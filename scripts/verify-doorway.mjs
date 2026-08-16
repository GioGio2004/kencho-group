/* Verifies DoorwayRail (the depth rail) in real Chromium: SSR text, the
 * pinned 520% corridor, the exponential dolly between neighbouring
 * planes, snap stops, the progress rule, keyboard stop-walking,
 * transform/opacity-only motion, and the vertical fallbacks (mobile +
 * reduced motion). */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100/en";
const OUT =
  process.env.OUT ??
  "C:/Users/khvic/AppData/Local/Temp/claude/C--Users-khvic-Desktop-kencho-group/9ed2d6f2-5df9-4374-a338-a15e6d8b24a1/scratchpad";

/** Must match DEPTH in DoorwayRail.tsx. */
const DEPTH = 2.6;
/** Five planes → five evenly spaced stops. */
const STOPS = [0, 0.25, 0.5, 0.75, 1];

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();

/* ---- SSR: the corridor's copy must exist without JavaScript. ---- */
const ssr = await (await fetch(BASE)).text();
for (const needle of [
  "Where the work lives",
  "three collections from one Tbilisi workshop",
  "We never repeat a piece",
  "FOUNDER, KENCHO GROUP",
]) {
  check(`SSR HTML contains "${needle.slice(0, 28)}…"`, ssr.includes(needle));
}
check(
  "SSR carries no .door-on (corridor is JS-only)",
  !ssr.includes("door-on"),
);

/* ---- Desktop corridor ---- */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
await page.waitForTimeout(800);
const skip = await page.$("[data-pro-skip]");
if (skip) await skip.click();
await page.waitForTimeout(1600);
await page.evaluate(() =>
  document.getElementById("panorama").scrollIntoView({ block: "start" }),
);
await page.waitForTimeout(600);

const pinInfo = await page.evaluate(() => {
  const door = document.getElementById("panorama");
  const spacer = door.querySelector(".pin-spacer");
  return {
    doorOn: door.classList.contains("door-on"),
    spacerH: spacer ? Math.round(spacer.getBoundingClientRect().height) : 0,
    planes: door.querySelectorAll("[data-door-plane]").length,
    vh: innerHeight,
  };
});
check("depth mode armed (.door-on)", pinInfo.doorOn);
check("five planes in the corridor", pinInfo.planes === 5, `${pinInfo.planes}`);
check(
  "pinSpacing correct (~6.2x viewport: 100svh pin + 520% distance)",
  Math.abs(pinInfo.spacerH - pinInfo.vh * 6.2) < pinInfo.vh * 0.2,
  `spacer ${pinInfo.spacerH}px @ vh ${pinInfo.vh}`,
);

/** Every plane's scale and opacity, in DOM order. */
const readPlanes = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-door-plane]")].map((el) => {
      const cs = getComputedStyle(el);
      return {
        scale: Number(new DOMMatrixReadOnly(cs.transform).a.toFixed(4)),
        opacity: Number(cs.opacity),
        visibility: cs.visibility,
      };
    }),
  );

/** Progress, read off the rule the corridor scrubs. */
const ruleScale = () =>
  page.evaluate(
    () =>
      new DOMMatrixReadOnly(
        getComputedStyle(document.querySelector("[data-door-rule]")).transform,
      ).a,
  );

/*
 * Wait for the snap to actually finish before measuring. Scrub catch-up
 * plus the 0.4s snap means a fixed sleep samples mid-flight, and a plane
 * caught between two stops is at no particular scale.
 */
const settle = async (minWait = 1400) => {
  /* ScrollTrigger only starts the snap once the scroll has gone idle, so
   * a value can sit still for a beat BEFORE the snap moves it. Hence the
   * opening wait, and the run of consecutive stable samples rather than
   * the first pair that happen to match. */
  await page.waitForTimeout(minWait);
  let previous = -1;
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    const now = await ruleScale();
    stable = Math.abs(now - previous) < 0.0005 ? stable + 1 : 0;
    previous = now;
    if (stable >= 5) return now;
    await page.waitForTimeout(120);
  }
  return previous;
};

/* Drive into the pin. */
for (let i = 0; i < 8; i++) {
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(80);
}
const settled = await settle();

const atStop = await readPlanes();
await page.screenshot({ path: `${OUT}/door-1.png` });

/* The plane at the threshold sits at scale 1; the one behind it is
 * DEPTH times smaller, and the one already passed DEPTH times larger.
 * That geometric ladder IS the dolly. */
const threshold = atStop.findIndex((p) => Math.abs(p.scale - 1) < 0.06);
check(
  "one plane rests exactly at the threshold (scale ~1)",
  threshold >= 0,
  atStop.map((p) => p.scale).join(" / "),
);
if (threshold >= 0 && threshold + 1 < atStop.length) {
  const ratio = atStop[threshold].scale / atStop[threshold + 1].scale;
  check(
    `next plane is ${DEPTH}x smaller (exponential dolly)`,
    Math.abs(ratio - DEPTH) < DEPTH * 0.08,
    `ratio ${ratio.toFixed(3)}`,
  );
}
check(
  "far planes are not painted (autoAlpha hides them)",
  atStop.some((p) => p.visibility === "hidden" || p.opacity < 0.02),
);

/* Snap: wherever the wheel left us, progress must settle on a stop. */
check(
  "snapped to a stop (progress rule at a stop value)",
  STOPS.some((s) => Math.abs(settled - s) < 0.03),
  `rule scaleX ${settled.toFixed(3)} vs ${STOPS.join("/")}`,
);

/* Arrow key walks one room further down the corridor. */
await page.keyboard.press("ArrowRight");
const afterKey = await settle();
const idx = STOPS.findIndex((s) => Math.abs(s - settled) < 0.03);
const expected = STOPS[Math.min(idx + 1, STOPS.length - 1)];
check(
  "ArrowRight walks to the next room",
  Math.abs(afterKey - expected) < 0.04,
  `${settled.toFixed(3)} -> ${afterKey.toFixed(3)} (expected ${expected.toFixed(3)})`,
);
await page.screenshot({ path: `${OUT}/door-2.png` });

/* Hygiene: only transform/opacity are written inline; the room links. */
const hygiene = await page.evaluate(() => {
  const planes = [...document.querySelectorAll("[data-door-plane]")];
  const room = document.querySelector(".door-room");
  return {
    styles: planes.map((p) => p.getAttribute("style") ?? ""),
    href: room?.querySelector("a")?.getAttribute("href"),
    meta: room?.querySelector(".door-room-meta")?.textContent?.trim(),
  };
});
check(
  "planes carry transform/opacity only (no width/filter/left inline)",
  hygiene.styles.every((s) => !/width|filter|[^-]left|top:/.test(s)),
  hygiene.styles[0]?.slice(0, 90),
);
check(
  "room links to its gallery",
  /\/en\/gallery\//.test(hygiene.href ?? ""),
  hygiene.href,
);
check(
  "bracketed monospace meta",
  /^\[\s*\S.*\S\s*\]$/.test(hygiene.meta ?? ""),
  hygiene.meta,
);

/* Ride to the end for the quote room. */
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(70);
}
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/door-3-quote.png` });
await page.close();

/* ---- Mobile: vertical page, no pin ---- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.waitForFunction(
  () => !document.documentElement.classList.contains("is-loading"),
  null,
  { timeout: 9000 },
);
await mobile.waitForTimeout(900);
const mob = await mobile.evaluate(() => {
  const door = document.getElementById("panorama");
  const room = door.querySelector(".door-room");
  return {
    pinned: !!door.querySelector(".pin-spacer"),
    doorOn: door.classList.contains("door-on"),
    roomVisible: room ? getComputedStyle(room).visibility : "none",
    roomPosition: room ? getComputedStyle(room).position : "none",
    overflowX: document.documentElement.scrollWidth > innerWidth,
  };
});
check("mobile is not pinned", !mob.pinned);
check("mobile does not arm the corridor", !mob.doorOn);
check("mobile rooms are visible in flow", mob.roomVisible === "visible");
check("mobile rooms are in normal flow", mob.roomPosition === "relative");
check("no horizontal overflow on mobile", !mob.overflowX);
await mobile.screenshot({ path: `${OUT}/door-4-mobile.png`, fullPage: false });
await mobile.close();

/* ---- Reduced motion: no pin, static page ---- */
const reduced = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
await reduced.goto(BASE, { waitUntil: "networkidle" });
await reduced.waitForTimeout(1500);
const red = await reduced.evaluate(() => {
  const door = document.getElementById("panorama");
  const room = door.querySelector(".door-room");
  return {
    pinned: !!door.querySelector(".pin-spacer"),
    doorOn: door.classList.contains("door-on"),
    roomVisible: room ? getComputedStyle(room).visibility : "none",
  };
});
check("reduced motion is not pinned", !red.pinned);
check("reduced motion does not arm the corridor", !red.doorOn);
check("reduced motion rooms visible", red.roomVisible === "visible");
await reduced.close();

await browser.close();

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
