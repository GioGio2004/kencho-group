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

  /* Masonry portfolio (aspect ratios + categories in lib/portfolio.ts;
   * localized captions/alt in messages projects.items). */
  portfolio01: { id: "1556911220-bff31c812dba", alt: "Dark wood kitchen, Vake" },
  portfolio02: { id: "1600585154340-be6161a56a0c", alt: "Sunlit kitchen, Saburtalo" },
  portfolio03: { id: "1595526114035-0d45ed16cfbf", alt: "Walk-in wardrobe, Vera" },
  portfolio04: { id: "1524758631624-e2822e304c36", alt: "Office boardroom, Saburtalo" },
  portfolio05: { id: "1600607687939-ce8a6c25118c", alt: "Kitchen with oak joinery, Dighomi" },
  portfolio06: { id: "1586023492125-27b2c045efd7", alt: "Living room storage wall, Vake" },
  portfolio07: { id: "1517248135467-4c7edcad34c4", alt: "Café interior, Vera" },
  portfolio08: { id: "1600566752229-250ed79470f8", alt: "Stone and oak kitchen, Ortachala" },
  portfolio09: { id: "1618221195710-dd6b41faaea6", alt: "Bathroom vanity, Vake" },
  portfolio10: { id: "1497366216548-37526070297c", alt: "Office lounge, Didube" },
  portfolio11: { id: "1615874959474-d609969a20ed", alt: "Bedroom built-ins, Dighomi" },
  portfolio12: { id: "1600607687920-4e2a09cf159d", alt: "Light kitchen, Mtatsminda" },
  portfolio13: { id: "1552566626-52f8b828add9", alt: "Restaurant fit-out, Mtatsminda" },
  portfolio14: { id: "1502005229762-cf1b2da7c5d6", alt: "Bedroom in soft tones, Tskneti" },
  portfolio15: { id: "1600047509807-ba8f99d2cdde", alt: "Loft kitchen, Isani" },
  portfolio16: { id: "1571003123894-1f0594d2b5d9", alt: "Hotel lobby, Vera" },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;
