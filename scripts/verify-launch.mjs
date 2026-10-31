import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { getFunctionName } from "convex/server";
import { cleanAttribution, fileError, matchesSignature, validateBrief, MAX_FILE_BYTES } from "../lib/project-request.ts";

const valid = { name: "Synthetic Visitor", phone: "+995555000111", furnitureType: "Kitchen", city: "Tbilisi", email: "", description: "Synthetic test only", dimensions: "I'm not sure", budget: "I'm not sure", timing: "" };
assert.deepEqual(validateBrief(valid).errors, []);
assert.ok(validateBrief({ ...valid, phone: "123", email: "invalid" }).errors.includes("phone"));
assert.ok(validateBrief({ ...valid, city: "" }).errors.includes("city"));
assert.equal(fileError({ name: "photo.svg", type: "image/svg+xml", size: 10 }), "fileType");
assert.equal(fileError({ name: "fake.pdf", type: "image/png", size: 10 }), "fileType");
assert.equal(fileError({ name: "big.pdf", type: "application/pdf", size: MAX_FILE_BYTES+1 }), "fileSize");
assert.equal(matchesSignature("application/pdf", new TextEncoder().encode("%PDF-1.7")), true);
assert.equal(matchesSignature("image/jpeg", new TextEncoder().encode("<script>")), false);
assert.deepEqual(cleanAttribution({ landing: "/en/contact?phone=secret", referrer: "https://example.com/private?email=secret", utm_source: "facebook" }), { landing: "/en/contact", referrer: "https://example.com", utm_source: "facebook", utm_medium: null, utm_campaign: null, utm_content: null });

const storage = new Map();
globalThis.window = {};
globalThis.location = { search: "?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch&utm_content=video", pathname: "/ka" };
globalThis.document = { referrer: "https://facebook.com/somewhere?secret=1" };
globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key,value) => storage.set(key,value) };
const { captureAttribution } = await import("../lib/attribution.ts");
const first = structuredClone(captureAttribution());
location.search = ""; location.pathname = "/ka/gallery/kitchens";
assert.deepEqual(captureAttribution().first, first.first);
location.search = "?utm_source=tiktok&utm_campaign=second";
assert.equal(captureAttribution().latest.utm_source, "tiktok");
assert.equal(captureAttribution().first.utm_source, "facebook");
delete globalThis.window;

// Exercise the real Next handlers with controlled database/provider adapters.
// No credentials, public database writes, or real messages are used.
const cookieJar = new Map();
const saved = new Map();
const reservations = new Map();
let imagekitFiles = []; let uploadCount = 0; let failSave = false; let rateAllowed = true;
globalThis.__cookies = { get: name => cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined, set: (name,value) => cookieJar.set(name,value) };
globalThis.__mutation = async (fn,args) => {
  const name = getFunctionName(fn);
  assert.equal(args.secret, process.env.LEAD_INGEST_SECRET);
  if (name === "launch:consumeRate") return { ok: rateAllowed, retryAfter: 60 };
  if (name === "launch:reserveUpload") {
    const record = reservations.get(args.uploadId) || { uploadId: args.uploadId, filePath: `/private-leads/${args.sessionId}/${args.uploadId}.pdf`, completed: false };
    reservations.set(args.uploadId, record); return record;
  }
  if (name === "launch:completeUpload") { reservations.get(args.uploadId).completed = true; return { uploadId: args.uploadId }; }
  if (name === "launch:cancelUpload") return null;
  if (name === "launch:submit") {
    if (failSave) throw new Error("simulated database failure");
    if (saved.has(args.requestId)) return { reference: saved.get(args.requestId).reference, duplicate: true };
    saved.set(args.requestId, { ...args, reference: "KG-1001" });
    return { reference: "KG-1001", duplicate: false };
  }
  throw new Error(`Unexpected function ${name}`);
};
registerHooks({
  resolve(specifier, context, next) {
    if (["server-only", "next/headers", "convex/browser"].includes(specifier)) return { url: `launch-test:${specifier}`, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "launch-test:server-only") return { format: "module", shortCircuit:true, source: "export {};" };
    if (url === "launch-test:next/headers") return { format: "module", shortCircuit:true, source: "export async function cookies() { return globalThis.__cookies; }" };
    if (url === "launch-test:convex/browser") return { format: "module", shortCircuit:true, source: "export class ConvexHttpClient { mutation(fn,args) { return globalThis.__mutation(fn,args); } }" };
    return next(url, context);
  },
});
process.env.LEAD_INGEST_SECRET = "synthetic-test-secret-never-use-in-production";
process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
process.env.IMAGE_KIT_SECRET_KEY = "synthetic-imagekit-key";
process.env.SITE_ORIGIN = "http://localhost:3100";
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith("https://api.imagekit.io/v1/files")) return Response.json(imagekitFiles);
  assert.equal(String(url), "https://upload.imagekit.io/api/v1/files/upload");
  assert.equal(options.body.get("isPrivateFile"), "true");
  assert.equal(options.body.get("useUniqueFileName"), "false");
  uploadCount++;
  const filePath = `${options.body.get("folder")}/${options.body.get("fileName")}`;
  imagekitFiles = [{ filePath, fileId: "synthetic-file", isPrivateFile: true, size: 8 }];
  return Response.json({ filePath, fileId: "synthetic-file" });
};
const sessionRoute = await import("../app/api/project-request/session/route.ts");
const leadRoute = await import("../app/api/project-request/route.ts");
const uploadRoute = await import("../app/api/project-request/upload/route.ts");
function req(path, body, origin = "http://localhost:3100") {
  return new Request(`http://localhost:3100${path}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
assert.equal((await sessionRoute.POST(req("/api/project-request/session", {}, "https://evil.invalid"))).status, 403);
assert.equal((await leadRoute.POST(req("/api/project-request", {}))).status, 401);
assert.equal((await sessionRoute.POST(req("/api/project-request/session", {}))).status, 200);
const requestId = crypto.randomUUID();
const body = { requestId, brief: valid, locale: "en", attachmentIds: [], firstAttribution: first.first, latestAttribution: captureAttribution().latest, website: "" };
failSave = true;
assert.equal((await leadRoute.POST(req("/api/project-request", body))).status, 503);
assert.equal(saved.size, 0);
failSave = false;
assert.deepEqual(await (await leadRoute.POST(req("/api/project-request", body))).json(), { reference: "KG-1001", duplicate: false });
assert.deepEqual(await (await leadRoute.POST(req("/api/project-request", body))).json(), { reference: "KG-1001", duplicate: true });
assert.equal(saved.size, 1);
assert.equal(saved.get(requestId).lead.firstAttribution.utm_source, "facebook");
assert.equal((await leadRoute.POST(req("/api/project-request", { ...body, website: "spam" }))).status, 400);
rateAllowed = false;
assert.equal((await leadRoute.POST(req("/api/project-request", body))).status, 429);
rateAllowed = true;
const uploadId = crypto.randomUUID();
function uploadRequest(content = "%PDF-1.7") {
  const form = new FormData(); form.set("uploadId", uploadId); form.set("file", new File([content], "design.pdf", { type: "application/pdf" }));
  return new Request("http://localhost:3100/api/project-request/upload", { method: "POST", headers: { origin: "http://localhost:3100" }, body: form });
}
assert.equal((await uploadRoute.POST(uploadRequest("<script>"))).status, 400);
assert.equal((await uploadRoute.POST(uploadRequest())).status, 200);
assert.equal(uploadCount, 1);
reservations.get(uploadId).completed = false; // Provider succeeded; DB acknowledgement lost.
assert.equal((await uploadRoute.POST(uploadRequest())).status, 200);
assert.equal(uploadCount, 1, "Ambiguous provider success must be reconciled, not uploaded twice");
cookieJar.set("kg-enquiry", "tampered");
assert.equal((await uploadRoute.POST(uploadRequest())).status, 401);
console.log("PASS launch validation, attribution navigation, origin/session guards, save failure, idempotent retry, rate limit, private upload/signature and ambiguous-upload recovery (controlled adapters)");

const { isAllowedOrigin } = await import("../lib/request-origin.ts");
const oldMode = process.env.NODE_ENV;
process.env.NODE_ENV = "development";
const tunnel = "https://test.ngrok-free.app";
const tunnelRequest = (origin = tunnel, host = "test.ngrok-free.app", site = "same-origin") => new Request("http://localhost:3100/api/project-request/session", {
  method: "POST", headers: { origin, "x-forwarded-host": host, "sec-fetch-site": site },
});
assert.equal(isAllowedOrigin(tunnelRequest()), true);
assert.equal(isAllowedOrigin(tunnelRequest("https://evil.invalid", "evil.invalid")), false);
assert.equal(isAllowedOrigin(tunnelRequest(tunnel, "other.ngrok-free.app")), false);
assert.equal(isAllowedOrigin(tunnelRequest(tunnel, "test.ngrok-free.app", "cross-site")), false);
process.env.NODE_ENV = "production";
assert.equal(isAllowedOrigin(tunnelRequest()), false);
process.env.SITE_ORIGIN = tunnel;
assert.equal(isAllowedOrigin(tunnelRequest()), true);
process.env.SITE_ORIGIN = "http://localhost:3100";
if (oldMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldMode;
console.log("PASS tunnel same-host origin checks and production/cross-site rejection");

const { assistantHistory } = await import("../lib/assistant-request.ts");
const longQuestion = "ა".repeat(3000);
const history = assistantHistory(Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: longQuestion })));
assert.equal(history.at(-1).content, longQuestion);
assert.equal(history.reduce((n, m) => n + m.content.length, 0), 12000);
assert.equal((await sessionRoute.POST(req("/api/project-request/session", {}))).status, 200);
process.env.GEMINI_API_KEY = "synthetic-provider-key";
let providerMode = "success";
globalThis.fetch = async (_url, options) => {
  const payload = JSON.parse(options.body);
  assert.equal(payload.contents.at(-1).parts[0].text, longQuestion);
  if (providerMode === "rate") return Response.json({}, { status: 429 });
  if (providerMode === "malformed") return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "invalid json" }] } }] });
  return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ reply: "Verified answer", brief: { furnitureType: "Kitchen" } }) }] } }] });
};
const aiRoute = await import("../app/api/ai-consultant/route.ts");
const aiBody = { locale: "ka", messages: history, brief: { city: "Batumi" } };
const aiResponse = await aiRoute.POST(req("/api/ai-consultant", aiBody));
assert.equal(aiResponse.status, 200, "Valid Georgian history exceeds old byte limit");
assert.deepEqual((await aiResponse.json()).brief, { city: "Batumi", furnitureType: "Kitchen" });
providerMode = "rate";
assert.equal((await aiRoute.POST(req("/api/ai-consultant", aiBody))).status, 429);
providerMode = "malformed";
assert.equal((await aiRoute.POST(req("/api/ai-consultant", aiBody))).status, 503);
assert.equal((await aiRoute.POST(req("/api/ai-consultant", { ...aiBody, messages: [{ role: "system", content: "bad" }] }))).status, 400);
console.log("PASS full Georgian chat payload, bounded history, brief preservation, provider rate limit and invalid responses");

const { ensureEnquirySession, fetchWithEnquirySession, resetEnquirySession } = await import("../lib/request-client.ts");
let sessions = 0, calls = 0;
globalThis.fetch = async url => {
  if (url.endsWith("/session")) { sessions++; return Response.json({ ok: true }); }
  calls++;
  return calls === 1 ? Response.json({ error: "session" }, { status: 401 }) : Response.json({ reply: "OK" });
};
assert.equal((await fetchWithEnquirySession("/api/ai-consultant", { method: "POST" })).status, 200);
assert.equal(sessions, 2);
assert.equal(calls, 2);
resetEnquirySession();
let releaseSession;
globalThis.fetch = () => new Promise(resolve => { releaseSession = () => resolve(Response.json({ ok: true })); });
const controller = new AbortController();
const waiting = ensureEnquirySession(controller.signal);
controller.abort();
await assert.rejects(waiting, { name: "AbortError" });
releaseSession();
await ensureEnquirySession();
console.log("PASS session renewal and immediate cancellation during shared session initialization");
