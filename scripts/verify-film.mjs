import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.LANDING_BASE ?? "http://localhost:3100";
const output = "docs/cinema-audit";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function enterFilm(variant, offset = 110) {
  const film = page.locator(`.home-film[data-variant="${variant}"]`);
  await film.evaluate((el, offset) => window.scrollTo({
    top: el.getBoundingClientRect().top + scrollY + offset, behavior: "instant",
  }), offset);
  await page.waitForFunction(variant => {
    const video = document.querySelector(`.home-film[data-variant="${variant}"] video`);
    return video.readyState >= 2 && !video.paused && video.currentTime > 0;
  }, variant);
  return film;
}

try {
  for (const locale of ["en", "ka", "ru"]) {
    for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/${locale}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => !document.documentElement.dataset.greeting);
      for (const variant of ["walkthrough", "people"]) {
        const film = await enterFilm(variant, variant === "walkthrough" ? 110 : 0);
        const geometry = await film.evaluate(el => {
          const box = node => {
            const rect = node.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
          };
          const video = el.querySelector("video");
          return {
            heading: box(el.querySelector("h2")), copy: box(el.querySelector(".film-copy")),
            footer: box(el.querySelector(".film-footer")), stage: box(el.querySelector(".film-stage")),
            error: video.error?.code, source: video.currentSrc,
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        const label = `${locale}/${width}/${variant}`;
        assert.equal(geometry.overflow, 0, `${label}: overflow`);
        assert.ok(!geometry.error, `${label}: video error`);
        assert.equal(geometry.source.includes("-mobile.mp4"), width < 768, `${label}: media source`);
        assert.ok(geometry.heading.top > 65, `${label}: heading under header`);
        assert.ok(geometry.copy.bottom < geometry.footer.top - 10, `${label}: copy overlaps controls`);
        assert.ok(geometry.footer.bottom <= height + 2, `${label}: controls outside viewport`);
        assert.ok(Math.abs(geometry.stage.width - width) < 1, `${label}: film isn't edge-to-edge`);
        assert.ok(Math.abs(geometry.stage.height - height) < 1, `${label}: film isn't viewport-sized`);
        if ((locale === "en" && width === 1440) || (locale === "ka" && width === 390) || (locale === "ru" && width === 320) || (locale === "ka" && width === 844)) {
          // Let the source's short opening fade and the frame expansion settle.
          await page.waitForTimeout(800);
          await page.screenshot({ path: `${output}/final-${locale}-${width}-${variant}.png` });
        }
      }
    }
    console.log(`PASS ${locale}: both films play across seven viewports; media, copy and controls fit`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/en#interior-film`, { waitUntil: "networkidle" });
  const film = await enterFilm("walkthrough");
  await film.locator(".film-play").click();
  await page.locator(".home-services").scrollIntoViewIfNeeded();
  await film.evaluate(el => window.scrollTo({ top: el.offsetTop + 110, behavior: "instant" }));
  await page.waitForTimeout(400);
  assert.ok(await film.locator("video").evaluate(video => video.paused), "Explicit pause was lost after re-entry");
  await film.locator(".film-play").click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterFilm("walkthrough");
  assert.ok((await film.locator("video").evaluate(video => video.currentSrc)).endsWith("/interior-walkthrough.mp4"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(400);
  assert.ok(await film.locator("video").evaluate(video => video.paused), "Live reduced-motion change didn't pause video");
  await film.locator(".film-play").click();
  await page.waitForFunction(() => !document.querySelector("#interior-film video").paused);
  assert.deepEqual(errors, [], "Browser errors");
  console.log("PASS pause persists, resize swaps media, live reduced motion pauses and explicit playback works");
} finally {
  await browser.close();
}
