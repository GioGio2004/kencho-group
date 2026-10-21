/*
 * PALETTE — the few colours needed where CSS cannot reach: the share
 * card (drawn by Satori, no CSSOM) and the browser-chrome colour.
 * KEEP IN SYNC with the @theme tokens at the top of app/globals.css.
 * All light: no dark surface colours exist in the system.
 */
export const PALETTE = {
  paper: "#FFFFFF",
  linen: "#F2ECE3",
  linenDeep: "#E6DCCD",
  sky: "#F2ECE3",
  ice: "#F8F4EE",
  cream: "#EFECE3",
  mineral: "#F2ECE3",
  ink: "#2A2723",
  ivory: "#FFFFFF",
  orange: "#B58E58",
  brass: "#B58E58",
  gold: "#B39359",
  /** Ink at 60%, the share card's second line. */
  inkSoft: "rgba(42, 39, 35, 0.62)",
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
  /*
   * The www host is canonical: production 308-redirects the bare apex
   * to www.kenchogroup.ge, so every canonical/hreflang/sitemap URL
   * built from this value must use www or Lighthouse flags the
   * canonical as pointing at another hreflang location.
   */
  url: "https://www.kenchogroup.ge",
  /**
   * Bing Webmaster Tools site-ownership ID. Public by design (it ships
   * in every page's <head> as msvalidate.01 and in
   * public/BingSiteAuth.xml) — it proves nothing except that whoever
   * deploys this repo controls the host.
   */
  bingVerification: "1827AF9B1C3F579DECF5A8D4F6B2AD0A",
  /**
   * IndexNow key (Bing / Yandex / Naver / Seznam / Yep share it). The
   * key file public/{key}.txt must contain exactly this string; the
   * protocol verifies each submission by fetching it. Rotate both
   * together. Also public by design. Submit with `npm run indexnow`.
   */
  indexNowKey: "e384c79236aad864d1a521fbc12d681b",
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
