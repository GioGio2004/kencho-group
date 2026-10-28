/* Full SEO audit against a running server (default http://localhost:3100).
 * Checks every route × locale: status, single h1, title/description
 * budgets, canonical, hreflang set, OG/Twitter, robots, JSON-LD types
 * per page — plus robots.txt, llms.txt, and the sitemap (app/sitemap.xml/route.ts,
 * valid XML, docs shape, every listed URL
 * responding 200). */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const BASE = process.env.SEO_BASE ?? "http://localhost:3100";
const SITE_URL = "https://www.kenchogroup.ge";
const LOCALES = ["ka", "ru", "en"];
const ROUTES = [
  { path: "/process", breadcrumb: true },
  { path: "/design-pricing", breadcrumb: true },
  { path: "/materials", breadcrumb: true },
  { path: "", breadcrumb: false },
  { path: "/about", breadcrumb: true },
  { path: "/faq", breadcrumb: true, faq: true },
  { path: "/contact", breadcrumb: true },
  { path: "/gallery", breadcrumb: true },
  { path: "/gallery/kitchens", breadcrumb: true, creativeWork: true },
  { path: "/gallery/wardrobes-storage", breadcrumb: true, creativeWork: true },
  { path: "/gallery/home-interiors", breadcrumb: true, creativeWork: true },
  { path: "/gallery/commercial-spaces", breadcrumb: true, creativeWork: true },
];

const results = [];
const publishedGalleryPaths = new Set();
const homeHtml = new Map();
const categoryHtml = new Map();
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
    if (route.path === "") homeHtml.set(locale, html);
    if (route.creativeWork) categoryHtml.set(path, html);
    if (route.path === "/gallery" && locale === "en") {
      for (const match of html.matchAll(/href="\/en(\/gallery\/[^"?/#]+)"/g)) publishedGalleryPaths.add(match[1]);
    }
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
  "llms.txt: markdown with gallery links and commercial facts",
  llms.status === 200 &&
    llmsBody.startsWith("# Kencho Group") &&
    llmsBody.includes("/en/gallery/") &&
    llmsBody.includes("30 GEL/m²") &&
    llmsBody.includes("LTB"),
);

const smRes = await fetch(`${BASE}/sitemap.xml`);
const sm = await smRes.text();
check(
  "sitemap: served as XML",
  /application\/xml/.test(smRes.headers.get("content-type") ?? "") &&
    sm.startsWith("<?xml"),
);
const urlCount = (sm.match(/<url>/g) ?? []).length;
const expectedPaths = [...ROUTES.filter(route => !route.creativeWork).map(route => route.path), ...publishedGalleryPaths];
const expectedUrls = expectedPaths.flatMap(path => LOCALES.map(locale => `${SITE_URL}/${locale}${path}`));
check("sitemap: current public routes and galleries in every locale", urlCount === expectedUrls.length, String(urlCount));
const lastmods = (sm.match(/<lastmod>/g) ?? []).length;
check("sitemap: lastmod on every entry (docs shape)", lastmods === urlCount, String(lastmods));
check("sitemap: no image/video extensions", !/xmlns:(image|video)/.test(sm));

/* Well-formedness + every listed URL answers 200 (mapped to this host). */
const browser = await chromium.launch({ channel: "chrome", headless: true });
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
check("sitemap: covers every expected URL without duplicates", new Set(parse.locs).size === expectedUrls.length && expectedUrls.every(url => parse.locs.includes(url)));
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

/* Parse the HTTP response in an inert document. RSC data and JS strings
 * must never count as visible/semantic HTML content for these assertions. */
const homeBodies = [];
const englishHomeFile = JSON.parse(await readFile(new URL("../messages/home-en.json", import.meta.url), "utf8"));
const englishLanding = englishHomeFile.landing;
const englishAiIsland = englishHomeFile.aiIsland;
const messageKeys = (messages, prefix = "") => Object.entries(messages).flatMap(([key, value]) =>
  typeof value === "object" ? messageKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
).sort();

for (const locale of LOCALES) {
  const localeHomeFile = JSON.parse(await readFile(new URL(`../messages/home-${locale}.json`, import.meta.url), "utf8"));
  const { landing, aiIsland } = localeHomeFile;
  check(
    `home /${locale}: complete dictionary`,
    JSON.stringify(messageKeys(landing)) === JSON.stringify(messageKeys(englishLanding)) &&
      JSON.stringify(messageKeys(aiIsland)) === JSON.stringify(messageKeys(englishAiIsland)),
  );

  const dom = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const text = (node) => node?.textContent.replace(/\s+/g, " ").trim() ?? "";
    const semantic = (node) => {
      if (!node) return "";
      const clone = node.cloneNode(true);
      clone.querySelectorAll('[aria-hidden="true"], script, style').forEach((n) => n.remove());
      return text(clone);
    };
    const main = doc.querySelector("main");
    return {
      h1: text(doc.querySelector("main h1")),
      lead: text(doc.querySelector("[data-hero-lead]")),
      body: semantic(main),
      rawBody: text(main),
      sections: [...doc.querySelectorAll("main > section")].map((s) => s.getAttribute("data-section")),
      categories: [...doc.querySelectorAll("[data-category-card]")].map((el) => ({
        slug: el.getAttribute("data-category-card"),
        href: el.getAttribute("href"),
        heading: text(el.querySelector("[data-category-heading]")),
        description: text(el.querySelector("[data-category-description]")),
      })),
      roadmapSteps: [...doc.querySelectorAll("[data-roadmap-step]")].map((el) => text(el)),
      techItems: [...doc.querySelectorAll("[data-tech-item]")].map((el) => text(el)),
      partners: [...doc.querySelectorAll("[data-partner-card]")].map((el) => el.getAttribute("data-partner-card")),
      pricingRows: [...doc.querySelectorAll("[data-pricing-row]")].map((el) => el.getAttribute("data-pricing-row")),
      faqs: [...doc.querySelectorAll("[data-home-faq]")].length,
      answers: [...doc.querySelectorAll("[data-home-faq-answer] p")].map(text),
      alts: [...main.querySelectorAll("img")].map((el) => el.getAttribute("alt")),
      business: JSON.parse([...doc.querySelectorAll('script[type="application/ld+json"]')].find((el) => el.textContent.includes('"FurnitureStore"')).textContent),
    };
  }, homeHtml.get(locale));

  const prefix = `home /${locale}`;
  homeBodies.push(dom.body);
  check(`${prefix}: exact localized H1`, dom.h1 === localeHomeFile.compact.headline, dom.h1);
  check(`${prefix}: six concise showcase sections`, JSON.stringify(dom.sections) === JSON.stringify(["hero", "categories", "roadmap", "ecosystem", "pricing", "faq"]));
  check(`${prefix}: localized introduction in initial HTML`, dom.lead === localeHomeFile.compact.lead);
  check(`${prefix}: four collection links in initial HTML`, dom.categories.length === 4 && ["kitchens", "wardrobes-storage", "commercial-spaces", "home-interiors"].every((slug, i) => dom.categories[i].href === `/${locale}/gallery/${slug}`));
  check(`${prefix}: detailed guides linked from initial HTML`, ["process", "materials", "design-pricing"].every(slug => homeHtml.get(locale).includes(`href="/${locale}/${slug}"`)));
  for (const [slug, section] of [["process", "roadmap"], ["materials", "ecosystem"], ["design-pricing", "pricing"]]) {
    const response = await fetch(`${BASE}/${locale}/${slug}`);
    const html = await response.text();
    const content = await page.evaluate(html => new DOMParser().parseFromString(html, "text/html").querySelector("main").textContent.replace(/\s+/g, " "), html);
    const strings = value => typeof value === "string" ? [value] : Object.values(value).flatMap(strings);
    check(`${prefix}: complete ${slug} guide in initial HTML`, response.ok && strings(landing[section]).every(copy => content.includes(copy)));
  }
  check(`${prefix}: service coverage`, ["Tbilisi", "Georgia"].every(name => dom.business.areaServed.some(area => area.name === name)));

}
check("home: three distinct localized main bodies", new Set(homeBodies).size === 3);

for (const locale of LOCALES) {
  const messages = JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
  for (const slug of ["kitchens", "wardrobes-storage", "home-interiors", "commercial-spaces"]) {
    const path = `/${locale}/gallery/${slug}`;
    const dom = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const guide = doc.querySelector("[data-buyer-guide]");
      return {
        h1: doc.querySelector("main h1")?.textContent,
        text: guide?.textContent.replace(/\s+/g, " "),
        stages: guide?.querySelectorAll("[data-project-stage]").length,
        faqs: guide?.querySelectorAll("details[data-category-faq]").length,
        afterGrid: !!(doc.querySelector(".catalogue-stage")?.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    }, categoryHtml.get(path));
    const guide = messages.categoryGuides.items[slug], commercial = messages.commercial;
    check(`${path}: localized H1 and complete buyer guide after photos`, dom.h1 === guide.title && dom.afterGrid && dom.stages === 4 && dom.faqs === 2 && [
      guide.focus, guide.faq1a, guide.faq2a, commercial.furnitureFee, commercial.interiorFee,
      commercial.timeline, commercial.quote, commercial.coverage, commercial.suppliers, commercial.technical, commercial.scope,
      ...Object.values(commercial.stages).map((stage) => stage.text),
    ].every((copy) => dom.text?.includes(copy)));
  }
}

const missing = await fetch(`${BASE}/en/gallery/does-not-exist`);
check("unknown gallery slug 404s", missing.status === 404);
await browser.close();

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
