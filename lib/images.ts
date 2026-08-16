/*
 * EVERY image on the site is registered here — swap the `file` to change
 * a photo, nothing else.
 *
 * These are the client's own photographs, served from /public/furniture.
 * The filenames are part of the SEO surface — what the photo shows, in
 * search vocabulary, plus the geography and the brand — so a Google
 * Images result for "kitchen tbilisi" carries the company name before
 * the page is even visited. Keep that shape when adding files:
 *
 *   <what-it-shows>-tbilisi-kencho-group.webp
 *
 * `alt` here is the English fallback; sections render localized alt text
 * from messages/*.json where available.
 */

export type ImageAsset = {
  /** Filename under /public/furniture. */
  file: string;
  /** English fallback alt — localized alts live in messages/*.json. */
  alt: string;
};

const BASE = "/furniture/";

/**
 * Build the source path for an asset. The width parameter is kept so
 * call sites read the same as they did against the CDN, but sizing is
 * next/image's job now — it optimises local files at request time.
 */
export function src(asset: ImageAsset, _width = 2000): string {
  return BASE + asset.file;
}

export const IMAGES = {
  /** Hero — the opening plate. LCP element. */
  heroMain: {
    file: "walnut-island-kitchen-tbilisi-kencho-group.webp",
    alt: "A walnut and white kitchen with a large island, built by Kencho Group in Tbilisi",
  },

  /**
   * Before/after slider.
   *
   * HONEST TO A FAULT: the library has no true before-photo of a
   * finished space, so the pair shows one commercial project mid-fit-out
   * — bare concrete ceiling, a lone carcass — against the same project's
   * finished boardroom. A real same-viewpoint pair should replace this
   * the day the client shoots one.
   */
  shellBefore: {
    file: "office-fit-out-in-progress-tbilisi-kencho-group.webp",
    alt: "An office space mid fit-out, bare concrete ceiling and a single carcass",
  },
  shellAfter: {
    file: "office-boardroom-furniture-tbilisi-kencho-group.webp",
    alt: "The finished office boardroom with walnut wall units and a conference table",
  },

  /** Services — one image per card. */
  serviceKitchens: {
    file: "white-oak-island-kitchen-tbilisi-kencho-group.webp",
    alt: "A white and oak kitchen with an island and pendant lights",
  },
  serviceWardrobes: {
    file: "oak-framed-wardrobe-tbilisi-kencho-group.webp",
    alt: "A run of built-in wardrobes with oak frames",
  },
  servicePaneling: {
    file: "fluted-oak-panel-detail-tbilisi-kencho-group.webp",
    alt: "A fluted oak island panel, curved at the corner",
  },
  serviceCommercial: {
    file: "commercial-reception-desk-tbilisi-kencho-group.webp",
    alt: "A slatted-wood reception desk in a commercial lobby",
  },

  /**
   * The Drawing — the photograph the elevation resolves into. A dead-on
   * single-wall kitchen, which is the arrangement the elevation is drawn
   * in; the crossfade only works if the two compositions land on each
   * other.
   */
  drawingReality: {
    file: "white-oak-kitchen-wall-tbilisi-kencho-group.webp",
    alt: "A white and oak kitchen wall, seen straight on",
  },

  /**
   * GENERATED from drawingReality — a difference-of-Gaussians graphite
   * trace (sigma 6, gain 3.5), the pencil rendering the print head
   * works ahead of. Regenerate whenever the photograph is swapped, or
   * the machine will be printing a different kitchen than it drew.
   * Decorative: rendered aria-hidden, never crawled for.
   */
  drawingTrace: {
    file: "white-oak-kitchen-wall-tbilisi-kencho-group-trace.webp",
    alt: "",
  },

  /* Masonry portfolio (aspect ratios + categories in lib/portfolio.ts;
   * localized captions/alt in messages projects.items). */
  portfolio01: {
    file: "walnut-and-concrete-kitchen-tbilisi-kencho-group.webp",
    alt: "A walnut and concrete-grey kitchen with a black extractor",
  },
  portfolio02: {
    file: "dark-walnut-kitchen-tbilisi-kencho-group.webp",
    alt: "A dark kitchen with a walnut feature wall and island",
  },
  portfolio03: {
    file: "oak-framed-wardrobe-hall-tbilisi-kencho-group.webp",
    alt: "Oak-framed wardrobes along a parquet hallway",
  },
  portfolio04: {
    file: "office-boardroom-furniture-tbilisi-kencho-group.webp",
    alt: "An office boardroom with walnut shelving and a long table",
  },
  portfolio05: {
    file: "green-marble-kitchen-tbilisi-kencho-group.webp",
    alt: "A green kitchen with a marble splashback and island seating",
  },
  portfolio06: {
    file: "bronze-mirror-wardrobe-tbilisi-kencho-group.webp",
    alt: "A wardrobe with bronze mirror fronts in warm light",
  },
  portfolio07: {
    file: "commercial-lobby-lounge-tbilisi-kencho-group.webp",
    alt: "A commercial lobby lounge with slatted wood and glass",
  },
  portfolio08: {
    file: "grey-marble-kitchen-tbilisi-kencho-group.webp",
    alt: "A grey kitchen with a marble splashback",
  },
  portfolio09: {
    file: "cane-entryway-wardrobe-tbilisi-kencho-group.webp",
    alt: "An entryway wardrobe with cane door panels and a shoe bench",
  },
  portfolio10: {
    file: "office-walnut-wall-unit-tbilisi-kencho-group.webp",
    alt: "An office storage wall in walnut with display shelving",
  },
  portfolio11: {
    file: "white-built-in-wardrobe-tbilisi-kencho-group.webp",
    alt: "A white built-in wardrobe with brass pulls",
  },
  portfolio12: {
    file: "green-island-kitchen-tbilisi-kencho-group.webp",
    alt: "A green kitchen with an island and black breakfast bar",
  },
  portfolio13: {
    file: "commercial-lobby-mirror-wall-tbilisi-kencho-group.webp",
    alt: "A curved mirror wall with wood slats in a commercial lobby",
  },
  portfolio14: {
    file: "built-in-wine-rack-tbilisi-kencho-group.webp",
    alt: "A diamond wine rack built into white cabinetry",
  },
  portfolio15: {
    file: "kitchen-island-staircase-tbilisi-kencho-group.webp",
    alt: "An open-plan kitchen with island beside a staircase",
  },
  portfolio16: {
    file: "classic-white-kitchen-tbilisi-kencho-group.webp",
    alt: "A classic white kitchen with ornate cabinetry",
  },

  /* The rooms section on the home page (card for the gallery that has
   * no portfolio entry of its own). */
  roomInteriors: {
    file: "living-room-media-wall-tbilisi-kencho-group.webp",
    alt: "A living room media wall in warm walnut",
  },

  /* The panorama's macro-texture scene — fluted oak up close. */
  textureFluted: {
    file: "fluted-oak-panel-detail-tbilisi-kencho-group.webp",
    alt: "Fluted oak panelling in close detail",
  },

  /* The voyage — the journey construction that closes the home page. */
  /** The drift band the ghost route-codes float over. Dark, so the
   *  bone letters read as letters rather than as a caption. */
  voyageDrift: {
    file: "black-oak-kitchen-dining-tbilisi-kencho-group.webp",
    alt: "A black oak kitchen and dining space built by Kencho Group in Tbilisi",
  },
  /** The closing CTA plate — warm light, an invitation. */
  voyageClose: {
    file: "bronze-mirror-wardrobe-tbilisi-kencho-group.webp",
    alt: "A wardrobe with bronze mirror fronts in warm light",
  },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;
