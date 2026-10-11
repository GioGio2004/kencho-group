/*
 * Site-owned photographs, served from /public/furniture.
 *
 * The catalogue itself does NOT live here — its photographs are managed
 * in the admin console and come from Convex (lib/catalogue.ts). This is
 * for the images the site needs independently of that: the home page's
 * hero grid, the social-share card, the business's structured data.
 *
 * Filenames are part of the SEO surface — what the photo shows, the
 * city, the brand: <what-it-shows>-tbilisi-kencho-group.webp
 */

export type ImageAsset = {
  /** Filename under /public/furniture. */
  file: string;
  alt: string;
};

const BASE = "/furniture/";

/** Site-relative path — next/image does the sizing. */
export function src(asset: ImageAsset): string {
  return BASE + asset.file;
}

export const IMAGES = {
  /** Share card for routes without their own, and the JSON-LD image. */
  heroMain: {
    file: "walnut-island-kitchen-tbilisi-kencho-group.webp",
    alt: "A walnut and white kitchen with a large island, built by Kencho Group in Tbilisi",
  },

  /* THE HERO GRID — six photographs, chosen for colour and variety, the
   * way a furniture maker's studio shots would be: a green kitchen, cane
   * doors, bronze mirror, pale oak, a walnut wall, a black kitchen. */
  heroGreen: {
    file: "green-island-kitchen-tbilisi-kencho-group.webp",
    alt: "A deep green kitchen island with black stools",
  },
  heroCane: {
    file: "cane-entryway-wardrobe-tbilisi-kencho-group.webp",
    alt: "An entryway wardrobe with cane door panels and a shoe bench",
  },
  heroBronze: {
    file: "bronze-mirror-wardrobe-tbilisi-kencho-group.webp",
    alt: "A wall of bronze mirror wardrobe doors in warm light",
  },
  heroOak: {
    file: "fluted-oak-panel-detail-tbilisi-kencho-group.webp",
    alt: "A kitchen island wrapped in fluted oak",
  },
  heroWalnut: {
    file: "living-room-media-wall-tbilisi-kencho-group.webp",
    alt: "A living room media wall in warm walnut",
  },
  heroBlack: {
    file: "black-marble-kitchen-tbilisi-kencho-group.webp",
    alt: "A narrow black kitchen under veined marble",
  },
} as const satisfies Record<string, ImageAsset>;

export type ImageKey = keyof typeof IMAGES;
