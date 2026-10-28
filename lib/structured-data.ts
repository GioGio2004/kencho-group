/* =====================================================================
 * STRUCTURED DATA
 * ---------------------------------------------------------------------
 * One rule governs everything here: SCHEMA DESCRIBES THE PAGE IT IS ON.
 * ================================================================== */

import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";

export const FAQ_IDS = ["pricing", "timeline", "materials", "commercial"] as const;

const SERVICE_IDS = [
  "kitchens",
  "wardrobes",
  "paneling",
  "commercial",
] as const;

/**
 * The company. Site-wide and true on every route, so this one is the
 * layout's. Includes GeoCoordinates, hasMap, openingHoursSpecification,
 * and OfferCatalog for Tbilisi Local Pack SEO.
 */
export async function businessLd(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "services" });
  const commercial = await getTranslations({ locale, namespace: "commercial" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    description: `${commercial("scope")} ${commercial("coverage")}`,
    url: `${SITE.url}/${locale}`,
    image: `${SITE.url}${src(IMAGES.heroMain)}`,
    telephone: SITE.phone,
    email: SITE.email,
    hasMap: SITE.mapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressCountry: SITE.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    openingHoursSpecification: SITE.openingHours.map((spec) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: spec.days,
      opens: spec.opens,
      closes: spec.closes,
    })),
    areaServed: SITE.serviceAreas,
    knowsAbout: [
      t("items.kitchens.name"),
      t("items.wardrobes.name"),
      t("items.paneling.name"),
      t("items.commercial.name"),
      commercial("furnitureFee"),
      commercial("interiorFee"),
      commercial("technical"),
      commercial("suppliers"),
    ],
    sameAs: Object.values(SITE.socials).filter((url) => !url.includes("TODO")),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t("title"),
      itemListElement: SERVICE_IDS.map((id) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: t(`items.${id}.name`),
          description: t(`items.${id}.line`),
          provider: { "@id": `${SITE.url}/#business` },
          areaServed: SITE.serviceAreas,
        },
      })),
    },
  });
}

/** The questions — emitted on /faq where the full FAQ list lives. */
export async function faqLd(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "faq" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_IDS.map((id) => ({
      "@type": "Question",
      name: t(`items.${id}.q`),
      acceptedAnswer: { "@type": "Answer", text: t(`items.${id}.a`) },
    })),
  });
}

export async function breadcrumbLd(
  locale: Locale,
  leaf: { name: string; path: string },
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "nav" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("crumbHome"),
        item: `${SITE.url}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: leaf.name,
        item: `${SITE.url}/${locale}${leaf.path}`,
      },
    ],
  });
}

export async function galleryBreadcrumbLd(
  locale: Locale,
  gallery: { name: string; slug: string },
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "nav" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("crumbHome"),
        item: `${SITE.url}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("gallery"),
        item: `${SITE.url}/${locale}/gallery`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: gallery.name,
        item: `${SITE.url}/${locale}/gallery/${gallery.slug}`,
      },
    ],
  });
}

export function creativeWorkLd(
  locale: Locale,
  gallery: {
    name: string;
    description?: string;
    slug: string;
    createdAt: number;
    images: string[];
  },
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: gallery.name,
    ...(gallery.description ? { description: gallery.description } : {}),
    url: `${SITE.url}/${locale}/gallery/${gallery.slug}`,
    image: gallery.images,
    datePublished: new Date(gallery.createdAt).toISOString(),
    inLanguage: locale,
    author: { "@id": `${SITE.url}/#business` },
  });
}
