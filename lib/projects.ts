import type { ImageAsset } from "@/lib/images";

/*
 * THE TWO PROJECTS on the home page (ProjectTiles.tsx): a family house
 * and a commercial ground floor, each with one fixed cover and a longer
 * story and photo gallery behind the plus.
 *
 * Copy and alt text live in messages/tiles-<locale>.json under the
 * project's key; this file only knows the photographs and their shape.
 */

export type ProjectKey = "house" | "lobby";

export type ProjectPhoto = ImageAsset & {
  /** 3:2 photographs lie, 2:3 stand — the frame follows. */
  landscape: boolean;
};

export type Project = {
  key: ProjectKey;
  /** Catalogue chapter the project belongs to, for "more like this". */
  chapter: string;
  /** The tile's colour: the pale one on the left, the deeper on the right. */
  tone: string;
  /** The photographs available inside the project story. */
  photos: ProjectPhoto[];
  /** The single photograph shown on the landing page. */
  cover: number;
  /** Index of the standing photograph shown small in the story. */
  portrait: number;
  /** Two closing photographs with a line each. */
  pair: [number, number];
};

const photo = (file: string, alt: string, landscape = true): ProjectPhoto => ({
  file: `${file}-tbilisi-kencho-group.webp`,
  alt,
  landscape,
});

export const PROJECTS: Project[] = [
  {
    key: "house",
    chapter: "kitchens",
    tone: "#e9e5df",
    photos: [
      photo("kitchen-island-staircase", "A white and walnut kitchen with a marble island and the staircase beyond"),
      photo("built-in-wine-rack", "A wine rack behind a glass door, set into white cabinetry", false),
      photo("walnut-upper-cabinets-kitchen", "Walnut upper cabinets and a marble splashback over the hob"),
      photo("white-oven-column-walnut-kitchen", "A built-in oven and microwave in a white column"),
      photo("open-plan-kitchen-media-wall", "The open plan: a long walnut television bench and the kitchen behind"),
      photo("wine-rack-glass-door", "The wine rack with its glass door open", false),
      photo("walnut-island-kitchen", "The kitchen island with three stools by the window"),
    ],
    cover: 2,
    portrait: 5,
    pair: [2, 3],
  },
  {
    key: "lobby",
    chapter: "commercial-spaces",
    tone: "#cfc2ae",
    photos: [
      photo("commercial-lobby-partition", "A lobby with a revolving door and an oak-slat partition"),
      photo("commercial-lobby-lounge", "The lobby lounge: a slatted oak column and two armchairs"),
      photo("backlit-slat-wall-mirror", "A backlit slat wall with a half-moon mirror and a velvet bench"),
      photo("commercial-lobby-mirror-wall", "The half-moon mirror on the slat wall, from the side", false),
      photo("commercial-lobby-bench", "A corridor with a slat wall, a round mirror and a bench"),
      photo("cafe-arched-shelving", "Arched oak shelving in the café, on a mint wall", false),
      photo("cafe-fluted-counter", "The café: a fluted counter and green chairs"),
    ],
    cover: 2,
    portrait: 5,
    pair: [6, 1],
  },
];
