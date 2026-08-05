import { chromium } from "playwright";

const ROUTES = ["/en", "/ka", "/ru", "/en/planner", "/ka/planner", "/ru/planner"];
const BASE = "http://localhost:4500";

const browser = await chromium.launch();
const out = [];

for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.goto(BASE + route, { waitUntil: "load" });

  // Read immediately after load (pre-heavy-JS) and again after settle.
  const read = () =>
    page.evaluate(() => {
      const links = [...document.querySelectorAll('link[rel="alternate"]')];
      return {
        // getAttribute with the LOWERCASE name proves HTML parser normalization
        lower: links.map((l) => l.getAttribute("hreflang")),
        camel: links.map((l) => l.getAttribute("hrefLang")),
        prop: links.map((l) => l.hreflang),
        hrefs: links.map((l) => l.getAttribute("href")),
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(
          (l) => l.getAttribute("href"),
        ),
        htmlLang: document.documentElement.lang,
        // does querySelector by lowercase attr selector match?
        selectorMatch: document.querySelectorAll(
          'link[rel="alternate"][hreflang]',
        ).length,
        xDefault: document.querySelector(
          'link[rel="alternate"][hreflang="x-default"]',
        )?.getAttribute("href") ?? null,
      };
    });

  const early = await read();
  await page.waitForTimeout(3500);
  const late = await read();

  out.push({ route, early, late });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
