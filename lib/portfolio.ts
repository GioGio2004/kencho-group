import type { ImageKey } from "./images";

/*
 * Masonry portfolio registry. Each item pins an image, a reserved aspect
 * ratio (prevents CLS — the box exists before the photo loads), and a
 * filter category. Captions and alt text live in messages/*.json under
 * projects.items.<key>.
 *
 * When real photos arrive: swap the Unsplash id in lib/images.ts and, if
 * the real photo's orientation differs, adjust `aspect` here to match.
 */

export type PortfolioCategory = "kitchens" | "wardrobes" | "commercial";

/** width/height, used directly in CSS aspect-ratio. */
export type PortfolioAspect = "3/4" | "4/3" | "1/1" | "2/3" | "4/5" | "16/10";

export type PortfolioItem = {
  key: `p${number}`;
  image: ImageKey;
  aspect: PortfolioAspect;
  category: PortfolioCategory;
};

export const PORTFOLIO: readonly PortfolioItem[] = [
  { key: "p1", image: "portfolio01", aspect: "3/4", category: "kitchens" },
  { key: "p2", image: "portfolio02", aspect: "4/3", category: "kitchens" },
  { key: "p3", image: "portfolio03", aspect: "3/4", category: "wardrobes" },
  { key: "p4", image: "portfolio04", aspect: "4/3", category: "commercial" },
  { key: "p5", image: "portfolio05", aspect: "1/1", category: "kitchens" },
  { key: "p6", image: "portfolio06", aspect: "4/5", category: "wardrobes" },
  { key: "p7", image: "portfolio07", aspect: "3/4", category: "commercial" },
  { key: "p8", image: "portfolio08", aspect: "2/3", category: "kitchens" },
  { key: "p9", image: "portfolio09", aspect: "1/1", category: "wardrobes" },
  { key: "p10", image: "portfolio10", aspect: "4/3", category: "commercial" },
  { key: "p11", image: "portfolio11", aspect: "3/4", category: "wardrobes" },
  { key: "p12", image: "portfolio12", aspect: "4/5", category: "kitchens" },
  { key: "p13", image: "portfolio13", aspect: "4/3", category: "commercial" },
  { key: "p14", image: "portfolio14", aspect: "16/10", category: "wardrobes" },
  { key: "p15", image: "portfolio15", aspect: "2/3", category: "kitchens" },
  { key: "p16", image: "portfolio16", aspect: "4/5", category: "commercial" },
] as const;

export const PORTFOLIO_CATEGORIES: readonly PortfolioCategory[] = [
  "kitchens",
  "wardrobes",
  "commercial",
];

/** Per-column scroll drift (%), cycled by column index — the subtle
 * differential that makes the masonry feel alive. */
export const COLUMN_DRIFT = [0, -5, 3, -4] as const;
