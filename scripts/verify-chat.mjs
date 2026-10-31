import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const base = process.env.BASE || "http://localhost:3000";
const output = join(tmpdir(), "kencho-chat-verification");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
let failed = 0;
async function fits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const overflow = await page.locator("dialog[open], .chat-context, .chat-composer, [data-ai-details]").evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2);
  }).map(el => el.className));
  assert.deepEqual(overflow, [], "Clipped chat controls");
}
try {
  for (const locale of ["en", "ka", "ru"]) for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 768, isMobile: width < 768,
      reducedMotion: "reduce", extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /hydration|hydrated|didn't match/i.test(message.text())) errors.push(message.text()); });
    let mode = "success", sessionCount = 0, expired = false;
    const requests = [];
    await page.route("**/api/project-request/session", route => { sessionCount++; return route.fulfill({ json: { ok: true } }); });
    await page.route("**/api/ai-consultant", async route => {
      requests.push(route.request().postDataJSON());
      if (mode === "expired" && !expired) { expired = true; return route.fulfill({ status: 401, json: { error: "session" } }); }
      if (mode === "error") return route.fulfill({ status: 503, json: { error: "unavailable" } });
      if (mode === "pending") { await new Promise(resolve => setTimeout(resolve, 1500)); return route.abort().catch(() => {}); }
      return route.fulfill({ json: { reply: "**Verified answer** for your kitchen.", brief: { city: "Batumi", furnitureType: "Kitchen" }, ui: {
        category: "kitchens", media: [{ src: "/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp", alt: "Walnut kitchen", caption: "Walnut kitchen" }],
      } } });
    });
    try {
      await page.goto(`${base}/${locale}`, { waitUntil: "load" });
      await page.locator("[data-ai-trigger]").click();
      await page.locator("dialog.chat-modal[open] .chat-composer").waitFor();
      await fits(page);
      await page.locator("[data-ai-details-toggle]").click();
      await page.locator("[data-ai-details]").waitFor();
      await fits(page);
      await page.locator("[data-ai-details] input[id$='-city']").fill("Batumi");
      await page.locator("[data-ai-details] .chat-details-done").click();
      const question = "A".repeat(2200) + " final detail";
      await page.locator(".chat-composer textarea").fill(question);
      await page.locator(".chat-composer button[type=submit]").click();
      await page.locator("[role=log] .is-assistant strong").waitFor();
      assert.equal(requests.at(-1).messages.at(-1).content, question, "Long question was truncated");
      assert.equal(requests.at(-1).brief.city, "Batumi");
      await page.locator("[data-ai-media]").first().click();
      await page.locator("[data-ai-lightbox]").waitFor();
      await page.locator("[data-ai-lightbox-close]").click();
      await page.locator("[data-ai-lightbox]").waitFor({ state: "hidden" });
      mode = "expired";
      await page.locator(".chat-composer textarea").fill("Keep my session working");
      await page.locator(".chat-composer button[type=submit]").click();
      await page.waitForFunction(() => document.querySelectorAll("[role=log] .is-assistant strong").length === 2);
      assert.equal(sessionCount, 2, "Expired cookie wasn't renewed");
      mode = "error";
      await page.locator(".chat-composer textarea").fill("Retry my question");
      await page.locator(".chat-composer button[type=submit]").click();
      await page.locator(".chat-error").waitFor();
      mode = "success";
      await page.locator(".chat-error button").click();
      await page.waitForFunction(() => document.querySelectorAll("[role=log] .is-assistant strong").length === 3);
      assert.equal(await page.locator("[role=log] .is-user").count(), 3);
      mode = "pending";
      await page.locator(".chat-composer textarea").fill("Stop this question");
      await page.locator(".chat-composer button[type=submit]").click();
      await page.locator("[data-ai-stop]").click();
      await page.locator("[data-ai-stop]").waitFor({ state: "hidden" });
      assert.equal(await page.locator(".chat-error").count(), 0);
      await fits(page);
      await page.screenshot({ path: join(output, `${locale}-${width}.png`) });
      await page.locator("dialog.chat-modal [data-theme-toggle]").click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      const labels = await page.locator("[data-theme-toggle]").evaluateAll(elements => elements.map(el => el.getAttribute("aria-label")));
      assert.equal(new Set(labels).size, 1, "Theme controls disagree");
      await page.locator(".chat-header [data-ai-request]").click();
      await page.locator("dialog.sheet[open]").waitFor();
      assert.equal(await page.locator("dialog.sheet input[name=city]").inputValue(), "Batumi");
      await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest("dialog.sheet[open]")), "AI exit stole contact form focus");
      await page.keyboard.press("Escape");
      await page.locator("dialog.sheet[open]").waitFor({ state: "hidden" });
      assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), "hidden");
      await page.reload({ waitUntil: "load" });
      await page.locator("[data-ai-trigger]").click();
      await page.locator("dialog.chat-modal[open]").waitFor();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      await fits(page);
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert.ok(await page.evaluate(() => !!document.activeElement?.closest("dialog.chat-modal[open]")));
      }
      await page.keyboard.press("Escape");
      await page.locator("dialog.chat-modal[open]").waitFor({ state: "hidden" });
      assert.ok(await page.locator("[data-ai-trigger]").evaluate(el => el === document.activeElement));
      console.log(`PASS ${locale}/${width}: opening, full questions, session renewal, retry, stop, photos, handoff, themes, focus and layout`);
    } catch (error) { failed++; console.error(`FAIL ${locale}/${width}: ${error.message}`); }
    finally { await context.close(); }
  }
  assert.deepEqual([...new Set(errors)], [], "Browser runtime/hydration errors");
} finally { await browser.close(); }
console.log(`Chat screenshots: ${output}`);
if (failed) process.exitCode = 1;
