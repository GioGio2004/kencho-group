/** Evergreen buyer copy is owned by the locale dictionaries. The CMS continues
 * to own gallery publication and photography, including newly published slugs. */
export const CATEGORY_SLUGS = [
  "kitchens",
  "wardrobes-storage",
  "home-interiors",
  "commercial-spaces",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function hasCategoryGuide(slug: string): slug is CategorySlug {
  return CATEGORY_SLUGS.some((category) => category === slug);
}
