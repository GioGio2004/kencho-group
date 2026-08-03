#!/usr/bin/env node
/**
 * Visual + behavioural verification of the kinetic layer.
 *
 *   node scripts/verify-kinetic.mjs [baseUrl]
 *
 * Drives a real Chromium, because the in-app preview pane runs hidden —
 * requestAnimationFrame never fires there, so every GSAP tween sits at
 * frame zero and any "it did not animate" reading is an artefact of the
 * harness rather than a fact about the page.
 *
 * Covers, at two viewports and in two locales:
 *   - WordMorph  — the four words start stacked and end scattered
 *   - Marquee    — the track is wider than the viewport and is moving
 *   - RevealText — the clip / stack / scatter variants reach their
 *                  finished state instead of stalling at the start one
 *   - ScrambleText — the label ends up as the string it started with
 *   - MagneticType — the wordmark is split, and a pointer displaces it
 *
 * Screenshots land in scripts/shots/kinetic-*.
 */

import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "shots");
const BASE = process.argv[2] ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];
const LOCALES = ["en", "ka"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * Evaluated by page.evaluate(), so each must be a self-invoking function —
 * a bare arrow serialises as a function object and yields undefined.
 */

/** Positions of the four morph words, to compare stacked against scattered. */
const MORPH_STATE = `(() => {
  const words = [...document.querySelectorAll('[data-morph-word]')];
  if (!words.length) return null;
  return words.map((w) => {
    const r = w.getBoundingClientRect();
    return { t: w.textContent, x: Math.round(r.left), y: Math.round(r.top) };
  });
})()`;

/** The marquee's geometry and current offset. */
const MARQUEE_STATE = `(() => {
  const host = document.querySelector('[data-marquee]');
  const track = host && host.querySelector('.marquee-track');
  if (!track) return null;
  const m = new DOMMatrixReadOnly(getComputedStyle(track).transform);
  return {
    copies: track.children.length,
    trackW: track.scrollWidth,
    hostW: host.offsetWidth,
    x: Math.round(m.m41),
    skew: Math.round(Math.atan2(m.b, m.a) * 1000) / 1000,
  };
})()`;

/** Finished-state probes for the three new RevealText variants. */
const VARIANT_STATE = `(() => {
  const read = (v) => {
    const el = document.querySelector('[data-reveal-variant="' + v + '"]');
    if (!el) return null;
    const line = el.firstElementChild;
    const leaves = [...el.querySelectorAll('div')].filter((d) => !d.children.length);
    return {
      clipPath: line ? getComputedStyle(line).clipPath : null,
      lineTransform: line ? getComputedStyle(line).transform : null,
      leaf: leaves[0]
        ? { t: leaves[0].textContent, tr: getComputedStyle(leaves[0]).transform, o: getComputedStyle(leaves[0]).opacity }
        : null,
    };
  };
  return { clip: read('clip'), stack: read('stack'), scatter: read('scatter') };
})()`;

/** Every scramble label, and whether it settled on its real string. */
const SCRAMBLE_STATE = `(() => {
  return [...document.querySelectorAll('[data-scramble]')].map((e) => ({
    text: e.textContent.trim(),
    lockedWidth: e.style.width || null,
  }));
})()`;

/** The magnetic wordmark's split, and where its letters currently sit. */
const MAGNET_STATE = `(() => {
  const el = document.querySelector('[data-magnetic]');
  if (!el) return null;
  const parts = [...el.children];
  return {
    unit: el.dataset.magnetic,
    parts: parts.length,
    offsets: parts.map((p) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
      return [Math.round(m.m41), Math.round(m.m42)];
    }),
  };
})()`;

/** Scrolls to an absolute offset through Lenis's own wheel path. */
async function scrollTo(page, y) {
  await page.evaluate((target) => {
    window.dispatchEvent(new CustomEvent("alma:scroll-lock"));
    window.scrollTo(0, target);
  }, y);
  await sleep(700);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("alma:scroll-unlock")));
  await sleep(500);
}

async function run(browser, locale, viewport) {
  const label = `${locale}-${viewport.name}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle" });

  // The intro holds the scroll; nothing below is measurable until it lets go.
  await page
    .waitForFunction(
      () => !document.documentElement.classList.contains("is-loading"),
      { timeout: 20000 },
    )
    .catch(() => errors.push("intro overlay never cleared"));
  await sleep(1200);

  const report = { label, errors };

  /* ---- WordMorph: stacked at the top of its section, scattered later ---- */
  const section = await page.$("[data-morph-section]");
  if (!section) {
    report.morph = "MISSING";
  } else {
    const box = await page.evaluate(() => {
      const el = document.querySelector("[data-morph-section]");
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: el.offsetHeight };
    });

    await scrollTo(page, box.top);
    const stacked = await page.evaluate(MORPH_STATE);
    await page.screenshot({ path: path.join(OUT, `kinetic-morph-a-${label}.png`) });

    await scrollTo(page, box.top + box.height * 0.5);
    const scattered = await page.evaluate(MORPH_STATE);
    await page.screenshot({ path: path.join(OUT, `kinetic-morph-b-${label}.png`) });

    const spread = (s) =>
      s ? Math.max(...s.map((w) => w.x)) - Math.min(...s.map((w) => w.x)) : 0;
    report.morph = {
      stackedXSpread: spread(stacked),
      scatteredXSpread: spread(scattered),
      moved: spread(scattered) - spread(stacked),
    };
  }

  /* ---- Marquee: measured twice, to prove the track is actually moving ---- */
  const band = await page.evaluate(() => {
    const el = document.querySelector("[data-marquee]");
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  });
  if (band == null) {
    report.marquee = "MISSING";
  } else {
    await scrollTo(page, band - viewport.height * 0.4);
    const first = await page.evaluate(MARQUEE_STATE);
    await sleep(900);
    const second = await page.evaluate(MARQUEE_STATE);
    await page.screenshot({ path: path.join(OUT, `kinetic-marquee-${label}.png`) });
    report.marquee = { ...first, movedBy: second.x - first.x };
  }

  /* ---- The three new RevealText variants, at their finished states ---- */
  for (const variant of ["clip", "stack"]) {
    const top = await page.evaluate((v) => {
      const el = document.querySelector('[data-reveal-variant="' + v + '"]');
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    }, variant);
    if (top == null) continue;
    await scrollTo(page, top - viewport.height * 0.35);
    await sleep(1600);
    const state = await page.evaluate(VARIANT_STATE);
    report[variant] = state[variant];
    await page.screenshot({ path: path.join(OUT, `kinetic-${variant}-${label}.png`) });
  }

  /* Scatter is a departure: read it with the block well past the viewport. */
  const scatTop = await page.evaluate(() => {
    const el = document.querySelector('[data-reveal-variant="scatter"]');
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  });
  if (scatTop != null) {
    await scrollTo(page, scatTop - viewport.height * 0.9);
    const before = await page.evaluate(VARIANT_STATE);
    await scrollTo(page, scatTop + viewport.height * 0.2);
    const after = await page.evaluate(VARIANT_STATE);
    report.scatter = { before: before.scatter?.leaf, after: after.scatter?.leaf };
    await page.screenshot({ path: path.join(OUT, `kinetic-scatter-${label}.png`) });
  }

  report.scramble = await page.evaluate(SCRAMBLE_STATE);

  /* ---- MagneticType: park the pointer on the wordmark and re-measure ---- */
  const mark = await page.$("[data-magnetic]");
  if (!mark) {
    report.magnetic = "MISSING";
  } else {
    await page.evaluate(() => {
      document.querySelector("[data-magnetic]").scrollIntoView({ block: "center" });
    });
    await sleep(900);
    const rest = await page.evaluate(MAGNET_STATE);
    const box = await mark.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await sleep(1400);
    }
    const pushed = await page.evaluate(MAGNET_STATE);
    const spread = (s) =>
      s ? s.offsets.reduce((a, [x, y]) => a + Math.abs(x) + Math.abs(y), 0) : 0;
    report.magnetic = {
      unit: rest?.unit,
      parts: rest?.parts,
      restDisplacement: spread(rest),
      pushedDisplacement: spread(pushed),
    };
    await page.screenshot({ path: path.join(OUT, `kinetic-wordmark-${label}.png`) });
  }

  /* Horizontal overflow is the classic cost of a poster-scale wordmark. */
  report.overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  }));

  await context.close();
  return report;
}

const browser = await chromium.launch();
await fs.mkdir(OUT, { recursive: true });

const reports = [];
for (const locale of LOCALES) {
  for (const viewport of VIEWPORTS) {
    reports.push(await run(browser, locale, viewport));
  }
}
await browser.close();

console.log(JSON.stringify(reports, null, 1));
