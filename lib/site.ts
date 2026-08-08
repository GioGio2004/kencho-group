/*
 * PALETTE — the colours that cannot come from app/theme.css.
 *
 * The OpenGraph card renders through Satori, which has no CSSOM and
 * cannot resolve a custom property; `viewport.themeColor` is serialised
 * into <meta> at build time, long before any stylesheet exists. Both
 * need literals, so both take them from HERE rather than each inventing
 * their own — keeping the theme file's "no hex outside this file" rule
 * true in spirit even where CSS cannot reach.
 *
 * These are the RAW palette entries, not the semantic ones: an OG card
 * is a fixed artefact with no theme to follow, so it is drawn on paper
 * in ink whatever the visitor's machine prefers.
 *
 * KEEP IN SYNC with the matching tokens in app/theme.css. There is no
 * mechanism that can enforce this; it is four values, checked by the
 * theme-parity test in scripts/verify-theme.mjs.
 */
export const PALETTE = {
  /** --stone-1, the light surface. */
  sand: "#e9ebee",
  /** --espresso. */
  ink: "#14171b",
  /** --brass. */
  clay: "#8d7448",
  /** --espresso at 62%, the OG subtitle weight. */
  inkSoft: "rgba(20, 23, 27, 0.62)",
  /** --coal-0, the dark surface — browser chrome in dark mode. */
  charcoalDeep: "#0d0e10",
} as const;

/*
 * Single source of truth for brand + contact data.
 * Real client data — verify before changing.
 */
export const SITE = {
  name: "Kencho Group",
  fullName: "Kencho Group",
  legalName: "Kencho Group",
  wordmark: "KENCHO",
  wordmarkSub: "GROUP",
  location: "Tbilisi, Georgia",
  /** TODO: confirm the production domain before launch. */
  url: "https://kenchogroup.ge",
  phone: "+995 592 82 22 60",
  phoneHref: "+995592822260",
  whatsappBase: "https://wa.me/995592822260",
  email: "kenchogroup@gmail.com",
  address: {
    street: "Guram Panjikidze St 1",
    city: "Tbilisi",
    country: "GE",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Guram+Panjikidze+St+1%2C+Tbilisi%2C+Georgia",
  /**
   * TODO: confirm exact workshop coordinates with the client (these are
   * for Guram Panjikidze St, Tbilisi — replace with the pin from Google
   * Maps: right-click the building → copy coordinates).
   */
  geo: {
    latitude: 41.7225,
    longitude: 44.7754,
  },
  /**
   * Schema.org openingHoursSpecification, serialised in businessLd.
   * TODO: confirm real hours with the client.
   */
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "19:00",
    },
    { days: ["Saturday"], opens: "11:00", closes: "17:00" },
  ],
  socials: {
    facebook: "https://www.facebook.com/kenchogroup",
    tiktok: "https://www.tiktok.com/@kencho.group",
    /** TODO: real Instagram URL. */
    instagram: "https://www.instagram.com/TODO-kenchogroup",
    /** TODO: real LinkedIn URL. */
    linkedin: "https://www.linkedin.com/company/TODO-kenchogroup",
  },
  year: 2026,
} as const;

/** WhatsApp deep link with a locale-specific prefilled message. */
export function whatsappUrl(prefill: string): string {
  return `${SITE.whatsappBase}?text=${encodeURIComponent(prefill)}`;
}
