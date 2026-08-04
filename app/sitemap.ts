import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/** Every routed page, per locale, with its own hreflang set. */
const PAGES = [
  { path: "", priority: 1, fallback: 0.8 },
  /* The planner is a tool with its own search intent rather than a
   * section of the home page, so it is listed rather than folded in. */
  { path: "/planner", priority: 0.9, fallback: 0.7 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) => {
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
}
