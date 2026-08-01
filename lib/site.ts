/*
 * Single source of truth for brand + contact copy.
 * Swap these values to rebrand the entire site.
 */
export const SITE = {
  name: "ALMA",
  wordmark: "ALMA",
  fullName: "Alma Residences",
  tagline: "Residences shaped by light",
  description:
    "Twenty-four residences in a quiet quarter of the old town. Deep terraces, lime-washed walls, and light that moves through the day.",
  location: "Vera District, Tbilisi",
  phone: "+995 592 82 22 60",
  phoneHref: "+995592822260",
  email: "hello@almaresidences.com",
  url: "https://almaresidences.com",
  year: 2026,
} as const;

export const NAV_LINKS = [
  { href: "#residences", label: "Residences" },
  { href: "#gallery", label: "Gallery" },
  { href: "#location", label: "Location" },
] as const;
