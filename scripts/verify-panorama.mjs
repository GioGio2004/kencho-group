/* Verifies PanoramaRail (Combo 12) in real Chromium: SSR text, the
 * pinned 400% journey, the ~1.625x parallax ratio between tracks, snap
 * stops, progress rule, keyboard stop-walking, transform-only motion,
 * and the vertical fallbacks (mobile + reduced motion). */
import { chromium } from "playwright";

const BASE = "http://localhost:3100/en";
const OUT =
  "C:/Users/khvic/AppData/Local/Temp/claude/C--Users-khvic-Desktop-kenchogroup-admin/44d95b0e-e4e8-4a58-82e3-fee31156fcf2/scratchpad";

const STOPS = [0, 92.5 / 325, 162.5 / 325, 232.5 / 325, 1];
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();

/* ---- SSR ---- */
const ssr = await (await fetch(BASE)).text();
for (const needle of [
  "Where the work lives",
  "three collections from one Tbilisi workshop",
  "We never repeat a piece",
  "FOUNDER, KENCHO GROUP",
]) {
  check(`SSR HTML contains "${needle.slice(0, 28)}…"`, ssr.includes(needle));
}

/* ---- Desktop journey ---- */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
await page.waitForTimeout(800);
await page.click("[data-pro-skip]");
await page.waitForTimeout(1600);
await page.evaluate(() =>
  document.getElementById("panorama").scrollIntoView({ block: "start" }),
);
await page.waitForTimeout(600);

const pinInfo = await page.evaluate(() => {
  const pano = document.getElementById("panorama");
  const spacer = pano.querySelector(".pin-spacer");
  return {
    panoOn: pano.classList.contains("pano-on"),
    spacerH: spacer ? Math.round(spacer.getBoundingClientRect().height) : 0,
    vh: innerHeight,
  };
});
check("horizontal mode armed (.pano-on)", pinInfo.panoOn);
check(
  "pinSpacing correct (~5x viewport: 100svh pin + 400% distance)",
  Math.abs(pinInfo.spacerH - pinInfo.vh * 5) < pinInfo.vh * 0.15,
  `spacer ${pinInfo.spacerH}px @ vh ${pinInfo.vh}`,
);

const xOf = (sel) =>
  page.evaluate(
    (s) =>
      new DOMMatrixReadOnly(
        getComputedStyle(document.querySelector(s)).transform,
      ).m41,
    sel,
  );

/* Enter the pin and take two samples to measure the speed ratio. */
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(1600);
const c1 = await xOf("[data-pano-track]");
const b1 = await xOf("[data-pano-bg]");
await page.screenshot({ path: `${OUT}/pano-1.png` });

for (let i = 0; i < 8; i++) {
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(1600);
const c2 = await xOf("[data-pano-track]");
const b2 = await xOf("[data-pano-bg]");
const ratio = (c2 - c1) / (b2 - b1);
check(
  "content track ~1.625x faster than scenes",
  Math.abs(ratio - 1.625) < 0.08,
  `ratio ${ratio.toFixed(3)}`,
);
check("both tracks moved (transform only)", c2 < c1 && b2 < b1);

/* Snap: wherever those wheels left us, the rail must settle exactly on
 * one of the five stops. */
const settled = await page.evaluate(() => {
  const pano = document.getElementById("panorama");
  const rule = pano.querySelector("[data-pano-rule]");
  return {
    ruleScale: new DOMMatrixReadOnly(getComputedStyle(rule).transform).a,
  };
});
const nearStop = STOPS.some((s) => Math.abs(settled.ruleScale - s) < 0.02);
check(
  "snapped to a stop (progress rule at a stop value)",
  nearStop,
  `rule scaleX ${settled.ruleScale.toFixed(3)} vs stops ${STOPS.map((s) => s.toFixed(3)).join("/")}`,
);
await page.screenshot({ path: `${OUT}/pano-2.png` });

/* Arrow key walks one stop right. */
const beforeKey = settled.ruleScale;
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(2200);
const afterKey = await page.evaluate(() => {
  const rule = document.querySelector("[data-pano-rule]");
  return new DOMMatrixReadOnly(getComputedStyle(rule).transform).a;
});
const stepIdx = STOPS.findIndex((s) => Math.abs(s - beforeKey) < 0.02);
const expected = STOPS[Math.min(stepIdx + 1, 4)];
check(
  "ArrowRight walks to the next stop",
  Math.abs(afterKey - expected) < 0.03,
  `${beforeKey.toFixed(3)} -> ${afterKey.toFixed(3)} (expected ${expected.toFixed(3)})`,
);

/* No filter/width animation on the tracks; card link present. */
const hygiene = await page.evaluate(() => {
  const track = document.querySelector("[data-pano-track]");
  const bg = document.querySelector("[data-pano-bg]");
  const card = document.querySelector("[data-pano-card]");
  return {
    trackStyle: track.getAttribute("style") ?? "",
    bgStyle: bg.getAttribute("style") ?? "",
    href: card.querySelector("a")?.getAttribute("href"),
    meta: card.querySelector(".pano-card-meta")?.textContent?.trim(),
  };
});
check(
  "tracks carry transform only (no width/filter inline)",
  !/width|filter/.test(hygiene.trackStyle) && !/width|filter/.test(hygiene.bgStyle),
);
check("card links to its gallery", /\/en\/gallery\//.test(hygiene.href ?? ""), hygiene.href);
check(
  "bracketed monospace meta",
  /^\[.*·.*\]$/.test(hygiene.meta ?? ""),
  hygiene.meta,
);

/* Ride to the end for the quote scene. */
for (let i = 0; i < 10; i++) {
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(70);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/pano-3-quote.png` });
await page.close();

/* ---- Mobile: vertical page, no pin ---- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
await mobile.waitForTimeout(800);
const mob = await mobile.evaluate(() => {
  const pano = document.getElementById("panorama");
  const card = pano.querySelector("[data-pano-card]");
  return {
    pinned: !!pano.querySelector(".pin-spacer"),
    panoOn: pano.classList.contains("pano-on"),
    bgHidden:
      getComputedStyle(pano.querySelector("[data-pano-bg]")).display === "none",
    cardW: Math.round(card.getBoundingClientRect().width),
    vertical:
      pano.querySelector("[data-pano-track]").getBoundingClientRect().height >
      innerHeight,
  };
});
check("mobile: not pinned, vertical stack", !mob.pinned && !mob.panoOn && mob.vertical);
check("mobile: scene track hidden, cards full-width", mob.bgHidden && mob.cardW > 330, `card ${mob.cardW}px`);
await mobile.close();

/* ---- Reduced motion: vertical, no pin, content visible ---- */
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await rm.emulateMedia({ reducedMotion: "reduce" });
await rm.goto(BASE, { waitUntil: "networkidle" });
await rm.waitForTimeout(1500);
await rm.evaluate(() =>
  document.getElementById("panorama").scrollIntoView({ block: "center" }),
);
await rm.waitForTimeout(900);
const rmState = await rm.evaluate(() => {
  const pano = document.getElementById("panorama");
  return {
    pinned: !!pano.querySelector(".pin-spacer"),
    panoOn: pano.classList.contains("pano-on"),
    titleVisible:
      parseFloat(
        getComputedStyle(document.getElementById("panorama-title")).opacity,
      ) > 0.9,
  };
});
check(
  "reduced motion: unpinned vertical with visible content",
  !rmState.pinned && !rmState.panoOn && rmState.titleVisible,
);
await rm.close();

await browser.close();
console.log(results.join("\n"));
console.log(
  `\nStops at progress: ${STOPS.map((s) => s.toFixed(3)).join(" / ")}; pinned distance 400% of viewport (${900 * 4}px at 900px).`,
);
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
