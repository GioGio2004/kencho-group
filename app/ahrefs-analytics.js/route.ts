/*
 * First-party proxy for Ahrefs' analytics.js.
 *
 * Loaded straight from analytics.ahrefs.com, the script request hits
 * Ahrefs' Cloudflare CDN, which answers with __cflb/__cf_bm
 * bot-management cookies — five third-party cookies that Lighthouse's
 * Best Practices audit flags. Served from here, the script request
 * never leaves the site's origin, so those cookies never exist.
 *
 * The beacons must still go straight to Ahrefs from the browser: the
 * script derives its endpoints from its own src origin (which is now
 * us), so AnalyticsScripts.tsx pins them with data-api / data-error.
 * Direct beacons also keep the visitor's IP, which is what Ahrefs'
 * geo and unique-visitor counts read — and the Lighthouse cookie
 * table shows the beacon responses set no cookies, only the script
 * fetch did.
 *
 * force-dynamic, NOT ISR: statically prerendering this route makes
 * the build ALSO render the path through the [locale] catch-all page
 * (locale = "ahrefs-analytics.js" → notFound), and the page's 404
 * status wins in the stored .meta — the route then serves the right
 * body with a 404 status. Dynamic serving sidesteps the collision the
 * same way /sitemap.xml does; the inner fetch's daily data cache and
 * the s-maxage header below keep it cheap anyway.
 */

const UPSTREAM = "https://analytics.ahrefs.com/analytics.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, { next: { revalidate: 86400 } });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const js = await upstream.text();
    return new Response(js, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("ahrefs-analytics: could not fetch upstream", error);
    return new Response("/* ahrefs analytics unavailable */", {
      headers: { "Content-Type": "text/javascript; charset=utf-8" },
    });
  }
}
