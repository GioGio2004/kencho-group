import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/app/_components/Contact";
import GalleryChapters from "@/app/_components/gallery/GalleryChapters";
import PageIntro from "@/app/_components/PageIntro";
import SiteHeader from "@/app/_components/SiteHeader";
import SmoothScroll from "@/app/_components/SmoothScroll";
import StickyWhatsApp from "@/app/_components/StickyWhatsApp";
import { routing, type Locale } from "@/i18n/routing";
import { galleriesApi, pick } from "@/lib/convex-gallery";
import { IMAGES, src } from "@/lib/images";
import { pageMetadata } from "@/lib/page-metadata";
import { breadcrumbLd } from "@/lib/structured-data";

/*
 * THE GALLERY INDEX — a corridor of full-bleed chapters, one per
 * published gallery, straight from Convex. Content is created in the
 * admin console and appears here with no deploy; the corridor itself
 * (titles, counts, links) is all in the server HTML, and the walk —
 * wipes, parallax, drift — is GalleryChapters' enhancement on top.
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
    image: src(IMAGES.portfolio01, 1200),
  });
}

export default async function GalleryIndexPage({
  params,
}: PageProps<"/[locale]/gallery">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [tNav, tGallery, galleries] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "gallery" }),
    fetchQuery(galleriesApi.listPublished, {}),
  ]);
  const breadcrumb = await breadcrumbLd(locale as Locale, {
    name: tNav("gallery"),
    path: "/gallery",
  });

  const sorted = [...galleries].sort((a, b) => a.order - b.order);
  const totalPhotos = sorted.reduce((sum, g) => sum + g.imageCount, 0);
  const chapters = sorted.map((g) => ({
    slug: g.slug,
    title: pick(g.title, locale as Locale),
    description: pick(g.description, locale as Locale),
    imageCount: g.imageCount,
    coverUrl: g.cover?.url ?? null,
    coverAlt: g.cover ? pick(g.cover.alt, locale as Locale) : "",
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />
      <SmoothScroll />
      <SiteHeader />
      <StickyWhatsApp />
      <main>
        <PageIntro locale={locale as Locale} page="gallery" />
        {chapters.length === 0 ? (
          <section className="u-band px-5 pt-10 pb-24 sm:px-8 lg:px-12">
            <p className="mx-auto w-full max-w-4xl text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base">
              {tGallery("empty")}
            </p>
          </section>
        ) : (
          <>
            {/* The ledger line: what the corridor holds. */}
            <div className="u-band px-5 pb-12 sm:px-8 lg:px-12">
              <p className="gx-mono mx-auto w-full max-w-4xl text-ink-55">
                {tGallery("galleriesCount", { count: chapters.length })}
                {" — "}
                {tGallery("count", { count: totalPhotos })}
              </p>
            </div>
            <GalleryChapters items={chapters} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
