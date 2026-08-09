/*
 * LIQUID THREAD — one continuous scroll-drawn SVG line for the landing
 * page.
 *
 * A single <path> is generated from every [data-thread-anchor] element
 * (Catmull-Rom smoothed, so every joint is rounded), drawn with the
 * classic dasharray/dashoffset technique behind a ScrollTrigger scrub,
 * and kept "liquid" by a slow sine displacement of its control points
 * on one shared rAF (gsap.ticker — the same clock Lenis runs on, see
 * SmoothScroll.tsx).
 *
 * The draw endpoint FOLLOWS THE VIEWPORT: progress is looked up by
 * document y (scroll position → arc length at that height), so the
 * line makes its way down at exactly the reader's speed, section by
 * section, with the scrub lag trailing behind like water.
 *
 * The weave is deliberately irregular — every gutter, wrap depth and
 * between-section meander is jittered by a deterministic per-index
 * hash, so the line reads as hand-drawn rather than metronomic, and
 * is identical on every visit (no Math.random, nothing to hydrate).
 *
 * Everything worth tuning — amplitude, speeds, colors, geometry — is a
 * constant below. The two clearly-marked sections to read before
 * touching anything are PATH GENERATION and LIQUID DISPLACEMENT.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* =====================================================================
 * TUNING
 * =================================================================== */

/* --- appearance ---------------------------------------------------- */
const STROKE_WIDTH = 1.25; // hairline
const GLOW_WIDTH = 3.5; // kept slim — the glow is a whisper, not a tube
const GLOW_OPACITY = 0.16; // wide translucent stroke, no blur filter (perf)
const QUIET_OPACITY = 0.5; // between waypoints
const LOUD_OPACITY = 1; // near waypoints
const NEAR_WINDOW = 0.05; // ± draw-progress that counts as "near"

/*
 * The spec palette (white → soft gray → muted gold) is designed for a
 * dark surface. The site also has a light (sand) theme where a white
 * hairline disappears, so each theme picks its own stop set — swap
 * freely, the gradient machinery does not care.
 */
const STOPS_DARK = ["#FFFFFF", "#9A9A9A", "#C9A96A"];
const STOPS_LIGHT = ["#14171B", "#9A9A9A", "#8D7448"];
const HALO_DARK = "#FFFFFF";
const HALO_LIGHT = "#8D7448";
const COMET_CORE = "#C9A96A";
const GRADIENT_CYCLE = 12; // seconds for one full color travel

/* --- liquid displacement ------------------------------------------- */
const WAVE_AMPLITUDE = 3; // px, keep within 2–4
const WAVE_LENGTH = 900; // px of page per sine cycle (large = calm)
const WAVE_SPEED = 0.15; // cycles per second (slow)

/* --- path geometry --------------------------------------------------
 * All the *_MIN / *_VAR pairs are the chaos budget: each value is
 * MIN + hash(index) * VAR, so no two wraps are alike but the result
 * is stable across reloads. Raise the VARs for a wilder line.
 * ------------------------------------------------------------------ */
const SIDE_GUTTER_MIN = 20; // px outside a card's edge…
const SIDE_GUTTER_VAR = 36; // …plus up to this much jitter
const EDGE_PAD = 16; // the line never comes closer to the viewport edge
const START_DIP = 90; // the line is born this far into the first card
const WRAP_TOP_MIN = 0.2; // side run begins at top + height * (MIN..MIN+VAR)
const WRAP_TOP_VAR = 0.18;
const WRAP_BOT_MIN = 0.05; // side run releases at bottom − height * (…)
const WRAP_BOT_VAR = 0.09;
const UNDER_FRAC_MIN = 0.14; // bottom sweep reaches this far under the card
const UNDER_FRAC_VAR = 0.24;
const EXIT_DROP_MIN = 30; // px below a card where the sweep bottoms out
const EXIT_DROP_VAR = 58;
const TALL_SECTION = 1.4; // sections taller than this × viewport get a
const TALL_WOBBLE = 90; //   mid-side wobble point (± px) so no long runs
const MEANDER_GAP = 260; // air between cards worth a wander point
const MEANDER_X_MIN = 0.28; // wander swings to vw * (MIN..MIN+VAR)
const MEANDER_X_VAR = 0.44;
const CURVE_TENSION = 1; // 1 = classic Catmull-Rom roundness
const MOBILE_BP = 768; // below this: gentle near-vertical S-bends
const MOBILE_SWAY = 0.07; // lateral sway as a fraction of viewport width

/* --- scroll + pulses ------------------------------------------------ */
const SCRUB = 1.2; // the lag IS the liquid trailing feel — never `true`
const DRAW_LEAD = 0.62; // draw endpoint rides this far down the viewport
const PULSE_SEGMENT = 220; // px of line lit around a waypoint
const PULSE_DURATION = 0.8;
const SAMPLES = 240; // path samples for length-by-height lookup
const RESIZE_DEBOUNCE = 200;

const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

/* =====================================================================
 * SMALL HELPERS
 * =================================================================== */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r2 = (v) => Math.round(v * 100) / 100;

/** Deterministic 0..1 "randomness" — same line on every visit. */
function jitter(i, salt) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function make(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
}

/* =====================================================================
 * MODULE
 * =================================================================== */

/**
 * Mounts the thread into `host` (an empty, absolutely-positioned,
 * pointer-events-none div spanning the page). Returns a destroy().
 */
export function initLiquidThread(host) {
  gsap.registerPlugin(ScrollTrigger);

  const uid = `thread-${Math.random().toString(36).slice(2, 8)}`;
  const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------
   * SVG SCAFFOLD — built once; geometry rewritten by rebuild().
   * ---------------------------------------------------------------- */
  const svg = make("svg", {
    "aria-hidden": "true",
    focusable: "false",
    preserveAspectRatio: "none",
  });

  const defs = make("defs", {});

  // Color that travels: userSpaceOnUse + spreadMethod="reflect" gives a
  // seamless mirror repeat, so translating the gradient reads as light
  // moving through water with zero hard stops.
  const grad = make("linearGradient", {
    id: `${uid}-grad`,
    gradientUnits: "userSpaceOnUse",
    spreadMethod: "reflect",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1200",
  });
  const stops = [0, 0.5, 1].map((offset) => {
    const stop = make("stop", { offset: String(offset) });
    grad.appendChild(stop);
    return stop;
  });

  const halo = make("radialGradient", { id: `${uid}-halo` });
  const haloIn = make("stop", { offset: "0", "stop-opacity": "0.9" });
  const haloOut = make("stop", { offset: "1", "stop-opacity": "0" });
  halo.appendChild(haloIn);
  halo.appendChild(haloOut);

  defs.appendChild(grad);
  defs.appendChild(halo);
  svg.appendChild(defs);

  const stroke = {
    stroke: `url(#${uid}-grad)`,
    fill: "none",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
  /*
   * Glow under, hairline over, pulse on top. The glow is NOT a blur
   * filter: an feGaussianBlur whose input (the path's d) changes every
   * frame re-rasterizes its whole document-height region per frame —
   * the exact large-area filter cost the performance budget forbids. A
   * wider stroke at low opacity with round caps reads the same at
   * hairline scale and costs a plain stroke raster.
   */
  const glowPath = make("path", {
    ...stroke,
    "stroke-width": String(GLOW_WIDTH),
    opacity: String(GLOW_OPACITY),
  });
  const mainPath = make("path", {
    ...stroke,
    "stroke-width": String(STROKE_WIDTH),
    opacity: String(QUIET_OPACITY),
  });
  const pulsePath = make("path", {
    ...stroke,
    "stroke-width": String(STROKE_WIDTH),
    opacity: "0",
  });

  // Comet head: soft halo + gold core, moved to the draw endpoint.
  const comet = make("g", { opacity: "0" });
  comet.appendChild(make("circle", { r: "7", fill: `url(#${uid}-halo)` }));
  comet.appendChild(make("circle", { r: "2", fill: COMET_CORE }));

  svg.appendChild(glowPath);
  svg.appendChild(mainPath);
  svg.appendChild(pulsePath);
  svg.appendChild(comet);
  host.appendChild(svg);

  /* ------------------------------------------------------------------
   * STATE
   * ---------------------------------------------------------------- */
  const state = {
    basePts: [], // Catmull-Rom control points, document coords
    length: 0, // getTotalLength() of the baseline path
    gradPeriod: 1200,
    waypoints: [], // { el, len, p }
    lookup: [], // { y: highwater document y, len } — length by height
    samples: [], // raw {len,x,y} path samples, for the comet position
    lastP: -1, // previous frame's draw progress, for the idle gate
    vh: 0,
    bright: QUIET_OPACITY,
    running: false,
    reduced: reducedMq.matches,
    builtVw: 0, // viewport width the current geometry was built for
  };
  const proxy = { p: 0 }; // scrubbed scroll progress, written by GSAP
  const pulsed = new WeakSet(); // waypoint one-shots survive rebuilds

  const listeners = new AbortController();
  const signal = listeners.signal;
  let drawTween = null;
  let resizeTimer = 0;
  let visible = true; // IntersectionObserver
  let tabVisible = !document.hidden;

  /* ------------------------------------------------------------------
   * THEME — the gradient follows the site's data-theme attribute.
   * ---------------------------------------------------------------- */
  function applyTheme() {
    const light =
      document.documentElement.getAttribute("data-theme") === "light";
    const palette = light ? STOPS_LIGHT : STOPS_DARK;
    stops.forEach((stop, i) => stop.setAttribute("stop-color", palette[i]));
    const haloColor = light ? HALO_LIGHT : HALO_DARK;
    haloIn.setAttribute("stop-color", haloColor);
    haloOut.setAttribute("stop-color", haloColor);
  }
  applyTheme();
  const themeWatch = new MutationObserver(applyTheme);
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  /* ==================================================================
   * PATH GENERATION
   * ==================================================================
   * All reads happen first (one getBoundingClientRect pass), all writes
   * after — never interleaved, so a rebuild costs one layout at most.
   *
   * The line is BORN a little way inside the first card (never above
   * it — anything above the first section sits inside the pinned
   * prologue's scroll range and would float over the intro), runs down
   * each card's flank on an alternating, jittered gutter, hooks under
   * the card, wanders through the air between sections, and DIES
   * inside the last card — it never crosses the footer.
   * ================================================================ */

  function measureAnchors() {
    const scrollY = window.scrollY;
    return Array.from(document.querySelectorAll("[data-thread-anchor]"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
        };
      })
      .filter((a) => a.height > 0)
      .sort((a, b) => a.top - b.top);
  }

  function buildPoints(anchors, vw, vh) {
    const cx = vw / 2;
    const pts = [];
    const marks = []; // which control point "is" each card, for pulses
    const px = (v) => clamp(v, EDGE_PAD, vw - EDGE_PAD);

    anchors.forEach((a, i) => {
      const onLeft = i % 2 === 0;
      const isFirst = i === 0;
      const isLast = i === anchors.length - 1;

      if (vw < MOBILE_BP) {
        // Gentle S: sway one way at the card's top, ease back below it,
        // with the same jittered irregularity as the desktop weave.
        const sway =
          vw * MOBILE_SWAY * (onLeft ? -1 : 1) * (0.7 + jitter(i, 9) * 0.6);
        if (isFirst) pts.push({ x: cx, y: a.top + START_DIP });
        pts.push({ x: px(cx + sway), y: a.top + a.height * 0.25 });
        marks.push({ el: a.el, ptIndex: pts.length - 1 });
        if (isLast) {
          pts.push({ x: cx, y: a.bottom - a.height * 0.1 });
        } else {
          pts.push({ x: px(cx - sway * 0.6), y: a.bottom - a.height * 0.15 });
        }
        return;
      }

      const gutter = SIDE_GUTTER_MIN + jitter(i, 1) * SIDE_GUTTER_VAR;
      const sideX = px(onLeft ? a.left - gutter : a.right + gutter);

      // Born on the flank, already inside the card — a short, quiet
      // vertical entrance instead of a sweep in from nowhere.
      if (isFirst) {
        pts.push({
          x: px(sideX + (onLeft ? 24 : -24)),
          y: a.top + START_DIP,
        });
      }

      pts.push({
        x: sideX,
        y: a.top + a.height * (WRAP_TOP_MIN + jitter(i, 2) * WRAP_TOP_VAR),
      });
      marks.push({ el: a.el, ptIndex: pts.length - 1 });

      // A tall card's flank would read as a ruler — wobble its middle.
      if (a.height > vh * TALL_SECTION) {
        pts.push({
          x: px(sideX + (jitter(i, 3) - 0.5) * 2 * TALL_WOBBLE),
          y: a.top + a.height * 0.62,
        });
      }

      if (isLast) {
        // Die inside the card: drift off the flank toward the content
        // and stop above the card's bottom edge. The footer is never
        // crossed.
        pts.push({ x: sideX, y: a.bottom - a.height * 0.28 });
        pts.push({
          x: px(onLeft ? a.left + a.width * 0.3 : a.right - a.width * 0.3),
          y: a.bottom - a.height * 0.08,
        });
        return;
      }

      pts.push({
        x: sideX,
        y: a.bottom - a.height * (WRAP_BOT_MIN + jitter(i, 4) * WRAP_BOT_VAR),
      });

      // Hook under the card…
      const underFrac = UNDER_FRAC_MIN + jitter(i, 5) * UNDER_FRAC_VAR;
      pts.push({
        x: px(onLeft ? a.left + a.width * underFrac : a.right - a.width * underFrac),
        y: a.bottom + EXIT_DROP_MIN + jitter(i, 6) * EXIT_DROP_VAR,
      });

      // …then wander through the air toward the next card, somewhere
      // unexpected, so the crossing is a curve and never a diagonal.
      const next = anchors[i + 1];
      const gap = next.top - a.bottom;
      if (gap > MEANDER_GAP) {
        pts.push({
          x: px(vw * (MEANDER_X_MIN + jitter(i, 7) * MEANDER_X_VAR)),
          y: a.bottom + gap * (0.35 + jitter(i, 8) * 0.3),
        });
      }
    });

    return { pts, marks };
  }

  /*
   * Catmull-Rom → cubic beziers. Tangent at each point comes from its
   * neighbours, which is what makes every joint rounded: there is no
   * corner anywhere for a corner to show.
   */
  function pathFrom(pts, offsetX) {
    const ox = offsetX ?? (() => 0);
    const x = (p) => r2(p.x + ox(p));
    let d = `M ${x(pts[0])} ${r2(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const k = CURVE_TENSION / 6;
      const c1x = r2(p1.x + ox(p1) + (p2.x - p0.x) * k);
      const c1y = r2(p1.y + (p2.y - p0.y) * k);
      const c2x = r2(p2.x + ox(p2) - (p3.x - p1.x) * k);
      const c2y = r2(p2.y - (p3.y - p1.y) * k);
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${x(p2)} ${r2(p2.y)}`;
    }
    return d;
  }

  function setGeometry(d) {
    glowPath.setAttribute("d", d);
    mainPath.setAttribute("d", d);
    pulsePath.setAttribute("d", d);
  }

  function rebuild() {
    /*
     * THE RATCHET GUARD. The absolutely-positioned host extends the
     * document's scrollable overflow, so measuring scrollHeight while
     * the host still carries the PREVIOUS rebuild's height means the
     * document can grow but never shrink — every reflow to a shorter
     * page would leave phantom scroll space forever. Release it before
     * the read pass; the host is out of flow, so nothing moves.
     */
    host.style.height = "0px";
    const anchors = measureAnchors();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight;

    // A tab loaded in the background measures a zero-width viewport;
    // geometry built from it would be garbage. Wait — the
    // visibilitychange handler below rebuilds on reveal.
    if (vw === 0) return;
    state.builtVw = vw;
    state.vh = vh;

    if (anchors.length === 0) {
      host.style.display = "none";
      return;
    }
    host.style.display = "";

    /* writes begin */
    host.style.height = `${docH}px`;
    svg.setAttribute("viewBox", `0 0 ${vw} ${docH}`);

    const { pts, marks } = buildPoints(anchors, vw, vh);
    state.basePts = pts;
    const d = pathFrom(pts);
    setGeometry(d);

    state.length = mainPath.getTotalLength();
    const dash = String(state.length);
    mainPath.setAttribute("stroke-dasharray", dash);
    glowPath.setAttribute("stroke-dasharray", dash);

    state.gradPeriod = Math.max(1400, docH / 4);
    grad.setAttribute("y2", String(state.gradPeriod));

    /*
     * One sampling pass serves two lookups:
     *  - length-by-height (the draw endpoint follows the viewport), a
     *    monotone "highwater" table so the under-card hooks — where y
     *    briefly runs flat or backwards — cannot make progress jump;
     *  - nearest-sample arc length for each waypoint card.
     */
    const samples = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const len = (i / SAMPLES) * state.length;
      const pt = mainPath.getPointAtLength(len);
      samples.push({ len, x: pt.x, y: pt.y });
    }

    let highwater = -Infinity;
    state.lookup = samples.map((s) => {
      highwater = Math.max(highwater, s.y);
      return { y: highwater, len: s.len };
    });
    // Kept for the comet: positions come from this table, never from
    // per-frame getPointAtLength (a forced SVG re-tessellation right
    // after writing d — a read-after-write the frame budget can't pay).
    state.samples = samples;

    state.waypoints = marks.map((mark) => {
      const target = pts[mark.ptIndex];
      let best = samples[0];
      let bestD = Infinity;
      for (const s of samples) {
        const dd = (s.x - target.x) ** 2 + (s.y - target.y) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = s;
        }
      }
      return { el: mark.el, len: best.len, p: best.len / state.length };
    });

    if (state.reduced) {
      // Fully drawn, static gradient, no undulation, no scrub.
      mainPath.style.strokeDashoffset = "0";
      glowPath.style.strokeDashoffset = "0";
      mainPath.style.opacity = String(QUIET_OPACITY + 0.2);
      comet.setAttribute("opacity", "0");
      grad.setAttribute("gradientTransform", "translate(0 0)");
    } else {
      // Keep the current draw state through a rebuild — no flash.
      const off = String(state.length * (1 - drawProgress()));
      mainPath.style.strokeDashoffset = off;
      glowPath.style.strokeDashoffset = off;
    }
  }

  /*
   * Scroll → draw progress, BY DOCUMENT HEIGHT. The scrubbed scroll
   * value places a horizon DRAW_LEAD down the viewport; the lookup
   * answers "how much arc length sits above that horizon", so the
   * line's tip travels with the reader — through each section as the
   * reader crosses it — rather than at total-length speed.
   */
  function drawProgress() {
    if (!state.lookup.length || state.length === 0) return 0;
    const st = drawTween?.scrollTrigger;
    const scrolled = st
      ? st.start + proxy.p * (st.end - st.start)
      : window.scrollY;
    const horizon = scrolled + state.vh * DRAW_LEAD;

    const table = state.lookup;
    if (horizon <= table[0].y) return 0;
    if (horizon >= table[table.length - 1].y) return 1;
    let lo = 0;
    let hi = table.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid].y < horizon) lo = mid;
      else hi = mid;
    }
    const a = table[lo];
    const b = table[hi];
    const t = b.y === a.y ? 1 : (horizon - a.y) / (b.y - a.y);
    return clamp((a.len + (b.len - a.len) * t) / state.length, 0, 1);
  }

  /* ==================================================================
   * LIQUID DISPLACEMENT + FRAME LOOP
   * ==================================================================
   * One rAF for everything (shared gsap.ticker). Each frame displaces
   * the control points' x by a slow travelling sine keyed on document y
   * — amplitude WAVE_AMPLITUDE, wavelength WAVE_LENGTH, speed
   * WAVE_SPEED — and rewrites `d`. ~40 control points make this a
   * sub-millisecond string build; the paths share one geometry.
   * ================================================================ */

  function frame(time) {
    if (!state.running || !visible || !tabVisible) return;
    if (state.length === 0) return;

    const p = drawProgress();

    /*
     * Idle gate: while nothing is drawn (the whole pinned prologue,
     * ~60% of this page's scroll), there is nothing to undulate and no
     * color to travel — skip every write. One extra frame runs when p
     * first returns to 0 so the parked state is applied exactly once.
     */
    if (p === 0 && state.lastP === 0) return;
    state.lastP = p;

    const wavePhase = time * WAVE_SPEED * TAU;
    const wave = (y) =>
      WAVE_AMPLITUDE * Math.sin((y / WAVE_LENGTH) * TAU - wavePhase);
    const d = pathFrom(state.basePts, (pt) => wave(pt.y));
    setGeometry(d);

    const off = String(state.length * (1 - p));
    mainPath.style.strokeDashoffset = off;
    glowPath.style.strokeDashoffset = off;

    // Color travelling through the line (reflect period = 2 × y2).
    const ty = ((time / GRADIENT_CYCLE) % 1) * state.gradPeriod * 2;
    grad.setAttribute("gradientTransform", `translate(0 ${r2(ty)})`);

    /*
     * Comet head rides the draw endpoint — read from the sample table
     * (lerped, plus the same wave offset the geometry got), so the
     * frame performs zero SVG geometry reads.
     */
    if (p > 0.002 && p < 0.998 && state.samples.length > 1) {
      const f = p * (state.samples.length - 1);
      const i = Math.min(Math.floor(f), state.samples.length - 2);
      const t = f - i;
      const s0 = state.samples[i];
      const s1 = state.samples[i + 1];
      const cy = s0.y + (s1.y - s0.y) * t;
      const cx = s0.x + (s1.x - s0.x) * t + wave(cy);
      comet.setAttribute("transform", `translate(${r2(cx)} ${r2(cy)})`);
      comet.setAttribute("opacity", "1");
    } else {
      comet.setAttribute("opacity", "0");
    }

    // Quiet between waypoints, bright near them — eased, never snappy.
    let near = false;
    for (const wp of state.waypoints) {
      if (Math.abs(p - wp.p) < NEAR_WINDOW) {
        near = true;
        break;
      }
    }
    const target = near ? LOUD_OPACITY : QUIET_OPACITY;
    state.bright += (target - state.bright) * 0.06;
    mainPath.style.opacity = String(r2(state.bright));

    // One-time waypoint pulses as the line reaches each card.
    for (const wp of state.waypoints) {
      if (p >= wp.p && !pulsed.has(wp.el)) {
        pulsed.add(wp.el);
        firePulse(wp);
      }
    }
  }

  /*
   * A short window of the same geometry, revealed by dash trickery and
   * swelled briefly: stroke-width 1.25 → 2 and back, power3.out. The
   * card itself pulses through a one-shot CSS animation (see the CSS
   * file) so nothing here fights the compositor.
   */
  function firePulse(wp) {
    pulsePath.setAttribute(
      "stroke-dasharray",
      `${PULSE_SEGMENT} ${Math.ceil(state.length)}`,
    );
    pulsePath.setAttribute(
      "stroke-dashoffset",
      String(-Math.max(0, wp.len - PULSE_SEGMENT / 2)),
    );
    gsap.killTweensOf(pulsePath);
    gsap
      .timeline()
      .fromTo(
        pulsePath,
        { opacity: 0, strokeWidth: STROKE_WIDTH },
        {
          opacity: 0.85,
          strokeWidth: 2,
          duration: PULSE_DURATION * 0.35,
          ease: "power3.out",
        },
      )
      .to(pulsePath, {
        opacity: 0,
        strokeWidth: STROKE_WIDTH,
        duration: PULSE_DURATION * 0.65,
        ease: "power3.out",
      });

    wp.el.classList.add("thread-card-pulse");
    wp.el.addEventListener(
      "animationend",
      () => wp.el.classList.remove("thread-card-pulse"),
      { once: true },
    );
  }

  /* ------------------------------------------------------------------
   * WIRING
   * ---------------------------------------------------------------- */

  function start() {
    rebuild();
    if (state.reduced) return;

    drawTween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        /*
         * The full document span — NOT <main>. The footer lives outside
         * <main>, so a main-bounded scrub pegs at 1 a footer's worth of
         * scroll early and the last stretch of the line would never
         * draw. maxScroll(window) is exactly the denominator the
         * height-lookup expects.
         */
        trigger: document.body,
        start: 0,
        end: () => ScrollTrigger.maxScroll(window),
        scrub: SCRUB, // the mandatory lag — see TUNING
        invalidateOnRefresh: true,
      },
    });

    gsap.ticker.add(frame);
    state.running = true;
  }

  /* Rebuild whenever layout truth changes; never desync from content. */
  const rebuildSoon = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(rebuild, RESIZE_DEBOUNCE);
  };
  window.addEventListener("resize", rebuildSoon, { signal });
  // The house ScrollFX already refreshes ScrollTrigger when images and
  // fonts land; riding that event covers every late layout shift.
  ScrollTrigger.addEventListener("refresh", rebuildSoon);
  document.fonts.ready.then(() => {
    if (!signal.aborted) rebuildSoon();
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      tabVisible = !document.hidden;
      // Revealed after a background-tab load (or a resize that happened
      // while hidden): the built geometry is stale — measure again.
      if (
        tabVisible &&
        state.builtVw !== document.documentElement.clientWidth
      ) {
        rebuildSoon();
      }
    },
    { signal },
  );
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  io.observe(host);

  // Honour a live flip of the OS motion setting.
  const onMotionFlip = () => {
    state.reduced = reducedMq.matches;
    if (state.reduced) {
      state.running = false;
      gsap.ticker.remove(frame);
      drawTween?.scrollTrigger?.kill();
      drawTween?.kill();
      drawTween = null;
      rebuild();
    } else {
      start();
    }
  };
  reducedMq.addEventListener("change", onMotionFlip, { signal });

  // The intro overlay scroll-locks the page; build once it clears.
  if (document.documentElement.classList.contains("is-loading")) {
    window.addEventListener("alma:loaded", start, { once: true, signal });
  } else {
    start();
  }

  return function destroy() {
    listeners.abort();
    window.clearTimeout(resizeTimer);
    ScrollTrigger.removeEventListener("refresh", rebuildSoon);
    themeWatch.disconnect();
    io.disconnect();
    state.running = false;
    gsap.ticker.remove(frame);
    gsap.killTweensOf(pulsePath);
    drawTween?.scrollTrigger?.kill();
    drawTween?.kill();
    document
      .querySelectorAll(".thread-card-pulse")
      .forEach((el) => el.classList.remove("thread-card-pulse"));
    svg.remove();
  };
}
