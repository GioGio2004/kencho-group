/* =====================================================================
 * STRUCTURED DATA
 * ---------------------------------------------------------------------
 * One rule governs everything here: SCHEMA DESCRIBES THE PAGE IT IS ON.
 *
 * The site used to emit its FAQPage from the shared locale layout, which
 * meant every route carried it — including the planner, which has no
 * questions and no answers anywhere in its markup. Google treats that as
 * structured data that does not match the page and can drop the rich
 * result for the page that DOES have the FAQ. So the business belongs to
 * the site and stays in the layout; the FAQ belongs to the home page and
 * lives there.
 *
 * Everything is emitted as a string, because <script type="ld+json">
 * takes raw JSON rather than a React child.
 * ================================================================== */

import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";

/* Keep in sync with ITEM_KEYS in app/_components/FAQ.tsx — the schema
 * must describe exactly the questions the page shows. */
const FAQ_IDS = [
  "pricing",
  "timeline",
  "process",
  "materials",
  "warranty",
  "area",
  "commercial",
] as const;

/** The four things the workshop sells, in the order the page lists them. */
const SERVICE_IDS = [
  "kitchens",
  "wardrobes",
  "paneling",
  "commercial",
] as const;

/**
 * The company. Site-wide and true on every route, so this one is the
 * layout's.
 *
 * `hasOfferCatalog` is new: a FurnitureStore with no stated offerings
 * tells a search engine what the business IS but nothing about what it
 * DOES, and "kitchens / wardrobes / panelling / commercial fit-outs" is
 * exactly the vocabulary a Tbilisi search uses.
 */
export async function businessLd(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "services" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": `${SITE.url}/#business`,
    name: SITE.name,
    url: `${SITE.url}/${locale}`,
    // Absolute, not the site-relative path src() now returns — JSON-LD
    // is read outside the page, where a relative URL points nowhere.
    image: `${SITE.url}${src(IMAGES.heroMain, 1200)}`,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressCountry: SITE.address.country,
    },
    areaServed: { "@type": "City", name: SITE.address.city },
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
    // Only the accounts that exist — TODO placeholders in lib/site.ts
    // must not ship as claimed profiles.
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
        },
      })),
    },
  });
}

/** The questions — home page only, because that is where they are. */
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

/**
 * A trail for any route below the home page. Two levels is all this site
 * has, and a breadcrumb is what stops a search result for the planner
 * showing a bare URL under its title.
 */
export async function breadcrumbLd(
  locale: Locale,
  leaf: { name: string; path: string },
): Promise<string> {
  /*
   * `crumbHome`, not `nav.home`. The nav string is "Back to top" in
   * English — a scroll affordance for the header link — and it was
   * shipping as the position-1 label of the breadcrumb Google renders.
   * ka and ru happened to read correctly; English did not.
   */
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

/**
 * The trail for a single gallery — three levels, because a gallery page
 * sits below the gallery index. The two-level breadcrumbLd above stays
 * as it is; every other route really is one level below home.
 */
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

/**
 * A gallery as a work rather than a page: the photographs, when it was
 * made, and that the business above is its author. This is what lets an
 * image search or an AI answer attribute the work instead of just
 * finding the file.
 */
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

/**
 * The planner, as a thing rather than as a page. It is a free tool with
 * a real function, and saying so is the difference between ranking for
 * "kitchen planner" and ranking for the company name.
 */
export async function plannerLd(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "planner" });
  const meta = await getTranslations({ locale, namespace: "metaPlanner" });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("title"),
    url: `${SITE.url}/${locale}/planner`,
    description: meta("description"),
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "GEL" },
    provider: { "@id": `${SITE.url}/#business` },
  });
}
