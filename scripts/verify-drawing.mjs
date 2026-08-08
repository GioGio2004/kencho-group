#!/usr/bin/env node
/**
 * Behavioural verification of THE DRAWING.
 *
 *   node --import ./scripts/alias-hook.mjs scripts/verify-drawing.mjs [baseUrl]
 *
 * Real Chromium — the in-app preview pane runs hidden and never fires
 * requestAnimationFrame, so a scrubbed section reads as frozen there no
 * matter what it actually does.
 *
 * The section makes a claim about precision, so the checks are about
 * precision rather than about "did something animate":
 *
 *   - line weight is 1.5px at 390px AND at 1440px, not 1.5px somewhere
 *     and whatever-the-zoom-says everywhere else
 *   - nothing is drawn at the start, and by the approved beat every path
 *     is complete with none left half-drawn
 *   - every dimension counts up to the value the geometry actually
 *     measures, imported from lib/drawing.ts rather than hard-coded here
 *   - exactly one text beat is legible at a time
 *   - the readout reports per-phase progress, not overall progress
 *   - mid-sweep, the print head stands mid-viewport with the photograph
 *     clipped in behind it — the head and the print edge are one number
 *   - the finale ghosts the linework over the photograph, then leaves it
 *   - scrolling back to the top unprints everything: strokes at zero,
 *     photograph withdrawn
 *   - the handheld sheet drops its two outermost annotations and keeps
 *     the full 3600 run, because cropping cabinets would turn the
 *     overall dimension into a lie
 */

import { chromium } from "playwright";
import {
  GHOST_OPACITY,
  PRINT,
  SHEET,
  STAGE,
  TIMELINE,
} from "../lib/drawing.ts";
import { K01, buildScene, chainValues } from "../lib/elevation/index.ts";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * What every chain must arrive at, taken from the SCENE the section
 * actually renders rather than from a hand-written list.
 *
 * This is the whole point of the extraction: the section, the planner and
 * this check now read one source, so a geometry change shows up here as a
 * failure instead of as a drawing that quietly disagrees with its own
 * labels. The `fronts` chain reports the FIRST multi-front unit, which is
 * the oven housing at 230/340/190 — b4's front division changed from a
 * hand-authored two drawers to a derived three when the engine took over,
 * and it is not what this chain measures.
 */
const EXPECT = chainValues(buildScene(K01, { wide: true }));

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/*
 * Evaluated by page.evaluate(), so each is a self-invoking function — a
 * bare arrow serialises as a function object and yields undefined.
 */

/** Line weights as actually painted, in CSS pixels. */
const WEIGHTS = `(() => {
  const svg = document.querySelector('svg[data-sheet]');
  const vb = svg.viewBox.baseVal;
  const scale = svg.getBoundingClientRect().width / vb.width;
  const px = (sel) => {
    const el = svg.querySelector(sel);
    if (!el) return null;
    let w = parseFloat(getComputedStyle(el).strokeWidth);
    if (Number.isNaN(w)) {
      // stroke-width is calc(--dwg-line * --dwg-heat) since hot ink
      // arrived, and Chromium declines to serialise a calc of two
      // unitless variables to a number — resolve the factors here.
      // Heat is 1 everywhere this probe reads, but multiply anyway so
      // a stuck multiplier fails the weight check instead of hiding.
      const s = getComputedStyle(el);
      const line = parseFloat(s.getPropertyValue('--dwg-line'));
      const heat = parseFloat(s.getPropertyValue('--dwg-heat')) || 1;
      w = line * heat;
    }
    return Math.round(w * scale * 100) / 100;
  };
  return {
    viewBoxX: Math.round(vb.x),
    line: px('#carcass path'),
    dim: px('#dims path[data-draw]'),
    labelPx: Math.round(parseFloat(getComputedStyle(svg.querySelector('.dwg-label')).fontSize) * scale * 10) / 10
  };
})()`;

/** How much of the linework has been laid down. */
const DRAWN = `(() => {
  const all = Array.from(document.querySelectorAll('svg[data-sheet] [data-draw]'));
  const paths = all.filter((p) => {
    const g = p.closest('[data-chain]');
    return !(g && getComputedStyle(g).display === 'none');
  });
  let done = 0, part = 0;
  for (const p of paths) {
    const len = p.getTotalLength();
    const off = Math.abs(parseFloat(getComputedStyle(p).strokeDashoffset) || 0);
    const f = len ? 1 - Math.min(off / len, 1) : 1;
    if (f > 0.995) done++; else if (f > 0.005) part++;
  }
  return { total: paths.length, done: done, part: part };
})()`;

/** Every chain's segment labels, in order, keyed by chain id. */
const LABELS = `(() => {
  const out = {};
  const groups = document.querySelectorAll('svg[data-sheet] [data-chain]');
  for (const g of groups) {
    out[g.dataset.chain] = {
      shown: [...g.querySelectorAll('text')].map((t) => t.textContent.trim()),
      hidden: getComputedStyle(g).display === 'none'
    };
  }
  return out;
})()`;

/**
 * Which beats are actually LEGIBLE, plus the finale's two layers.
 *
 * Element opacity is not the answer and the first version of this check
 * used it: a beat waiting its turn sits at opacity 1 with its lines
 * parked outside their masks, so the naive read called every beat
 * visible and happily passed a section that was printing its title
 * through its own body copy. A beat counts as legible only if one of its
 * split lines is sitting at rest inside the mask.
 */
const STATE = `(() => {
  const op = (sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(parseFloat(getComputedStyle(el).opacity) * 100) / 100 : null;
  };
  const legible = (n) => {
    const el = document.querySelector('[data-beat="' + n + '"]');
    if (!el) return false;
    if (parseFloat(getComputedStyle(el).opacity) < 0.05) return false;
    const lines = el.querySelectorAll('div > div');
    if (!lines.length) return parseFloat(getComputedStyle(el).opacity) > 0.05;
    for (const line of lines) {
      const m = new DOMMatrixReadOnly(getComputedStyle(line).transform);
      if (Math.abs(m.m42) < 2) return true;
    }
    return false;
  };
  const stage = document.querySelector('[data-readout-stage]');
  const pct = document.querySelector('[data-readout-pct]');
  return {
    beats: [1, 2, 3].map((n) => op('[data-beat="' + n + '"]')),
    legible: [1, 2, 3].map(legible),
    sheet: op('svg[data-sheet]'),
    photo: op('[data-photo]'),
    readout: stage ? stage.textContent : null,
    pct: pct ? parseInt(pct.textContent, 10) : null
  };
})()`;

/** The print head and the edge it is welded to, in stage percent. */
const HEAD = `(() => {
  const stage = document.querySelector('[data-stage]');
  const head = document.querySelector('[data-head]');
  const photo = document.querySelector('[data-photo]');
  const w = stage.getBoundingClientRect().width;
  const m = new DOMMatrixReadOnly(getComputedStyle(head).transform);
  return {
    x: Math.round((m.m41 / w) * 1000) / 10,
    opacity: Math.round(parseFloat(getComputedStyle(head).opacity) * 100) / 100,
    clipped: getComputedStyle(photo).clipPath.includes('inset'),
    photo: Math.round(parseFloat(getComputedStyle(photo).opacity) * 100) / 100
  };
})()`;

async function at(page, progress) {
  const box = await page.evaluate(() => {
    const el = document.getElementById("drawing");
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, h: el.offsetHeight, vh: window.innerHeight };
  });
  await page.evaluate((y) => {
    window.dispatchEvent(new CustomEvent("alma:scroll-lock"));
    window.scrollTo(0, y);
  }, box.top + (box.h - box.vh) * progress);
  // Long enough for scrub:1 to finish catching up.
  await sleep(2600);
}

const browser = await chromium.launch();

for (const vp of [
  { name: "390", width: 390, height: 844, wide: false },
  { name: "1440", width: 1440, height: 900, wide: true },
]) {
  console.log(`\n=== ${vp.name}px ===`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  /*
   * "load", not "networkidle": the intro gate below is the real
   * readiness wait, and networkidle hands any long-lived connection a
   * veto over the whole harness — observed as a dev-server next/image
   * request that stalls open forever and times every run out.
   */
  await page.goto(`${BASE_URL}/en`, { waitUntil: "load" });
  await page
    .waitForFunction(
      () => !document.documentElement.classList.contains("is-loading"),
      { timeout: 20000 },
    )
    .catch(() => errors.push("intro never cleared"));
  await sleep(1200);

  /* ---- line weight, at this width ---- */
  await at(page, 0.5);
  const w = await page.evaluate(WEIGHTS);
  check("cabinet line renders at 1.5px", Math.abs(w.line - 1.5) < 0.16, `${w.line}px`);
  check(
    "dimension line is lighter than the cabinet line",
    w.dim < w.line,
    `${w.dim}px vs ${w.line}px`,
  );
  check("annotation type renders near 11px", Math.abs(w.labelPx - 11) < 1.3, `${w.labelPx}px`);
  check(
    `sheet uses the ${vp.wide ? "desktop" : "handheld"} framing`,
    w.viewBoxX === (vp.wide ? SHEET.desktop.x : SHEET.handheld.x),
    `viewBox x ${w.viewBoxX}`,
  );

  /* ---- nothing drawn at the start ---- */
  await at(page, 0.005);
  const start = await page.evaluate(DRAWN);
  check("sheet starts blank", start.done === 0, `${start.done}/${start.total} complete`);

  /* ---- everything drawn by the approved beat ---- */
  await at(page, (STAGE.approved.at + STAGE.approved.dur * 0.5) / TIMELINE);
  const done = await page.evaluate(DRAWN);
  check(
    "every line is laid down by the approved beat",
    done.done === done.total,
    `${done.done}/${done.total} complete, ${done.part} partial`,
  );

  /* The readout is a plotter's job line: it reports THE PHASE's own
   * progress, so the centre of the approved window must read near 50 —
   * an overall counter would read near 64 here and the regression would
   * be invisible to the eye that already knows what it built. */
  const holdState = await page.evaluate(STATE);
  check(
    "readout counts the phase, not the section",
    holdState.pct !== null && Math.abs(holdState.pct - 50) <= 8,
    `${holdState.pct}% during ${holdState.readout}`,
  );

  /*
   * Read the numbers after a COLD jump — a fresh page landed straight in
   * the middle of the section, the way a deep link, a restored scroll
   * position or a hard flick arrives.
   *
   * The warm path above (this run has already scrolled to 0.5 and 0.005)
   * is not the same test and used to pass while the cold one produced a
   * fully drawn sheet dimensioned entirely in zeroes: the counters were
   * tween-driven, and a tween that gets SEEKED past rather than played
   * never runs its onUpdate. Both paths are checked now.
   */
  const cold = await ctx.newPage();
  await cold.goto(`${BASE_URL}/en`, { waitUntil: "load" });
  await cold
    .waitForFunction(
      () => !document.documentElement.classList.contains("is-loading"),
      { timeout: 20000 },
    )
    .catch(() => {});
  await sleep(1200);
  await at(cold, (STAGE.approved.at + STAGE.approved.dur * 0.5) / TIMELINE);
  const coldLabels = await cold.evaluate(LABELS);
  await cold.close();

  for (const [id, expected] of Object.entries(EXPECT)) {
    const got = coldLabels[id];
    if (!got || got.hidden) continue;
    const shown = got.shown.map(Number);
    check(
      `${id} is right after a cold jump`,
      shown.length === expected.length && shown.every((n, i) => n === expected[i]),
      `shows ${got.shown.join("/")}`,
    );
  }

  const labels = await page.evaluate(LABELS);
  for (const [id, expected] of Object.entries(EXPECT)) {
    const got = labels[id];
    if (!got) {
      check(`chain ${id} is present`, false, "missing from the sheet");
      continue;
    }
    if (got.hidden) {
      check(`chain ${id} is dropped on the handheld sheet`, !vp.wide, "hidden");
      continue;
    }
    const shown = got.shown.map(Number);
    check(
      `${id} counts to ${expected.join("/")}`,
      shown.length === expected.length &&
        shown.every((n, i) => n === expected[i]),
      `shows ${got.shown.join("/")}`,
    );
  }

  /* Never two beats at once, sampled right across the section — the
   * overlap this catches lived between two stage boundaries, so a single
   * probe at the hold walked straight past it. */
  for (const probe of [0.12, 0.25, 0.4, 0.55, 0.72, 0.86]) {
    await at(page, probe);
    const s = await page.evaluate(STATE);
    check(
      `at most one beat legible at ${probe}`,
      s.legible.filter(Boolean).length <= 1,
      JSON.stringify(s.legible),
    );
  }

  /* ---- the print ----
   * Probed dead centre of the sweep. The head must stand mid-viewport,
   * lit, with the photograph clipped in behind it — head and clip read
   * the same variable, so one number answers for both. */
  const sweepCentre =
    (STAGE.output.at + PRINT.sweep.at + PRINT.sweep.dur * 0.5) / TIMELINE;
  await at(page, sweepCentre);
  const mid = await page.evaluate(HEAD);
  check(
    "the head stands mid-sweep",
    mid.x > 40 && mid.x < 60 && mid.opacity > 0.6,
    `head at ${mid.x}%, opacity ${mid.opacity}`,
  );
  check(
    "reality prints in behind the head",
    mid.photo === 1 && mid.clipped,
    `photo opacity ${mid.photo}, clipped ${mid.clipped}`,
  );

  /* ---- the finale ----
   * Probed in the middle of the authored hold, not at an arbitrary 0.86:
   * the first version of this check sampled mid-transition and reported
   * a half-faded sheet as a failure of a state it had not reached yet.
   * The ghost holds from the end of the sweep to built.at + 0.7·dur —
   * probing at 0.625 of the built stage is safely inside the window
   * where "the drawing sits on top of reality" is the authored state. */
  const holdCentre = (STAGE.built.at + STAGE.built.dur * 0.625) / TIMELINE;
  await at(page, holdCentre);
  const ghost = await page.evaluate(STATE);
  check(
    "linework ghosts over the photograph",
    ghost.photo > 0.95 && ghost.sheet > 0.05 && ghost.sheet < GHOST_OPACITY * 1.6,
    `sheet ${ghost.sheet}, photo ${ghost.photo} at progress ${holdCentre.toFixed(3)}`,
  );

  await at(page, 1);
  const end = await page.evaluate(STATE);
  check(
    "finale lands on the photograph alone",
    end.photo > 0.95 && end.sheet < 0.02,
    `sheet ${end.sheet}, photo ${end.photo}`,
  );
  check("closing beat holds", end.beats[2] > 0.9, JSON.stringify(end.beats));
  check(
    "the job signs off at 100% built",
    end.pct === 100,
    `${end.pct}% at rest`,
  );

  /* ---- the machine unprints ----
   * Back to the top after the full plot has run. Scrub-driven
   * choreography claims reversibility for free; this is where the
   * claim is cashed: every stroke back at zero, the photograph
   * withdrawn behind its clip. */
  await at(page, 0.005);
  const rev = await page.evaluate(DRAWN);
  check(
    "scrolling back unprints the sheet",
    rev.done === 0,
    `${rev.done}/${rev.total} still complete`,
  );
  const revState = await page.evaluate(STATE);
  check(
    "scrolling back withdraws the photograph",
    revState.photo !== null && revState.photo < 0.05,
    `photo ${revState.photo}`,
  );

  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  }));
  check(
    "no horizontal overflow",
    overflow.scrollW <= overflow.winW,
    `${overflow.scrollW}/${overflow.winW}`,
  );
  check("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nall drawing checks passed");
process.exit(failures ? 1 : 0);
