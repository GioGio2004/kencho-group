import { cache } from "react";
import { fetchQuery } from "convex/nextjs";
import type { Locale } from "@/i18n/routing";
import { translatedPhotoTitle } from "@/lib/gallery-titles";
import {
  galleriesApi,
  pick,
  type Gallery,
  type Localized,
} from "@/lib/convex-gallery";

/*
 * THE CATALOGUE — every published gallery from the admin console,
 * flattened into one list of pages.
 *
 * Chapters are the galleries (Kitchens, Wardrobes…), pages are their
 * photographs. Everything here runs on the server: the catalogue's
 * full text — chapter names, headings, captions — is in the HTML a
 * crawler gets, and the client component only adds the page-turning.
 */

export type Chapter = {
  slug: string;
  title: string;
  description: string;
  count: number;
  cover: { url: string; alt: string; width: number; height: number } | null;
};

export type CataloguePage = {
  id: string;
  chapter: string;
  chapterTitle: string;
  url: string;
  alt: string;
  /**
   * The piece's name in the visitor's language — the alt's descriptive
   * stem, without the importer's SEO tail. Empty when the admin has not
   * written one in this language; the page then shows the chapter name.
   */
  heading: string;
  /** The English name, always present: what the lead tells the workshop. */
  ref: string;
  /** Empty when the admin has not written one in this language. */
  caption: string;
  width: number;
  height: number;
  /** Position within its chapter — what `?p=` opens on the chapter page. */
  indexInChapter: number;
};

/**
 * Captions only in the visitor's own language. Alt text may fall back
 * to English (a screen reader is better served by English than by
 * nothing), but a Georgian page with English captions under the
 * photographs reads as unfinished — so a missing caption is left out.
 */
function strict(value: Localized | undefined, locale: Locale): string {
  return value?.[locale]?.trim() ?? "";
}

const loadGallery = cache(async (slug: string) =>
  fetchQuery(galleriesApi.bySlug, { slug }),
);

const loadPublished = cache(async () => {
  const list = await fetchQuery(galleriesApi.listPublished, {});
  return [...list].sort((a, b) => a.order - b.order);
});

export { loadGallery };

function toPages(gallery: Gallery, locale: Locale): CataloguePage[] {
  const chapterTitle = pick(gallery.title, locale);
  return gallery.images
    .filter((img) => img.url !== null)
    .sort((a, b) => a.order - b.order)
    .map((img, indexInChapter) => {
      const stem = (text: string) => text.split(" — ")[0].trim();
      const ref = stem(img.alt.en);
      const translated = translatedPhotoTitle(ref, locale);
      return {
        id: img._id,
        chapter: gallery.slug,
        chapterTitle,
        url: img.url as string,
        alt: strict(img.alt, locale) || translated || pick(img.alt, locale),
        heading: stem(strict(img.alt, locale)) || translated,
        ref,
        caption: strict(img.caption, locale),
        width: img.width,
        height: img.height,
        indexInChapter,
      };
    });
}

/**
 * A chapter with four of its pages picked out — the links on its panel
 * in the home page's strip. Each opens the chapter with that page.
 */
export type ChapterHighlights = Chapter & {
  highlights: { index: number; heading: string }[];
};

export async function loadHighlights(locale: Locale): Promise<ChapterHighlights[]> {
  const chapters = await loadChapters(locale);
  return Promise.all(
    chapters.map(async (chapter) => {
      const pages = await loadPages(locale, chapter.slug);
      return {
        ...chapter,
        // No name in this language yet → the piece's English name, which
        // still tells four pieces apart (the chapter title would not).
        highlights: pages
          .slice(0, 4)
          .map((page, index) => ({ index, heading: page.heading || page.ref })),
      };
    }),
  );
}

/**
 * The newest pages across the catalogue — the first of each chapter,
 * then the second — for the home page's list.
 */
export async function loadLatest(locale: Locale, count = 6): Promise<CataloguePage[]> {
  const all = await loadPages(locale);
  return all.slice(0, count);
}

export async function loadChapters(locale: Locale): Promise<Chapter[]> {
  const published = await loadPublished();
  return published.map((g) => ({
    slug: g.slug,
    title: pick(g.title, locale),
    description: pick(g.description, locale),
    count: g.imageCount,
    cover:
      g.cover?.url != null
        ? {
            url: g.cover.url,
            alt: pick(g.cover.alt, locale),
            width: g.cover.width,
            height: g.cover.height,
          }
        : null,
  }));
}

/**
 * Pages for one chapter, or for the whole catalogue when `slug` is
 * omitted. The whole catalogue interleaves chapters round-robin, so the
 * first screen of "All" shows a kitchen, a wardrobe, an office and an
 * interior rather than twenty-seven kitchens in a row.
 */
export async function loadPages(
  locale: Locale,
  slug?: string,
): Promise<CataloguePage[]> {
  const published = await loadPublished();
  const slugs = slug ? [slug] : published.map((g) => g.slug);
  const galleries = (await Promise.all(slugs.map(loadGallery))).filter(
    (g): g is Gallery => g !== null,
  );
  const lists = galleries.map((g) => toPages(g, locale));
  if (lists.length === 1) return lists[0];

  const out: CataloguePage[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}
