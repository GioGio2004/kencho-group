/*
 * EVERY image on the site is registered here — swap the `id` to change a
 * photo, nothing else. `id` is the Unsplash photo slug from a
 * https://images.unsplash.com/photo-<id> URL.
 *
 * `src()` requests a generously sized source; next/image downscales it
 * per device via the `sizes` attribute on each <Image>.
 */

export type ImageAsset = {
  /** Unsplash photo slug (the part after `photo-`). */
  id: string;
  /** Descriptive alt text — keep meaningful for accessibility and SEO. */
  alt: string;
};

const BASE = "https://images.unsplash.com/photo-";

/** Build a full source URL for an asset. */
export function src(asset: ImageAsset, width = 2000): string {
  return `${BASE}${asset.id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const IMAGES = {
  /** Hero — the opening image: card, then full-bleed. LCP element. */
  heroMain: {
    id: "1600585154340-be6161a56a0c",
    alt: "Sunlit living room with warm neutral walls and floor-to-ceiling windows",
  },

  /** Before/after slider — the raw shell state. */
  shellBefore: {
    id: "1503174971373-b1f69850bded",
    alt: "Unfinished apartment shell with bare concrete walls before fit-out",
  },
  /** Before/after slider — the finished interior. */
  shellAfter: {
    id: "1600607687939-ce8a6c25118c",
    alt: "The same space finished with warm oak joinery and soft natural light",
  },

  /** Residences — one image per floorplan card. */
  residenceOne: {
    id: "1600607687920-4e2a09cf159d",
    alt: "One-bedroom residence with open-plan living area and oak flooring",
  },
  residenceTwo: {
    id: "1600566753086-00f18fb6b3ea",
    alt: "Two-bedroom residence with a bright corner window and linen furnishings",
  },
  residencePenthouse: {
    id: "1600047509807-ba8f99d2cdde",
    alt: "Penthouse living space with double-height ceilings and terrace access",
  },

  /** Gallery grid. */
  gallery01: {
    id: "1616486338812-3dadae4b4ace",
    alt: "Modern residential facade in warm stone under afternoon light",
  },
  gallery02: {
    id: "1586023492125-27b2c045efd7",
    alt: "Minimalist living room with a low sofa and neutral textiles",
  },
  gallery03: {
    id: "1502005229762-cf1b2da7c5d6",
    alt: "Bedroom in soft beige tones with morning light across the bed",
  },
  gallery04: {
    id: "1600566752229-250ed79470f8",
    alt: "Kitchen detail with pale stone counters and integrated oak cabinetry",
  },
  gallery05: {
    id: "1618221195710-dd6b41faaea6",
    alt: "Bathroom clad in warm microcement with a sculptural basin",
  },
  gallery06: {
    id: "1560185007-cde436f6a4d0",
    alt: "Terrace with planting and a view over neighbouring rooftops",
  },

  /** Location — full-bleed masked reveal. */
  locationAerial: {
    id: "1493809842364-78817add7ffb",
    alt: "Aerial view over the surrounding district at golden hour",
  },

  /** Contact — quiet supporting detail shot. */
  contactDetail: {
    id: "1522771739844-6a9f6d5f14af",
    alt: "Entrance hall detail with a plaster wall and brass door handle",
  },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;
