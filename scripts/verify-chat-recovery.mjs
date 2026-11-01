import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // Exercise browsers that lack the newer static abort helpers.
    AbortSignal.any = undefined;
    AbortSignal.timeout = undefined;
  });
  let pending = true;
  const requests = [];
  await page.route("**/api/project-request/session", route => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/ai-consultant", async route => {
    requests.push(route.request().postDataJSON());
    if (pending) return; // Deliberately leave the network request unanswered.
    await route.fulfill({ json: { reply: "Recovered answer", brief: {}, ui: { media: [] } } });
  });
  await page.goto(`${process.env.BASE || "http://localhost:3000"}/en/chat`, { waitUntil: "domcontentloaded" });
  await page.locator(".chat-composer textarea").fill("Please answer this question");
  await page.waitForFunction(() => !document.querySelector(".chat-composer button[type=submit]")?.disabled);
  await page.clock.install();
  await page.locator(".chat-composer button[type=submit]").click();
  await page.waitForFunction(() => document.querySelector("[data-ai-stop]"));
  // Session initialization is shared; wait until the AI request has started.
  await assertEventually(() => requests.length === 1);
  await page.clock.fastForward(56000);
  await page.locator(".chat-error").waitFor();
  assert.equal(await page.locator("[data-ai-stop]").count(), 0, "Timeout releases the composer");
  await page.locator(".chat-composer textarea").fill("Preserve this new draft");
  pending = false;
  await page.locator(".chat-error button").click();
  await page.getByText("Recovered answer", { exact: true }).waitFor();
  assert.equal(await page.locator(".is-user").count(), 1, "Retry must not duplicate the question");
  assert.equal(await page.locator(".chat-composer textarea").inputValue(), "Preserve this new draft");
  await page.locator("[data-ai-exit]").click();
  await page.locator("[data-ai-trigger]").waitFor();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("kencho:ai-open", { detail: { prompt: "Tell me about this gallery kitchen" } })));
  await assertEventually(() => requests.length === 3);
  assert.equal(requests.at(-1).messages.at(-1).content, "Tell me about this gallery kitchen");
  await page.getByText("Recovered answer", { exact: true }).last().waitFor();
  console.log("PASS request timeout, retry without duplicates, draft preservation, older abort API compatibility and gallery prompt handoff");
} finally { await browser.close(); }

async function assertEventually(check) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(check(), "Expected request was not sent");
}
