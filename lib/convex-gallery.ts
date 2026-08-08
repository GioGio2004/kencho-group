/*
 * THE STOREFRONT'S VIEW OF CONVEX.
 *
 * The database lives in the admin repo (kenchogroup-admin); this site
 * only reads the three public queries below, server-side, via
 * `fetchQuery` from "convex/nextjs". The generated api object cannot be
 * imported across repos (it type-imports the admin's source modules), so
 * the references are built with `anyApi` and typed by hand here.
 *
 * KEEP IN SYNC with convex/galleries.ts in kenchogroup-admin — the
 * public queries change rarely, and only additively.
 */

import {
  anyApi,
  type DefaultFunctionArgs,
  type FunctionReference,
} from "convex/server";
import type { Locale } from "@/i18n/routing";

/** Localized copy: en is canonical, ka/ru fall back to en. */
export type Localized = { en: string; ka?: string; ru?: string };

export function pick(value: Localized | undefined, locale: Locale): string {
  return value?.[locale] ?? value?.en ?? "";
}

export type GalleryCover = {
  url: string | null;
  alt: Localized;
  width: number;
  height: number;
};

export type GallerySummary = {
  slug: string;
  title: Localized;
  description?: Localized;
  order: number;
  imageCount: number;
  cover: GalleryCover | null;
};

export type GalleryImage = {
  _id: string;
  url: string | null;
  alt: Localized;
  caption?: Localized;
  order: number;
  width: number;
  height: number;
};

export type Gallery = {
  slug: string;
  title: Localized;
  description?: Localized;
  /** Convex `_creationTime`, ms since epoch. */
  createdAt: number;
  images: GalleryImage[];
};

export type GallerySlugEntry = {
  slug: string;
  title: Localized;
  description?: Localized;
  createdAt: number;
};

type PublicQuery<Args extends DefaultFunctionArgs, Result> = FunctionReference<
  "query",
  "public",
  Args,
  Result
>;

export const galleriesApi = {
  listPublished: anyApi.galleries.listPublished as PublicQuery<
    Record<string, never>,
    GallerySummary[]
  >,
  bySlug: anyApi.galleries.bySlug as PublicQuery<
    { slug: string },
    Gallery | null
  >,
  listPublishedSlugs: anyApi.galleries.listPublishedSlugs as PublicQuery<
    Record<string, never>,
    GallerySlugEntry[]
  >,
};
