import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { routing } from "@/i18n/routing";
import { galleriesApi } from "@/lib/convex-gallery";
import { SITE } from "@/lib/site";

/** Every routed page, per locale, with its own hreflang set. */
const PAGES = [
  { path: "", priority: 1, fallback: 0.8 },
  /* The planner is a tool with its own search intent rather than a
   * section of the home page, so it is listed rather than folded in. */
  { path: "/planner", priority: 0.9, fallback: 0.7 },
  { path: "/projects", priority: 0.8, fallback: 0.6 },
  { path: "/services", priority: 0.8, fallback: 0.6 },
  { path: "/gallery", priority: 0.8, fallback: 0.6 },
  { path: "/process", priority: 0.7, fallback: 0.5 },
  { path: "/faq", priority: 0.7, fallback: 0.5 },
  { path: "/contact", priority: 0.7, fallback: 0.5 },
] as const;

/* Re-read hourly so a gallery published in the admin console reaches the
 * sitemap without a deploy. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = PAGES.flatMap((page) => {
    const languages = Object.fromEntries(
      routing.locales.map((l) => [l, `${SITE.url}/${l}${page.path}`]),
    );

    return routing.locales.map((locale) => ({
      url: `${SITE.url}/${locale}${page.path}`,
      lastModified: new Date(`${SITE.year}-01-01`),
      changeFrequency: "monthly" as const,
      priority:
        locale === routing.defaultLocale ? page.priority : page.fallback,
      alternates: { languages },
    }));
  });

  /* Published galleries, straight from Convex. If the deployment is
   * unreachable the static half of the sitemap still ships — a missing
   * gallery entry costs a crawl cycle, a failed build costs the site. */
  let slugs: Awaited<
    ReturnType<typeof fetchQuery<typeof galleriesApi.listPublishedSlugs>>
  > = [];
  try {
    slugs = await fetchQuery(galleriesApi.listPublishedSlugs, {});
  } catch (error) {
    console.error("sitemap: could not list galleries from Convex", error);
  }

  const galleryEntries = slugs.flatMap(({ slug, createdAt }) => {
    const path = `/gallery/${slug}`;
    const languages = Object.fromEntries(
      routing.locales.map((l) => [l, `${SITE.url}/${l}${path}`]),
    );

    return routing.locales.map((locale) => ({
      url: `${SITE.url}/${locale}${path}`,
      lastModified: new Date(createdAt),
      changeFrequency: "monthly" as const,
      priority: locale === routing.defaultLocale ? 0.7 : 0.5,
      alternates: { languages },
    }));
  });

  return [...staticEntries, ...galleryEntries];
}
