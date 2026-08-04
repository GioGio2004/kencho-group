#!/usr/bin/env node
/**
 * The drawing chapter: contrast in BOTH themes, and the chapter flip.
 *
 *   node --import ./scripts/alias-hook.mjs scripts/verify-dark.mjs [baseUrl]
 *
 * Two things the eye is bad at judging from a screenshot:
 *
 *   1. WCAG contrast. Every colour on the sheet is computed from the
 *      tokens as they actually resolve in the browser and checked
 *      against AA, so "bone on charcoal looks fine" becomes a number.
 *
 *      Run TWICE now, once per theme. The sheet used to be charcoal
 *      whatever the page was, so one measurement covered it; since the
 *      theme split it is ink-on-paper in light and bone-on-charcoal in
 *      dark, and a token set that passes on one surface tells you
 *      nothing about the other. Both are the shipped product.
 *
 *   2. Flicker at the boundary. The `data-chapter` flip is what retints
 *      the header's frosted backdrop, and a naive threshold strobes when
 *      the visitor scrubs across it. This scrolls the boundary back and
 *      forth forty times and counts the flips — with hysteresis it
 *      should be one per crossing and never more.
 */

import { chromium } from "playwright";
import { STAGE, TIMELINE } from "../lib/drawing.ts";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
/** Which theme this run measures. Both ship, so both are checked. */
const THEME = process.argv[3] === "dark" ? "dark" : "light";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/** Resolves the section's tokens and computes AA contrast for each pair. */
const CONTRAST = `(() => {
  const el = document.documentElement;
  const cs = getComputedStyle(el);
  const v = (n) => cs.getPropertyValue(n).trim();

  /*
   * Chromium serialises a computed colour TWO ways, and the difference
   * is silent: rgba() comes back as "rgb(237, 230, 218 / 0.62)" in
   * 0-255 channels, but anything that went through color-mix() comes
   * back as "color(srgb 0.929412 0.901961 0.854902 / 0.62)" in 0-1
   * floats. Scraping numbers and assuming 0-255 makes every tokenised
   * colour compute as near-black, every contrast ratio as ~1.0, and
   * every check here fail without a pixel changing. Verified in this
   * project's own Chromium before the tokens were converted.
   */
  const parse = (c) => {
    const probe = document.createElement('span');
    probe.style.color = c;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const m = (computed.match(/[\\d.]+/g) || []).map(Number);
    const unit = computed.startsWith('color(') ? 255 : 1;
    return {
      r: m[0] * unit, g: m[1] * unit, b: m[2] * unit,
      a: m.length > 3 ? m[3] : 1
    };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1
  });
  const lum = (c) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
  };

  const bg = parse(v('--dwg-bg'));
  const pairs = {
    bone: v('--dwg-bone'),
    boneSoft: v('--dwg-bone-soft'),
    boneDim: v('--dwg-bone-dim'),
    gold: v('--dwg-gold')
  };
  const out = {};
  for (const [k, c] of Object.entries(pairs)) out[k] = ratio(over(parse(c), bg), bg);
  out._bg = v('--dwg-bg');
  return out;
})()`;

console.log(`\n=== ${THEME} theme ===`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: THEME,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

/*
 * Seeded before the document runs, so the boot script in layout.tsx
 * reads it and stamps `data-theme` on the very first frame. Setting it
 * afterwards would measure whatever the OS said and call it a pass.
 */
await page.addInitScript(
  ([key, theme]) => {
    try {
      localStorage.setItem(key, theme);
    } catch {}
  },
  ["alma:theme", THEME],
);

await page.goto(`${BASE_URL}/en`, { waitUntil: "networkidle" });
await page
  .waitForFunction(
    () => !document.documentElement.classList.contains("is-loading"),
    { timeout: 20000 },
  )
  .catch(() => errors.push("intro never cleared"));
await sleep(1200);

const box = await page.evaluate(() => {
  const el = document.getElementById("drawing");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, h: el.offsetHeight, vh: window.innerHeight };
});

const go = async (y, wait = 700) => {
  await page.evaluate((t) => {
    window.dispatchEvent(new CustomEvent("alma:scroll-lock"));
    window.scrollTo(0, t);
  }, y);
  await sleep(wait);
};

/* ---- contrast, measured inside the section ---- */
await go(box.top + (box.h - box.vh) * 0.4, 2200);
const c = await page.evaluate(CONTRAST);
console.log(`\nsurface ${c._bg}`);
check("linework/heading bone passes AA", c.bone >= 4.5, `${c.bone}:1`);
check("body bone passes AA", c.boneSoft >= 4.5, `${c.boneSoft}:1`);
check("dim labels pass AA", c.boneDim >= 4.5, `${c.boneDim}:1`);
check("gold passes AA on charcoal", c.gold >= 4.5, `${c.gold}:1`);

/* ---- the surface flip, scrubbed hard across both boundaries ---- */
for (const [name, centre] of [
  ["entry", box.top],
  ["exit", box.top + box.h - box.vh],
]) {
  await page.evaluate(() => {
    window.__flips = 0;
    window.__last = document.documentElement.getAttribute("data-chapter");
    window.__obs = new MutationObserver(() => {
      const now = document.documentElement.getAttribute("data-chapter");
      if (now !== window.__last) {
        window.__last = now;
        window.__flips++;
      }
    });
    window.__obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-chapter"],
    });
  });

  // Twenty crossings, each a hard jump either side of the boundary.
  for (let i = 0; i < 20; i++) {
    await go(centre - box.vh * 0.55, 60);
    await go(centre + box.vh * 0.55, 60);
  }
  await sleep(600);

  const flips = await page.evaluate(() => {
    window.__obs.disconnect();
    return window.__flips;
  });
  // Twenty crossings each way is forty legitimate flips; anything much
  // above that is the threshold dithering rather than the visitor moving.
  check(`${name} boundary flips once per crossing`, flips <= 44, `${flips} flips in 40 crossings`);
}

/* ---- the surface is off outside the section, on inside, off at the
       finale (where a bright photograph is behind the fixed pills) ---- */
const probe = async (label, y, expected) => {
  await go(y, 2400);
  const got = await page.evaluate(() =>
    document.documentElement.getAttribute("data-chapter"),
  );
  check(`surface is ${expected ?? "off"} at ${label}`, got === expected, String(got));
};

const range = box.h - box.vh;
await probe("the approach", box.top - box.vh * 0.7, null);
await probe("the sheet", box.top + range * 0.45, "drawing");
await probe(
  "the finale",
  box.top + range * ((STAGE.built.at + STAGE.built.dur * 0.6) / TIMELINE),
  null,
);
await probe("after the section", box.top + box.h + box.vh * 0.3, null);

check("no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nall dark-surface checks passed");
process.exit(failures ? 1 : 0);
