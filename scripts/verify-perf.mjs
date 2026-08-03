#!/usr/bin/env node
/**
 * Scroll the whole page under CPU throttle and find where frames die.
 *
 *   node scripts/verify-perf.mjs [baseUrl] [throttleRate]
 *
 * Chrome's tracing gives frame timings, but attributing them to a SECTION
 * is the part that matters — "the page drops frames" is not actionable,
 * "the masonry drops frames" is. So this scrolls in fixed steps, records
 * rAF deltas within each step, and maps every step to whichever section
 * owns the middle of the viewport at that moment.
 *
 * Reported per section: frames sampled, median and worst frame time, and
 * the share of frames over 32ms (two missed frames at 60Hz, which is
 * where stutter becomes visible rather than merely measurable).
 */

import { chromium } from "playwright";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const RATE = Number(process.argv[3] ?? 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SECTION_IDS = [
  "hero", "manifesto", "kinetic", "transformation", "projects",
  "drawing", "services", "showcase", "process", "faq", "contact",
];

/** One scroll pass at a given throttle, returning per-section frame times. */
async function pass(rate) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);

  await page.goto(`${BASE_URL}/en`, { waitUntil: "networkidle" });
  await page
    .waitForFunction(
      () => !document.documentElement.classList.contains("is-loading"),
      { timeout: 20000 },
    )
    .catch(() => {});
  await sleep(1500);

  // Throttle only for the scroll. Throttling the load just makes the
  // intro take longer and tells us nothing about scrolling.
  if (rate > 1) await client.send("Emulation.setCPUThrottlingRate", { rate });
  await sleep(400);

  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__frames.push([
        Math.round(window.scrollY),
        Math.round((now - last) * 100) / 100,
      ]);
      last = now;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });

  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

  // Real wheel events, so Lenis drives the scroll the way a visitor does.
  // Small steps and a short dwell: enough samples per section that a p95
  // is a percentile rather than "the second-worst of nine frames".
  const STEP = 140;
  for (let y = 0; y < max; y += STEP) {
    await page.mouse.wheel(0, STEP);
    await sleep(60);
  }
  await sleep(800);

  const { frames, sections } = await page.evaluate((ids) => {
    cancelAnimationFrame(window.__raf);
    const sections = ids
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { id, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
      })
      .filter(Boolean);
    return { frames: window.__frames, sections };
  }, SECTION_IDS);

  if (rate > 1) await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();

  /* Attribute each frame to whichever section owns the viewport middle. */
  const buckets = new Map();
  for (const [y, dt] of frames) {
    const mid = y + 450;
    const hit = sections.find((s) => mid >= s.top && mid < s.bottom);
    const key = hit ? hit.id : "(between)";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(dt);
  }
  return { buckets, total: frames.length };
}

const stat = (deltas) => {
  const sorted = [...deltas].sort((a, b) => a - b);
  return {
    n: deltas.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    // A hitch, not a missed frame. At 4x throttle every frame misses;
    // what a visitor actually perceives is the page stopping, and 100ms
    // is where "smooth but slow" becomes "it stuck".
    hitches: deltas.filter((d) => d > 100).length,
  };
};

const browser = await chromium.launch();
console.log("baseline pass (1x)…");
const base = await pass(1);
console.log(`throttled pass (${RATE}x)…`);
const hot = await pass(RATE);
await browser.close();

const rows = [];
for (const [id, deltas] of hot.buckets) {
  if (deltas.length < 20) continue;
  const t = stat(deltas);
  const b = base.buckets.get(id);
  const bs = b && b.length >= 20 ? stat(b) : null;
  rows.push({
    id,
    ...t,
    baseMedian: bs ? bs.median : null,
    // How much worse this section gets under load, relative to how much
    // worse the page gets overall. Above 1 means the section itself is
    // the cost, not the throttle.
    cost: bs ? Math.round((t.median / bs.median) * 100) / 100 : null,
    hitchRate: t.hitches / t.n,
  });
}

rows.sort((a, b) => b.hitchRate - a.hitchRate || (b.cost ?? 0) - (a.cost ?? 0));

console.log(`\nCPU throttle ${RATE}x · ${hot.total} frames throttled, ${base.total} baseline\n`);
console.log(
  "section".padEnd(16) +
    "frames".padStart(7) +
    "1x med".padStart(9) +
    `${RATE}x med`.padStart(9) +
    "p95".padStart(9) +
    "cost".padStart(7) +
    "hitches".padStart(9),
);
for (const r of rows) {
  console.log(
    r.id.padEnd(16) +
      String(r.n).padStart(7) +
      `${r.baseMedian ?? "—"}ms`.padStart(9) +
      `${r.median}ms`.padStart(9) +
      `${r.p95}ms`.padStart(9) +
      `${r.cost ?? "—"}x`.padStart(7) +
      `${r.hitches} (${(r.hitchRate * 100).toFixed(1)}%)`.padStart(9),
  );
}
const worst = rows[0];
if (worst) {
  console.log(
    `\nworst section: ${worst.id} — ${worst.hitches} hitches over 100ms in ${worst.n} frames ` +
      `(${(worst.hitchRate * 100).toFixed(1)}%), p95 ${worst.p95}ms, ${worst.cost}x the unthrottled median`,
  );
}
