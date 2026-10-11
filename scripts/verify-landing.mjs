import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.LANDING_BASE ?? "http://localhost:3100";
const output = "docs/landing-page-audit-2026-10-11";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const failures = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && new URL(response.url()).origin === base)
    failures.push(`${response.status()} ${response.url()}`);
});

async function revealImages() {
  for (const section of await page.locator(".home > section").all()) {
    await section.evaluate((el) =>
      el.scrollIntoView({ behavior: "instant", block: "start" }),
    );
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
}

try {
  for (const locale of ["en", "ka", "ru"]) {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      const response = await page.goto(`${base}/${locale}`, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => !document.documentElement.dataset.greeting);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator(".tiles").count(), 0);
      assert.equal(await page.locator(".home-film video").count(), 2);
      assert.equal(await page.locator(".service-row").count(), 4);
      assert.equal(await page.locator(".home form").count(), 0);
      assert.equal(await page.locator(".home [data-pin]").count(), 0);
      assert.ok(await page.locator(".hero-actions .btn").isVisible());
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${locale}/${width}: horizontal overflow`,
      );
      assert.ok(
        await page
          .locator(".service-row p")
          .evaluateAll((els) =>
            els.every((el) => el.getBoundingClientRect().width > 100),
          ),
        `${locale}/${width}: service text collapsed`,
      );
      await revealImages();
      if (
        (locale === "en" && width === 1440) ||
        (locale === "ka" && width === 390)
      ) {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.waitForTimeout(400);
        await page.screenshot({
          path: `${output}/rebuilt-${locale}-${width}.png`,
          fullPage: true,
        });
        await page.screenshot({
          path: `${output}/rebuilt-hero-${locale}-${width}.png`,
        });
      }
    }
    console.log(`PASS responsive layout: ${locale}, six widths`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/en`, { waitUntil: "networkidle" });
  const hrefs = await page
    .locator(".service-row, .services-heading .home-text-link, .film-gallery")
    .evaluateAll((els) => [
      ...new Set(els.map((el) => el.getAttribute("href"))),
    ]);
  for (const href of hrefs)
    assert.equal(
      (await context.request.get(base + href)).status(),
      200,
      `Broken gallery link: ${href}`,
    );

  await page.locator(".header-menu").click();
  await page.waitForTimeout(650);
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    assert.ok(
      await page.evaluate(
        () => !!document.activeElement?.closest("#site-menu"),
      ),
      "Menu focus escaped",
    );
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  assert.ok(
    await page
      .locator(".header-menu")
      .evaluate((el) => el === document.activeElement),
  );

  await page.locator(".hero-actions .btn").click();
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(350);
  assert.equal(
    await page.evaluate(() => scrollY),
    before,
    "Contact sheet failed to lock the page",
  );
  assert.equal(await page.locator(".sheet form").count(), 0);
  assert.ok(
    (
      await page
        .locator(".sheet a[href^='https://wa.me/']")
        .getAttribute("href")
    ).includes("995592822260"),
  );
  await page.keyboard.press("Escape");

  const film = page.locator('.home-film[data-variant="walkthrough"]');
  await film.evaluate(el => window.scrollTo({top:el.getBoundingClientRect().top+scrollY+160,behavior:'instant'}));
  const player = film.locator('video');
  await page.waitForFunction(() => {
    const video = document.querySelector('.home-film[data-variant="walkthrough"] video');
    return video.readyState >= 2 && !video.paused && video.currentTime > 0;
  });
  const filmBox = await film.locator('.film-stage').boundingBox();
  assert.equal(filmBox.width, 1440);
  assert.equal(filmBox.height, 900);
  assert.equal(filmBox.y, 0);
  await page.waitForTimeout(800);
  await page.screenshot({path:output+'/cinematic-film-desktop.png'});
  await film.locator('.film-play').click();
  assert.ok(await player.evaluate(el=>el.paused), 'Pause control failed');
  await film.locator('.film-play').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.home-film[data-variant="walkthrough"] video').paused);
  await film.locator('.film-fullscreen').click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.ok(await film.evaluate(el=>document.fullscreenElement===el));
  await film.locator('.film-fullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  const lastService = page.locator('.service-row').last();
  await lastService.scrollIntoViewIfNeeded();
  await lastService.focus();
  assert.equal(await page.locator('.service-preview-image[data-active="true"]').getAttribute('src').then(url=>decodeURIComponent(url)).then(url=>url.includes('backlit-slat-wall')),true);
  await page.waitForTimeout(500);
  assert.ok(await player.evaluate(el=>el.paused),'Offscreen video continued playing');

  const photo = page.locator(".detail-photo").nth(3);
  await photo.scrollIntoViewIfNeeded();
  await photo.click();
  await page.waitForTimeout(900);
  assert.equal(await photo.getAttribute("aria-pressed"), "true");
  assert.ok((await photo.boundingBox()).width > 200);
  await page.screenshot({ path: `${output}/rebuilt-detail-motion.png` });
  await photo.click();
  await page.waitForTimeout(900);
  assert.equal(await photo.getAttribute("data-active"), "false");

  await page.evaluate(() => {
    window.testEvents = [];
    window.fbq = (...args) => window.testEvents.push(args);
  });
  for (const method of ["tel:", "https://wa.me/"]) {
    const link = page.locator(`.site-footer a[href^='${method}']`).first();
    await link.evaluate((el) =>
      el.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      }),
    );
    await link.click();
  }
  assert.equal(
    await page.evaluate(
      () => window.testEvents.filter((args) => args[1] === "Contact").length,
    ),
    2,
  );
  console.log(
    "PASS menu, contact, full-screen video, playback controls, category previews, photo expansion and contact tracking",
  );

  await page.goto(`${base}/en/gallery?ref=qa`, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator(".gallery-viewer").count(),
    0,
    "Gallery unexpectedly opened its first image",
  );
  await page.locator(".mtile").first().click();
  await page.waitForTimeout(650);
  assert.ok(page.url().includes("p=0"));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
  assert.ok(page.url().includes("p=1"));
  await page.screenshot({ path: `${output}/rebuilt-gallery-desktop.png` });
  await page.goBack();
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".gallery-viewer").count(), 0);
  assert.ok(page.url().includes("ref=qa") && !page.url().includes("p="));
  await page.goto(`${base}/ka/gallery/kitchens?p=0`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  assert.ok(await page.locator(".gallery-viewer").evaluate((el) => el.open));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${output}/rebuilt-gallery-mobile.png` });
  await page.locator(".gallery-close").click();
  await page.waitForTimeout(100);
  assert.ok(!page.url().includes("p="));
  await page.goto(`${base}/en/gallery/kitchens?p=2&ref=qa`, {
    waitUntil: "networkidle",
  });
  await page.locator(".gallery-close").click();
  await page
    .locator(".header-languages button")
    .filter({ hasText: "RU" })
    .click();
  await page.waitForURL(/\/ru\/gallery\/kitchens/);
  assert.ok(page.url().includes("ref=qa"));
  console.log(
    "PASS gallery navigation, deep links, browser back and locale query preservation",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/en`, { waitUntil: "networkidle" });
  assert.ok(await page.evaluate(() => !window.__lenis));
  assert.ok(
    await page
      .locator(".detail-photo")
      .first()
      .evaluate(
        (el) => parseFloat(getComputedStyle(el).transitionDuration) < 0.01,
      ),
  );
  assert.ok(await page.locator('.home-film').evaluateAll(els=>els.every(el=>!el.dataset.motion)));
  await page.locator('.home-film').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  assert.ok(await page.locator('.home-film video').evaluateAll(els=>els.every(el=>el.paused)));
  console.log("PASS reduced motion");

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const plain = await noJs.newPage();
  for (const locale of ["en", "ka", "ru"]) {
    await plain.goto(`${base}/${locale}`);
    assert.equal(await plain.locator(".tiles").count(), 0);
    assert.ok(await plain.locator(".home-film video").evaluateAll(els=>els.every(el=>el.controls && !el.autoplay && el.getAttribute("poster"))));
    assert.equal(await plain.locator(".home h2").count(), 8);
    assert.ok(
      (await plain.locator(".hero-actions .btn").getAttribute("href")).endsWith(
        "/contact",
      ),
    );
    await plain.locator(".hero-actions .btn").click({ force: true });
    await plain.waitForURL(`**/${locale}/contact`);
    assert.ok(
      await plain
        .locator("main .contact-channels a[href^='https://wa.me/']")
        .isVisible(),
    );
  }
  await noJs.close();
  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(failures, [], "Failed local requests");
  console.log(
    "PASS no-JavaScript content and working contact links; no browser or asset errors",
  );
} finally {
  await browser.close();
}
