import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768, reducedMotion: "reduce" });
    const page = await context.newPage();
    const original = `${base}/en/materials?research=oak#ecosystem`;
    await page.goto(original, { waitUntil: "load" });
    await page.locator("[data-ai-trigger]").waitFor();
    await page.evaluate(() => scrollTo(0, 650));
    const position = await page.evaluate(() => scrollY);
    assert.ok(position > 200, "Origin has a meaningful reading position");
    await page.locator("[data-ai-trigger]").click();
    await page.locator("[data-ai-exit]").waitFor();
    await page.reload({ waitUntil: "load" });
    await page.locator("[data-ai-exit]").click();
    await page.waitForURL(original);
    await page.waitForFunction(y => Math.abs(scrollY-y) < 4, position);
    console.log(`PASS ${width}: exit restores previous URL, query, anchor and reading position after chat reload`);
    for (const locale of ["en", "ka", "ru"]) {
      const gallery = `${base}/${locale}/gallery`;
      await page.goto(gallery, { waitUntil: "load" });
      await page.locator("[data-ai-trigger]").click();
      await page.locator("[data-ai-exit]").waitFor();
      await page.locator("[data-ai-exit]").click();
      await page.waitForURL(gallery);
      // Check the return link also survives a full load without origin storage.
      await page.goto(`${base}/${locale}/chat?returnTo=${encodeURIComponent(`/${locale}/gallery`)}`, { waitUntil: "load" });
      await page.evaluate(() => {
        sessionStorage.removeItem("kg:chat-return");
        const state = { ...history.state };
        delete state.kgChatOrigin;
        history.replaceState(state, "");
      });
      await page.locator("[data-ai-exit]").click();
      await page.waitForURL(gallery);
      console.log(`PASS ${width}/${locale}: gallery → chat → exit returns to gallery, including without saved origin`);
    }
    const direct = await context.newPage();
    await direct.goto(`${base}/ru/chat`, { waitUntil: "load" });
    await direct.locator("[data-ai-exit]").click();
    await direct.waitForURL(`${base}/ru`);
    console.log(`PASS ${width}: direct chat entry uses safe localized fallback`);
    await context.close();
  }
} finally { await browser.close(); }
