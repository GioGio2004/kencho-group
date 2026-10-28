import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CatalogueShell from "@/app/_components/CatalogueShell";
import CategoryBuyerGuide from "@/app/_components/CategoryBuyerGuide";
import { hasCategoryGuide } from "@/lib/category-guides";
import { routing, type Locale } from "@/i18n/routing";
import { loadChapters, loadGallery, loadPages } from "@/lib/catalogue";
import { pick } from "@/lib/convex-gallery";
import { OG_LOCALE } from "@/lib/page-metadata";
import { SITE } from "@/lib/site";
import { creativeWorkLd, galleryBreadcrumbLd } from "@/lib/structured-data";

/*
 * ONE CHAPTER of the catalogue — Kitchens, Wardrobes… Publish a gallery
 * in the admin console and this route exists for it, in all three
 * locales, with no code change and no deploy. Unpublished or missing
 * slugs 404 (the public query returns null for both).
 */

export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gallery/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const gallery = await loadGallery(slug);
  if (gallery === null) return {};

  const guide = hasCategoryGuide(slug)
    ? await getTranslations({ locale, namespace: `categoryGuides.items.${slug}` })
    : null;
  const title = guide ? guide("metaTitle") : `${pick(gallery.title, locale as Locale)} | ${SITE.name}`;
  /*
   * Admin-written descriptions are one sentence and often land under
   * the ~110 characters search tools expect. Pad short ones with a
   * localized brand line from metaGallery.tail (sized so the result
   * stays under 160).
   */
  const base = guide ? guide("metaDescription") : pick(gallery.description, locale as Locale);
  const t = await getTranslations({ locale, namespace: "metaGallery" });
  const description =
    guide ? base : base.length === 0
      ? t("tail")
      : base.length < 110
        ? `${base} ${t("tail")}`
        : base;
  const path = `/gallery/${gallery.slug}`;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE.url}/${l}${path}`]),
  );
  const cover = gallery.images.find((img) => img.url !== null);

  return {
    metadataBase: new URL(SITE.url),
    title,
    description,
    alternates: {
      canonical: `${SITE.url}/${locale}${path}`,
      languages: { ...languages, "x-default": `${SITE.url}/ka${path}` },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title,
      description,
      url: `${SITE.url}/${locale}${path}`,
      locale: OG_LOCALE[locale as Locale],
      images: cover?.url
        ? [
            {
              url: cover.url,
              width: cover.width,
              height: cover.height,
              alt: guide ? guide("title") : pick(cover.alt, locale as Locale),
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover?.url ? [cover.url] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ChapterPage({
  params,
}: PageProps<"/[locale]/gallery/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const gallery = await loadGallery(slug);
  if (gallery === null) notFound();

  const [chapters, pages] = await Promise.all([
    loadChapters(locale as Locale),
    loadPages(locale as Locale, gallery.slug),
  ]);

  const guide = hasCategoryGuide(slug)
    ? await getTranslations({ locale, namespace: `categoryGuides.items.${slug}` })
    : null;
  const title = guide ? guide("title") : pick(gallery.title, locale as Locale);
  const description = guide ? guide("lede") : pick(gallery.description, locale as Locale);

  const [breadcrumb, work] = [
    await galleryBreadcrumbLd(locale as Locale, {
      name: title,
      slug: gallery.slug,
    }),
    creativeWorkLd(locale as Locale, {
      name: title,
      description: description || undefined,
      slug: gallery.slug,
      createdAt: gallery.createdAt,
      images: pages.map((p) => p.url),
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: work }}
      />
      <CatalogueShell
        locale={locale as Locale}
        chapters={chapters}
        pages={pages}
        active={gallery.slug}
        title={title}
        lede={description}
      >
        {hasCategoryGuide(slug) && <CategoryBuyerGuide locale={locale as Locale} slug={slug} />}
      </CatalogueShell>
    </>
  );
}
