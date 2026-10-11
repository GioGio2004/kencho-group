import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CatalogueShell from "@/app/_components/CatalogueShell";
import { routing, type Locale } from "@/i18n/routing";
import { loadChapters, loadPages } from "@/lib/catalogue";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

/*
 * THE CATALOGUE — every chapter at once, interleaved so the first
 * screen shows the range. Content comes from the admin console and
 * appears here with no deploy (revalidated every five minutes).
 *
 * The URL stays /gallery: it is the address search engines already
 * know, and renaming it would throw that away for a word.
 */

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata({
    locale,
    path: "/gallery",
    namespace: "metaGallery",
    image: src(IMAGES.heroMain),
  });
}

export default async function CataloguePage({
  params,
}: PageProps<"/[locale]/gallery">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tNav, chapters, pages] = await Promise.all([
    getTranslations({ locale, namespace: "catalogue" }),
    getTranslations({ locale, namespace: "nav" }),
    loadChapters(locale as Locale),
    loadPages(locale as Locale),
  ]);
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: tNav("gallery"),
    path: "/gallery",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <CatalogueShell
        locale={locale as Locale}
        chapters={chapters}
        pages={pages}
        title={t("title")}
        lede={t("lede")}
      />
    </>
  );
}
