import { cache } from "react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/app/_components/Contact";
import GalleryExhibit from "@/app/_components/gallery/GalleryExhibit";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { galleriesApi, pick } from "@/lib/convex-gallery";
import { OG_LOCALE } from "@/lib/page-metadata";
import { SITE } from "@/lib/site";
import { creativeWorkLd, galleryBreadcrumbLd } from "@/lib/structured-data";

/*
 * ONE GALLERY, hung as an exhibit — the scaling surface of the site.
 * Publish a gallery in the admin console and this route exists for it,
 * in all three locales, with no code change and no deploy. Unpublished
 * or missing slugs 404 (the public query returns null for both,
 * indistinguishably).
 *
 * The page fetches the exhibit AND the published set: the set gives the
 * opening plate its position line ("02 / 04") and the hand-off plate
 * its destination — the next gallery in the curated order, wrapping.
 */

export const revalidate = 300;

const getGallery = cache(async (slug: string) => {
  return await fetchQuery(galleriesApi.bySlug, { slug });
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/gallery/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const gallery = await getGallery(slug);
  if (gallery === null) return {};

  const title = `${pick(gallery.title, locale as Locale)} | ${SITE.name}`;
  /*
   * Admin-written descriptions are one sentence and often land under
   * the ~110 characters search tools expect (Ahrefs "meta description
   * too short", 2026-08-09). Pad short ones with a localized brand
   * line from metaGallery.tail — the tails are sized (41–50 chars) so
   * even a 109-character description stays inside the 160-character
   * ceiling. Long-enough copy passes through untouched.
   */
  const base = pick(gallery.description, locale as Locale);
  const t = await getTranslations({ locale, namespace: "metaGallery" });
  const description =
    base.length === 0
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
              alt: pick(cover.alt, locale as Locale),
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

export default async function GalleryPage({
  params,
}: PageProps<"/[locale]/gallery/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [gallery, published] = await Promise.all([
    getGallery(slug),
    fetchQuery(galleriesApi.listPublished, {}),
  ]);
  if (gallery === null) notFound();

  const title = pick(gallery.title, locale as Locale);
  const description = pick(gallery.description, locale as Locale);
  const images = gallery.images
    .filter((img) => img.url !== null)
    .map((img) => {
      const alt = pick(img.alt, locale as Locale);
      return {
        url: img.url as string,
        alt,
        /* The plate's display name: the alt's descriptive stem, without
         * the SEO tail the importer appends after the em dash. */
        heading: alt.split(" — ")[0],
        caption: img.caption ? pick(img.caption, locale as Locale) : undefined,
        width: img.width,
        height: img.height,
      };
    });

  /* Position in the published set, and the next room over (wrapping). */
  const sorted = [...published].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((g) => g.slug === gallery.slug);
  const nextSummary =
    sorted.length > 1 && index >= 0
      ? sorted[(index + 1) % sorted.length]
      : null;
  const next = nextSummary
    ? {
        slug: nextSummary.slug,
        title: pick(nextSummary.title, locale as Locale),
        coverUrl: nextSummary.cover?.url ?? null,
        coverAlt: nextSummary.cover
          ? pick(nextSummary.cover.alt, locale as Locale)
          : "",
      }
    : null;

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
      images: images.map((img) => img.url),
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
      <SmoothScroll />
      <SiteHeader />
      <StickyWhatsApp />
      {/* The catalogue opens on paper — the header keeps its ink. */}
      <main>
        <GalleryExhibit
          title={title}
          description={description}
          year={new Date(gallery.createdAt).getFullYear().toString()}
          position={String(index + 1).padStart(2, "0")}
          total={String(sorted.length).padStart(2, "0")}
          images={images}
          next={next}
        />
      </main>
      <Footer />
    </>
  );
}
