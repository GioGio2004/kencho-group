/* Deterministic failure-path checks; no CMS writes or customer messages.
 * Run with: node --import ./scripts/alias-hook.mjs scripts/verify-commercial.mjs */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

const data = new Map();
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
};
globalThis.window = { location: new URL("https://www.kenchogroup.ge/ka?utm_source=facebook&utm_campaign=kitchens&ref=owner") };
globalThis.document = { referrer: "https://www.facebook.com/kenchogroup?private=omit" };
const lead = await import("../lib/lead-ref.ts");
lead.captureSource();
const code = lead.getRefCode();
assert.match(code, /^KG-\d{4}$/);
window.location = new URL("https://www.kenchogroup.ge/ru/gallery/kitchens");
const enquiry = lead.getEnquiryAttribution("ru");
assert.equal(enquiry.locale, "ru");
assert.equal(enquiry.page, "/ru/gallery/kitchens");
assert.equal(enquiry.landing, "/ka");
assert.equal(enquiry.utm_source, "facebook");
assert.equal(enquiry.source, "owner");
assert.equal(enquiry.campaign, "kitchens");
assert.equal(enquiry.referrer, "https://www.facebook.com/kenchogroup");
assert.equal(lead.getRefCode(), code);
console.log("PASS attribution: first touch survives navigation and retains current locale/path");

globalThis.localStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
window.location = new URL("https://www.kenchogroup.ge/en?utm_source=instagram");
const blocked = await import(new URL("../lib/lead-ref.ts?blocked", import.meta.url));
blocked.captureSource();
window.location = new URL("https://www.kenchogroup.ge/en/about");
assert.equal(blocked.getEnquiryAttribution("en").utm_source, "instagram");
assert.equal(blocked.getRefCode(), blocked.getRefCode());
assert.ok(blocked.getSource());
console.log("PASS attribution: blocked storage still supports enquiry context and a stable page reference");

globalThis.localStorage = {
  getItem: (key) => key === "kg:ref-source" ? "legacy-referral/summer" : null,
  setItem() {},
};
window.location = new URL("https://www.kenchogroup.ge/ka/gallery/kitchens");
document.referrer = "";
const legacy = await import(new URL("../lib/lead-ref.ts?legacy", import.meta.url));
assert.equal(legacy.getEnquiryAttribution("ka").source, "legacy-referral/summer");
console.log("PASS attribution: pre-existing referral tags survive migration");

// Exercise the actual route handler with a controlled Convex dependency.
// This hook is test-only; production has no failure switch or test endpoint.
const mock = "data:text/javascript," + encodeURIComponent("export async function fetchQuery() { if(globalThis.__cmsUnavailable) throw new Error('simulated CMS outage'); return globalThis.__publishedGalleries; }");
const hook = registerHooks({ resolve(specifier, context, next) {
  return specifier === "convex/nextjs" ? { url: mock, shortCircuit: true } : next(specifier, context);
} });
globalThis.__publishedGalleries = ["kitchens", "wardrobes-storage", "home-interiors", "commercial-spaces"].map((slug) => ({ slug, createdAt: Date.UTC(2026, 9, 27) }));
const { GET } = await import("../app/sitemap.xml/route.ts");
const healthy = await GET();
assert.equal(healthy.status, 200);
const xml = await healthy.text();
assert.equal((xml.match(/<loc>/g) ?? []).length, 36);
globalThis.__cmsUnavailable = true;
const log = console.error;
console.error = () => {};
let unavailable;
try { unavailable = await GET(); } finally { console.error = log; }
assert.equal(unavailable.status, 503);
assert.match(unavailable.headers.get("cache-control"), /no-store/);
assert.ok(!((await unavailable.text()).includes("<urlset")));
globalThis.__cmsUnavailable = false;
assert.equal((await GET()).status, 200);
hook.deregister();
console.log("PASS sitemap: complete success, non-cacheable 503 on CMS failure, then recovery");

for (const locale of ["en", "ka", "ru"]) {
  const main = JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
  const home = JSON.parse(await readFile(new URL(`../messages/home-${locale}.json`, import.meta.url), "utf8"));
  const content = JSON.stringify([main, home]);
  assert.ok(!/3[–-]5\s*(weeks|недел|კვირ)|1[–-]3\s*(days|дн|დღ)|under one roof|instead of outsourcing|never changes after approval/i.test(content), `${locale}: retired commercial claim`);
  assert.match(main.commercial.furnitureFee, /30/);
  assert.match(main.commercial.interiorFee, /15–20/);
  assert.match(main.commercial.timeline, /6–8/);
  assert.match(main.commercial.stages.review.text, /7–10/);
  assert.match(main.commercial.stages.materials.text, /5–14/);
  assert.match(main.commercial.stages.installation.text, /7–10/);
  for (const slug of ["kitchens", "wardrobes-storage", "home-interiors", "commercial-spaces"])
    assert.ok(main.categoryGuides.items[slug].faq1a && main.categoryGuides.items[slug].faq2a);
  console.log(`PASS ${locale}: commercial facts, distinct fees, stages and four category guides`);
}
