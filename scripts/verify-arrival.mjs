import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.LANDING_BASE ?? "http://localhost:3000";
const output = "docs/arrival-audit";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const errors = [];
const failures = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && new URL(response.url()).origin === base)
    failures.push(`${response.status()} ${response.url()}`);
});

async function assertLayout(locale, width, height) {
  assert.equal(await page.locator("h1").count(), 1);
  const geometry = await page.locator(".home-arrival").evaluate((root) => {
    const box = (selector) => {
      const r = root.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
    };
    return {
      motion: root.dataset.motion,
      lead: box(".arrival-lead"),
      portal: box(".arrival-portal"),
      footer: box(".arrival-footer"),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      loaded: [...root.querySelectorAll("img")].every((img) => img.complete && img.naturalWidth > 0),
    };
  });
  const label = `${locale}/${width}x${height}`;
  assert.equal(geometry.motion, "true", `${label}: motion did not initialize`);
  assert.equal(geometry.overflow, false, `${label}: horizontal overflow`);
  assert.equal(geometry.loaded, true, `${label}: missing photograph`);
  assert.ok(geometry.footer.bottom <= height + 1, `${label}: controls below viewport`);
  assert.ok(geometry.portal.y >= 70, `${label}: opening photograph hidden under header`);
  assert.ok(geometry.lead.y > 70, `${label}: heading hidden under header`);
  const localeColour = await page.locator(".header-languages [aria-current]").evaluate((el) => getComputedStyle(el).color);
  assert.equal(localeColour, "rgb(242, 238, 229)", `${label}: language switch is illegible`);
}

try {
  for (const locale of ["en", "ka", "ru"]) {
    for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const response = await page.goto(`${base}/${locale}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.greeting);
      await page.waitForTimeout(1800);
      await assertLayout(locale, width, height);
      if ((locale === "en" && width === 1440) || (locale === "ka" && width === 390)) {
        await page.screenshot({ path: `${output}/opening-${locale}-${width}.png` });
        for (const index of [0, 1, 2, 0]) {
          await page.locator(".arrival-chapter").nth(index).click();
          await page.waitForTimeout(1900);
          assert.equal(await page.locator(".home-arrival").getAttribute("data-chapter"), String(index));
          assert.equal(await page.locator(".arrival-chapter").nth(index).getAttribute("aria-pressed"), "true");
          const visible = page.locator(".arrival-caption").nth(index);
          assert.ok(await visible.isVisible(), `Chapter ${index} was blank`);
          assert.equal(await visible.getAttribute("aria-hidden"), "false");
          await page.screenshot({ path: `${output}/chapter-${index}-${locale}-${width}.png` });
        }
        await page.locator(".arrival-explore").click();
        await page.waitForTimeout(1600);
        assert.equal(await page.locator(".home-arrival").getAttribute("data-in-view"), "false");
        assert.ok(await page.locator("#work").evaluate((el) => Math.abs(el.getBoundingClientRect().top) < 200), "Explore link did not reach the collection");
        await page.screenshot({ path: `${output}/after-arrival-${locale}-${width}.png` });
      }
    }
    console.log(`PASS ${locale}: seven viewports, images, controls and language contrast`);
  }

  // Resize while inside a chapter: reconstruct the responsive timeline, then reverse it.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/en`, { waitUntil: "networkidle" });
  await page.locator(".arrival-chapter").nth(2).click();
  await page.waitForTimeout(1900);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1900);
  await page.locator(".arrival-chapter").nth(0).click();
  await page.waitForTimeout(1900);
  assert.equal(await page.locator(".home-arrival").getAttribute("data-chapter"), "0");
  assert.ok(await page.locator(".arrival-caption").first().isVisible());
  console.log("PASS responsive timeline rebuild and reverse scrolling");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  assert.notEqual(await page.locator(".home-arrival").getAttribute("data-motion"), "true");
  assert.equal(await page.locator(".arrival-chapters").isVisible(), false);
  assert.ok(await page.locator("#arrival-heading").isVisible());
  assert.ok(await page.locator(".home-arrival").evaluate((el) => el.offsetHeight <= innerHeight + 1));
  await page.locator(".arrival-scroll").click();
  await page.waitForTimeout(400);
  assert.ok(await page.locator("#introduction").evaluate((el) => Math.abs(el.getBoundingClientRect().top) < 120));
  console.log("PASS live reduced-motion change, static fallback and continuation link");

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  for (const locale of ["en", "ka", "ru"]) {
    await plain.goto(`${base}/${locale}`, { waitUntil: "networkidle" });
    await plain.waitForTimeout(1000);
    assert.ok(await plain.locator("#arrival-heading").isVisible());
    assert.equal(await plain.locator(".arrival-chapters").isVisible(), false);
    assert.ok(await plain.locator(".home-arrival").evaluate((el) => el.offsetHeight <= innerHeight + 1));
    await plain.locator(".arrival-explore").click();
    assert.ok(await plain.locator("#work").evaluate((el) => Math.abs(el.getBoundingClientRect().top) < 120));
  }
  await noJs.close();
  console.log("PASS no-JavaScript opening and gallery links in all three languages");
  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(failures, [], "Failed local assets");
  console.log("PASS no browser errors or failed local requests");
} finally {
  await browser.close();
}
