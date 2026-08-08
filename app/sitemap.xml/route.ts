import { fetchQuery } from "convex/nextjs";
import { routing } from "@/i18n/routing";
import { galleriesApi, type GallerySlugEntry } from "@/lib/convex-gallery";
import { SITE } from "@/lib/site";

/*
 * app/sitemap.xml/route.ts — a Route Handler (docs: api-reference/
 * file-conventions/route, "Non-UI Responses") instead of the
 * app/sitemap.ts metadata convention. The convention's serializer has
 * no way to attach an <?xml-stylesheet?> processing instruction, so a
 * browser without an XML tree viewer painted the sitemap as one run-on
 * line of text. This handler emits the same <urlset> — one entry per
 * locale with xhtml:link alternates, changefreq and priority — plus a
 * PI pointing at /sitemap.xsl (public/), which renders a readable
 * table for humans. Crawlers ignore the PI and parse the XML as before.
 */

const PAGES = [
  { path: "", priority: 1, fallback: 0.8 },
  { path: "/planner", priority: 0.9, fallback: 0.7 },
  { path: "/projects", priority: 0.8, fallback: 0.6 },
  { path: "/services", priority: 0.8, fallback: 0.6 },
  { path: "/gallery", priority: 0.8, fallback: 0.6 },
  { path: "/process", priority: 0.7, fallback: 0.5 },
  { path: "/faq", priority: 0.7, fallback: 0.5 },
  { path: "/contact", priority: 0.7, fallback: 0.5 },
] as const;

/*
 * Convex's fetchQuery is a no-store fetch (the gallery pages are ƒ
 * dynamic for the same reason), so `next build`'s prerender attempt
 * aborts with DYNAMIC_SERVER_USAGE — which the try/catch below would
 * catch and log as a scary build error. force-dynamic skips the
 * prerender; the s-maxage Cache-Control on the response gives the CDN
 * the hourly caching that `revalidate = 3600` used to provide.
 */
export const dynamic = "force-dynamic";

type Entry = {
  loc: string;
  lastModified: Date;
  priority: number;
  /** hreflang → absolute URL, x-default included. */
  languages: Record<string, string>;
};

function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE.url}/${l}${path}`]),
  );
  languages["x-default"] = `${SITE.url}/${routing.defaultLocale}${path}`;
  return languages;
}

function entriesFor(
  path: string,
  lastModified: Date,
  priority: number,
  fallback: number,
): Entry[] {
  const languages = languagesFor(path);
  return routing.locales.map((locale) => ({
    loc: `${SITE.url}/${locale}${path}`,
    lastModified,
    priority: locale === routing.defaultLocale ? priority : fallback,
    languages,
  }));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function serialize(entries: Entry[]): string {
  const urls = entries
    .map((entry) => {
      const alternates = Object.entries(entry.languages)
        .map(
          ([hreflang, href]) =>
            `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}" />`,
        )
        .join("\n");
      return [
        "<url>",
        `<loc>${escapeXml(entry.loc)}</loc>`,
        alternates,
        `<lastmod>${entry.lastModified.toISOString()}</lastmod>`,
        "<changefreq>monthly</changefreq>",
        `<priority>${entry.priority}</priority>`,
        "</url>",
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export async function GET() {
  const now = new Date();
  const staticEntries = PAGES.flatMap((page) =>
    entriesFor(page.path, now, page.priority, page.fallback),
  );

  let slugs: GallerySlugEntry[] = [];
  try {
    slugs = await fetchQuery(galleriesApi.listPublishedSlugs, {});
  } catch (error) {
    console.error("sitemap: could not list galleries from Convex", error);
  }

  const galleryEntries = slugs.flatMap(({ slug, createdAt }) =>
    entriesFor(`/gallery/${slug}`, new Date(createdAt), 0.7, 0.5),
  );

  return new Response(serialize([...staticEntries, ...galleryEntries]), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
