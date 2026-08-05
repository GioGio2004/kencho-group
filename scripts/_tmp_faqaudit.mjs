import { chromium } from "playwright";

const BASE = "http://localhost:4500";

const countLd = async (page) =>
  page.evaluate(() => {
    const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const out = [];
    for (const n of nodes) {
      let o;
      try { o = JSON.parse(n.textContent); } catch { out.push({ type: "PARSE_ERROR" }); continue; }
      out.push({
        type: o["@type"],
        n: Array.isArray(o.mainEntity) ? o.mainEntity.length : undefined,
      });
    }
    return { blocks: out, url: location.pathname };
  });

const browser = await chromium.launch();

/* ---------- 1. client-side navigation home -> planner -> home ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  console.log("home (hydrated):", JSON.stringify(await countLd(page)));

  const link = page.locator('a[href="/en/planner"]').first();
  const has = await link.count();
  console.log("planner link present:", has);
  if (has) {
    await link.click({ force: true });
    await page.waitForURL("**/planner", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    console.log("after CSR nav ->", JSON.stringify(await countLd(page)));
    await page.goBack();
    await page.waitForTimeout(2500);
    console.log("after back ->", JSON.stringify(await countLd(page)));
  }
  await ctx.close();
}

/* ---------- 2. viewports x locales: FAQ section actually rendered ---------- */
for (const vp of [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  for (const loc of ["en", "ka", "ru"]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${loc}`, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => {
      const sec = document.querySelector("#faq");
      if (!sec) return { section: false };
      const cs = getComputedStyle(sec);
      const btns = [...sec.querySelectorAll("button")].map((b) =>
        b.querySelector("span")?.textContent?.trim(),
      );
      const answers = [...sec.querySelectorAll("[data-answer]")].map((p) => p.textContent.trim());
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((n) => { try { return JSON.parse(n.textContent); } catch { return null; } })
        .filter((o) => o && o["@type"] === "FAQPage");
      const qs = ld[0] ? ld[0].mainEntity.map((q) => q.name) : [];
      const as = ld[0] ? ld[0].mainEntity.map((q) => q.acceptedAnswer?.text) : [];
      return {
        section: true,
        display: cs.display,
        visibility: cs.visibility,
        height: sec.getBoundingClientRect().height,
        buttons: btns,
        answers,
        faqPageBlocks: ld.length,
        qMatch: JSON.stringify(btns) === JSON.stringify(qs),
        aMatch: JSON.stringify(answers) === JSON.stringify(as),
      };
    });
    console.log(
      `${vp.name}/${loc}: section=${r.section} display=${r.display} vis=${r.visibility} h=${Math.round(r.height)} ldFAQ=${r.faqPageBlocks} qMatch=${r.qMatch} aMatch=${r.aMatch}`,
    );
    if (!r.qMatch || !r.aMatch) {
      console.log("   BUTTONS:", JSON.stringify(r.buttons));
      console.log("   ANSWERS:", JSON.stringify(r.answers));
    }
    await ctx.close();
  }
}

/* ---------- 3. dark theme + reduced motion ---------- */
for (const scheme of ["dark", "light"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  const r = await countLd(page);
  console.log(`theme=${scheme} reduced-motion: ${JSON.stringify(r)}`);
  await ctx.close();
}

/* ---------- 4. all planner locales ---------- */
for (const loc of ["en", "ka", "ru"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${loc}/planner`, { waitUntil: "networkidle" });
  console.log(`planner/${loc}:`, JSON.stringify(await countLd(page)));
  await ctx.close();
}

await browser.close();
