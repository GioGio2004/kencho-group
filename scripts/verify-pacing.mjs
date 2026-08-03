#!/usr/bin/env node
/**
 * Pure-function checks on the scrub pacing math in lib/motion.ts.
 *
 *   node scripts/verify-pacing.mjs
 *
 * lingerStops sits under the hero's frame playhead, so a bug here is a
 * bug in the site's flagship shot — and it is the kind that looks like
 * "the walkthrough feels slightly off" rather than like an error. These
 * assert the three properties the remap has to hold, which is cheaper and
 * far more conclusive than eyeballing frames:
 *
 *   1. endpoints pinned      f(0) = 0 and f(1) = 1
 *   2. boundaries pinned     every beat window's ends map to themselves,
 *                            so re-pacing never re-times the story
 *   3. strictly monotone     scrolling back retraces the same frames;
 *                            a non-monotone remap would run the walk
 *                            briefly backwards mid-scroll
 *
 * Imported straight from the TypeScript source (Node 24 strips types), so
 * this tests the shipped function rather than a copy of it.
 */

import { lingerEase, lingerStops, smoothstep, LINGER } from "../lib/motion.ts";
import { WALKTHROUGH_STOPS } from "../lib/walkthrough.ts";

let failures = 0;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/* ---- smoothstep ---- */
check("smoothstep pins 0 and 1", near(smoothstep(0), 0) && near(smoothstep(1), 1));
check("smoothstep is symmetric about 0.5", near(smoothstep(0.5), 0.5));
check("smoothstep clamps out of range", smoothstep(-3) === 0 && smoothstep(3) === 1);

/* ---- lingerEase ---- */
for (const amount of [0, 0.16, 0.3, 0.45, 1]) {
  check(
    `lingerEase(${amount}) pins both ends`,
    near(lingerEase(0, amount), 0) && near(lingerEase(1, amount), 1),
  );
}
check("lingerEase(0) is the identity", [0.1, 0.37, 0.62, 0.9].every((x) => near(lingerEase(x, 0), x)));
check("lingerEase holds the midpoint", [0.16, 0.45, 1].every((a) => near(lingerEase(0.5, a), 0.5)));

// The whole point: the middle is slower than the edges.
const rate = (a, x, h = 1e-4) => (lingerEase(x + h, a) - lingerEase(x - h, a)) / (2 * h);
check(
  "lingerEase slows the middle and quickens the edges",
  rate(LINGER.read, 0.5) < 0.7 && rate(LINGER.read, 0.02) > 1.5,
  `mid ${rate(LINGER.read, 0.5).toFixed(3)}x, edge ${rate(LINGER.read, 0.02).toFixed(3)}x`,
);

/* ---- lingerStops, against the hero's real beat windows ---- */
const stops = WALKTHROUGH_STOPS;
console.log(`\nhero stops: ${stops.map((s) => `${s.in}-${s.out}@${s.linger ?? 0}`).join("  ")}\n`);

check("stops are ordered and non-overlapping",
  stops.every((s, i) => s.out > s.in && (i === 0 || s.in >= stops[i - 1].out)));

check("lingerStops pins the scrub ends",
  near(lingerStops(0, stops), 0) && near(lingerStops(1, stops), 1));

for (const s of stops) {
  check(
    `beat boundary ${s.in}/${s.out} maps to itself`,
    near(lingerStops(s.in, stops), s.in, 1e-9) && near(lingerStops(s.out, stops), s.out, 1e-9),
    `${lingerStops(s.in, stops).toFixed(6)} / ${lingerStops(s.out, stops).toFixed(6)}`,
  );
}

// Monotonicity across the whole span, at frame resolution for a 350vh scrub.
let prev = -1, worst = Infinity, worstAt = 0;
for (let i = 0; i <= 20000; i++) {
  const x = i / 20000;
  const y = lingerStops(x, stops);
  const d = y - prev;
  if (d < worst) { worst = d; worstAt = x; }
  prev = y;
}
check("lingerStops is strictly monotone", worst > 0,
  `smallest step ${worst.toExponential(2)} at x=${worstAt.toFixed(4)}`);

// The empty stretch must stay untouched — it is the only part of the walk
// that is meant to run at full speed.
check("the empty stretch passes through unpaced",
  [0.78, 0.85, 0.92].every((x) => near(lingerStops(x, stops), x)));

console.log(failures ? `\n${failures} FAILED` : "\nall pacing checks passed");
process.exit(failures ? 1 : 0);
