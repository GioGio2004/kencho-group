/* Full SEO audit against a running server (default http://localhost:3100).
 * Checks every route × locale: status, single h1, title/description
 * budgets, canonical, hreflang set, OG/Twitter, robots, JSON-LD types
 * per page — plus robots.txt, llms.txt, and the sitemap (app/sitemap.ts,
 * the Next metadata convention: valid XML, docs shape, every listed URL
 * responding 200). */
import { chromium } from "playwright";

const BASE = process.env.SEO_BASE ?? "http://localhost:3100";
const SITE_URL = "https://www.kenchogroup.ge";
const LOCALES = ["ka", "ru", "en"];
const ROUTES = [
  { path: "", breadcrumb: false },
  { path: "/planner", breadcrumb: true },
  { path: "/projects", breadcrumb: true },
  { path: "/services", breadcrumb: true },
  { path: "/process", breadcrumb: true },
  { path: "/faq", breadcrumb: true, faq: true },
  { path: "/contact", breadcrumb: true },
  { path: "/gallery", breadcrumb: true },
  { path: "/gallery/kitchens", breadcrumb: true, creativeWork: true },
];

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const grab = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

const titlesByLocale = new Map(LOCALES.map((l) => [l, new Map()]));

for (const route of ROUTES) {
  for (const locale of LOCALES) {
    const path = `/${locale}${route.path}`;
    const res = await fetch(BASE + path);
    const html = await res.text();
    const id = path;
    const problems = [];

    if (res.status !== 200) problems.push(`status ${res.status}`);

    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1s !== 1) problems.push(`${h1s} h1 elements`);

    const title = grab(html, /<title>([^<]+)<\/title>/);
    if (!title) problems.push("no title");
    else {
      if (title.length > 70) problems.push(`title ${title.length}ch`);
      const seen = titlesByLocale.get(locale);
      if (seen.has(title)) problems.push(`title duplicates ${seen.get(title)}`);
      seen.set(title, id);
    }

    const desc = grab(
      html,
      /<meta name="description" content="([^"]*)"/,
    );
    if (!desc) problems.push("no description");
    else if (desc.length > 170) problems.push(`description ${desc.length}ch`);

    const canonical = grab(html, /<link rel="canonical" href="([^"]+)"/);
    if (canonical !== `${SITE_URL}${path}`) {
      problems.push(`canonical ${canonical}`);
    }

    /* Next emits the attribute camelCased (hrefLang) — HTML attribute
     * names are case-insensitive, so match accordingly. */
    const hreflangs = [
      ...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/gi),
    ].map((m) => m[1]);
    const wanted = [...LOCALES, "x-default"];
    if (!wanted.every((l) => hreflangs.includes(l))) {
      problems.push(`hreflang set [${hreflangs.join(",")}]`);
    }

    if (!/property="og:image"/.test(html)) problems.push("no og:image");
    if (!/name="twitter:card"/.test(html)) problems.push("no twitter:card");
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) {
      problems.push("noindex");
    }

    const ldBlocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => m[1]);
    const ldTypes = [];
    for (const block of ldBlocks) {
      try {
        ldTypes.push(JSON.parse(block)["@type"]);
      } catch {
        problems.push("unparseable JSON-LD");
      }
    }
    if (!ldTypes.includes("FurnitureStore")) problems.push("no business LD");
    if (route.faq && !ldTypes.includes("FAQPage")) problems.push("no FAQPage LD");
    if (!route.faq && ldTypes.includes("FAQPage")) problems.push("stray FAQPage LD");
    if (route.breadcrumb && !ldTypes.includes("BreadcrumbList")) {
      problems.push("no BreadcrumbList LD");
    }
    if (route.creativeWork && !ldTypes.includes("CreativeWork")) {
      problems.push("no CreativeWork LD");
    }

    check(`page ${id}`, problems.length === 0, problems.join("; "));
  }
}

/* ---- Global surfaces ---- */
const robots = await (await fetch(`${BASE}/robots.txt`)).text();
check(
  "robots.txt: sitemap + AI crawlers",
  robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`) &&
    robots.includes("GPTBot") &&
    robots.includes("ClaudeBot"),
);

const llms = await fetch(`${BASE}/llms.txt`);
const llmsBody = await llms.text();
check(
  "llms.txt: markdown with gallery links",
  llms.status === 200 && llmsBody.startsWith("# Kencho Group") &&
    llmsBody.includes("/en/gallery/"),
);

const smRes = await fetch(`${BASE}/sitemap.xml`);
const sm = await smRes.text();
check(
  "sitemap: served as XML",
  /application\/xml/.test(smRes.headers.get("content-type") ?? "") &&
    sm.startsWith("<?xml"),
);
const urlCount = (sm.match(/<url>/g) ?? []).length;
check("sitemap: 36 entries (8 routes + 4 galleries, ×3 locales)", urlCount === 36, String(urlCount));
/* Docs-conformant shape: every entry carries loc + hreflang alternates
 * + lastmod, nothing else rides along. */
const lastmods = (sm.match(/<lastmod>/g) ?? []).length;
check("sitemap: lastmod on every entry (docs shape)", lastmods === urlCount, String(lastmods));
check("sitemap: no image/video extensions", !/xmlns:(image|video)/.test(sm));

/* Well-formedness + every listed URL answers 200 (mapped to this host). */
const browser = await chromium.launch();
const page = await browser.newPage();
const parse = await page.evaluate((xml) => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  return {
    ok: !err,
    locs: [...doc.getElementsByTagName("loc")].map((n) => n.textContent),
  };
}, sm);
check("sitemap: well-formed XML", parse.ok, `${parse.locs.length} locs`);
let broken = 0;
for (const loc of parse.locs) {
  const local = loc.replace(SITE_URL, BASE);
  const r = await fetch(local, { method: "GET" });
  if (r.status !== 200) {
    broken++;
    results.push(`FAIL  sitemap URL ${loc} -> ${r.status}`);
  }
}
check("sitemap: every listed URL responds 200", broken === 0, `${parse.locs.length - broken}/${parse.locs.length}`);

const missing = await fetch(`${BASE}/en/gallery/does-not-exist`);
check("unknown gallery slug 404s", missing.status === 404);
await browser.close();

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
