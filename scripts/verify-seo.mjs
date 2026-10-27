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
const HOME_H1 = {
  ka: "სამზარეულოს და კარადების დამზადება შეკვეთით თბილისში — Kencho Group",
  ru: "Кухни и корпусная мебель на заказ в Тбилиси — Kencho Group",
  en: "Custom kitchens, wardrobes and bespoke millwork in Tbilisi — Kencho Group",
};
const ROUTES = [
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
const expectedPaths = [...ROUTES.filter(route => !route.creativeWork).map(route => route.path), ...publishedGalleryPaths];
const expectedUrls = expectedPaths.flatMap(path => LOCALES.map(locale => `${SITE_URL}/${locale}${path}`));
check("sitemap: current public routes and galleries in every locale", urlCount === expectedUrls.length, String(urlCount));
/* Docs-conformant shape: every entry carries loc + hreflang alternates
 * + lastmod, nothing else rides along. */
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
const englishHome = JSON.parse(await readFile(new URL("../messages/home-en.json", import.meta.url), "utf8")).era;
const messageKeys = (messages, prefix = "") => Object.entries(messages).flatMap(([key, value]) =>
  typeof value === "object" ? messageKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
).sort();
for (const locale of LOCALES) {
  const { era } = JSON.parse(await readFile(new URL(`../messages/home-${locale}.json`, import.meta.url), "utf8"));
  check(`home /${locale}: complete dictionary`, JSON.stringify(messageKeys(era)) === JSON.stringify(messageKeys(englishHome)));
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
      h1: text(doc.querySelector("h1 .sr-only")),
      body: semantic(main),
      rawBody: text(main),
      rooms: [...doc.querySelectorAll("[data-room-heading]")].map(text),
      descriptions: [...doc.querySelectorAll("[data-room-description] p")].map(text),
      hotspots: [...doc.querySelectorAll("[data-hero-hotspot]")].map((el) => ({ title: text(el.querySelector("h2")), description: text(el.querySelector("p")) })),
      answers: [...doc.querySelectorAll("[data-home-faq-answer] p")].map(text),
      headings: [...main.querySelectorAll("h1,h2,h3")].map(text),
      concept: semantic(doc.querySelector("#concept-heading")),
      craft: semantic(doc.querySelector("#concept h3")),
      rawCraft: text(doc.querySelector("#concept h3")),
      space: semantic([...doc.querySelectorAll("#concept h3")].at(-1)),
      made: semantic(doc.querySelector("#made-to-live-in-heading")),
      manifestoDisplay: text(doc.querySelector("[data-manifesto-display]")),
      manifestoPhrase: text(doc.querySelector("[data-manifesto-phrase]")),
      captions: [...doc.querySelectorAll("[data-caption-text]")].map(text),
      alts: [...main.querySelectorAll('img')].map((el) => el.getAttribute("alt")),
      categoryLinks: [...doc.querySelectorAll("[data-room-description] a")].map((el) => ({ href: el.getAttribute("href"), text: text(el) })),
      business: JSON.parse([...doc.querySelectorAll('script[type="application/ld+json"]')].find((el) => el.textContent.includes('"FurnitureStore"')).textContent),
    };
  }, homeHtml.get(locale));
  const prefix = `home /${locale}`;
  homeBodies.push(dom.body);
  check(`${prefix}: exact localized H1`, dom.h1 === HOME_H1[locale]);
  const script = locale === "ka" ? /[\u10a0-\u10ff]/ : locale === "ru" ? /[\u0400-\u04ff]/ : /[A-Za-z]/;
  check(`${prefix}: localized main copy`, script.test(dom.concept) && dom.body.includes(era.manifesto.heading));
  check(`${prefix}: localized copy across every active section`, [
    era.hero.tagline, era.concept.lineOne, era.collection.kitchensDescription,
    era.manifesto.heading, era.materials.oakCaption, era.editorial.hardwareDescription,
    era.quote.quote, era.hud.scroll,
  ].every(copy => dom.rawBody.includes(copy) && script.test(copy)));
  if (locale !== "en") {
    check(`${prefix}: no English section copy fallback`, [
      englishHome.hero.tagline, englishHome.concept.lineOne, englishHome.collection.kitchensDescription,
      englishHome.manifesto.heading, englishHome.materials.oakCaption,
      englishHome.editorial.hardwareDescription, englishHome.quote.quote,
    ].every(copy => !dom.rawBody.includes(copy)));
  }
  const services = ["kitchens", "wardrobes", "paneling", "commercial"];
  check(`${prefix}: all four service headings in initial HTML`, dom.rooms.length === 4 && services.every((key, i) => dom.rooms[i] === era.collection[`${key}Title`]));
  check(`${prefix}: all four service descriptions in initial HTML`, dom.descriptions.length === 4 && services.every((key, i) => dom.descriptions[i] === era.collection[`${key}Description`]));
  const hotspots = ["Measure", "Materials", "Workshop"];
  check(`${prefix}: all three hotspots in initial HTML`, dom.hotspots.length === 3 && hotspots.every((key, i) => dom.hotspots[i].title === era.hero[`hotspot${key}Title`] && dom.hotspots[i].description === era.hero[`hotspot${key}Description`]));
  const answers = ["faqDesignerAnswer", "faqNoDesignerAnswer", "faqTimelineAnswer", "faqVisitAnswer"];
  check(`${prefix}: all four FAQ answers in initial HTML`, dom.answers.length === 4 && answers.every((key, i) => dom.answers[i] === era.editorial[key]));
  const slugs = ["kitchens", "wardrobes-storage", "home-interiors", "commercial-spaces"];
  check(`${prefix}: direct localized category links`, dom.categoryLinks.length === 4 && slugs.every((slug, i) => dom.categoryLinks[i].href === `/${locale}/gallery/${slug}` && dom.categoryLinks[i].text === era.collection[`${services[i]}Link`]));
  check(`${prefix}: Tbilisi and Georgia service coverage`, ["Tbilisi", "Georgia"].every((name) => dom.business.areaServed.some((area) => area.name === name)));
  check(`${prefix}: intact split heading boundaries`,
    dom.concept === [era.concept.lineOne, era.concept.lineTwo, era.concept.lineThree].join(" ") &&
    dom.craft === [era.concept.new, era.concept.golden, era.concept.craft].join(" ") &&
    dom.rawCraft === [era.concept.new, era.concept.cityLabel, era.concept.golden, era.concept.craft].join(" ") &&
    dom.space === [era.concept.spaceWanted, era.concept.yours, era.concept.thisYear].join(" ") &&
    dom.made === [era.editorial.made, era.editorial.toLive].join(" ") &&
    !dom.headings.some((h) => /STUDIODESIGNED|TIMBERAND|NEWGOLDENCRAFT|WANTEDyoursTHIS|MADETo/.test(h)));
  check(`${prefix}: intact manifesto word boundaries`,
    dom.manifestoDisplay === [era.manifesto.city, era.manifesto.country, era.manifesto.workshop, era.manifesto.craft].join(" ") &&
    dom.manifestoPhrase === [era.manifesto.fromHands, era.manifesto.directly, era.manifesto.toHome].join(" ") &&
    !dom.manifestoDisplay.includes("G E O R G I A"));
  check(`${prefix}: all five intact material captions in initial HTML`,
    dom.captions.length === 5 && ["oak", "walnut", "stone", "light", "lacquer"].every((key, i) => dom.captions[i] === era.materials[`${key}Caption`]));
  check(`${prefix}: localized nondecorative image alts`, dom.alts.length > 0 && dom.alts.every((alt) => alt === "" || (alt !== null && script.test(alt))));
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
