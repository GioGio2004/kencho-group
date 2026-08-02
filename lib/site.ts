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
