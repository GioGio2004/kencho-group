/*
 * Shared motion vocabulary. Every animation on the site pulls its easing
 * and duration from here so the whole page moves with one signature.
 *
 * Plain data. No GSAP import, nothing runs at module scope — a server
 * component can read a token without pulling the library into its bundle.
 *
 * Two rules explain most of the values below:
 *   1. inOut for anything the page plays by itself; out for anything the
 *      pointer causes.
 *   2. Type leads, media follows — copy starts earlier and finishes
 *      sooner than the image beside it.
 */

/*
 * Easing tokens. Always name one explicitly; never let a tween fall back
 * to GSAP's own default.
 *
 * On precision: these are GSAP's named eases, and that is as exact as
 * this vocabulary gets. No literal cubic-bezier or CustomEase curve sits
 * behind them, so there is nothing to register — authoring one would
 * invent a precision the values do not carry. EASE_CSS holds labelled
 * approximations for the CSS-only path.
 */
export const EASE = {
  /** Primary reveal ease: fast out, long settle. */
  out: "expo.out",
  /** Symmetric wipes and curtains. */
  inOut: "expo.inOut",
  /** Softer variant for small UI moves. */
  soft: "power3.out",
  /** Scrub-friendly linear. */
  none: "none",

  /*
   * The pair below carries most of the site's character. Reach for these
   * first; the four above stay for the sections already built on them.
   */
  /** Anything the page plays by itself: line reveals, clip wipes, layout
   *  morphs, cross-element flights. The house ease. */
  narrative: "power4.inOut",
  /** Anything the pointer causes: hover in, menu open, button release. */
  pointer: "power4.out",

  /** Opacity swaps between stacked layers, and SVG point morphs. */
  crossfade: "power2.inOut",
  /** Things leaving under their own weight: scatter, dismiss, cursor out. */
  exit: "power2.in",
  /** Small elements arriving with a hint of overshoot: badges, marks. */
  pop: "back.out(0.9)",
  /** A pointer-summoned element arriving — a bigger, sharper overshoot. */
  popSharp: "back.out(1.8)",
  /** Release of a magnetic field: overshoots, wobbles, settles. */
  spring: "elastic.out(1, 0.35)",
  /** Rebound after a squash — same idea, far less ring. */
  springSoft: "elastic.out(1, 0.8)",

  /**
   * A long pointer-driven drift, for anything running at DUR.magnet.
   * Deliberately gentler than EASE.pointer: over two seconds power4 spends
   * nine-tenths of its time visually stopped, which turns a field into a
   * snap followed by nothing. power2 keeps the tail alive, and the tail is
   * the part that reads as a field.
   */
  drift: "power2.out",
} as const;

/*
 * CSS fallbacks. GSAP's named eases are polynomial and have no exact
 * cubic-bezier form, so every entry here is an approximation of the
 * matching EASE token — close enough for a standalone hover transition,
 * wrong for anything that has to land in step with a tween. Prefer the
 * GSAP token; use these only where there is no tween to hang the move on.
 *
 * EASE.pop, EASE.popSharp, EASE.spring and EASE.springSoft overshoot and
 * have no cubic-bezier equivalent at all. Those stay in GSAP.
 */
export const EASE_CSS = {
  /** Approximates EASE.narrative. */
  narrative: "cubic-bezier(0.77, 0, 0.175, 1)",
  /** Approximates EASE.pointer. */
  pointer: "cubic-bezier(0.165, 0.84, 0.44, 1)",
  /** Approximates EASE.soft. */
  soft: "cubic-bezier(0.215, 0.61, 0.355, 1)",
  /** Approximates EASE.crossfade. */
  crossfade: "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
  /** Approximates EASE.out, and the smooth-scroll curve with it — for CSS
   *  that has to feel like it belongs to the same page. */
  out: "cubic-bezier(0.19, 1, 0.22, 1)",
} as const;

/*
 * Duration tokens in seconds, in two bands: 0.2–0.8 for feedback the
 * visitor caused, 1–2 for narrative the page is telling. Reaching for a
 * value between the bands usually means the move has not decided which of
 * the two it is — `base` sits on the seam and carries the sections built
 * before the split.
 */
export const DUR = {
  fast: 0.4,
  base: 0.9,
  slow: 1.3,

  /** The smallest acknowledged move: press states, icon nudges. */
  tap: 0.2,
  /** A hover releasing. Twice `fast`, on purpose — entrances are quick,
   *  exits linger, so nothing ever snaps back at the pointer. */
  release: 0.8,
  /** One masked line of type arriving. */
  reveal: 1,
  /** An element travelling between two measured positions. */
  flight: 1.2,
  /** A clip-path wipe over media. Longer than `reveal` so the copy beside
   *  it has finished first. */
  wipe: 1.4,
  /** A full-viewport collapse: preloader, overlay, curtain. */
  curtain: 1.8,
  /** Magnetic drift and settle. Long enough to read as syrup, not a snap. */
  magnet: 2,
} as const;

/*
 * Standard stagger values, in seconds between neighbours.
 *
 * Note the site splits text to lines or words and never to characters —
 * Georgian and Cyrillic break badly per glyph — so any per-character
 * cadence lands on words instead. `chars` predates that rule; prefer
 * `words` for new work.
 */
export const STAGGER = {
  lines: 0.09,
  items: 0.07,
  chars: 0.02,

  /** Long paragraphs: many lines at `lines` drags the tail out. */
  linesTight: 0.05,
  /** Words inside a headline arriving one after another. */
  words: 0.03,
  /** Words in the opening headline — the first impression gets room. */
  wordsHero: 0.1,
  /** Nav and menu link lists. */
  menu: 0.08,
} as const;

/** Reverse-ordered stagger for a headline reflowing between two layouts.
 *  Running it from the end is what stops the move reading like a list. */
export const REFLOW_STAGGER = { each: 0.2, from: "end" } as const;

/** Default ScrollTrigger start for one-shot entrance reveals. */
export const REVEAL_START = "top 82%";

/*
 * Finer entrance offsets than the shared REVEAL_START. Splitting copy and
 * media by seven percent of the viewport is what makes a section read as
 * composed rather than as everything arriving at once.
 */
export const ENTRANCE = {
  /** Copy — the first thing to move in a section. */
  text: "top 95%",
  /** Media — later than copy, and paired with the longer DUR.wipe. */
  media: "top 88%",
  /** toggleActions for every one-shot: play once, never reverse, never
   *  replay. Re-running an entrance on scroll-back reads as a glitch. */
  once: "play none none none",
} as const;

/*
 * Scrub smoothing, in seconds of catch-up. Never use `scrub: true` — an
 * unlagged scrub tracks the wheel exactly, which reads cheap and lands
 * every layer at the same instant. The lag between these values is what
 * gives the page mass.
 */
export const SCRUB = {
  /** Pinned content, which has to stay under the finger. */
  pinned: 1,
  /** Foreground layers. */
  near: 1.5,
  /** Mid layers. */
  mid: 2,
  /** The deepest layer, and anything that should feel heavy. */
  far: 3,
} as const;

/** Common scrubbed spans, as ScrollTrigger start/end pairs. */
export const SCRUB_RANGE = {
  /** Element crosses the whole viewport: parallax, drift, ambient moves. */
  travel: { start: "top bottom", end: "bottom top" },
  /** Inner layer of a parallax pair — lands before its container leaves,
   *  so the image is never still while the frame is moving. */
  travelInner: { start: "top bottom", end: "bottom center" },
  /** Section owns the viewport: pins and pinned morphs. */
  hold: { start: "top top", end: "bottom top" },
  /** Scrubbed across a tall section's own spare height, no pin. */
  through: { start: "top top", end: "bottom bottom" },
} as const;

/*
 * Parallax factors. The depth cue is the lag between the two layers, not
 * the distance either travels: pair a container on SCRUB.near with its
 * inner image on SCRUB.far and the image is always the slower of the two.
 */
export const PARALLAX = {
  /** Container travel in px. Negative rises against the scroll. */
  container: -60,
  /** Container travel for the layer meant to read as closest. */
  containerFar: -100,
  /** Inner image travel, as a percentage of its own height. A few percent
   *  is plenty — the depth reads from the slower scrub, not the distance,
   *  and a big move here just shows the image's edge. */
  image: -8,
  /** Extra image height, as a percentage, that gives the inner travel
   *  somewhere to go — an image at 100% shows its edge as it moves. */
  headroom: 110,
  /** Per-item offsets in px, cycled by index. The alternating sign and
   *  uneven magnitude are the point; a formula reads mechanical. */
  items: [80, -150, -100, -160, 100, -90],
} as const;

/*
 * Clip-path wipe endpoints. Cycle `from` by index so a grid never reveals
 * every tile the same way — uniform wipes are what make a gallery read as
 * a template.
 */
export const CLIP = {
  /** Rest state: fully visible. */
  open: "inset(0% 0% 0% 0%)",
  /** Hidden states — bottom-right corner, bottom-left corner, straight up. */
  from: [
    "inset(100% 100% 0% 0%)",
    "inset(100% 0% 0% 100%)",
    "inset(100% 0% 0% 0%)",
  ],
} as const;

/**
 * Descender headroom for masked line reveals, in em. The moving line
 * carries this much extra padding-bottom and its mask pulls the same
 * amount back, so a "g" or "y" is never guillotined by the mask edge and
 * the reveal still costs zero layout shift.
 */
export const MASK_DESCENDER = 0.15;

/* =====================================================================
 * RULING CADENCE — how a hairline arrives.
 * ---------------------------------------------------------------------
 * A page carrying forty hairlines that all grow left-to-right at the
 * same speed does not read as drawn; it reads as a loading skeleton.
 * Every line looks like the same line because it is the same tween.
 *
 * So the cadence is a TABLE, cycled by document index — the same device
 * PARALLAX.items uses and for the same reason: a formula reads
 * mechanical, and true randomness reads as a bug. These seven were
 * authored, and the unevenness in them is the whole point. Seven rather
 * than four or six so the cycle never lines up with a column grid; a
 * three-up row of cards would otherwise get the identical entry three
 * times and the variety would vanish exactly where it is most visible.
 *
 * TWO MODES, and the difference is physical:
 *
 *   `scale`  stretches the line out of nothing. Elastic — the line is
 *            being pulled into existence.
 *   `wipe`   clips it open at constant length. That is a pen: the line
 *            was always that long, you are watching it be laid down.
 *
 * Mixing them is most of what makes the page feel ruled by a hand
 * rather than rendered by a loop. `tip` adds the brass nib running ahead
 * of the stroke — the same idea THE DRAWING spends a whole section on,
 * and rare enough here (two entries in seven) to stay an accent.
 * ================================================================== */
export interface RuleStep {
  mode: "scale" | "wipe";
  from: "left" | "right" | "center";
  /** Seconds. */
  dur: number;
  /** Seconds after its batch lands. */
  delay: number;
  /** Key into EASE. */
  ease: keyof typeof EASE;
  tip?: boolean;
}

export const RULE_CADENCE: readonly RuleStep[] = [
  { mode: "wipe", from: "left", dur: 1.5, delay: 0, ease: "narrative", tip: true },
  { mode: "scale", from: "right", dur: 0.8, delay: 0.18, ease: "pointer" },
  { mode: "wipe", from: "center", dur: 2, delay: 0.05, ease: "narrative" },
  { mode: "scale", from: "left", dur: 0.6, delay: 0.34, ease: "out" },
  { mode: "wipe", from: "right", dur: 1.2, delay: 0.11, ease: "pointer", tip: true },
  { mode: "scale", from: "center", dur: 1.7, delay: 0.42, ease: "narrative" },
  { mode: "wipe", from: "left", dur: 0.9, delay: 0.08, ease: "out" },
];

/** The nib's length, as a share of the rule it runs along. */
export const RULE_TIP_LENGTH = 0.14;
/** How far past the far end it runs before it is lifted. */
export const RULE_TIP_OVERRUN = 1.1;

/**
 * Registration ticks, in seconds after their frame arrives. Four corners
 * marked in a lazy diagonal rather than clockwise — a corner mark is a
 * thing a draughtsman puts down when they reach it, and four ticks
 * appearing in a neat rotation is the one arrangement that reads as
 * generated.
 */
export const TICK_DELAY = [0.06, 0.42, 0.19, 0.61] as const;

/** Magnetic pointer fields — repelled type, drifting shapes, trailing
 *  cursors. Handheld gets a smaller field so a thumb cannot pin the whole
 *  composition at once. */
export const MAGNET = {
  /** Radius of influence around the pointer, in px. */
  radius: { desktop: 460, handheld: 260 },
  /** Furthest an element is pushed, at the centre of the field, in px. */
  push: { desktop: 380, handheld: 110 },
  /** Falloff exponent across the radius. Above 1 keeps the outer edge calm
   *  and concentrates the effect near the pointer. */
  falloff: 1.6,
  /** Per-frame lerp for anything that trails the pointer. */
  lerp: 0.09,
} as const;

/*
 * Repelled type. MAGNET above describes a field acting on whole objects;
 * this one acts on the fragments of a single headline, and wants a much
 * tighter, harder field — a word has to clear its own neighbour to read as
 * pushed at all, and a 460px radius on a headline just slides the entire
 * line sideways.
 *
 * The field is intentionally linear rather than MAGNET's 1.6 falloff.
 * Type is read left to right, so an exponent that keeps the outer edge
 * calm reads as "some of the words are broken"; a linear ramp keeps the
 * whole line visibly under one influence.
 */
export const REPEL = {
  /** Radius of influence around the pointer, in px. */
  radius: 230,
  /** Furthest a fragment is pushed, at the centre of the field, in px. */
  push: 240,
  /** How far outside the host's own box the field still listens, in px.
   *  Without this the type only reacts once the pointer is already on top
   *  of it, and the approach — the best part — is lost. */
  margin: 140,
} as const;

/*
 * Character-scramble decode. The one place on the site where text is split
 * per character: a decode has no other unit. Safe here in a way a masked
 * line reveal is not, because nothing is being clipped and no line box is
 * being measured — each glyph is simply swapped in place.
 *
 * Pools are per script. Scrambling Georgian copy through a Latin pool
 * reads as a font failure rather than as an effect, so the component picks
 * the pool from the string it was handed.
 */
export const SCRAMBLE = {
  pool: {
    latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=/",
    /** Mkhedruli, U+10D0–U+10F0. */
    georgian: "აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ",
    cyrillic: "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789",
  },
  /** Seconds for a short label to resolve. */
  duration: 1.1,
  /** Glyphs swapped per second, per character, before it settles. Higher
   *  reads as noise; lower reads as a slideshow. */
  speed: 0.5,
  /** Hover re-scramble: quick, because the pointer is waiting on it. */
  hoverDuration: 0.55,
} as const;

/*
 * The scrolling band. Speed is in px per second of track travel at rest,
 * which is what keeps a long phrase and a short one moving at the same
 * apparent pace — a percentage-based loop would not.
 */
export const MARQUEE = {
  /** Resting travel, px/s. Slow enough to read, fast enough to live. */
  speed: 42,
  /** Scroll velocity, px/s, that doubles the track's timeScale. */
  velocityScale: 2200,
  /** Ceiling on that multiplier, so a flung scroll cannot smear the band. */
  maxTimeScale: 7,
  /** Furthest the band leans while the page moves under it, in degrees. */
  maxSkew: 7,
  /** Seconds the lean takes to catch up — and, since the same quickTo
   *  carries it home, to fall back upright. One value rather than the
   *  site's usual quick-in, slow-out pair: two tweens on one property
   *  would spend the whole time overwriting each other. */
  skewDuration: 0.5,
  /** Milliseconds of quiet before the band is declared at rest. Under a
   *  frame or two and a slow scroll would keep resetting it. */
  settleDelay: 120,
} as const;

/*
 * The two-state Flip reflow: a set of words that physically relocates from
 * one layout into another as its section is scrolled, then returns.
 *
 * `dip` is what stops the move reading as a slide. Each word shrinks
 * towards nothing at its own offset and grows back on arrival, so the eye
 * follows a sequence of departures and landings rather than a convoy.
 */
export const MORPH = {
  /** The Flip itself. Longer than DUR.flight because every word is
   *  travelling a different distance and the slowest sets the read. */
  duration: 1.4,
  /** Scale each word falls to at the midpoint of its own hop. Deep
   *  enough to read as a departure, shallow enough that a visitor who
   *  stops mid-scroll is looking at type rather than at dust. */
  dip: 0.5,
  /** Seconds of each half of that dip. */
  dipDuration: 0.8,
  /** Seconds between neighbouring dips. Runs from the end, like
   *  REFLOW_STAGGER, so the last word leaves first. */
  dipStagger: 0.1,
  /**
   * Dead seconds between the outward leg and the return, as a repeatDelay
   * on the yoyo. Without it the arrangement the whole section exists to
   * show is reached and left in the same instant — the words would be in
   * flight at every scroll position but one. This is what turns the
   * arrival into something the visitor can stop and look at.
   */
  hold: 2,
} as const;

/**
 * The smooth-scroll curve: exponential out. This one is exact rather than
 * a family — it is the literal easing the page scrolls on, so a tween that
 * has to match the glide can share it.
 */
export function expoOut(t: number): number {
  return Math.min(1, 1.001 - Math.pow(2, -10 * t));
}

/* =====================================================================
 * SCRUB PACING
 * ---------------------------------------------------------------------
 * The functions below are for scroll-SCRUBBED motion, where the visitor
 * supplies the clock. A scrub has no ease of its own: progress is the raw
 * scroll position, so the camera moves at exactly the speed of the wheel
 * and every moment of the shot is worth the same. That is the flat,
 * unedited feeling of most scroll sites.
 *
 * The fix is not to ease the tween — that would move the seams. It is to
 * remap TIME under the scroll, keeping the endpoints pinned, so the
 * camera slows where there is something to look at and covers the
 * transit quickly. Ease in and ease out, applied to the film rather than
 * to a property.
 *
 * Adapted from the scroll-world engine's `linger` model.
 * ================================================================== */

/** Clamps to 0–1. Every function here assumes normalised progress. */
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Smoothstep — the S-curve with zero slope at both ends.
 *
 * The right curve for a scrubbed cross-fade, where GSAP's named eases are
 * the wrong tool: those are tuned for a tween the page plays itself, and
 * an `expo.out` fade under a scrub finishes visually in the first tenth
 * of the scroll it was given. This one spends its time in the middle,
 * which is where a fade should live.
 */
export function smoothstep(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * Slows the middle of a span and speeds up its edges, without moving
 * either end. `amount` 0 is untouched linear; 1 is a full mid-span
 * settle. f(0) = 0 and f(1) = 1 for every amount, which is the whole
 * point — the frames at the boundaries are exactly where they were, so
 * this can be dropped onto an existing scrub without re-timing anything
 * that hands off to it.
 *
 * Strictly monotone below 1, so scrolling back retraces the same path.
 * Rate runs at `1 + 2·amount` at the edges and `1 - amount` at the
 * centre — past about 0.5 the edges start to read as a lurch.
 */
export function lingerEase(x: number, amount: number): number {
  const t = clamp01(x);
  const a = clamp01(amount);
  const c = t - 0.5;
  return (1 - a) * t + a * (4 * c * c * c + 0.5);
}

/** One settle: a sub-span of a scrub, and how hard to slow its middle. */
export interface LingerStop {
  /** Where the stop opens, as progress through the whole scrub. */
  in: number;
  /** Where it closes. Must be greater than `in`. */
  out: number;
  /** Passed to `lingerEase`. Omit or 0 to leave the stop linear. */
  linger?: number;
}

/**
 * `lingerEase` applied inside each of several stops along one scrub.
 *
 * A single settle is right for a section that shows one thing. A long
 * pinned shot that narrates several beats needs one settle per beat, and
 * this is the generalisation: each stop is remapped onto itself, so every
 * boundary between stops — and both ends of the scrub — is pinned exactly
 * where it was. Progress outside every stop passes through untouched, so
 * a deliberately empty stretch stays brisk.
 *
 * Stops must be ordered and non-overlapping. They do not have to tile:
 * the gaps are the transit.
 */
export function lingerStops(x: number, stops: readonly LingerStop[]): number {
  const t = clamp01(x);
  for (const stop of stops) {
    if (!stop.linger || t < stop.in || t > stop.out) continue;
    const span = stop.out - stop.in;
    if (span <= 0) continue;
    return stop.in + lingerEase((t - stop.in) / span, stop.linger) * span;
  }
  return t;
}

/**
 * How hard to settle, by what the visitor is being asked to do there.
 * Named by intent rather than by number so a section picks the one that
 * describes its beat, and retuning the site's pace is one edit here.
 */
export const LINGER = {
  /** A beat with copy to read. The camera all but stops under it. */
  read: 0.45,
  /** A beat with something to look at but nothing to read. */
  look: 0.3,
  /** An opening or a hand-off. Barely there — just enough to not feel
   *  like the shot starts at full speed. */
  brush: 0.16,
} as const;

/**
 * Length of a single wheel-tick glide, in seconds. The long tail is what
 * gives scrolling its weight; the usable band is roughly 1.1 to 1.2, and
 * the site runs the low end so anchors still feel answerable.
 */
export const SMOOTH_SCROLL_DURATION = 1.1;

/** True when the visitor asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
