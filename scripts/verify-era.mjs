/* Responsive showcase, guides, global monochrome theme and expanded chat. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const base = process.env.LANDING_BASE ?? "http://localhost:3100";
const output = join(tmpdir(), "kencho-showcase-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [], errors = [];
async function check(name, fn) { try { await fn(); results.push({ name, pass:true }); console.log(`PASS ${name}`); } catch(error) { results.push({ name, pass:false, error:error.message }); console.error(`FAIL ${name}: ${error.message}`); } }
try {
 await Promise.all(["ka","ru","en"].map(async locale => {
  const page = await browser.newPage();
  page.on("pageerror", e => errors.push(e.message));
  for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   for (const path of ["","/process","/materials","/design-pricing","/about","/faq","/contact","/gallery","/gallery/kitchens"]) {
    await check(`${locale}${path}/${width}: page and monochrome layout`, async () => {
     const response = await page.goto(`${base}/${locale}${path}`, {waitUntil:"load"});
     assert.equal(response.status(),200);
     await page.evaluate(() => document.fonts.ready);
     assert.equal(await page.locator("main h1").count(),1);
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),"Horizontal overflow");
     assert.equal(await page.locator("[data-ai-trigger]").count(),1);
     assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),"dark");
     if (!path) {
      assert.equal(await page.locator("[data-open-ai-consultant]").count(),0);
      assert.equal(await page.locator("[data-floating-island] [class*=emerald]").count(),0);
      if(width===390 || width===1440) await page.screenshot({path:join(output,`${locale}-${width}.png`)});
     }
    });
   }
  }
  for (const width of [390,1440]) await check(`${locale}/${width}: chat expansion, focus, question and close`,async()=>{
   await page.setViewportSize({width,height:900});
   await page.goto(`${base}/${locale}`);
   await page.locator("[data-ai-trigger]").click();
   await page.waitForSelector("dialog[open] [data-ai-drawer]");
   await page.waitForTimeout(450);
   const bounds=await page.locator("dialog[open]").boundingBox();
   assert.ok(bounds.height>=900*.85);
   assert.equal(await page.locator("[data-ai-drawer] [class*=emerald]").count(),0);
   assert.ok(await page.locator(".chat-composer textarea").evaluate(el=>el===document.activeElement));
   await page.route("**/api/ai-consultant",route=>route.fulfill({json:{reply:"Project consultation response"}}));
   await page.locator("[data-ai-chip]").first().click();
   await page.getByText("Project consultation response",{exact:true}).waitFor();
   for(let i=0;i<16;i++) { await page.keyboard.press("Tab"); assert.ok(await page.evaluate(()=>!!document.activeElement.closest("dialog"))); }
   await page.screenshot({path:join(output,`${locale}-${width}-chat.png`)});
   await page.keyboard.press("Escape");
   await page.waitForFunction(()=>!document.querySelector("dialog[open]"));
   assert.ok(await page.locator("[data-ai-trigger]").evaluate(el=>el===document.activeElement));
  });
  await page.close();
 }));
 await check("No browser runtime errors",()=>assert.deepEqual(errors,[]));
} finally { await browser.close(); await writeFile(join(output,"results.json"),JSON.stringify(results,null,2)); }
const failures=results.filter(r=>!r.pass); console.log(`${results.length-failures.length}/${results.length} passed. ${output}`);if(failures.length)process.exitCode=1;
