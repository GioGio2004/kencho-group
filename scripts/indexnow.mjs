/*
 * IndexNow — push every sitemap URL to Bing (and Yandex, Naver, Seznam,
 * Yep, which share the endpoint) instead of waiting to be crawled.
 *
 *   npm run indexnow                    # every URL in the live sitemap
 *   npm run indexnow -- /en/faq /ka/faq # just these paths
 *
 * WHY THIS EXISTS. Bing had zero pages of kenchogroup.ge indexed on
 * 2026-08-16 (`site:kenchogroup.ge` on bing.com returned unrelated
 * results, its signature for an empty index). Bing does not crawl a
 * new .ge domain with no inbound links on its own initiative for
 * weeks; IndexNow is the protocol it built so a site can announce its
 * URLs and be fetched within hours. Bing Webmaster Tools' "URL
 * Submission" does the same thing by hand — this is that, scripted.
 *
 * HOW IT VERIFIES. The key in lib/site.ts must be served verbatim at
 * https://www.kenchogroup.ge/{key}.txt (public/{key}.txt). The
 * endpoint fetches that file to prove the submitter controls the host,
 * so run this against PRODUCTION only — a localhost host cannot be
 * verified and the request 4xxs.
 *
 * WHEN TO RUN. After every deploy that changes copy or adds a gallery,
 * and once now to seed the index. IndexNow is idempotent; resubmitting
 * an unchanged URL costs nothing but a crawl-budget nudge. Do not
 * automate it into the build: a build runs before the new pages are
 * live, and the endpoint would fetch the OLD ones.
 *
 * Runs on plain Node — the alias hook makes `@/lib/site` importable:
 *   node --import ./scripts/alias-hook.mjs scripts/indexnow.mjs
 */
import { SITE } from "@/lib/site";

const ENDPOINT = "https://api.indexnow.org/IndexNow";

async function main(args) {
  const host = new URL(SITE.url).host;
  const key = SITE.indexNowKey;
  const keyLocation = `${SITE.url}/${key}.txt`;

  /* 1. The key file must resolve on the live host before anything else. */
  const keyRes = await fetch(keyLocation);
  const keyBody = (await keyRes.text()).trim();
  if (keyRes.status !== 200 || keyBody !== key) {
    console.error(
      `indexnow: key file not live — GET ${keyLocation} → ${keyRes.status}` +
        (keyRes.status === 200 ? ` (body ${JSON.stringify(keyBody)})` : ""),
    );
    console.error("Deploy first (public/*.txt ships with the site), then rerun.");
    return 1;
  }

  /* 2. URLs: the CLI's paths, or every <loc> in the live sitemap. */
  let urls;
  if (args.length > 0) {
    urls = args.map((p) => (p.startsWith("http") ? p : `${SITE.url}${p}`));
  } else {
    const smRes = await fetch(`${SITE.url}/sitemap.xml`);
    if (smRes.status !== 200) {
      console.error(`indexnow: sitemap → ${smRes.status}`);
      return 1;
    }
    const xml = await smRes.text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }
  if (urls.length === 0) {
    console.error("indexnow: nothing to submit");
    return 1;
  }
  const foreign = urls.filter((u) => new URL(u).host !== host);
  if (foreign.length) {
    console.error(`indexnow: refusing URLs off ${host}:`, foreign);
    return 1;
  }

  /* 3. One POST, up to 10,000 URLs per the protocol. */
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
  });

  /*
   * 200 OK / 202 Accepted are both success ("URL received", "key
   * validation pending"). 400 invalid format · 403 key not found at
   * keyLocation · 422 URLs don't belong to host · 429 too many requests.
   */
  const ok = res.status === 200 || res.status === 202;
  console.log(
    `indexnow: ${res.status} ${res.statusText} — ${urls.length} URL(s) for ${host}` +
      (ok ? "" : `\n${await res.text()}`),
  );
  if (ok) {
    for (const u of urls) console.log("  " + u);
    console.log(
      "\nBing Webmaster Tools → IndexNow shows the receipt within minutes;",
      "\nindexing typically follows in hours to a couple of days.",
    );
  }
  return ok ? 0 : 1;
}

/* exitCode rather than process.exit(): the latter races the fetch
 * keep-alive teardown on Windows and trips a libuv assertion on the way
 * out (harmless, but it prints as a crash). */
process.exitCode = await main(process.argv.slice(2));
