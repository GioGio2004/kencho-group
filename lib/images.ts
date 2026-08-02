/*
 * EVERY image on the site is registered here — swap the `id` to change a
 * photo, nothing else. `id` is the Unsplash photo slug from a
 * https://images.unsplash.com/photo-<id> URL. All IDs verified live.
 *
 * `alt` here is the English fallback; sections render localized alt text
 * from messages/*.json where available.
 */

export type ImageAsset = {
  /** Unsplash photo slug (the part after `photo-`). */
  id: string;
  /** English fallback alt — localized alts live in messages/*.json. */
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
    alt: "A kitchen built by Kencho Group in natural light",
  },

  /** Before/after slider. */
  shellBefore: {
    id: "1503174971373-b1f69850bded",
    alt: "An unfinished space in shell condition before fit-out",
  },
  shellAfter: {
    id: "1600607687939-ce8a6c25118c",
    alt: "The same space with a finished interior and built-in furniture",
  },

  /** Services — one image per glass card. */
  serviceKitchens: {
    id: "1556911220-bff31c812dba",
    alt: "A custom kitchen with dark wood cabinet fronts",
  },
  serviceWardrobes: {
    id: "1595526114035-0d45ed16cfbf",
    alt: "A built-in wardrobe room with wooden detailing",
  },
  servicePaneling: {
    id: "1615874959474-d609969a20ed",
    alt: "Wooden wall paneling in soft light",
  },
  serviceCommercial: {
    id: "1524758631624-e2822e304c36",
    alt: "A commercial interior with custom furniture",
  },

  /** Projects gallery. */
  project01: {
    id: "1600566752229-250ed79470f8",
    alt: "A dark wood kitchen in Vake",
  },
  project02: {
    id: "1586023492125-27b2c045efd7",
    alt: "A living room with built-in furniture in Saburtalo",
  },
  project03: {
    id: "1502005229762-cf1b2da7c5d6",
    alt: "A bedroom with wooden accents in Dighomi",
  },
  project04: {
    id: "1600607687920-4e2a09cf159d",
    alt: "A light-toned kitchen in Vera",
  },
  project05: {
    id: "1618221195710-dd6b41faaea6",
    alt: "A microcement bathroom in Vake",
  },
  project06: {
    id: "1560185007-cde436f6a4d0",
    alt: "A furnished terrace in Mtatsminda",
  },

  /** Contact — quiet supporting detail shot. */
  contactDetail: {
    id: "1522771739844-6a9f6d5f14af",
    alt: "An interior detail — a wooden surface in soft light",
  },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;
