import { chromium } from "playwright";

const BASE = "http://localhost:4500";

const probe = () => {
  const inAriaHidden = (el) => !!el.closest('[aria-hidden="true"]');
  const path = (el) => {
    const bits = [];
    let n = el;
    while (n && n.nodeType === 1 && bits.length < 5) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += "#" + n.id;
      else if (n.className && typeof n.className === "string")
        s += "." + n.className.trim().split(/\s+/).slice(0, 2).join(".");
      bits.unshift(s);
      n = n.parentElement;
    }
    return bits.join(" > ");
  };

  const imgs = [...document.querySelectorAll("img")];
  const missing = imgs
    .filter((i) => !i.hasAttribute("alt"))
    .map((i) => ({ src: i.currentSrc || i.src, where: path(i) }));
  const empty = imgs
    .filter((i) => i.getAttribute("alt") === "")
    .map((i) => ({
      src: (i.currentSrc || i.src).slice(-70),
      hidden: inAriaHidden(i),
      where: path(i),
    }));
  const whitespace = imgs
    .filter((i) => {
      const a = i.getAttribute("alt");
      return a !== null && a !== "" && a.trim() === "";
    })
    .map((i) => ({ src: (i.currentSrc || i.src).slice(-70), where: path(i) }));
  // alt that leaked an untranslated i18n key path
  const keyLeak = imgs
    .filter((i) => /^[a-z]+(\.[A-Za-z0-9_]+)+$/.test(i.getAttribute("alt") || ""))
    .map((i) => ({ alt: i.getAttribute("alt"), where: path(i) }));
  // alt duplicating filename
  const fileNameAlt = imgs
    .filter((i) => /\.(jpe?g|png|webp|avif)$/i.test(i.getAttribute("alt") || ""))
    .map((i) => i.getAttribute("alt"));

  const roleImg = [...document.querySelectorAll('[role="img"]')]
    .filter(
      (e) =>
        !e.getAttribute("aria-label") &&
        !e.getAttribute("aria-labelledby") &&
        !inAriaHidden(e)
    )
    .map((e) => path(e));

  const svgs = [...document.querySelectorAll("svg")];
  const badSvg = svgs
    .filter((s) => {
      if (s.getAttribute("aria-hidden") === "true") return false;
      if (inAriaHidden(s)) return false;
      if (s.getAttribute("aria-label") || s.querySelector("title")) return false;
      const b = s.closest("button,a,[role=button]");
      if (b && (b.getAttribute("aria-label") || b.innerText.trim())) return false;
      return true;
    })
    .map((s) => path(s));

  const canvases = [...document.querySelectorAll("canvas")]
    .filter((c) => !inAriaHidden(c) && !c.getAttribute("aria-label"))
    .map((c) => path(c));

  const alts = imgs.map((i) => i.getAttribute("alt"));
  return {
    count: imgs.length,
    missing,
    empty,
    whitespace,
    keyLeak,
    fileNameAlt,
    roleImg,
    badSvg,
    canvases,
    alts,
  };
};

const scrollAll = async (page) => {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.body.scrollHeight + 3000; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
};

const report = (label, r) => {
  const bad =
    r.missing.length ||
    r.whitespace.length ||
    r.keyLeak.length ||
    r.fileNameAlt.length ||
    r.roleImg.length ||
    r.badSvg.length ||
    r.empty.filter((e) => !e.hidden).length;
  console.log(
    `${bad ? "FAIL" : "ok  "} ${label} imgs=${r.count} missing=${r.missing.length} empty=${r.empty.length}(exposed=${r.empty.filter((e) => !e.hidden).length}) ws=${r.whitespace.length} keyLeak=${r.keyLeak.length} fileAlt=${r.fileNameAlt.length} roleImg=${r.roleImg.length} badSvg=${r.badSvg.length} canvas=${r.canvases.length}`
  );
  if (r.missing.length) console.log("   MISSING:", JSON.stringify(r.missing, null, 1));
  if (r.empty.filter((e) => !e.hidden).length)
    console.log("   EXPOSED EMPTY:", JSON.stringify(r.empty.filter((e) => !e.hidden), null, 1));
  if (r.whitespace.length) console.log("   WHITESPACE:", JSON.stringify(r.whitespace, null, 1));
  if (r.keyLeak.length) console.log("   KEY LEAK:", JSON.stringify(r.keyLeak, null, 1));
  if (r.roleImg.length) console.log("   role=img unlabelled:", r.roleImg);
  if (r.badSvg.length) console.log("   svg unlabelled:", r.badSvg);
  if (r.canvases.length) console.log("   canvas unlabelled:", r.canvases);
  return bad;
};

const run = async () => {
  const browser = await chromium.launch();
  let failures = 0;

  for (const locale of ["en", "ka", "ru"]) {
    for (const scheme of ["light", "dark"]) {
      for (const vp of [
        { name: "mobile", width: 390, height: 844 },
        { name: "desktop", width: 1440, height: 900 },
      ]) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: scheme,
          deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        await scrollAll(page);

        const label = `${locale}/${scheme}/${vp.name}`;
        failures += report(`${label} [scrolled]`, await page.evaluate(probe));

        // ---- interaction: open the project lightbox ----
        const tile = page.locator('figure[data-item] button').first();
        if (await tile.count()) {
          await tile.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          await tile.click({ force: true });
          await page.waitForTimeout(1200);
          const openState = await page.evaluate(probe);
          failures += report(`${label} [lightbox open]`, openState);

          // navigate forward twice, then back
          for (let i = 0; i < 2; i++) {
            await page.keyboard.press("ArrowRight");
            await page.waitForTimeout(900);
          }
          failures += report(`${label} [lightbox +2]`, await page.evaluate(probe));
          await page.keyboard.press("ArrowLeft");
          await page.waitForTimeout(900);
          failures += report(`${label} [lightbox -1]`, await page.evaluate(probe));
          await page.keyboard.press("Escape");
          await page.waitForTimeout(700);
        } else {
          console.log(`   (no project tiles found at ${label})`);
        }

        // ---- interaction: drag the before/after handle ----
        const frame = page.locator("#transformation-frame");
        if (await frame.count()) {
          await frame.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          const box = await frame.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2, { steps: 12 });
            await page.mouse.up();
            await page.waitForTimeout(400);
            failures += report(`${label} [before/after dragged]`, await page.evaluate(probe));
          }
        }

        // ---- hero variant swap: force the other opening ----
        await page.evaluate(() => {
          const cur = document.documentElement.getAttribute("data-hero");
          document.documentElement.setAttribute(
            "data-hero",
            cur === "editorial" ? "cinematic" : "editorial"
          );
        });
        await page.waitForTimeout(600);
        failures += report(`${label} [hero swapped]`, await page.evaluate(probe));

        // ---- planner route ----
        await page.goto(`${BASE}/${locale}/planner`, { waitUntil: "networkidle" });
        await page.waitForTimeout(900);
        await scrollAll(page);
        failures += report(`${locale}/${scheme}/${vp.name} [planner]`, await page.evaluate(probe));

        await ctx.close();
      }
    }
  }

  // sample the actual alt strings once per locale for a sanity read
  for (const locale of ["en", "ka", "ru"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle" });
    await scrollAll(page);
    const { alts } = await page.evaluate(probe);
    console.log(`\n--- ${locale} alt values (${alts.length}) ---`);
    alts.forEach((a, i) => console.log(` ${i}: ${JSON.stringify(a)}`));
    await ctx.close();
  }

  await browser.close();
  console.log(`\nTOTAL FAILING STATES: ${failures}`);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
