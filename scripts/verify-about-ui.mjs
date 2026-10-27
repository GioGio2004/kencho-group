import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const base = process.env.LANDING_BASE || 'http://localhost:3000';
const output = path.join(os.tmpdir(), 'kencho-about-ui-2026-10-28');
await fs.mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
let checks = 0;
try {
  for (const locale of ['en', 'ka', 'ru']) {
    const context = await browser.newContext({reducedMotion: 'reduce'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 950});
      const response = await page.goto(`${base}/${locale}/about`);
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('#about-film video[controls]').count(), 1);
      assert.equal(await page.locator('.about-page ol li').count(), 5);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale} ${width}: overflow`);
      assert(await page.locator('h1').evaluate(el => {
        const range = document.createRange(); range.selectNodeContents(el);
        return [...range.getClientRects()].every(r => r.left >= -1 && r.right <= innerWidth + 1);
      }), `${locale} ${width}: title clipping`);
      if (width === 390 || width === 1440) {
        for (const img of await page.locator('.about-page img').all()) {
          await img.scrollIntoViewIfNeeded();
          await img.evaluate(el => el.decode());
        }
        await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
        await page.screenshot({path: path.join(output, `${locale}-about-${width}.png`), fullPage: true});
      }
      checks++;
    }
    const playback = await page.locator('video').evaluate(async video => {
      video.muted = true;
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 400));
      const result = video.currentTime > 0 && video.videoWidth > 0;
      video.pause();
      return result;
    });
    assert(playback, `${locale}: film must play`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 950});
      await page.goto(`${base}/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const invitation = page.locator('[data-project-invitation]');
      await invitation.scrollIntoViewIfNeeded();
      assert.equal(await page.locator('[data-process-milestone]').count(), 0);
      assert.equal(await invitation.locator(`a[href="/${locale}/about"]`).count(), 1);
      await invitation.locator('img').evaluate(img => img.decode());
      assert(await invitation.locator('img').evaluate(img => img.complete && img.naturalWidth > 0));
      assert(await invitation.evaluate(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1;
      }), `${locale} ${width}: invitation clipping`);
      if (width === 390 || width === 1440) await invitation.screenshot({path: path.join(output, `${locale}-invitation-${width}.png`)});
      checks++;
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(`${checks} responsive checks passed; film plays in all three locales; no runtime errors. Screenshots: ${output}`);
} finally {
  await browser.close();
}
