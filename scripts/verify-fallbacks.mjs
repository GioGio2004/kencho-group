import { chromium } from "playwright";
const BASE = process.argv[2] ?? "http://localhost:3005";
const b = await chromium.launch();

const readBeats = `(() => {
  const out = {};
  for (const n of ['welcome','headline','craft','cue']) {
    const el = document.querySelector('[data-beat="'+n+'"]');
    if (!el) { out[n] = 'missing'; continue; }
    const r = el.getBoundingClientRect();
    out[n] = { op: +getComputedStyle(el).opacity.slice(0,4), vis: getComputedStyle(el).visibility,
               top: Math.round(r.top), h: Math.round(r.height) };
  }
  const h1 = document.querySelector('#hero-title');
  out._h1 = h1 ? { vis: getComputedStyle(h1).visibility, text: h1.textContent.trim().slice(0,30) } : 'missing';
  return out;
})()`;

function overlapping(beats) {
  const boxes = ['welcome','headline','craft','cue']
    .map(n => beats[n]).filter(x => x && x !== 'missing' && x.op > 0.05);
  let hits = 0;
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
    const a=boxes[i], c=boxes[j];
    if (a.top < c.top + c.h && c.top < a.top + a.h) hits++;
  }
  return { visible: boxes.length, overlaps: hits };
}

// 1. reduced motion
{
  const p = await b.newPage({ viewport:{width:390,height:844}, reducedMotion:"reduce" });
  await p.goto(`${BASE}/ka`, { waitUntil:"networkidle", timeout:60000 });
  await p.waitForTimeout(1500);
  const beats = await p.evaluate(readBeats);
  console.log("reduced-motion:", JSON.stringify(overlapping(beats)), "h1:", JSON.stringify(beats._h1));
  await p.screenshot({ path: "scripts/shots/fallback-reduced.png" });
  await p.close();
}

// 2. JS disabled (what a crawler / JS failure sees)
{
  const ctx = await b.newContext({ viewport:{width:390,height:844}, javaScriptEnabled:false });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/ka`, { waitUntil:"domcontentloaded", timeout:60000 });
  await p.waitForTimeout(800);
  const beats = await p.evaluate(readBeats).catch(()=>null);
  const html = await p.content();
  console.log("no-JS: h1 in HTML:", /id="hero-title"/.test(html),
              "| beats in HTML:", (html.match(/data-beat=/g)||[]).length,
              "| static attr:", /data-static/.test(html));
  await p.screenshot({ path: "scripts/shots/fallback-nojs.png" });
  await ctx.close();
}

// 3. total frame failure -> poster must remain
{
  const p = await b.newPage({ viewport:{width:390,height:844} });
  await p.route("**/frames/**/frame_*.webp", r => r.abort());
  await p.goto(`${BASE}/ka`, { waitUntil:"networkidle", timeout:60000 });
  await p.mouse.wheel(0,10); await p.waitForTimeout(2500);
  const st = await p.evaluate(`(() => {
    const poster = document.querySelector('[data-hero-poster]');
    const canvas = document.querySelector('#hero canvas');
    return {
      posterOpacity: poster ? getComputedStyle(poster).opacity : 'missing',
      posterVisible: poster ? getComputedStyle(poster).visibility : 'missing',
      canvasVisibility: canvas ? getComputedStyle(canvas).visibility : 'missing',
      heroBg: getComputedStyle(document.querySelector('#hero')).backgroundColor
    };
  })()`);
  console.log("frame-failure:", JSON.stringify(st));
  await p.screenshot({ path: "scripts/shots/fallback-noframes.png" });
  await p.close();
}
await b.close();
