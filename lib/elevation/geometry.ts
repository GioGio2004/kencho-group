/* =====================================================================
 * ELEVATION GEOMETRY — a KitchenSpec resolved into millimetres.
 * ---------------------------------------------------------------------
 * The sheet's coordinate system is the drawing's own: x = 0 at the left
 * end of the run, y = 0 at 2400 mm above the floor, y increasing DOWNWARD
 * as SVG demands. So `FLOOR` reads as "the floor is 2400 mm below the top
 * of the sheet", and a height above the floor is `FLOOR - y`.
 *
 * SVG user units ARE millimetres. That is what makes the dimensions
 * honest rather than decoratively technical.
 * ================================================================== */

import type { KitchenSpec, SpecUnit, UnitType } from "./spec";

/** Floor line. Everything else is measured up from here. */
export const FLOOR = 2400;
/** Recessed plinth: floor up to the underside of the base carcass. */
export const PLINTH = 100;
/** Worktop thickness. */
export const WORKTOP_THICKNESS = 40;
/** Worktop overhang past the carcass line, each end. */
export const WORKTOP_OVERHANG = 20;
/** Base cabinet depth. */
export const DEPTH = 600;
/** Wall-unit depth — shallower, and flush to the wall. */
export const UPPER_DEPTH = 350;
/** Extractor depth. */
export const HOOD_DEPTH = 500;
/** Shadow gap drawn between neighbouring fronts. */
export const GAP = 4;

/** How far back each run's front plane sits from the base fronts. */
export const UPPER_Z = DEPTH - UPPER_DEPTH;
export const HOOD_Z = DEPTH - HOOD_DEPTH;
/** Doors and drawers stand this far proud of their carcass. */
export const FRONT_Z = -18;
/** The worktop overhangs the fronts at its front edge. */
export const WT_FRONT_Z = -46;

/* ---------------------------------------------------------------------
 * THE PROJECTION — cabinet oblique, 30°, half-scale depth.
 *
 * Not isometric, and the difference is the whole reason the dimensions
 * survive. In an isometric every axis is foreshortened, so a cabinet
 * front is a parallelogram and a "600" written across it measures a
 * distance that is not 600 anywhere on the sheet.
 *
 * Cabinet oblique keeps the front plane TRUE — undistorted, full scale —
 * and sends only depth away at an angle, at half scale so the boxes do
 * not read as twice as deep as they are. The elevation IS the front face
 * of the solid, and every dimension on the z = 0 plane measures exactly
 * what it says.
 * ------------------------------------------------------------------ */
const OBLIQUE_ANGLE = (30 * Math.PI) / 180;
const OBLIQUE_SCALE = 0.5;

export const DZ = {
  x: OBLIQUE_SCALE * Math.cos(OBLIQUE_ANGLE),
  y: -OBLIQUE_SCALE * Math.sin(OBLIQUE_ANGLE),
} as const;

/** Length of the projected depth vector, for arrowheads that point
 *  along it rather than along a screen axis. */
export const OBLIQUE_LEN = Math.hypot(DZ.x, DZ.y);

export function project(x: number, y: number, z = 0): [number, number] {
  return [x + z * DZ.x, y + z * DZ.y];
}

/* ---------------------------------------------------------------------
 * PATH HELPERS
 *
 * Every shape is a <path> so the draw direction is ours: a <rect> cannot
 * say where its stroke starts, and a box that draws from a random corner
 * reads as a glitch rather than as a hand.
 * ------------------------------------------------------------------ */

/** One projected point, rounded to a tenth of a millimetre. */
export const p = (x: number, y: number, z = 0): string => {
  const [px, py] = project(x, y, z);
  return `${Math.round(px * 10) / 10} ${Math.round(py * 10) / 10}`;
};

export const box = (x: number, y: number, w: number, h: number, z = 0) =>
  `M${p(x, y, z)} L${p(x + w, y, z)} L${p(x + w, y + h, z)} L${p(x, y + h, z)} Z`;

export const seg = (x1: number, y1: number, x2: number, y2: number, z = 0) =>
  `M${p(x1, y1, z)} L${p(x2, y2, z)}`;

/** The top face of a solid: its front top edge swept back to the wall. */
export const topFace = (
  x: number,
  y: number,
  w: number,
  zFront: number,
  zBack: number,
) =>
  `M${p(x, y, zFront)} L${p(x, y, zBack)} L${p(x + w, y, zBack)} L${p(x + w, y, zFront)} Z`;

/** The right-hand end — the only side face this projection shows,
 *  because depth runs up and to the right. */
export const endFace = (
  x: number,
  y: number,
  h: number,
  zFront: number,
  zBack: number,
) =>
  `M${p(x, y, zFront)} L${p(x, y, zBack)} L${p(x, y + h, zBack)} L${p(x, y + h, zFront)} Z`;

/** A single depth edge, where only the recession needs showing. */
export const depthEdge = (x: number, y: number, zFront: number, zBack: number) =>
  `M${p(x, y, zFront)} L${p(x, y, zBack)}`;

/** A face lying in a horizontal plane — a hob or a sink on the worktop. */
export const surfaceFace = (
  x: number,
  y: number,
  w: number,
  zNear: number,
  zFar: number,
) =>
  `M${p(x, y, zNear)} L${p(x + w, y, zNear)} L${p(x + w, y, zFar)} L${p(x, y, zFar)} Z`;

/** Arrowhead as a filled triangle, pointing along a unit vector. */
export const arrow = (
  x: number,
  y: number,
  dx: number,
  dy: number,
  len = 92,
  half = 26,
) => {
  const tx = x + dx * len;
  const ty = y + dy * len;
  const px = -dy * half;
  const py = dx * half;
  return `M${x} ${y} L${tx + px} ${ty + py} L${tx - px} ${ty - py} Z`;
};

/* ---------------------------------------------------------------------
 * RESOLVING A SPEC
 * ------------------------------------------------------------------ */

/** A unit with its position and box resolved into sheet coordinates. */
export interface PlacedUnit extends SpecUnit {
  /** Left edge, mm from the start of the run. */
  x: number;
  /** Top of its carcass. */
  y: number;
  /** Carcass height. */
  h: number;
  /** Front plane, mm back from the base fronts. */
  z: number;
  /** Depth of this unit. */
  depth: number;
  /** True for the wall run. */
  upper: boolean;
  /** This bay holds the extractor rather than a cabinet. */
  hood?: boolean;
  /** This bay is open shelving. */
  open?: boolean;
}

export interface Levels {
  floor: number;
  /** Top face of the worktop. */
  worktop: number;
  /** Top of the base carcass = underside of the worktop. */
  baseTop: number;
  /** Underside of the wall units. */
  upperBottom: number;
  /** Top of the wall units. */
  upperTop: number;
  baseHeight: number;
  upperHeight: number;
}

export function levelsOf(spec: KitchenSpec): Levels {
  const worktop = FLOOR - spec.heights.worktop;
  const baseTop = worktop + WORKTOP_THICKNESS;
  const upperTop = FLOOR - spec.heights.upper;
  const upperBottom = worktop - spec.heights.backsplash;
  return {
    floor: FLOOR,
    worktop,
    baseTop,
    upperBottom,
    upperTop,
    baseHeight: FLOOR - PLINTH - baseTop,
    upperHeight: upperBottom - upperTop,
  };
}

/** Lay the base run out left to right, and the wall run above it. */
export function placeUnits(spec: KitchenSpec): {
  base: PlacedUnit[];
  upper: PlacedUnit[];
  levels: Levels;
  runWidth: number;
} {
  const levels = levelsOf(spec);
  let x = 0;
  const base: PlacedUnit[] = spec.baseUnits.map((u) => {
    const placed: PlacedUnit = {
      ...u,
      x,
      // A tall unit runs from the top of the wall units to the plinth.
      y: u.type === "tall" ? levels.upperTop : levels.baseTop,
      h:
        u.type === "tall"
          ? FLOOR - PLINTH - levels.upperTop
          : levels.baseHeight,
      z: 0,
      depth: DEPTH,
      upper: false,
    };
    x += u.width;
    return placed;
  });

  const runWidth = x;
  const row = spec.upperRow;
  const upper: PlacedUnit[] = [];

  if (row) {
    let ux = 0;
    row.units.forEach((u, i) => {
      const overTall = spec.baseUnits[i]?.type === "tall";
      // A tall base unit already occupies this bay's full height.
      if (!overTall) {
        upper.push({
          ...u,
          x: ux,
          y: levels.upperTop,
          h: levels.upperHeight,
          z: i === row.hoodIndex ? HOOD_Z : UPPER_Z,
          depth: i === row.hoodIndex ? HOOD_DEPTH : UPPER_DEPTH,
          upper: true,
          hood: i === row.hoodIndex,
          open: row.openShelfLast && i === row.units.length - 1,
        });
      }
      ux += u.width;
    });
  }

  return { base, upper, levels, runWidth };
}

/* ---------------------------------------------------------------------
 * FRONT DIVISION
 *
 * Absolute millimetres summing to the carcass height, rounded to 10 so a
 * drawer chain labels 180/290/290 rather than 182/289/289. A drawing
 * whose own numbers are not round reads as measured off a screenshot.
 * ------------------------------------------------------------------ */
export function frontHeights(type: UnitType, h: number): number[] {
  const round10 = (n: number) => Math.round(n / 10) * 10;

  if (type === "oven") {
    // Drawer, oven, drawer. The oven is the fixed appliance opening.
    const oven = round10(Math.min(600, h * 0.45));
    const top = round10((h - oven) * 0.55);
    return [top, oven, h - oven - top];
  }
  if (type === "drawers") {
    // Three rows above ~700mm, two below — a 190mm drawer is a joke.
    if (h < 700) {
      const top = round10(h * 0.34);
      return [top, h - top];
    }
    const top = round10(h * 0.24);
    const mid = round10((h - top) / 2);
    return [top, mid, h - top - mid];
  }
  // Doors, sinks and tall units are a single leaf pair.
  return [h];
}

/** Front boundaries as absolute y positions, for a dimension chain. */
export function frontStops(unit: PlacedUnit): number[] {
  const stops: number[] = [unit.y];
  let y = unit.y;
  for (const h of frontHeights(unit.type, unit.h)) {
    y += h;
    stops.push(y);
  }
  return stops;
}
