/* Verifies the prologue's full animated path in real Chromium:
 * intro release → arrival → pinned scrub (title in, veil) → release
 * into the manifesto, plus the skip anchor. Screenshots each stage. */
import { chromium } from "playwright";

const BASE = "http://localhost:3100/en";
const OUT =
  "C:/Users/khvic/AppData/Local/Temp/claude/C--Users-khvic-Desktop-kenchogroup-admin/44d95b0e-e4e8-4a58-82e3-fee31156fcf2/scratchpad";

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: "networkidle" });

/* 1. The preloader must release on its own (hardCap 3.5s). */
await page.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
check("preloader releases (is-loading removed)", true);

/* 2. Arrival: line, place, skip and cue faded in. */
await page.waitForTimeout(2600);
/* Visibility AND opacity — an autoAlpha collision once left the line at
 * opacity 1 with visibility:hidden, and an opacity-only check passed. */
const rest = await page.evaluate(() => {
  const probe = (sel) => {
    const s = getComputedStyle(document.querySelector(sel));
    return { o: s.opacity, v: s.visibility };
  };
  return {
    line: probe(".pro-line-text"),
    parent: probe("[data-pro-line]"),
    skip: probe("[data-pro-skip]"),
    titleVis: getComputedStyle(document.querySelector(".pro-title-main")).visibility,
    scrollY: window.scrollY,
  };
});
const vis = (p) => p.v !== "hidden" && parseFloat(p.o) > 0.95;
check("line visible after arrival", vis(rest.line) && vis(rest.parent), JSON.stringify(rest.line));
check("skip pill visible", vis(rest.skip), JSON.stringify(rest.skip));
check("title hidden at rest (storyline not yet told)", rest.titleVis === "hidden");
await page.screenshot({ path: `${OUT}/prologue-1-rest.png` });

/* 3. Scroll INTO the pin with real wheel events (Lenis path) — a
 * controlled walk to ~55% progress so the title stage is captured. */
for (let i = 0; i < 11; i++) {
  await page.mouse.wheel(0, 90);
  await page.waitForTimeout(90);
}
await page.waitForTimeout(1600);
const mid = await page.evaluate(() => ({
  scrollY: window.scrollY,
  title: getComputedStyle(document.querySelector(".pro-title-main")).opacity,
  titleVis: getComputedStyle(document.querySelector(".pro-title-main")).visibility,
  /* The scrub hides the line's PARENT wrapper — read that, not the child. */
  line: getComputedStyle(document.querySelector("[data-pro-line]")).opacity,
  dim: getComputedStyle(document.querySelector("[data-pro-dim]")).opacity,
}));
check(
  "title risen mid-pin",
  mid.titleVis === "visible" && parseFloat(mid.title) > 0.5,
  `opacity ${mid.title} @ scrollY ${mid.scrollY}`,
);
check("line stepped aside mid-pin", parseFloat(mid.line) < 0.3, `opacity ${mid.line}`);
check("shot dimmed under title", parseFloat(mid.dim) > 0.2, `dim ${mid.dim}`);
await page.screenshot({ path: `${OUT}/prologue-2-title.png` });

/* 4. Through the veil and out into the manifesto. */
for (let i = 0; i < 20; i++) {
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1200);
const out = await page.evaluate(() => {
  const veil = document.querySelector("[data-pro-veil]");
  const manifesto = document.getElementById("manifesto");
  return {
    veil: getComputedStyle(veil).opacity,
    manifestoTop: manifesto.getBoundingClientRect().top,
    scrollY: window.scrollY,
  };
});
check("veil raised by pin end", parseFloat(out.veil) > 0.8, `opacity ${out.veil}`);
check(
  "manifesto reached after release",
  out.manifestoTop < 900,
  `top ${Math.round(out.manifestoTop)}`,
);
await page.screenshot({ path: `${OUT}/prologue-3-handoff.png` });

/* 5. The SKIP anchor from a fresh load glides past the pin. */
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
await page.waitForTimeout(1200);
await page.click("[data-pro-skip]");
await page.waitForTimeout(2200);
const skipped = await page.evaluate(() => ({
  scrollY: window.scrollY,
  manifestoTop: document.getElementById("manifesto").getBoundingClientRect().top,
}));
check(
  "skip lands at the manifesto",
  Math.abs(skipped.manifestoTop) < 140,
  `manifesto top ${Math.round(skipped.manifestoTop)} @ scrollY ${Math.round(skipped.scrollY)}`,
);
await page.screenshot({ path: `${OUT}/prologue-4-skipped.png` });

/* 6. Rooms section renders with its four doors. */
const rooms = await page.evaluate(() => ({
  cards: document.querySelectorAll(".room-card").length,
  firstName: document.querySelector(".room-card-name")?.textContent,
}));
check("rooms section carries 4 cards", rooms.cards === 4, rooms.firstName ?? "");

await browser.close();
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
