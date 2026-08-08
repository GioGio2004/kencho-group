import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

/*
 * One metadata block, shared by every routed page below home.
 *
 * The planner wrote this shape out by hand; with five more routes the
 * boilerplate would be copied six times and drift. Each page supplies
 * only what is actually its own: the message namespace, its path, and
 * an OG image.
 */

export const OG_LOCALE: Record<Locale, string> = {
  ka: "ka_GE",
  ru: "ru_RU",
  en: "en_US",
};

export async function pageMetadata({
  locale,
  path,
  namespace,
  image,
}: {
  locale: string;
  path: string;
  /** Message namespace with `title`, `description`, `ogAlt`. */
  namespace: string;
  /** Site-relative OG image URL (resolved against metadataBase). */
  image: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace });

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE.url}/${l}${path}`]),
  );

  return {
    metadataBase: new URL(SITE.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${SITE.url}/${locale}${path}`,
      languages: { ...languages, "x-default": `${SITE.url}/ka${path}` },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: t("title"),
      description: t("description"),
      url: `${SITE.url}/${locale}${path}`,
      locale: OG_LOCALE[locale as Locale],
      images: [{ url: image, width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}
