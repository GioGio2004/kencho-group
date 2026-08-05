import { chromium } from "playwright";

const BASE = "http://localhost:4500";
const ROUTES = [
  "/en", "/ka", "/ru",
  "/en/planner", "/ka/planner", "/ru/planner",
];

function stripToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const out = [];

for (const r of ROUTES) {
  const res = await fetch(BASE + r);
  const html = await res.text();
  const text = stripToText(html);
  out.push({
    route: r,
    status: res.status,
    prerenderHeader: res.headers.get("x-nextjs-prerender"),
    cacheHeader: res.headers.get("x-nextjs-cache"),
    htmlBytes: html.length,
    serverTextChars: text.length,
    h1Count: (html.match(/<h1/gi) || []).length,
    h2Count: (html.match(/<h2/gi) || []).length,
    imgCount: (html.match(/<img/gi) || []).length,
    svgCount: (html.match(/<svg/gi) || []).length,
    buttonCount: (html.match(/<button/gi) || []).length,
    inputCount: (html.match(/<input/gi) || []).length,
    hasSelfClosingBodyOnly: /<body[^>]*>\s*<\/body>/i.test(html),
    textSample: text.slice(0, 260),
  });
}

console.log("=== RAW HTML (no JS at all, plain fetch) ===");
console.table(out.map(({ textSample, ...o }) => o));
for (const o of out) console.log(o.route, "->", JSON.stringify(o.textSample));

// Now: JS-disabled browser render vs JS-enabled, to see how much is client-only.
const browser = await chromium.launch();

for (const r of ROUTES) {
  const ctxNo = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const pNo = await ctxNo.newPage();
  await pNo.goto(BASE + r, { waitUntil: "domcontentloaded" });
  const noJs = await pNo.evaluate(() => {
    const b = document.body;
    return {
      bodyTextLen: (b.innerText || "").replace(/\s+/g, " ").trim().length,
      domNodes: document.querySelectorAll("*").length,
      scrollH: document.documentElement.scrollHeight,
      htmlClass: document.documentElement.className,
      theme: document.documentElement.getAttribute("data-theme"),
      firstH1: (document.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    };
  });
  await ctxNo.close();

  const ctxYes = await browser.newContext({ javaScriptEnabled: true, viewport: { width: 1440, height: 900 } });
  const pYes = await ctxYes.newPage();
  await pYes.goto(BASE + r, { waitUntil: "networkidle" });
  await pYes.waitForTimeout(1500);
  const yesJs = await pYes.evaluate(() => {
    const b = document.body;
    return {
      bodyTextLen: (b.innerText || "").replace(/\s+/g, " ").trim().length,
      domNodes: document.querySelectorAll("*").length,
      scrollH: document.documentElement.scrollHeight,
      firstH1: (document.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
    };
  });
  await ctxYes.close();

  console.log(`\n### ${r}`);
  console.log("  noJS :", JSON.stringify(noJs));
  console.log("  JS   :", JSON.stringify(yesJs));
}

await browser.close();
