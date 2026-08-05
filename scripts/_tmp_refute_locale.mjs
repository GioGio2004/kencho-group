import { chromium } from "playwright";

const BASE = "http://localhost:4500";
const out = (k, v) => console.log(`${k}\t${JSON.stringify(v)}`);

const SWITCHER_SEL = '[role="group"][aria-label="Language"], [role="group"][aria-label="Язык"], [role="group"][aria-label="ენა"]';

const browser = await chromium.launch();

// ---------- 1. NO-JS: is the copy server-rendered? ----------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  for (const loc of ["en", "ka", "ru"]) {
    await p.goto(`${BASE}/${loc}`, { waitUntil: "domcontentloaded" });
    out(`nojs.${loc}.lang`, await p.getAttribute("html", "lang"));
    out(`nojs.${loc}.title`, (await p.title()).slice(0, 40));
  }
  // 1b. NO-JS: can a visitor actually switch? click the RU button on /en
  await p.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
  const groups = await p.locator(SWITCHER_SEL).count();
  out("nojs.en.switcherGroups", groups);
  const tags = await p.locator(`${SWITCHER_SEL} >> css=*`).evaluateAll((els) =>
    els.map((e) => ({ tag: e.tagName, href: e.getAttribute("href"), txt: e.textContent.trim() })),
  );
  out("nojs.en.switcherChildren", tags);
  const before = p.url();
  await p.locator(SWITCHER_SEL).first().getByText("RU", { exact: true }).click({ timeout: 3000 }).catch((e) => out("nojs.clickErr", String(e).slice(0, 80)));
  await p.waitForTimeout(1200);
  out("nojs.urlBefore", before);
  out("nojs.urlAfterClickingRU", p.url());
  out("nojs.langAfterClick", await p.getAttribute("html", "lang"));
  // keyboard path: Enter on a focused option
  await ctx.close();
}

// ---------- 2. JS ON: does clicking change the URL & the document? ----------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const docReqs = [];
  p.on("request", (r) => { if (r.resourceType() === "document") docReqs.push(r.url()); });
  await p.goto(`${BASE}/en`, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const sw = p.locator(SWITCHER_SEL).first();
  await sw.scrollIntoViewIfNeeded();
  await sw.getByText("RU", { exact: true }).click();
  await p.waitForTimeout(2500);
  out("js.urlAfterRU", p.url());
  out("js.langAfterRU", await p.getAttribute("html", "lang"));
  out("js.titleAfterRU", (await p.title()).slice(0, 40));
  out("js.documentRequests", docReqs);
  // 2b. history: does Back return to English?
  await p.goBack().catch((e) => out("js.backErr", String(e).slice(0, 60)));
  await p.waitForTimeout(1500);
  out("js.urlAfterBack", p.url());
  out("js.langAfterBack", await p.getAttribute("html", "lang"));
  await ctx.close();
}

// ---------- 3. Deep-link with hash/query preserved? ----------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/en?utm_source=fb#projects`, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const sw = p.locator(SWITCHER_SEL).first();
  await sw.scrollIntoViewIfNeeded();
  await sw.getByText("RU", { exact: true }).click();
  await p.waitForTimeout(2000);
  out("hash.urlAfterRU", p.url());
  await ctx.close();
}

// ---------- 4. PLANNER ROUTE: is there any switcher at all? ----------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (const loc of ["en", "ka", "ru"]) {
    await p.goto(`${BASE}/${loc}/planner`, { waitUntil: "load" });
    await p.waitForTimeout(1500);
    out(`planner.${loc}.status`, "loaded");
    out(`planner.${loc}.switcherGroups`, await p.locator(SWITCHER_SEL).count());
    out(
      `planner.${loc}.anyLocaleControl`,
      await p.evaluate(() => {
        const hits = [...document.querySelectorAll("a,button")].filter((e) =>
          /^(EN|RU|ქარ|English|Русский|ქართული)$/.test((e.textContent || "").trim()) ||
          /^(English|Русский|ქართული)$/.test(e.getAttribute("aria-label") || ""),
        );
        return hits.map((e) => e.tagName + ":" + (e.textContent || "").trim());
      }),
    );
    out(`planner.${loc}.anchorsToOtherLocales`, await p.evaluate(() => {
      const here = document.documentElement.lang;
      return [...document.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/(en|ka|ru)(\/|$|#|\?)/.test(h) && !h.startsWith("/" + here));
    }));
  }
  await ctx.close();
}

// ---------- 5. MOBILE 375: is the footer switcher reachable/visible? ----------
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/en`, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const n = await p.locator(SWITCHER_SEL).count();
  out("mobile.switcherGroups", n);
  for (let i = 0; i < n; i++) {
    const g = p.locator(SWITCHER_SEL).nth(i);
    await g.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(400);
    const box = await g.boundingBox();
    out(`mobile.group${i}.box`, box);
    const ru = g.getByText("RU", { exact: true });
    const rb = await ru.boundingBox().catch(() => null);
    out(`mobile.group${i}.ruBox`, rb);
    out(`mobile.group${i}.ruVisible`, await ru.isVisible().catch(() => "err"));
  }
  await ctx.close();
}

// ---------- 6. Reduced motion / no-scroll edge: direct URL entry per locale on planner ----------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (const u of ["/ka/planner", "/ru/planner", "/en/planner"]) {
    const r = await p.goto(BASE + u, { waitUntil: "domcontentloaded" });
    out(`plannerDirect${u}`, [r.status(), await p.getAttribute("html", "lang"), (await p.title()).slice(0, 30)]);
  }
  await ctx.close();
}

await browser.close();
