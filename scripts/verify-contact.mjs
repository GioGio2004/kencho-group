import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const base=process.env.BASE || 'http://localhost:3000';
const output=join(tmpdir(),'kencho-contact-review');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[],submissions=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/project-request**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/session'))return route.fulfill({json:{ok:true}});if(path.endsWith('/upload')) {const uploadId=route.request().postDataBuffer().toString().match(/name="uploadId"\r\n\r\n([^\r]+)/)?.[1];return route.fulfill({json:{uploadId}});}submissions.push(route.request().postDataJSON());return route.fulfill({json:{reference:'KG-SYNTHETIC',duplicate:false}});});
  await page.route('**/api/ai-consultant',route=>route.fulfill({json:{reply:'I prepared your project details for review.',brief:{name:'Synthetic visitor',phone:'+995555000111',email:'synthetic@example.invalid',furnitureType:'Oak kitchen',city:'Batumi',description:'Oak kitchen with a green island.',dimensions:'3 metres',budget:'12000 GEL',timing:'Spring'}}}));
  await page.goto(`${base}/en/contact`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('dialog.sheet').count(),0);
  assert.equal(await page.locator('main .project-request').count(),1);
  await page.locator('.contact-banner-slide.is-active img').evaluate(img=>img.decode());
  await page.getByRole('button',{name:'Next banner',exact:true}).click();
  assert.match(await page.locator('.contact-banner-slide.is-active img').getAttribute('src'),/kencho-bedroom-interior/);
  if(width===1440){const top=(await page.locator('.request-page-intro').boundingBox()).y;await page.evaluate(()=>scrollTo(0,400));await page.waitForTimeout(350);const after=(await page.locator('.request-page-intro').boundingBox()).y;assert.ok(Math.abs(top-after)<100,'Left introduction stays visible while the form scrolls');await page.evaluate(()=>scrollTo(0,0));}
  for(const theme of ['light','dark']) {await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(output,`contact-${width}-${theme}.png`),fullPage:true});}
  await page.locator('[data-ai-trigger]').click();await page.locator('dialog.chat-modal[open]').waitFor();
  await page.locator('.chat-composer textarea').fill('I want to request an oak kitchen.');await page.locator('.chat-composer button[type=submit]').click();await page.getByRole('log').getByText('I prepared your project details for review.').waitFor();
  await page.locator('.chat-header [data-ai-request]').click();const form=page.locator('[data-ai-request-form] .project-request');await form.waitFor();
  for(const [key,value]of Object.entries({name:'Synthetic visitor',phone:'+995555000111',email:'synthetic@example.invalid',furnitureType:'Oak kitchen',city:'Batumi',dimensions:'3 metres',budget:'12000 GEL',timing:'Spring'}))assert.equal(await form.locator(`[name="${key}"]`).inputValue(),value);
  await form.locator('[name=city]').fill('Tbilisi');await page.locator('.chat-request-back').click();await page.locator('.chat-header [data-ai-request]').click();assert.equal(await form.locator('[name=city]').inputValue(),'Tbilisi');assert.equal(submissions.length,0,'AI never sends without explicit submission');
  await form.locator('input[type=file]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfXcAAAAASUVORK5CYII=','base64')});
  await page.screenshot({path:join(output,`ai-review-${width}.png`)});
  await form.locator('[type=submit]').click();await page.locator('[data-ai-request-form] .request-success').waitFor();assert.equal(submissions.length,1);assert.equal(submissions[0].brief.city,'Tbilisi');assert.equal(submissions[0].attachmentIds.length,1);assert.equal(await page.locator('dialog[open]').count(),1);assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS ${width}px: contact banners, themes, layout, AI extraction/review/edit, draft retention and explicit submission with image (mocked services)`);
 }
 console.log(`Screenshots: ${output}`);
} finally {await browser.close();}
