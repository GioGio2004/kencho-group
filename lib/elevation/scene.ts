/* =====================================================================
 * SCENE BUILDER — a KitchenSpec in, a drawable scene out.
 * ---------------------------------------------------------------------
 * Returns DATA, not JSX. Three consumers render the same scene three
 * ways and none of them can drift from the others:
 *
 *   - THE DRAWING section renders it with data-draw / data-pop hooks and
 *     scrubs the whole thing to scroll.
 *   - The planner renders it statically and redraws on every edit.
 *   - The PDF exporter serialises it to a sheet.
 *
 * Pure: no DOM, no React, no side effects. That is what lets the
 * exporter run it and what makes it testable in plain Node.
 * ================================================================== */

import {
  DEPTH,
  FLOOR,
  FRONT_Z,
  GAP,
  HOOD_Z,
  OBLIQUE_LEN,
  PLINTH,
  UPPER_Z,
  WORKTOP_OVERHANG,
  WORKTOP_THICKNESS,
  WT_FRONT_Z,
  DZ,
  arrow,
  box,
  depthEdge,
  endFace,
  frontHeights,
  frontStops,
  p,
  placeUnits,
  project,
  seg,
  surfaceFace,
  topFace,
  type Levels,
  type PlacedUnit,
} from "./geometry";
import { materialFor } from "./spec";
import type { KitchenSpec, UnitType } from "./spec";

/* ---------------------------------------------------------------------
 * SCENE TYPES
 * ------------------------------------------------------------------ */

export type GroupId =
  | "carcass"
  | "dividers"
  | "fronts"
  | "countertop"
  | "appliances"
  | "details";

/** Groups in draw order — the order the section's stages animate them. */
export const GROUP_ORDER: readonly GroupId[] = [
  "carcass",
  "dividers",
  "fronts",
  "countertop",
  "appliances",
  "details",
];

export interface ScenePath {
  d: string;
  /** `draw` strokes on via dash offset; `pop` scales in from nothing. */
  role: "draw" | "pop";
}

export interface SceneGroup {
  id: GroupId;
  paths: ScenePath[];
}

export interface SceneLabel {
  x: number;
  y: number;
  value: number;
  /** Degrees; vertical chains read up the sheet. */
  rotate?: number;
}

export type Wave = 1 | 2 | 3 | 4;

/** Wave order, for the section choreography. */
export const WAVES: readonly Wave[] = [1, 2, 3, 4];

export interface SceneChain {
  id: string;
  wave: Wave;
  /** Dropped on the 390px sheet, which has no room for it. */
  wide: boolean;
  paths: ScenePath[];
  labels: SceneLabel[];
}

export interface SceneHit {
  unitId: string;
  d: string;
  type: UnitType;
  w: number;
  h: number;
  d3: number;
  /** Key under `drawing.materials`. */
  material: string;
}

export interface Scene {
  groups: SceneGroup[];
  /** Faces that tint late, for depth. */
  tints: string[];
  chains: SceneChain[];
  hits: SceneHit[];
  viewBox: { x: number; y: number; w: number; h: number };
  runWidth: number;
  levels: Levels;
}

/* ---------------------------------------------------------------------
 * ANNOTATION GEOMETRY — one set of numbers for every chain on the sheet.
 * ------------------------------------------------------------------ */
export const DIM = {
  arrowLen: 92,
  arrowHalf: 26,
  extGap: 40,
  extPast: 70,
  label: 46,
  dimmed: 0.4,
  settled: 0.7,
} as const;

/** Where the vertical chains sit, relative to the run.
 *
 *  The right-hand chain has to clear the drawing's PROJECTED extent, not
 *  its front-plane width: the worktop's back-right corner lands about
 *  260 mm right of the run, so a chain closer than this sits inside the
 *  end panel with its label printed over the cabinet. */
export const CHAIN_OFFSET = {
  left: -300,
  right: 560,
  fronts: -110,
} as const;

/* ---------------------------------------------------------------------
 * BUILD
 * ------------------------------------------------------------------ */

export interface SceneOptions {
  /** Include the annotations that only the wide sheet has room for. */
  wide?: boolean;
  /** Extra sheet margin, mm. The section needs sky for its copy block. */
  sky?: number;
}

export function buildScene(spec: KitchenSpec, opts: SceneOptions = {}): Scene {
  const { base, upper, levels, runWidth } = placeUnits(spec);
  const wide = opts.wide ?? true;
  const sky = opts.sky ?? 0;

  const groups: Record<GroupId, ScenePath[]> = {
    carcass: [],
    dividers: [],
    fronts: [],
    countertop: [],
    appliances: [],
    details: [],
  };
  const tints: string[] = [];
  const hits: SceneHit[] = [];

  const draw = (id: GroupId, d: string) => groups[id].push({ d, role: "draw" });
  const pop = (id: GroupId, d: string) => groups[id].push({ d, role: "pop" });

  const worktopX = -WORKTOP_OVERHANG;
  const worktopW = runWidth + WORKTOP_OVERHANG * 2;
  const floorPad = 320;

  /* ---- 1. CARCASS — the solids, the floor, the wall ---- */
  draw("carcass", seg(-floorPad, FLOOR, runWidth + floorPad, FLOOR));
  draw("carcass", seg(-floorPad, FLOOR, runWidth + floorPad, FLOOR, DEPTH));
  draw("carcass", depthEdge(-floorPad, FLOOR, 0, DEPTH));
  draw("carcass", depthEdge(runWidth + floorPad, FLOOR, 0, DEPTH));

  base.forEach((u) => draw("carcass", box(u.x, u.y, u.width, u.h)));
  // The run's right-hand end panel — the one side face this projection
  // shows. Taken from the LAST unit, so a tall unit at the end gets its
  // full height rather than the base run's.
  const last = base[base.length - 1];
  if (last) draw("carcass", endFace(runWidth, last.y, last.h, 0, DEPTH));

  draw("carcass", box(0, FLOOR - PLINTH, runWidth, PLINTH, 60));

  upper.forEach((u) => {
    draw("carcass", box(u.x, u.y, u.width, u.h, u.hood ? HOOD_Z : UPPER_Z));
    if (!u.hood) {
      draw("carcass", topFace(u.x, u.y, u.width, UPPER_Z, DEPTH));
    }
  });
  const lastUpper = upper[upper.length - 1];
  if (lastUpper && !lastUpper.hood) {
    draw(
      "carcass",
      endFace(lastUpper.x + lastUpper.width, lastUpper.y, lastUpper.h, UPPER_Z, DEPTH),
    );
  }

  /* ---- 2. DIVIDERS — the insides that show ---- */
  upper
    .filter((u) => u.open)
    .forEach((shelf) => {
      [0.36, 0.68].forEach((share) => {
        const y = shelf.y + shelf.h * share;
        draw("dividers", seg(shelf.x, y, shelf.x + shelf.width, y, UPPER_Z));
        draw("dividers", topFace(shelf.x, y, shelf.width, UPPER_Z, DEPTH));
      });
      draw("dividers", box(shelf.x, shelf.y, shelf.width, shelf.h, DEPTH));
    });

  base
    .filter((u) => u.type === "sink")
    .forEach((sink) => {
      draw(
        "dividers",
        seg(sink.x + sink.width / 2, sink.y + 24, sink.x + sink.width / 2, FLOOR - PLINTH - 24),
      );
      draw(
        "dividers",
        seg(sink.x + 24, sink.y + 120, sink.x + sink.width - 24, sink.y + 120),
      );
    });

  /* ---- 3. FRONTS — doors, drawers, handles ---- */
  const addFronts = (u: PlacedUnit, z: number) => {
    const heights = frontHeights(u.type, u.h);
    let y = u.y;

    if (u.type === "doors" || u.type === "sink" || u.type === "tall") {
      // A leaf either side.
      const leaf = (u.width - GAP * 3) / 2;
      [0, 1].forEach((k) => {
        const lx = u.x + GAP + k * (leaf + GAP);
        draw("fronts", box(lx, u.y + GAP / 2, leaf, u.h - GAP, z));
        const hx = k === 0 ? lx + leaf - 60 : lx + 60;
        pop("fronts", seg(hx, u.y + u.h * 0.28, hx, u.y + u.h * 0.52, z));
      });
      return;
    }

    heights.forEach((h, i) => {
      // The oven's middle opening is the appliance, drawn later.
      if (u.type === "oven" && i === 1) {
        y += h;
        return;
      }
      draw("fronts", box(u.x + GAP / 2, y + GAP / 2, u.width - GAP, h - GAP, z));
      const len = Math.min(u.width * 0.42, 300);
      const hx = u.x + (u.width - len) / 2;
      const cy = y + Math.min(h * 0.5, 70);
      pop("fronts", seg(hx, cy, hx + len, cy, z));
      y += h;
    });
  };

  base.forEach((u) => addFronts(u, FRONT_Z));
  upper
    .filter((u) => !u.hood && !u.open)
    .forEach((u) => {
      draw("fronts", box(u.x + GAP / 2, u.y + GAP / 2, u.width - GAP, u.h - GAP, UPPER_Z + FRONT_Z));
      const len = Math.min(u.h * 0.34, 260);
      const hx = u.x + u.width - 70;
      const top = u.y + (u.h - len) / 2;
      pop("fronts", seg(hx, top, hx, top + len, UPPER_Z + FRONT_Z));
    });

  /* ---- 4. COUNTERTOP — one slab, the sheet's largest surface ---- */
  draw("countertop", box(worktopX, levels.worktop, worktopW, WORKTOP_THICKNESS, WT_FRONT_Z));
  draw("countertop", topFace(worktopX, levels.worktop, worktopW, WT_FRONT_Z, DEPTH));
  draw(
    "countertop",
    endFace(worktopX + worktopW, levels.worktop, WORKTOP_THICKNESS, WT_FRONT_Z, DEPTH),
  );

  /* ---- 5. APPLIANCES — oven and extractor ---- */
  base
    .filter((u) => u.type === "oven")
    .forEach((u) => {
      const heights = frontHeights(u.type, u.h);
      const openingY = u.y + (heights[0] ?? 0);
      const openingH = heights[1] ?? 0;
      draw("appliances", box(u.x + GAP / 2, openingY, u.width - GAP, openingH, FRONT_Z));
      draw(
        "appliances",
        box(u.x + 70, openingY + 80, u.width - 140, Math.max(40, openingH - 160), FRONT_Z),
      );
    });

  upper
    .filter((u) => u.hood)
    .forEach((h) => {
      const taper = Math.min(150, h.width * 0.2);
      const neck = h.y + Math.min(260, h.h * 0.4);
      draw(
        "appliances",
        `M${p(h.x, h.y + h.h, HOOD_Z)} L${p(h.x + taper, neck, HOOD_Z)} L${p(h.x + h.width - taper, neck, HOOD_Z)} L${p(h.x + h.width, h.y + h.h, HOOD_Z)} Z`,
      );
      draw("appliances", topFace(h.x + taper, neck, h.width - taper * 2, HOOD_Z, DEPTH));
      draw("appliances", depthEdge(h.x, h.y + h.h, HOOD_Z, DEPTH));
      draw("appliances", depthEdge(h.x + h.width, h.y + h.h, HOOD_Z, DEPTH));
      const duct = Math.min(260, h.width * 0.34);
      draw("appliances", box(h.x + h.width / 2 - duct / 2, h.y, duct, neck - h.y, HOOD_Z + 60));
      draw("appliances", topFace(h.x + h.width / 2 - duct / 2, h.y, duct, HOOD_Z + 60, DEPTH));
    });

  /* ---- 6. DETAILS — splashback, hob, sink, tap ---- */
  if (upper.length) {
    draw(
      "details",
      box(0, levels.upperBottom, runWidth, levels.worktop - levels.upperBottom, DEPTH),
    );
  }

  const hoodBay = upper.find((u) => u.hood);
  if (hoodBay) {
    const inset = 80;
    draw(
      "details",
      surfaceFace(hoodBay.x + inset, levels.worktop, hoodBay.width - inset * 2, 60, 560),
    );
  }

  base
    .filter((u) => u.type === "sink")
    .forEach((sink) => {
      const bowlW = Math.min(520, sink.width - 300);
      draw("details", surfaceFace(sink.x + 180, levels.worktop, bowlW, 90, 500));
      const tapX = sink.x + 180 + bowlW / 2;
      draw(
        "details",
        `M${p(tapX, levels.worktop, 520)} L${p(tapX, levels.worktop - 260, 520)} L${p(tapX, levels.worktop - 300, 380)} L${p(tapX, levels.worktop - 190, 300)}`,
      );
    });

  /* ---- TINTS — depth, arriving late and barely there ---- */
  tints.push(topFace(worktopX, levels.worktop, worktopW, WT_FRONT_Z, DEPTH));
  const firstTinted = base[0];
  if (firstTinted) {
    tints.push(
      box(firstTinted.x + GAP / 2, firstTinted.y, firstTinted.width - GAP, firstTinted.h, FRONT_Z),
    );
  }
  const openBay = upper.find((u) => u.open);
  if (openBay) tints.push(box(openBay.x, openBay.y, openBay.width, openBay.h, DEPTH));

  /* ---- HIT TARGETS — the planner's and the section's inspect layer ---- */
  [...base, ...upper.filter((u) => !u.hood)].forEach((u) => {
    hits.push({
      unitId: u.id,
      type: u.type,
      w: u.width,
      h: Math.round(u.h),
      d3: u.depth,
      material: materialFor(u.type, !!u.open),
      d: box(u.x, u.y, u.width, u.h, u.upper ? UPPER_Z : FRONT_Z),
    });
  });

  /* ---- CHAINS ---- */
  const chains = buildChains(spec, base, upper, levels, runWidth, wide);

  /* ---- THE SHEET ----
   * Sized from the content rather than from a constant, so a 1200mm
   * kitchen and a 6000mm one are both framed rather than one of them
   * floating in a box drawn for the other. */
  const rightChain = runWidth + CHAIN_OFFSET.right;
  const leftEdge = wide ? CHAIN_OFFSET.left - 260 : -60;
  const rightEdge = rightChain + 200;
  const topEdge = levels.upperTop - 300 - DIM.extPast - 130 - sky;
  const bottomEdge = FLOOR + 620 + DIM.extPast + 140;

  return {
    groups: GROUP_ORDER.map((id) => ({ id, paths: groups[id] })),
    tints,
    chains,
    hits,
    viewBox: {
      x: leftEdge,
      y: topEdge,
      w: rightEdge - leftEdge,
      h: bottomEdge - topEdge,
    },
    runWidth,
    levels,
  };
}

/* ---------------------------------------------------------------------
 * DIMENSION CHAINS
 *
 * A chain is one baseline, one extension line per stop, and a measured
 * segment between each neighbouring pair — which is what a shop drawing
 * does. Five unit widths under one baseline reads as a run being
 * dimensioned; five separate dimensions reads as annotation scattered on
 * a picture. Every value is the difference between two stops, so a label
 * cannot disagree with the geometry it measures.
 * ------------------------------------------------------------------ */
function buildChains(
  spec: KitchenSpec,
  base: PlacedUnit[],
  upper: PlacedUnit[],
  levels: Levels,
  runWidth: number,
  wide: boolean,
): SceneChain[] {
  const out: SceneChain[] = [];

  const chain = (
    id: string,
    wave: Wave,
    axis: "h" | "v",
    stops: number[],
    at: number,
    feature: number,
    o: { flip?: boolean; wide?: boolean } = {},
  ) => {
    if (stops.length < 2) return;
    if (o.wide && !wide) return;

    const dir = Math.sign(at - feature) || 1;
    const paths: ScenePath[] = [];
    const labels: SceneLabel[] = [];
    const horizontal = axis === "h";

    stops.forEach((s) => {
      paths.push({
        role: "draw",
        d: horizontal
          ? seg(s, feature + dir * DIM.extGap, s, at + dir * DIM.extPast)
          : seg(feature + dir * DIM.extGap, s, at + dir * DIM.extPast, s),
      });
    });

    stops.slice(0, -1).forEach((s, i) => {
      const e = stops[i + 1]!;
      const value = Math.round(e - s);
      const mid = (s + e) / 2;
      const labelAt = at + (o.flip ? DIM.label : -DIM.label);

      paths.push({ role: "draw", d: horizontal ? seg(s, at, e, at) : seg(at, s, at, e) });
      paths.push({
        role: "pop",
        d: horizontal
          ? arrow(s, at, 1, 0, DIM.arrowLen, DIM.arrowHalf)
          : arrow(at, s, 0, 1, DIM.arrowLen, DIM.arrowHalf),
      });
      paths.push({
        role: "pop",
        d: horizontal
          ? arrow(e, at, -1, 0, DIM.arrowLen, DIM.arrowHalf)
          : arrow(at, e, 0, -1, DIM.arrowLen, DIM.arrowHalf),
      });
      labels.push(
        horizontal
          ? { x: mid, y: at - DIM.label, value }
          : { x: labelAt, y: mid, value, rotate: -90 },
      );
    });

    out.push({ id, wave, wide: !!o.wide, paths, labels });
  };

  /* WAVE 1 — how long and how tall. What a joiner reads first. */
  chain("overall-w", 1, "h", [0, runWidth], FLOOR + 620, FLOOR);
  if (upper.length) {
    chain("overall-h", 1, "v", [levels.upperTop, FLOOR], CHAIN_OFFSET.left, 0, {
      wide: true,
    });
  }

  /* WAVE 2 — the base run, chained on ONE baseline. */
  chain(
    "units",
    2,
    "h",
    [...base.map((u) => u.x), runWidth],
    FLOOR + 300,
    FLOOR,
  );

  /* WAVE 3 — the height chain on the right, and the extractor's width. */
  const heightStops = upper.length
    ? [levels.upperTop, levels.upperBottom, levels.worktop, FLOOR]
    : [levels.worktop, FLOOR];
  chain("heights", 3, "v", heightStops, runWidth + CHAIN_OFFSET.right, runWidth, {
    flip: true,
  });

  const hood = upper.find((u) => u.hood);
  if (hood) {
    chain(
      "hood-w",
      3,
      "h",
      [hood.x, hood.x + hood.width],
      levels.upperTop - 300,
      levels.upperTop,
    );
  }

  /* WAVE 4 — the representative detail: one unit's front heights. */
  const detailed = base.find((u) => frontHeights(u.type, u.h).length > 1);
  if (detailed) {
    chain(
      "fronts",
      4,
      "v",
      frontStops(detailed),
      detailed.x + CHAIN_OFFSET.fronts,
      detailed.x,
      { wide: true },
    );
  }

  /* WAVE 4 — depth, along the worktop's right-hand end. In a flat
   * elevation this had to be a leader with a number on it; the
   * projection made it a real edge, so it is a real dimension. */
  if (wide) {
    const wx = runWidth + WORKTOP_OVERHANG;
    const wy = levels.worktop;
    const paths: ScenePath[] = [
      { role: "draw", d: `M${p(wx, wy, WT_FRONT_Z)} L${p(wx + 200, wy - 120, WT_FRONT_Z)}` },
      { role: "draw", d: `M${p(wx, wy, DEPTH)} L${p(wx + 200, wy - 120, DEPTH)}` },
      { role: "draw", d: `M${p(wx + 150, wy - 90, WT_FRONT_Z)} L${p(wx + 150, wy - 90, DEPTH)}` },
      {
        role: "pop",
        d: arrow(
          ...(project(wx + 150, wy - 90, WT_FRONT_Z) as [number, number]),
          DZ.x / OBLIQUE_LEN,
          DZ.y / OBLIQUE_LEN,
          DIM.arrowLen,
          DIM.arrowHalf,
        ),
      },
      {
        role: "pop",
        d: arrow(
          ...(project(wx + 150, wy - 90, DEPTH) as [number, number]),
          -DZ.x / OBLIQUE_LEN,
          -DZ.y / OBLIQUE_LEN,
          DIM.arrowLen,
          DIM.arrowHalf,
        ),
      },
    ];
    const [lx, ly] = project(wx + 300, wy - 560, DEPTH / 2);
    out.push({
      id: "depth",
      wave: 4,
      wide: true,
      paths,
      labels: [{ x: lx, y: ly, value: DEPTH }],
    });
  }

  return out;
}

/** Every chain's segment values, for verification and for the PDF's
 *  module table — derived from the same stops the labels are. */
export function chainValues(scene: Scene): Record<string, number[]> {
  return Object.fromEntries(
    scene.chains.map((c) => [c.id, c.labels.map((l) => l.value)]),
  );
}
