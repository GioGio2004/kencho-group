#!/usr/bin/env node
/**
 * Visual + behavioural verification of the scroll-scrubbed hero.
 *
 *   node scripts/verify-hero.mjs [baseUrl]
 *
 * Drives a real Chromium (frames composite, rAF fires — unlike the
 * in-app preview pane), scrolls the pinned hero at 0/25/50/75/100%, and
 * at each stop records a screenshot plus:
 *   - a hash of the canvas pixels, to prove frames actually advance
 *   - which narrative beat is visible, to prove the story fires
 * Screenshots land in scripts/shots/.
 */

import { chromium, devices } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts", "shots");
const BASE = process.argv[2] ?? "http://localhost:3005";
const LOCALE = "ka";
const STOPS = [0, 0.25, 0.5, 0.75, 1];

const VIEWPORTS = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "1440", width: 1440, height: 900, mobile: false },
];

/*
 * These are evaluated as expressions by page.evaluate(), so each must be
 * a self-invoking function — a bare arrow would just serialise as a
 * function object and yield undefined.
 */

/** Cheap perceptual fingerprint of the canvas contents. */
const CANVAS_HASH = `(() => {
  const c = document.querySelector('#hero canvas');
  if (!c) return null;
  const g = c.getContext('2d');
  if (!g) return null;
  const w = c.width, h = c.height;
  if (!w || !h) return null;
  let acc = '';
  // Sample a small grid — enough to detect a frame change, cheap to run.
  for (const fy of [0.25, 0.5, 0.75]) {
    for (const fx of [0.25, 0.5, 0.75]) {
      const d = g.getImageData(Math.floor(w*fx), Math.floor(h*fy), 1, 1).data;
      acc += d[0] + ',' + d[1] + ',' + d[2] + '|';
    }
  }
  return acc;
})()`;

const BEAT_STATE = `(() => {
  const out = {};
  for (const name of ['welcome','headline','craft','cue']) {
    const el = document.querySelector('[data-beat="' + name + '"]');
    out[name] = el ? Number(getComputedStyle(el).opacity).toFixed(2) : 'missing';
  }
  const fill = document.querySelector('[data-hero-progress]');
  out.progress = fill ? getComputedStyle(fill).transform : 'missing';
  const poster = document.querySelector('[data-hero-poster]');
  out.posterOpacity = poster ? Number(getComputedStyle(poster).opacity).toFixed(2) : 'missing';
  return out;
})()`;

async function runViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    ...(vp.mobile ? devices["iPhone 13"].userAgent
      ? { userAgent: devices["iPhone 13"].userAgent, hasTouch: true, isMobile: true }
      : {} : {}),
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 200)));

  await page.goto(`${BASE}/${LOCALE}`, { waitUntil: "networkidle", timeout: 60000 });

  // Skip the type intro so the walkthrough is what we measure.
  await page.mouse.wheel(0, 10);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900); // let frames stream + ScrollTrigger settle

  const heroScroll = await page.evaluate(() => {
    const hero = document.querySelector("#hero");
    if (!hero) return null;
    // Pinned distance lives between the hero's top and the next section.
    return {
      docHeight: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
      heroTop: hero.getBoundingClientRect().top + window.scrollY,
    };
  });

  const results = [];
  for (const stop of STOPS) {
    // The pin consumes ~350vh after the hero's top.
    const target = heroScroll
      ? heroScroll.heroTop + stop * (3.5 * heroScroll.viewport)
      : stop * 1000;
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await page.waitForTimeout(700); // scrub:1 needs catch-up time

    const hash = await page.evaluate(CANVAS_HASH);
    const beats = (await page.evaluate(BEAT_STATE)) ?? {};
    const file = path.join(OUT, `hero-${vp.name}-${Math.round(stop * 100)}.png`);
    await page.screenshot({ path: file });
    results.push({ stop, hash, beats, file: path.relative(ROOT, file) });
  }

  await context.close();
  return { viewport: vp.name, results, errors };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  for (const vp of VIEWPORTS) {
    report.push(await runViewport(browser, vp));
  }
  await browser.close();

  for (const r of report) {
    console.log(`\n=== ${r.viewport}px ===`);
    const hashes = r.results.map((x) => x.hash);
    const distinct = new Set(hashes.filter(Boolean)).size;
    console.log(
      `frames advance: ${distinct} distinct canvas states across ${hashes.length} stops` +
        (distinct >= 3 ? "  ✓" : "  ✗ FRAMES NOT ADVANCING"),
    );
    for (const s of r.results) {
      const visible = Object.entries(s.beats)
        .filter(([k, v]) => !["progress", "posterOpacity"].includes(k) && Number(v) > 0.05)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      console.log(
        `  ${String(Math.round(s.stop * 100)).padStart(3)}%  beats[${visible || "none"}]  poster=${s.beats.posterOpacity}  → ${s.file}`,
      );
    }
    if (r.errors.length) {
      console.log(`  console errors (${r.errors.length}):`);
      for (const e of [...new Set(r.errors)].slice(0, 5)) console.log(`    ${e}`);
    } else {
      console.log("  console: clean");
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error("verify-hero failed:", e.message);
  process.exit(1);
});
