/* Focused production UI checks. WhatsApp navigation is always prevented. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.env.BASE ?? process.env.LANDING_BASE ?? "http://localhost:3100").replace(/\/$/, "");
const output = process.env.ASSISTANT_OUTPUT ?? join(tmpdir(), "kencho-assistant-qa");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const runtimeErrors = new Set();
await mkdir(output, { recursive: true });

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

async function settle(page) {
  // Wait until the entering Framer Motion surface has reached its final state.
  await page.waitForFunction(() => {
    const workspace = document.querySelector("dialog[open] .chat-workspace");
    const composer = document.querySelector("dialog[open] .chat-composer");
    return workspace && composer && Number(getComputedStyle(workspace).opacity) > 0.999 &&
      composer.getBoundingClientRect().width > 100 &&
      (!workspace.getAnimations().some(animation => animation.playState === "running"));
  });
  await page.waitForTimeout(350);
}

async function assertFits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Page has horizontal overflow");
  const overflowing = await page.locator("dialog[open], .chat-workspace, .chat-context, .chat-composer, [data-ai-details]").evaluateAll(elements =>
    elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2);
    }).map(element => element.className),
  );
  assert.deepEqual(overflowing, [], "Chat has horizontal overflow");
}

async function openChat(page) {
  await page.locator("[data-ai-trigger]").click();
  await page.locator("dialog[open] [data-ai-drawer]").waitFor({ state: "visible" });
  await settle(page);
}

async function assertClosed(page, originalOverflow, opener = "[data-ai-trigger]") {
  await page.waitForFunction(() => !document.querySelector("dialog.chat-modal[open]"));
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), originalOverflow, "Page scroll lock was not released");
  assert.ok(await page.locator(opener).evaluate(element => element === document.activeElement), "Focus was not restored to the invoking control");
}

async function assertFocusContained(page) {
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press(key);
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest("dialog.chat-modal[open]")), `${key} escaped the modal`);
    }
  }
}

try {
  for (const locale of ["en", "ka", "ru"]) {
    const messages = JSON.parse(await readFile(new URL(`../messages/assistant-${locale}.json`, import.meta.url), "utf8"));
    const home = JSON.parse(await readFile(new URL(`../messages/home-${locale}.json`, import.meta.url), "utf8"));
    for (const width of [320, 390, 1440]) {
      const touch = width < 768;
      await check(`${locale}/${width}: chat, details, replies, retry and dismissal`, async () => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch });
        await context.addInitScript(() => {
          Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.__assistantCopied = value; } } });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        page.on("pageerror", error => runtimeErrors.add(`${locale}/${width}: ${error.message}`));
        let mode = "success";
        const requests = [];
        const pending = [];
        await page.route("**/api/ai-consultant", async route => {
          requests.push(route.request().postDataJSON());
          if (mode === "pending") {
            return new Promise(resolve => pending.push(async () => { try { await route.abort("aborted"); } catch {} resolve(); }));
          }
          if (mode === "sse") return route.fulfill({
            contentType: "text/event-stream", headers: { "Cache-Control": "no-store" },
            body: 'data: {"delta":"Streamed "}\n\ndata: {"delta":"**project answer**"}\n\ndata: {"done":true,"whatsappPrefill":"Project streaming summary","ui":{"category":"kitchens","media":[{"src":"/furniture/walnut-island-kitchen-tbilisi-kencho-group.webp","alt":"Walnut kitchen","caption":"Kitchen · walnut"},{"src":"/furniture/green-island-kitchen-tbilisi-kencho-group.webp","alt":"Green kitchen","caption":"Kitchen · green"}]}}\n\n',
          });
          if (mode === "error") return route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } });
          return route.fulfill({ json: { reply: "**Design rate**: `30 GEL/m²`\nMeasured by front elevation." } });
        });
        try {
          const response = await page.goto(`${base}/${locale}?utm_source=assistant-qa&utm_campaign=glass`, { waitUntil: "load", referer: "https://referrer.example/assistant" });
          assert.equal(response.status(), 200);
          await page.evaluate(() => document.fonts.ready);
          const originalOverflow = await page.evaluate(() => document.documentElement.style.overflow);
          await openChat(page);
          assert.equal(await page.locator("dialog.chat-modal[open]").count(), 1);
          assert.equal(await page.locator("[data-ai-chip]").count(), 3);
          assert.equal(await page.locator("dialog.chat-modal [role=dialog]").count(), 0, "Nested modal semantics");
          assert.equal(await page.locator("dialog.chat-modal [class*=emerald]").count(), 0);
          assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "hidden");
          const surface = await page.locator(".chat-context").evaluate(element => ({ background: getComputedStyle(element).backgroundColor, filter: getComputedStyle(element).backdropFilter }));
          assert.equal(surface.background, "rgb(0, 0, 0)", "Popup content must have an opaque black background");
          assert.equal(surface.filter, "none", "Black popup should not use a glass blur");
          const photoFrames = await page.locator("main .glass-media").evaluateAll(elements => elements.map(element => {
            const style = getComputedStyle(element);
            return { border: style.borderTopWidth, background: style.backgroundImage, fill: style.backgroundColor, shadow: style.boxShadow, radius: Number.parseFloat(style.borderTopLeftRadius) };
          }));
          assert.ok(photoFrames.length > 0, "Expected rounded image wrappers");
          for (const frame of photoFrames) { assert.equal(frame.border, "0px"); assert.equal(frame.background, "none"); assert.equal(frame.fill, "rgba(0, 0, 0, 0)"); assert.equal(frame.shadow, "none"); assert.ok(frame.radius >= 12); }
          if (!touch) {
            const bounds = await page.locator("dialog[open]").boundingBox();
            assert.ok(bounds.height >= 900 * 0.85, "Desktop chat is smaller than 85% of the viewport height");
            assert.ok(await page.locator(".chat-composer textarea").evaluate(element => element === document.activeElement));
          } else {
            assert.ok(await page.locator(".chat-composer textarea").evaluate(element => element !== document.activeElement), "Touch opening unnecessarily launches the keyboard");
          }
          await assertFits(page);
          await assertFocusContained(page);

          const detailsToggle = page.locator("[data-ai-details-toggle]");
          await detailsToggle.click();
          await page.locator("[data-ai-details]").waitFor();
          await page.waitForTimeout(350);
          assert.equal(await detailsToggle.getAttribute("aria-expanded"), "true");
          const details = page.locator("[data-ai-details]");
          await details.locator("input[id$='-city']").fill("Batumi QA");
          await details.locator("input[id$='-phone']").fill("+995 555 12 34 56");
          await assertFits(page);
          await details.getByRole("button", { name: messages.detailsDone, exact: true }).first().click();
          await details.waitFor({ state: "hidden" });
          await detailsToggle.click();
          await details.waitFor({ state: "visible" });
          await page.waitForTimeout(350);
          assert.equal(await details.locator("input[id$='-city']").inputValue(), "Batumi QA");
          assert.equal(await details.locator("input[id$='-phone']").inputValue(), "+995 555 12 34 56");

          // Prevent the browser action while letting the React attribution handler run.
          const handoff = details.locator("a[data-contact-method='whatsapp']");
          await page.evaluate(() => { window.__assistantContacts = []; window.fbq = (...args) => window.__assistantContacts.push(args); });
          await handoff.evaluate(element => element.addEventListener("click", event => event.preventDefault(), { once: true }));
          await handoff.click();
          const summary = new URL(await handoff.getAttribute("href")).searchParams.get("text");
          for (const value of ["Batumi QA", "+995 555 12 34 56", "assistant-qa", `/${locale}`, "referrer.example"]) assert.ok(summary.includes(value), `WhatsApp summary misses ${value}`);
          assert.match(summary, /KG-\d{4}/, "Missing enquiry reference");
          const contact = await page.evaluate(() => window.__assistantContacts.at(-1)?.[2]);
          assert.equal(contact?.locale, locale);
          assert.equal(contact?.utm_source, "assistant-qa");
          assert.equal(page.url(), `${base}/${locale}?utm_source=assistant-qa&utm_campaign=glass`);
          await details.getByRole("button", { name: messages.detailsDone, exact: true }).first().click();
          await details.waitFor({ state: "hidden" });

          await page.locator("[data-ai-chip]").first().click();
          const log = page.locator("[role=log]");
          await log.locator(".is-assistant").waitFor();
          assert.equal(await log.locator(".is-user").count(), 1);
          assert.equal(await log.locator("strong").textContent(), "Design rate");
          assert.equal(await log.locator("code").textContent(), "30 GEL/m²");
          assert.ok(!(await log.locator(".is-assistant").textContent()).includes("**"));
          assert.ok(!(await log.locator(".is-assistant").textContent()).includes("`"));
          assert.equal(requests.at(-1).locale, locale);
          assert.equal(requests.at(-1).stream, true, "UI should request real streaming responses");
          await log.locator("[data-ai-copy]").first().click();
          assert.ok((await page.evaluate(() => window.__assistantCopied)).includes("30 GEL/m²"), "Copy answer did not write the response");
          assert.equal(requests.at(-1).lead.city, "Batumi QA");
          assert.equal(requests.at(-1).lead.phone, "+995 555 12 34 56");

          mode = "error";
          await page.locator(".chat-composer textarea").fill("Please retry this project question");
          await page.locator(".chat-composer button[type=submit]").click();
          await log.getByRole("alert").waitFor();
          assert.equal(await log.locator(".is-user").count(), 2);
          const failedMessages = requests.at(-1).messages;
          mode = "success";
          await log.getByRole("button", { name: messages.retry, exact: true }).click();
          await page.waitForFunction(() => document.querySelectorAll("[role=log] .is-assistant").length === 2);
          assert.equal(await log.locator(".is-user").count(), 2, "Retry duplicated the user's message");
          assert.deepEqual(requests.at(-1).messages, failedMessages, "Retry changes the failed conversation payload");
          assert.equal(await log.getByRole("alert").count(), 0);
          assert.ok(await page.locator(".chat-header").evaluate(header => {
            const rect = header.getBoundingClientRect();
            const dialog = header.closest("dialog").getBoundingClientRect();
            for (let element = header; element; element = element.parentElement) {
              const style = getComputedStyle(element);
              if (Number(style.opacity) < 0.999 || style.visibility === "hidden") return false;
            }
            return rect.width > 0 && rect.height > 0 && rect.top >= dialog.top - 1 && rect.bottom <= dialog.bottom + 1;
          }), "Header is hidden or clipped after a reply");
          mode = "sse";
          await page.locator(".chat-composer textarea").fill("Stream this answer please");
          await page.locator(".chat-composer button[type=submit]").click();
          await page.waitForFunction(() => [...document.querySelectorAll("[role=log] .is-assistant")].some(element => element.textContent.includes("Streamed project answer")));
          await page.locator("[data-ai-stop]").waitFor({ state: "hidden" });
          assert.equal(await log.locator(".is-assistant strong").last().textContent(), "project answer");
          assert.equal(await log.locator("[data-ai-media-grid] [data-ai-media]").count(), 2, "Expected 2 showcased portfolio photos");
          assert.equal(await log.locator("[data-ai-book]").count(), 1, "Expected Book consultation button");
          assert.equal(await log.locator("[data-ai-call]").count(), 1, "Expected Direct call button");
          assert.equal(await log.locator("[data-ai-gallery]").count(), 1, "Expected Open gallery button");
          await log.locator("[data-ai-media]").first().click();
          await page.locator("[data-ai-lightbox]").waitFor({ state: "visible" });
          await page.locator("[data-ai-lightbox-close]").click();
          await page.locator("[data-ai-lightbox]").waitFor({ state: "hidden" });
          mode = "pending";
          await page.locator(".chat-composer textarea").fill("Stop this pending generation");
          await page.locator(".chat-composer button[type=submit]").click();
          await page.locator("[data-ai-stop]").waitFor();
          await page.locator("[data-ai-stop]").click();
          await page.locator("[data-ai-stop]").waitFor({ state: "hidden" });
          for (const release of pending.splice(0)) await release();
          assert.equal(await log.getByRole("alert").count(), 0, "Stopping should not show a network error");
          assert.equal(await page.locator(".chat-composer textarea").isEnabled(), true);
          await assertFits(page);
          if (width !== 320) await page.screenshot({ path: join(output, `${locale}-${width}-chat.png`) });

          await page.keyboard.press("Escape");
          await assertClosed(page, originalOverflow);
          await openChat(page);
          assert.equal(await page.locator("[role=log] .is-user").count(), 4, "Closing erased the conversation");
          await page.locator("[data-ai-new-chat]").click();
          assert.equal(await page.locator("[role=log]").count(), 0, "New chat did not reset the conversation");
          assert.equal(await page.locator("[data-ai-chip]").count(), 3);
          await page.getByRole("button", { name: home.aiIsland.close, exact: true }).click();
          await assertClosed(page, originalOverflow);
          await openChat(page);
          const bounds = await page.locator("dialog[open]").boundingBox();
          assert.ok(bounds.x > 1 || bounds.y > 1, "There is no exposed backdrop to test");
          await page.mouse.click(bounds.x > 1 ? bounds.x / 2 : width / 2, bounds.y > 1 ? bounds.y / 2 : 1);
          await assertClosed(page, originalOverflow);
        } finally { for (const release of pending.splice(0)) await release(); await context.close(); }
      });
    }
  }

  await check("Reduced motion and external opener focus restoration", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", error => runtimeErrors.add(`reduced-motion: ${error.message}`));
    try {
      await page.goto(`${base}/en`, { waitUntil: "load" });
      await page.evaluate(() => {
        const opener = document.createElement("button");
        opener.id = "assistant-test-opener";
        opener.textContent = "Open consultation";
        Object.assign(opener.style, { position: "fixed", top: "100px", left: "20px", zIndex: "100" });
        opener.onclick = () => window.dispatchEvent(new CustomEvent("kencho:open-ai"));
        document.body.append(opener);
      });
      const originalOverflow = await page.evaluate(() => document.documentElement.style.overflow);
      await page.locator("#assistant-test-opener").click();
      await page.locator("dialog[open] [data-ai-drawer]").waitFor();
      await settle(page);
      assert.ok(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));
      await assertFits(page);
      await assertFocusContained(page);
      await page.keyboard.press("Escape");
      await assertClosed(page, originalOverflow, "#assistant-test-opener");
    } finally { await context.close(); }
  });
  await check("No browser runtime errors", () => assert.deepEqual([...runtimeErrors], []));
} finally {
  await browser.close();
  await writeFile(join(output, "results.json"), JSON.stringify({ base, results, runtimeErrors: [...runtimeErrors] }, null, 2));
}
const failed = results.filter(result => !result.passed).length;
console.log(`${results.length - failed}/${results.length} checks passed. Report: ${output}`);
if (failed) process.exitCode = 1;
