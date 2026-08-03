import type { ImageKey } from "./images";

/*
 * SHOWCASE — the split-screen synced gallery.
 *
 * Each entry is one project: a pinned viewer shows the active photo
 * while a strip of the same photos scrolls past, and the two stay in
 * lockstep. Titles and locations come from messages/*.json under
 * showcase.items.<id>; only structure lives here.
 *
 * `side` flips which half holds the pinned viewer on desktop, so the
 * eye is thrown across the page between projects.
 */

export type ShowcaseProject = {
  id: "lobby" | "office" | "residence";
  side: "left" | "right";
  images: readonly ImageKey[];
};

export const SHOWCASE: readonly ShowcaseProject[] = [
  {
    id: "lobby",
    side: "left",
    images: [
      "portfolio16",
      "portfolio07",
      "portfolio13",
      "portfolio10",
    ],
  },
  {
    id: "office",
    side: "right",
    images: [
      "portfolio04",
      "portfolio10",
      "portfolio07",
      "portfolio13",
    ],
  },
  {
    id: "residence",
    side: "left",
    images: [
      "portfolio02",
      "portfolio06",
      "portfolio11",
      "portfolio01",
    ],
  },
] as const;

/** Motion tuning for the showcase. */
export const SHOWCASE_MOTION = {
  /** Crossfade between viewer photos when the active card changes. */
  swap: { duration: 0.55, ease: "power2.out" },
  /** Incoming photo starts slightly enlarged, settling as it fades in. */
  swapScale: 1.05,
  /** Ken Burns drift on whichever photo is currently showing. */
  drift: { to: 1.08, duration: 9 },
  /** Parallax travel of each strip card inside its frame (percent). */
  cardParallax: 7,
  /** Where a card counts as "active" — share of viewport height. */
  activeLine: 0.55,
} as const;
