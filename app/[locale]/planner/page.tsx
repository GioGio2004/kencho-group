import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Planner from "@/app/_components/planner/Planner";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import { routing, type Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import { breadcrumbLd, plannerLd } from "@/lib/structured-data";

/*
 * THE PLANNER ROUTE.
 *
 * A real page rather than a section of the home page: it is the only
 * thing on the site with its own search intent — "kitchen planner",
 * "სამზარეულოს დაგეგმარება", "планировщик кухни" — and a tool a visitor
 * comes back to needs a URL they can come back to.
 *
 * Statically generated for all three locales, same as the home page.
 * The configurator is client-side, but everything a crawler needs — the
 * heading, the lede, the K-01 sheet with all its dimensions — is in the
 * server's HTML, because the drawing is rendered from the spec rather
 * than assembled by an effect.
 *
 * No CustomCursor here, deliberately. The site replaces the pointer with
 * a dot on the marketing pages; on a panel of steppers and 40-pixel
 * chips that trades precision for atmosphere, and this page is the one
 * place where the visitor is aiming rather than reading.
 */

const OG_LOCALE: Record<Locale, string> = {
  ka: "ka_GE",
  ru: "ru_RU",
  en: "en_US",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/planner">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "metaPlanner" });

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE.url}/${l}/planner`]),
  );

  return {
    metadataBase: new URL(SITE.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${SITE.url}/${locale}/planner`,
      languages: { ...languages, "x-default": `${SITE.url}/ka/planner` },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: t("title"),
      description: t("description"),
      url: `${SITE.url}/${locale}/planner`,
      locale: OG_LOCALE[locale as Locale],
      images: [
        {
          url: src(IMAGES.drawingReality, 1200),
          width: 1200,
          height: 630,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [src(IMAGES.drawingReality, 1200)],
    },
    robots: { index: true, follow: true },
  };
}

export default async function PlannerPage({
  params,
}: PageProps<"/[locale]/planner">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /*
   * This page's OWN schema. The layout supplies the business; the two
   * things that are true about THIS route — that it sits one level below
   * home, and that it is a free tool rather than a brochure page — are
   * stated here. Without the second, "kitchen planner" searches have
   * nothing to match but a title tag.
   */
  const t = await getTranslations({ locale, namespace: "nav" });
  const [breadcrumb, tool] = await Promise.all([
    breadcrumbLd(locale as Locale, {
      name: t("planner"),
      path: "/planner",
    }),
    plannerLd(locale as Locale),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: tool }}
      />
      <SmoothScroll />
      <SiteHeader />
      <main>
        <Planner />
      </main>
    </>
  );
}
