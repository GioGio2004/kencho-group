#!/usr/bin/env node
/**
 * Behavioural verification of the journey rail.
 *
 *   node scripts/verify-rail.mjs [baseUrl]
 *
 * Real Chromium, because the in-app preview pane runs hidden and never
 * fires requestAnimationFrame — every ScrollTrigger there sits at its
 * initial state, so nothing about a scroll-driven component can be read
 * from it. Checks the four things that would each break the rail in a way
 * that still looks fine in a screenshot:
 *
 *   - it is absent on phones and present on desktop
 *   - it stays out of the way of the opening shot and arrives after it
 *   - aria-current follows the section that owns the viewport, and there
 *     is never more than one
 *   - the spent-scroll fill tracks the document, including through the
 *     pinned hero, where a stop-counted bar would sit frozen
 *
 * Plus the reduced-motion path, where the rail must be present from the
 * first frame rather than waiting for a reveal that never plays.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RAIL = "[data-journey-rail]";

/** Which stop is announced as current, and how many claim to be. */
const ACTIVE = `(() => {
  const ticks = [...document.querySelectorAll('[data-rail-tick]')];
  const on = ticks.filter(t => t.getAttribute('aria-current') === 'true');
  return {
    count: on.length,
    href: on[0] ? on[0].getAttribute('href') : null,
    total: ticks.length,
  };
})()`;

/** Rail visibility and the fill's current scale. */
const STATE = `(() => {
  const rail = document.querySelector('${RAIL}');
  if (!rail) return null;
  const fill = rail.querySelector('[data-rail-fill]');
  const cs = getComputedStyle(rail);
  const m = fill ? new DOMMatrixReadOnly(getComputedStyle(fill).transform) : null;
  return {
    display: cs.display,
    opacity: Math.round(parseFloat(cs.opacity) * 100) / 100,
    visibility: cs.visibility,
    blend: cs.mixBlendMode,
    fillScaleY: m ? Math.round(m.d * 1000) / 1000 : null,
  };
})()`;

async function settle(page, y) {
  await page.evaluate((target) => {
    window.dispatchEvent(new CustomEvent("alma:scroll-lock"));
    window.scrollTo(0, target);
  }, y);
  await sleep(900);
}

/**
 * Parks the middle of the viewport inside a section and waits for the
 * page to stop moving under it.
 *
 * The re-target is not politeness — below-the-fold images decode after
 * the jump lands, the document grows above the viewport, and the section
 * that was under the middle slides out from under it. Measuring once and
 * asserting immediately reads a page that is still settling and blames
 * the component: this loop is what separates "the rail is wrong" from
 * "the rail had not been told yet".
 */
async function parkOn(page, id) {
  let landed = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const y = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return (
        r.top +
        window.scrollY +
        Math.min(el.offsetHeight, window.innerHeight) / 2 -
        window.innerHeight / 2
      );
    }, id);
    if (y == null) return null;
    await settle(page, y);
    const now = await page.evaluate(() => window.scrollY);
    if (landed != null && Math.abs(now - landed) < 2) break;
    landed = now;
  }
  return landed;
}

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch();

/* ---- desktop ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  await page
    .waitForFunction(() => !document.documentElement.classList.contains("is-loading"), { timeout: 20000 })
    .catch(() => errors.push("intro never cleared"));
  await sleep(1200);

  const top = await page.evaluate(STATE);
  check("rail is rendered on desktop", top && top.display !== "none", JSON.stringify(top));
  check("rail is held back over the opening shot", top && top.opacity < 0.05, `opacity ${top?.opacity}`);
  check("rail uses difference blending", top?.blend === "difference", top?.blend);

  const docH = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  // Past the hero: the rail should have arrived.
  const heroBottom = await page.evaluate(() => {
    const h = document.getElementById("hero");
    return h.getBoundingClientRect().bottom + window.scrollY;
  });
  await settle(page, heroBottom);
  const shown = await page.evaluate(STATE);
  check("rail arrives once the hero is walked", shown.opacity > 0.9, `opacity ${shown.opacity}`);

  // aria-current tracks the section under the middle of the viewport.
  for (const id of ["manifesto", "transformation", "projects", "services", "process", "contact"]) {
    if ((await parkOn(page, id)) == null) continue;
    const a = await page.evaluate(ACTIVE);
    check(`aria-current follows #${id}`, a.href === `#${id}`, `got ${a.href}`);
    check(`exactly one stop is current at #${id}`, a.count === 1, `${a.count} claimed`);
  }

  // The fill has to grow monotonically with the document, pinned hero included.
  const marks = [];
  for (const frac of [0.1, 0.35, 0.6, 0.9]) {
    await settle(page, docH * frac);
    const s = await page.evaluate(STATE);
    marks.push({ frac, fill: s.fillScaleY });
  }
  check(
    "fill tracks the document monotonically",
    marks.every((m, i) => i === 0 || m.fill > marks[i - 1].fill),
    marks.map((m) => `${m.frac}→${m.fill}`).join("  "),
  );
  // Not just "low then high": the fill has to still have room left at 90%
  // of the document. A bar that reads full while a whole section is still
  // below the fold is the exact symptom of a progress readout measured off
  // a stale trigger end — which is how the rail used to freeze on the last
  // stretch of the page.
  check("fill roughly matches the document position",
    marks.every((m) => Math.abs(m.fill - m.frac) < 0.06),
    marks.map((m) => `${m.frac}→${m.fill}`).join("  "));
  check("fill still has room at 90%", marks[marks.length - 1].fill < 0.98,
    String(marks[marks.length - 1].fill));

  check("no console errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---- phone ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  await sleep(1500);
  const s = await page.evaluate(STATE);
  check("rail is absent on phones", s?.display === "none", `display ${s?.display}`);
  await ctx.close();
}

/* ---- reduced motion ---- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  await sleep(1800);
  const s = await page.evaluate(STATE);
  check("rail is present from the first frame under reduced motion",
    s && s.opacity > 0.9 && s.visibility !== "hidden", JSON.stringify(s));
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nall rail checks passed");
process.exit(failures ? 1 : 0);
