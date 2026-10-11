import { loadChapters } from "@/lib/catalogue";
import type { Locale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

// Navigation must not hold up the whole landing page if the CMS is unavailable.
export async function navigationChapters(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "home" });
  const fallback = [
    { key: "kitchens", slug: "kitchens" },
    { key: "wardrobes", slug: "wardrobes-storage" },
    { key: "home-interiors", slug: "home-interiors" },
    { key: "offices", slug: "commercial-spaces" },
  ].map(({ key, slug }) => ({ slug, title: t(`services.${key}.title`) }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const chapters = await Promise.race([
      loadChapters(locale),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Navigation query timed out")),
          2500,
        );
      }),
    ]);
    return chapters.length
      ? chapters.map((c) => ({ slug: c.slug, title: c.title }))
      : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
