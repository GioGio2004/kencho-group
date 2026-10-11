import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.LANDING_BASE ?? "http://localhost:3100";
const output = "docs/greeting-audit";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const key = "kencho:greeting:v1";

async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
async function playing(page) {
  await page.waitForFunction(() => document.documentElement.dataset.greeting === "playing");
}
async function finished(page) {
  await page.waitForFunction(() => !document.documentElement.dataset.greeting);
  assert.equal(await page.locator(".greeting-screen").isVisible(), false);
  assert.ok(await page.locator("[data-site-content]").evaluate(el => !el.inert));
  assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), "hidden");
}

try {
  for (const [locale, width, height] of [["en", 1440, 900], ["ka", 390, 844], ["ru", 320, 740], ["ka", 844, 390]]) {
    const { context, page } = await newPage({ viewport: { width, height } });
    const began = Date.now();
    await page.goto(`${base}/${locale}`, { waitUntil: "domcontentloaded" });
    await playing(page);
    assert.equal(await page.locator("main .greeting-screen").count(), 0, "Greeting was embedded in the page");
    assert.ok(await page.locator("[data-site-content]").evaluate(el => el.inert));
    assert.equal(await page.locator(".site-header").isVisible(), false);
    await page.waitForTimeout(650);
    const box = await page.locator(".greeting-brand").boundingBox();
    assert.ok(box.x > 10 && box.x + box.width < width - 10, "Logo overflow");
    assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 1, "Logo not centred");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: `${output}/outline-${locale}-${width}.png` });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${output}/logo-${locale}-${width}.png` });
    await finished(page);
    assert.ok(Date.now() - began < 6500, "Greeting didn't finish within its time limit");
    await page.waitForTimeout(1500);
    assert.ok(await page.locator(".site-header").isVisible());
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), "seen");
    await page.screenshot({ path: `${output}/revealed-${locale}-${width}.png` });
    const states = [];
    await page.addInitScript(() => {
      window.greetingReplayed = false;
      new MutationObserver(() => {
        if (document.documentElement?.dataset.greeting) window.greetingReplayed = true;
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-greeting"] });
    });
    await page.reload({ waitUntil: "networkidle" });
    states.push(await page.evaluate(() => window.greetingReplayed));
    await page.goto(`${base}/${locale}/about`, { waitUntil: "networkidle" });
    states.push(await page.evaluate(() => window.greetingReplayed));
    assert.deepEqual(states, [false, false], "Greeting replayed on a returning visit");
    await context.close();
    console.log(`PASS ${locale}/${width}: separate greeting, centred logo, reveal, once per session`);
  }

  const { context, page } = await newPage();
  await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await playing(page);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800);
  await page.keyboard.press("Tab");
  assert.ok(await page.locator(".greeting-screen button").evaluate(el => el === document.activeElement));
  assert.equal(await page.evaluate(() => scrollY), before, "Background scrolled during the greeting");
  await page.keyboard.press("Escape");
  await finished(page);
  assert.ok(await page.locator("#main-content").evaluate(el => el === document.activeElement));
  await page.goto(`${base}/en?intro=1`, { waitUntil: "domcontentloaded" });
  await playing(page);
  await page.locator(".greeting-screen button").click();
  await finished(page);
  await page.goto(`${base}/en?intro=1`, { waitUntil: "domcontentloaded" });
  await playing(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finished(page);
  await context.close();
  console.log("PASS background lock, keyboard focus, Escape, skip, replay preview and live reduced motion");

  for (const skip of [false, true]) {
    const direct = await newPage();
    await direct.page.goto(`${base}/en/gallery/kitchens?p=0`, { waitUntil: "domcontentloaded" });
    await playing(direct.page);
    assert.equal(await direct.page.locator(".gallery-viewer").evaluate(el => el.open), false);
    assert.ok(await direct.page.locator(".greeting-screen").evaluate(el => el.contains(document.activeElement)));
    if (skip) await direct.page.keyboard.press("Escape");
    await direct.page.waitForFunction(() => !document.documentElement.dataset.greeting);
    await direct.page.waitForFunction(() => document.querySelector(".gallery-viewer")?.open);
    assert.ok(new URL(direct.page.url()).searchParams.has("p"), "Greeting consumed the photo deep link");
    assert.ok(await direct.page.locator(".gallery-viewer").evaluate(el => el.contains(document.activeElement)));
    assert.equal(await direct.page.evaluate(() => document.documentElement.style.overflow), "hidden");
    await direct.page.locator(".gallery-close").click();
    await direct.page.waitForFunction(() => !document.querySelector(".gallery-viewer"));
    assert.equal(new URL(direct.page.url()).searchParams.has("p"), false);
    assert.notEqual(await direct.page.evaluate(() => document.documentElement.style.overflow), "hidden");
    await direct.context.close();
  }
  console.log("PASS direct gallery links wait for the greeting, preserve the photo, focus and scroll lock");

  const reduced = await newPage({ reducedMotion: "reduce" });
  await reduced.page.goto(`${base}/en`, { waitUntil: "networkidle" });
  assert.equal(await reduced.page.locator(".greeting-screen").isVisible(), false);
  assert.ok(await reduced.page.locator(".site-header").isVisible());
  await reduced.context.close();
  const plain = await newPage({ javaScriptEnabled: false });
  await plain.page.goto(`${base}/en`, { waitUntil: "networkidle" });
  assert.equal(await plain.page.locator(".greeting-screen").isVisible(), false);
  assert.ok(await plain.page.locator(".site-header").isVisible());
  await plain.context.close();
  console.log("PASS reduced motion and no-JavaScript bypass");

  const blockedStorage = await newPage();
  await blockedStorage.page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await blockedStorage.page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await playing(blockedStorage.page);
  await finished(blockedStorage.page);
  await blockedStorage.context.close();

  const failedHydration = await newPage();
  await failedHydration.page.route("**/_next/static/**/*.js", route => route.abort());
  await failedHydration.page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
  await failedHydration.page.waitForFunction(() => document.documentElement.dataset.greeting === "pending");
  await failedHydration.page.waitForFunction(() => !document.documentElement.dataset.greeting, null, { timeout: 6000 });
  assert.ok(await failedHydration.page.locator(".site-header").isVisible());
  await failedHydration.context.close();
  console.log("PASS blocked storage and automatic escape when application JavaScript fails");
  assert.deepEqual(errors, [], "Browser errors");
} finally {
  await browser.close();
}
