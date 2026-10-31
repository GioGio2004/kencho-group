import assert from "node:assert/strict";
import { chromium } from "playwright";

// Every request endpoint is intercepted: this suite never creates a real lead or upload.
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    let sessions = 0, uploads = 0;
    const submissions = [], uploadIds = [];
    await page.addInitScript(() => {
      window.releasedPreviews = [];
      const revoke = URL.revokeObjectURL;
      URL.revokeObjectURL = url => { window.releasedPreviews.push(url); revoke(url); };
    });
    await page.route("**/api/project-request**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path.endsWith("/session")) { sessions++; return route.fulfill({ json: { ok: true } }); }
      if (path.endsWith("/upload")) {
        assert.equal(request.method(), "POST");
        uploads++;
        const uploadId = request.postDataBuffer().toString().match(/name="uploadId"\r\n\r\n([^\r]+)/)?.[1];
        assert.ok(uploadId); uploadIds.push(uploadId);
        if (uploads === 1) return route.fulfill({ status: 401, json: { error: "session" } });
        return route.fulfill({ json: { uploadId } });
      }
      assert.equal(path, "/api/project-request");
      submissions.push(request.postDataJSON());
      if (submissions.length === 1) return route.fulfill({ status: 503, json: { error: "unavailable" } });
      return route.fulfill({ json: { reference: "KG-SYNTHETIC", duplicate: false } });
    });
    await page.goto(`${process.env.BASE || "http://localhost:3000"}/en/contact`, { waitUntil: "networkidle" });
    const form = page.locator("main .project-request");
    await form.locator('[name="name"]').fill("Synthetic visitor");
    await form.locator('[name="phone"]').fill("+995555000111");
    await form.locator('[name="furnitureType"]').fill("Kitchen");
    await form.locator('[name="city"]').fill("Tbilisi");
    await form.locator('input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfXcAAAAASUVORK5CYII=", "base64") });
    await form.locator('[type="submit"]').click();
    await form.locator('[role="alert"]').waitFor();
    assert.equal(uploads, 2, "Expired upload session is renewed once");
    assert.equal(sessions, 2);
    assert.equal(uploadIds[0], uploadIds[1], "Upload identity survives renewal");
    await form.locator('[type="submit"]').click();
    const success = page.locator("main .request-success");
    await success.waitFor();
    assert.match(await success.innerText(), /KG-SYNTHETIC/);
    assert.equal(submissions.length, 2);
    assert.equal(submissions[0].requestId, submissions[1].requestId, "Save retries retain idempotency key");
    assert.deepEqual(submissions[0].attachmentIds, submissions[1].attachmentIds);
    assert.equal(uploads, 2, "Save retries reuse successful uploads");
    await success.locator("button").click();
    assert.equal(await form.locator('[name="name"]').inputValue(), "");
    assert.equal(await page.evaluate(() => window.releasedPreviews.length), 1, "Reset releases local preview");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.close();
    console.log(`PASS shared request form: ${width}px, private upload renewal, save retry, reset (mocked services)`);
  }
} finally { await browser.close(); }
