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
  const overflow = await page.locator(".chat-page, .chat-context, .chat-composer, [data-ai-details]").evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2);
  }).map(el => el.className));
  assert.deepEqual(overflow, [], "Clipped chat controls");
}
try {
  for (const locale of (process.env.LOCALES || "en,ka,ru").split(",")) for (const width of (process.env.WIDTHS || "320,390,1440").split(",").map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 768, isMobile: width < 768,
      reducedMotion: "reduce", extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(60000);
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
      await page.locator(".chat-page .chat-composer").waitFor();
      await fits(page);
      await page.locator("[data-ai-details-toggle]").click();
      await page.locator("[data-ai-request-form]:visible").waitFor();
      await fits(page);
      await page.locator("[data-ai-request-form] input[name=city]").fill("Batumi");
      await page.locator(".chat-request-back").click();
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
      await page.locator(".chat-composer textarea").fill("Draft while retrying");
      await page.locator(".chat-error button").click();
      await page.waitForFunction(() => document.querySelectorAll("[role=log] .is-assistant strong").length === 3);
      assert.equal(await page.locator("[role=log] .is-user").count(), 3);
      assert.equal(await page.locator(".chat-composer textarea").inputValue(), "Draft while retrying", "Retry preserves a new draft");
      mode = "pending";
      await page.locator(".chat-composer textarea").fill("Stop this question");
      await page.locator(".chat-composer button[type=submit]").click();
      await page.locator("[data-ai-stop]").click();
      await page.locator("[data-ai-stop]").waitFor({ state: "hidden" });
      assert.equal(await page.locator(".chat-error").count(), 0);
      await page.waitForFunction(() => {
        const thread = document.querySelector(".chat-conversation");
        return thread.scrollHeight - thread.scrollTop - thread.clientHeight < 4;
      });
      await fits(page);
      await page.screenshot({ caret: "initial", path: join(output, `${locale}-${width}.png`) });
      await page.locator(".chat-page [data-theme-toggle]").click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      const labels = await page.locator("[data-theme-toggle]").evaluateAll(elements => elements.map(el => el.getAttribute("aria-label")));
      assert.equal(new Set(labels).size, 1, "Theme controls disagree");
      await page.locator(".chat-header [data-ai-request]").click();
      await page.locator("[data-ai-request-form]:visible").waitFor();
      assert.equal(await page.locator("[data-ai-request-form] input[name=city]").inputValue(), "Batumi");
      assert.equal(await page.locator("dialog[open]").count(), 0, "Chat and request review are full page");
      await page.keyboard.press("Escape");
      await page.locator("[data-ai-request-form]:visible").waitFor({ state: "hidden" });
      await page.locator(".chat-composer textarea").fill("My unsent draft");
      await page.reload({ waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector(".chat-composer textarea")?.value === "My unsent draft");
      assert.equal(await page.locator("[role=log] .is-user").count(), 4, "Conversation survives reload");
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      await fits(page);
      // Approximate the reduced visual viewport when a phone keyboard opens.
      await page.setViewportSize({ width, height: 440 });
      await page.locator(".chat-composer textarea").focus();
      await page.waitForFunction(() => {
        const r = document.querySelector(".chat-composer").getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight;
      });
      await fits(page);
      await page.screenshot({ caret: "initial", path: join(output, `${locale}-${width}-keyboard.png`) });
      await page.setViewportSize({ width, height: 900 });
      await page.locator("[data-ai-exit]").click();
      await page.locator("[data-ai-trigger]").waitFor();
      await page.locator("[data-ai-trigger]").click();
      await page.waitForFunction(() => document.querySelector(".chat-composer textarea")?.value === "My unsent draft");
      assert.equal(await page.locator("[role=log] .is-user").count(), 4, "Conversation survives navigation");
      await page.locator("[data-ai-new-chat]").click();
      await page.locator(".chat-welcome").waitFor();
      assert.equal(await page.locator(".chat-composer textarea").inputValue(), "");
      await page.reload({ waitUntil: "load" });
      await page.locator(".chat-welcome").waitFor();
      await page.waitForFunction(() => !document.querySelector(".chat-composer textarea")?.disabled);
      await page.screenshot({ caret: "initial", path: join(output, `${locale}-${width}-welcome.png`) });
      console.log(`PASS ${locale}/${width}: opening, full questions, session renewal, retry, stop, photos, handoff, themes, persistence, keyboard resizing and layout`);
    } catch (error) { await page.screenshot({ caret: "initial", path: join(output, `failure-${locale}-${width}.png`) }).catch(() => {}); failed++; console.error(`FAIL ${locale}/${width}: ${error.message}`); }
    finally { await context.close(); }
  }
  assert.deepEqual([...new Set(errors)], [], "Browser runtime/hydration errors");
} finally { await browser.close(); }
console.log(`Chat screenshots: ${output}`);
if (failed) process.exitCode = 1;
