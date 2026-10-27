/* Regression checks for the current ERA homepage. Run through verify:landing.
 * LANDING_BASE selects the running server; LANDING_OUTPUT selects the report directory. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = (process.env.LANDING_BASE ?? "http://localhost:3100").replace(/\/$/, "");
const output = process.env.LANDING_OUTPUT ?? join(tmpdir(), "kencho-ui-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [], errors = new Set(), failedAssets = new Set();

async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function watch(page) {
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.add(`${page.url()}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === base)
      failedAssets.add(`${response.status()} ${response.url()}`);
  });
}

async function load(page, path) {
  const response = await page.goto(base + path, { waitUntil: "load" });
  assert.equal(response.status(), 200, path);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.documentElement.dataset.greeting);
  await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches || !!window.__lenis);
}

async function scrollTo(page, selector, offset = 0) {
  await page.locator(selector).first().evaluate((el, offset) => {
    const top = el.getBoundingClientRect().top + scrollY + offset;
    if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: "instant" });
  }, offset);
  await page.waitForTimeout(1600); // Original scrub easing and entrance stagger.
}

async function assertMasks(page, selector, childSelector) {
  const clipped = await page.locator(selector).evaluateAll((masks, childSelector) => {
    const clipped = [];
    for (const mask of masks) {
      const m = mask.getBoundingClientRect();
      for (const child of mask.querySelectorAll(childSelector)) {
        const r = child.getBoundingClientRect();
        if (r.top < m.top - 1 || r.bottom > m.bottom + 1 || r.left < m.left - 1 || r.right > m.right + 1)
          clipped.push(child.textContent.trim());
      }
    }
    return clipped;
  }, childSelector);
  assert.deepEqual(clipped, [], "Text extends outside its reveal mask");
}

async function assertFits(page, selector) {
  const outside = await page.locator(selector).evaluateAll((els) => els.filter((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).visibility === "hidden") return false;
    // A block can fit while a long word overflows its box. Include the actual
    // text fragments, not just the element's assigned layout width.
    const range = document.createRange();
    range.selectNodeContents(el);
    return [r, ...range.getClientRects()].some((rect) => rect.left < -1 || rect.right > innerWidth + 1);
  }).map((el) => el.textContent.trim()));
  assert.deepEqual(outside, [], "Text extends beyond the viewport");
}

try {
  if (process.env.LANDING_ENTRY_ONLY !== "1") {
    await Promise.all(["en", "ka", "ru"].map(async (locale) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      watch(page);
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await check(`${locale}/${width}: responsive text and reveal masks`, async () => {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
          await load(page, `/${locale}`);
          await page.waitForSelector(".mat-line-mask", { state: "attached" });
          await page.waitForTimeout(2600);
          assert.equal(await page.locator("main h1").count(), 1);
          assert.equal(await page.locator(".era-landing section").count(), 7);
          await assertMasks(page, ".era-letter-mask", ".kg-letter");
          await scrollTo(page, "#concept");
          await assertMasks(page, "#concept .era-line-mask", ".font-era-display, [data-sub]");
          await scrollTo(page, "[data-manifesto-display]", -160);
          await assertFits(page, "[data-drift-word]");
          await scrollTo(page, "#materials");
          await assertMasks(page, "#materials .mat-line-mask", ".mat-word");
          await assertFits(page, "#materials [data-caption-label]");
          await scrollTo(page, "#specifications");
          await assertFits(page, "#made-to-live-in-heading > span");
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Horizontal page overflow");
          await assertFits(page, "[data-project-invitation] h3");
          if (width === 390 || width === 1440)
            await page.screenshot({ path: join(output, `${locale}-${width}-editorial.png`) });
        });
      }

      for (const width of [390, 1440]) {
        await check(`${locale}/${width}: hotspots, services, materials, FAQ and contact`, async () => {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
          await load(page, `/${locale}`);
          await page.waitForSelector(".mat-line-mask", { state: "attached" });
          await page.evaluate(() => { window.__persistentNodes = [...document.querySelectorAll("[data-hero-hotspot], [data-room-heading], [data-home-faq-answer]")]; });
          await page.locator(".era-landing > section").first().evaluate((el) => {
            const top = el.offsetHeight - innerHeight;
            if (window.__lenis) window.__lenis.scrollTo(top, { immediate: true, force: true });
            else window.scrollTo({ top, behavior: "instant" });
          });
          await page.waitForTimeout(1800);
          for (const button of await page.locator("button[aria-controls^='hero-hotspot-']").all()) {
            await button.hover();
            await page.waitForTimeout(800);
            const id = await button.getAttribute("aria-controls");
            assert.equal(await page.locator(`#${id}`).getAttribute("aria-hidden"), "false");
            await assertFits(page, `#${id}`);
          }
          await scrollTo(page, "#collection", 760);
          for (let i = 0; i < 4; i++) {
            assert.equal(await page.locator("[data-room-heading][aria-hidden='false']").count(), 1);
            await assertFits(page, "[data-room-heading][aria-hidden='false']");
            await page.locator("#collection button").last().click();
            await page.waitForTimeout(1200);
          }
          await scrollTo(page, "#materials");
          for (const button of await page.locator("#materials li button").all()) {
            await button.focus();
            await page.waitForTimeout(1800);
            assert.equal(await button.getAttribute("aria-pressed"), "true");
            // Exiting captions are intentionally outside their masks until hidden.
            const id = await button.getAttribute("aria-controls");
            await assertMasks(page, `#${id} .mat-line-mask`, ".mat-word");
          }
          await page.screenshot({ path: join(output, `${locale}-${width}-materials.png`) });
          for (const button of await page.locator("summary[aria-controls^='home-faq-answer-']").all()) {
            await button.scrollIntoViewIfNeeded();
            if (!await button.evaluate((el) => el.parentElement.open)) await button.click();
            await page.waitForTimeout(400);
            const id = await button.getAttribute("aria-controls");
            assert.ok(await button.evaluate((el) => el.parentElement.open));
            assert.equal(await page.locator("#specifications details[open]").count(), 1, "FAQ did not close its previous answer");
            assert.ok(await page.locator(`#${id}`).evaluate((el) => el.clientHeight >= el.scrollHeight - 1), "FAQ answer clipped");
          }
          assert.ok(await page.evaluate(() => window.__persistentNodes.every((node) => node.isConnected)), "Interactive text was replaced");
          await page.locator("#inquiry button").click();
          await page.waitForTimeout(1300);
          assert.ok(await page.locator("dialog.sheet").evaluate((el) => el.open));
          assert.ok(await page.locator("dialog.sheet a[href^='https://wa.me/']").isVisible());
          const y = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, 500);
          await page.waitForTimeout(250);
          assert.equal(await page.evaluate(() => scrollY), y, "Contact sheet did not lock scrolling");
          await page.keyboard.press("Escape");
          await page.waitForTimeout(1100);
          assert.ok(await page.locator("dialog.sheet").evaluate((el) => !el.open));
        });
      }

      await check(`${locale}: menu focus and navigation`, async () => {
        await load(page, `/${locale}`);
        const trigger = page.locator("button[aria-controls='mega-menu']");
        await trigger.click();
        await page.waitForTimeout(1900);
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press("Tab");
          assert.ok(await page.evaluate(() => !!document.activeElement?.closest("#mega-menu,button[aria-controls='mega-menu']")), "Focus escaped the menu");
        }
        await assertFits(page, "#mega-menu nav a");
        await page.keyboard.press("Escape");
        assert.ok(await trigger.evaluate((el) => el === document.activeElement));
      });

      for (const route of ["/about", "/contact", "/faq", "/gallery", "/gallery/kitchens", "/gallery/wardrobes-storage", "/gallery/home-interiors", "/gallery/commercial-spaces"]) {
        await check(`${locale}${route}: route, headings and mobile layout`, async () => {
          for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
            await load(page, `/${locale}${route}`);
            assert.equal(await page.locator("main h1").count(), 1);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}px`);
            if (route.startsWith("/gallery/")) {
              assert.equal(await page.locator("[data-buyer-guide]").count(), 1);
              await assertFits(page, ".catalogue-title,[data-buyer-guide] h2,[data-buyer-guide] h3,[data-buyer-guide] p");
            }
          }
        });
      }
      await context.close();
    }));

    await check("Gallery: deep links, keyboard, browser back and locale preservation", async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      watch(page);
      await load(page, "/en/gallery/kitchens?ref=qa");
      assert.equal(await page.locator(".gallery-viewer").count(), 0);
      await page.locator(".mtile").first().click();
      await page.waitForFunction(() => document.querySelector(".gallery-viewer")?.open);
      assert.equal(new URL(page.url()).searchParams.get("p"), "0");
      await page.keyboard.press("ArrowRight");
      await page.waitForURL(/p=1/);
      await page.goBack();
      await page.waitForFunction(() => !document.querySelector(".gallery-viewer"));
      assert.equal(new URL(page.url()).searchParams.get("ref"), "qa");
      await page.locator(".header-languages button").filter({ hasText: "RU" }).click();
      await page.waitForURL(/\/ru\/gallery\/kitchens/);
      assert.equal(new URL(page.url()).searchParams.get("ref"), "qa");
      await context.close();
    });

    for (const locale of ["en", "ka", "ru"]) {
      await check(`${locale}: touch hotspots and short-phone service layout`, async () => {
        const context = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        watch(page);
        await load(page, `/${locale}`);
        await page.waitForSelector(".mat-line-mask", { state: "attached" });
        await page.evaluate(() => window.__lenis.scrollTo(innerHeight * 2.4, { immediate: true, force: true }));
        await page.waitForTimeout(1800);
        const hotspot = page.locator("button[aria-controls^='hero-hotspot-']").first();
        await hotspot.tap();
        await page.waitForTimeout(500);
        assert.equal(await hotspot.getAttribute("aria-expanded"), "true");
        await hotspot.tap();
        await page.waitForTimeout(500);
        assert.equal(await hotspot.getAttribute("aria-expanded"), "false");
        await scrollTo(page, "#collection", 500);
        for (let i = 0; i < 4; i++) {
          const bounds = await page.locator("[data-room-heading][aria-hidden='false'],[data-room-description][aria-hidden='false']").evaluateAll((els) => els.map((el) => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
          }));
          assert.ok(bounds.every((r) => r.top >= 0 && r.bottom <= 568 && r.left >= 0 && r.right <= 320), "Service text clipped on a short phone");
          assert.ok((await page.locator(".era-collection-photo").boundingBox()).height >= 90, "Service photograph collapsed");
          await page.locator("#collection button").last().tap();
          await page.waitForTimeout(1200);
        }
        await page.screenshot({ path: join(output, `${locale}-320x568-collection.png`) });
        await context.close();
      });
      await check(`${locale}: reduced motion and live preference changes`, async () => {
        const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        watch(page);
        await load(page, `/${locale}`);
        await page.waitForSelector(".mat-line-mask", { state: "attached" });
        assert.ok(await page.evaluate(() => !window.__lenis));
        assert.equal(await page.locator("#collection [data-hud-tone]").evaluate((el) => getComputedStyle(el).clipPath), "none");
        assert.equal(await page.locator(".animate-spin-slow").evaluate((el) => getComputedStyle(el).animationName), "none");
        await scrollTo(page, "#quote-banner");
        assert.equal(await page.locator("#quote-banner blockquote").evaluate((el) => getComputedStyle(el.parentElement).opacity), "1");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForTimeout(500);
        assert.ok(await page.evaluate(() => !!window.__lenis));
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForTimeout(500);
        assert.equal(await page.locator("#collection [data-hud-tone]").evaluate((el) => getComputedStyle(el).clipPath), "none");
        await context.close();
      });
      await check(`${locale}: initial HTML includes every service, hotspot and FAQ`, async () => {
        const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        watch(page);
        await page.goto(`${base}/${locale}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(900); // Let the CSS-only page entrance settle.
        assert.equal(await page.locator("[data-hero-hotspot]").count(), 3);
        assert.equal(await page.locator("[data-room-heading]").count(), 4);
        assert.equal(await page.locator("[data-home-faq-answer]").count(), 4);
        for (const summary of await page.locator("summary[aria-controls^='home-faq-answer-']").all()) {
          if (!await summary.evaluate((el) => el.parentElement.open)) {
            // With application JS disabled Chromium can stop the RAF callbacks
            // Playwright's stability check uses. Send real pointer input after
            // scrolling and checking the layout, rather than forcing a DOM click.
            await summary.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
            const before = await summary.boundingBox();
            await page.waitForTimeout(150);
            const box = await summary.boundingBox();
            assert.ok(Math.abs(before.y - box.y) < 1, "No-JavaScript FAQ layout is moving");
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          }
          const id = await summary.getAttribute("aria-controls");
          assert.ok(await page.locator(`#${id}`).isVisible(), "FAQ unavailable without JavaScript");
          assert.ok(await page.locator(`#${id}`).evaluate((el) => el.clientHeight >= el.scrollHeight - 1), "No-JavaScript FAQ clipped");
        }
        assert.equal(await page.locator("#collection [data-hud-tone]").evaluate((el) => getComputedStyle(el).clipPath), "none");
        assert.ok(await page.locator("#inquiry a[href^='https://wa.me/']").getAttribute("href"));
        await context.close();
      });
    }
  }
  for (const locale of ["en", "ka", "ru"]) {
    await check(`${locale}: all enquiry links retain campaign, referrer, locale and page`, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      watch(page);
      await page.goto(`${base}/${locale}?utm_source=seo-qa&utm_campaign=kitchens`, { waitUntil: "load", referer: "https://referrer.example/project?private=omit" });
      await page.waitForSelector(".mat-line-mask", { state: "attached" });
      for (const route of ["", "/about", "/contact", "/gallery/kitchens"]) {
        if (route) await load(page, `/${locale}${route}`);
        await page.evaluate(() => {
          window.__contactEvents = [];
          window.fbq = (...args) => window.__contactEvents.push(args);
        });
        const links = await page.locator("main a[href^='https://wa.me/'], main a[href^='tel:']").all();
        assert.ok(links.length > 0);
        for (const link of links) {
          assert.ok(await link.getAttribute("data-contact-method"), "Untracked contact link");
          // Exercise the handler while preventing navigation or sending messages.
          await link.evaluate((el) => {
            el.addEventListener("click", (event) => event.preventDefault(), { once: true });
            el.click();
          });
          const payload = await page.evaluate(() => window.__contactEvents.at(-1)?.[2]);
          assert.equal(payload.locale, locale);
          assert.equal(payload.page, `/${locale}${route}`);
          assert.equal(payload.utm_source, "seo-qa");
          assert.equal(payload.landing, `/${locale}`);
          assert.ok(payload.referrer.includes("referrer.example"));
          const href = await link.getAttribute("href");
          if (href.startsWith("https://wa.me/")) {
            const message = new URL(href).searchParams.get("text");
            for (const value of [payload.code, payload.locale, payload.page, payload.utm_source, payload.referrer])
              assert.ok(message.includes(value), `WhatsApp context missing ${value}`);
          }
        }
        assert.equal(await page.evaluate(() => window.__contactEvents.length), links.length);
      }
      await context.close();
    });
    await check(`${locale}: hero letters fully concealed before entry and intact afterwards`, async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      watch(page);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await load(page, `/${locale}`);
        await page.waitForSelector(".mat-line-mask", { state: "attached" });
        // Move the real CSS animations back into their delay, including those
        // which finished during font loading. This checks the actual keyframes.
        await page.locator(".kg-letter").evaluateAll((els) => els.forEach((el) => {
          el.style.animationDelay = "100s";
          el.style.animationPlayState = "paused";
        }));
        const visible = await page.locator(".kg-letter").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().top < el.parentElement.getBoundingClientRect().bottom - 1).map((el) => el.textContent));
        assert.deepEqual(visible, [], "Letter tips visible before the reveal starts");
        await page.locator(".kg-letter").evaluateAll((els) => els.forEach((el) => { el.style.animation = "none"; }));
        await assertMasks(page, ".era-letter-mask", ".kg-letter");
      }
      await context.close();
    });
  }
  await check("No browser runtime errors", () => assert.deepEqual([...errors], []));
  await check("No failed local routes or assets", () => assert.deepEqual([...failedAssets], []));
} finally {
  await browser.close();
  await writeFile(join(output, "results.json"), JSON.stringify({ base, results, errors: [...errors], failedAssets: [...failedAssets] }, null, 2));
}
const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Report: ${output}`);
if (failed.length) process.exitCode = 1;
