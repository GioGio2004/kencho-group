/* =====================================================================
 * THE DRAWING — the kitchen elevation, in millimetres.
 * ---------------------------------------------------------------------
 * A front elevation of a 3600 mm kitchen run: the sort of sheet the
 * workshop actually builds from. Every number here is a real millimetre,
 * and the SVG's user units ARE millimetres, so the drawing is
 * dimensionally honest rather than decoratively "technical".
 *
 * WHY THIS IS DATA AND NOT A HAND-TYPED <svg>. The dimension labels have
 * to agree with the geometry they measure — a drawing whose "600" sits
 * over a 640 mm cabinet is worse than no drawing, because the whole
 * point of the section is precision. Deriving both the boxes and the
 * annotations from one set of numbers makes that disagreement
 * impossible, and it is what lets `npm run verify:drawing` assert the
 * labels against the runs instead of against a copy of them.
 *
 * THE COORDINATE SYSTEM is the drawing's own: x = 0 at the left end of
 * the run, y = 0 at 2400 mm above the floor, y increasing DOWNWARD as
 * SVG demands. So `floor: 2400` reads as "the floor is 2400 mm below the
 * top of the sheet", and a height above the floor is `floor - y`.
 * ================================================================== */

/** A cabinet in one of the two runs. `w` is its finished width in mm. */
export interface Unit {
  id: string;
  /** Left edge, mm from the start of the run. */
  x: number;
  /** Finished width, mm. */
  w: number;
  kind:
    | "oven"
    | "drawers"
    | "door"
    | "doors"
    | "sink"
    | "hood"
    | "shelf";
  /**
   * Front heights in millimetres, top to bottom, summing to the carcass
   * height. Absolute rather than fractional so a drawer chain reads
   * "180 / 290 / 290" instead of "182 / 289 / 289" — a drawing whose own
   * dimensions are not round numbers looks like it was measured off a
   * screenshot. Asserted against BASE_HEIGHT by the verifier.
   */
  fronts?: readonly number[];
}

/* ---------------------------------------------------------------------
 * HEIGHTS — one section through the run.
 *
 * Worktop at 900 and uppers topping out at 2200 are the two numbers a
 * joiner would recognise on sight; everything else is derived from them
 * so the elevation cannot drift out of standard.
 * ------------------------------------------------------------------ */
export const H = {
  /** Floor line. */
  floor: 2400,
  /** Recessed plinth: floor up to the underside of the base carcass. */
  plinth: 100,
  /** Underside of the worktop = top of the base carcass. */
  baseTop: 1540,
  /** Top face of the worktop — 900 mm above the floor. */
  worktop: 1500,
  /** Underside of the wall units — 600 mm of splashback above the worktop. */
  upperBottom: 900,
  /** Top of the wall units — 2200 mm above the floor. */
  upperTop: 200,
} as const;

/** Total run width. Asserted against the unit runs by the verifier. */
export const RUN_WIDTH = 3600;

/*
 * THE BASE RUN, left to right. The oven housing sits at the left end and
 * the hob above the 800 unit, which is what puts the hood at the optical
 * centre of the sheet — the same arrangement as the photograph the
 * finale resolves into, so the two compositions land on top of each
 * other rather than merely dissolving between.
 */
export const BASE: readonly Unit[] = [
  { id: "b1", x: 0, w: 600, kind: "oven", fronts: [230, 340, 190] },
  { id: "b2", x: 600, w: 600, kind: "drawers", fronts: [180, 290, 290] },
  { id: "b3", x: 1200, w: 800, kind: "doors" },
  { id: "b4", x: 2000, w: 600, kind: "drawers", fronts: [230, 530] },
  { id: "b5", x: 2600, w: 1000, kind: "sink" },
] as const;

/** Carcass height of the base run — what `fronts` must sum to. */
export const BASE_HEIGHT = H.floor - H.plinth - H.baseTop;
/** Carcass height of the wall run. */
export const UPPER_HEIGHT = H.upperBottom - H.upperTop;

/** The wall run. The hood is an outline in this run's band, not a box. */
export const UPPER: readonly Unit[] = [
  { id: "u1", x: 0, w: 600, kind: "door" },
  { id: "u2", x: 600, w: 600, kind: "door" },
  { id: "u3", x: 1200, w: 800, kind: "hood" },
  { id: "u4", x: 2000, w: 600, kind: "door" },
  { id: "u5", x: 2600, w: 1000, kind: "shelf" },
] as const;

/** Worktop overhang past the carcass line, each end, mm. */
export const WORKTOP_OVERHANG = 20;
/** Worktop thickness, mm. */
export const WORKTOP_THICKNESS = 40;
/** Base cabinet depth. */
export const DEPTH = 600;
/** Gap drawn between neighbouring fronts, mm. Real shadow gap. */
export const GAP = 4;

/* ---------------------------------------------------------------------
 * THE PROJECTION — cabinet oblique, 30°, half-scale depth.
 *
 * Not isometric, and the difference is the whole reason the section
 * still works. In an isometric every axis is foreshortened, so the
 * cabinet fronts would be parallelograms and a "600" written across one
 * would be measuring a distance that is not 600 anywhere on the sheet.
 *
 * Cabinet oblique keeps the front plane TRUE — undistorted, full scale —
 * and sends only depth away at an angle, at half scale so the boxes do
 * not read as twice as deep as they are. So the elevation IS the front
 * face of the solid, every dimension on the z = 0 plane measures exactly
 * what it says, and the drawing is in three dimensions without telling a
 * single lie about size. It is also the projection furniture drawings
 * have used for a century, which is why it is called cabinet projection.
 *
 * z is depth BACK from the front face: 0 at the fronts, DEPTH at the
 * wall. The depth vector points up and to the right, so the visible
 * faces are the front, the top, and the right-hand end.
 * ------------------------------------------------------------------ */

/** Depth angle from the horizontal, and its half-scale foreshortening. */
const OBLIQUE_ANGLE = (30 * Math.PI) / 180;
const OBLIQUE_SCALE = 0.5;

/** Screen offset per mm of depth. */
export const DZ = {
  x: OBLIQUE_SCALE * Math.cos(OBLIQUE_ANGLE),
  y: -OBLIQUE_SCALE * Math.sin(OBLIQUE_ANGLE),
} as const;

/** Wall-unit depth. Shallower than the base run, and flush to the wall,
 *  so its front plane sits further back than the base fronts. */
export const UPPER_DEPTH = 350;
/** How far back the wall-unit fronts sit. */
export const UPPER_Z = DEPTH - UPPER_DEPTH;
/** Extractor depth. */
export const HOOD_DEPTH = 500;
export const HOOD_Z = DEPTH - HOOD_DEPTH;

/** Project a point in the drawing's 3-space onto the sheet. */
export function project(x: number, y: number, z = 0): [number, number] {
  return [x + z * DZ.x, y + z * DZ.y];
}

/* ---------------------------------------------------------------------
 * DIMENSIONS
 *
 * `value` is never authored — it is measured off the geometry above, so
 * a label cannot disagree with the thing it is pointing at.
 * ------------------------------------------------------------------ */

/**
 * ONE geometry for every annotation on the sheet.
 *
 * The brief's requirement — same arrowhead, same text size, same offsets
 * everywhere — is only enforceable if there is a single place those
 * numbers exist. Every chain below reads these; nothing hand-tunes.
 */
export const DIM = {
  /** Arrowhead, in mm along and across the dimension line. */
  arrowLen: 92,
  arrowHalf: 26,
  /** Clearance between the measured feature and its extension line. */
  extGap: 40,
  /** How far the extension line runs past the dimension line. */
  extPast: 70,
  /** Label offset from its dimension line. */
  label: 46,
  /** Opacity a wave falls to when a later wave takes the focus. */
  dimmed: 0.4,
  /** Opacity every wave returns to for the hold. */
  settled: 0.7,
} as const;

/**
 * Where the two vertical chains sit.
 *
 * The right-hand chain has to clear the drawing's PROJECTED extent, not
 * its front-plane width: the worktop's back-right corner lands at
 * RUN_WIDTH + overhang + DEPTH·DZ.x, roughly 3880, so a chain at
 * RUN_WIDTH + 240 was sitting inside the end panel with its label
 * printed over the cabinet. That is the "clipped mid-word" bug — the
 * label was never clipped, it was overlapping linework.
 */
export const CHAIN_X = {
  left: -300,
  /** Cleared past the deepest projected point of the run. */
  right: RUN_WIDTH + 560,
  /** The drawer chain, tucked between the run and the overall height. */
  drawers: -110,
} as const;

export type Wave = 1 | 2 | 3 | 4;

/**
 * A dimension CHAIN: one baseline, one set of extension lines, and a
 * segment between each neighbouring pair of stops.
 *
 * Chains rather than independent dimensions because that is what a shop
 * drawing does — five unit widths under one baseline sharing their
 * extension lines reads as a run being dimensioned, whereas five
 * separate dimensions at five heights reads as annotation scattered on a
 * picture. It also halves the linework.
 *
 * Every value is the difference between two stops, so a label still
 * cannot disagree with the geometry it measures.
 */
export interface DimChain {
  id: string;
  wave: Wave;
  axis: "h" | "v";
  /** Ordered positions along the measured axis; n stops, n−1 segments. */
  stops: readonly number[];
  /** Where the dimension line sits, on the other axis. */
  at: number;
  /** Where the extension lines meet the drawing. */
  feature: number;
  /** Put the labels on the far side — vertical chains on the right. */
  flip?: boolean;
  /** Dropped on the 390px sheet, which has no room for it. */
  wide?: boolean;
}

const b1 = BASE[0]!;
const hood = UPPER[2]!;

/** Front boundaries of a unit, as absolute y positions. */
function frontStops(unit: Unit): number[] {
  const stops: number[] = [H.baseTop];
  let y = H.baseTop;
  for (const h of unit.fronts ?? []) {
    y += h;
    stops.push(y);
  }
  return stops;
}

export const CHAINS: readonly DimChain[] = [
  /* WAVE 1 — the two overalls, and nothing else. The first thing a
   * joiner reads off a sheet is how long and how tall. */
  {
    id: "overall-w",
    wave: 1,
    axis: "h",
    stops: [0, RUN_WIDTH],
    at: H.floor + 620,
    feature: H.floor,
  },
  {
    id: "overall-h",
    wave: 1,
    axis: "v",
    stops: [H.upperTop, H.floor],
    at: CHAIN_X.left,
    feature: 0,
    wide: true,
  },

  /* WAVE 2 — the base run, chained on ONE baseline above the overall. */
  {
    id: "units",
    wave: 2,
    axis: "h",
    stops: [...BASE.map((u) => u.x), RUN_WIDTH],
    at: H.floor + 300,
    feature: H.floor,
  },

  /* WAVE 3 — the height chain on the right: wall unit, splashback gap,
   * worktop. Three segments off one baseline, which is how an elevation
   * is dimensioned vertically. Plus the extractor's width. */
  {
    id: "heights",
    wave: 3,
    axis: "v",
    stops: [H.upperTop, H.upperBottom, H.worktop, H.floor],
    at: CHAIN_X.right,
    feature: RUN_WIDTH,
    flip: true,
  },
  {
    id: "hood-w",
    wave: 3,
    axis: "h",
    stops: [hood.x, hood.x + hood.w],
    at: H.upperTop - 300,
    feature: H.upperTop,
  },

  /* WAVE 4 — the representative detail: one unit's front heights, and
   * the depth. Both dropped on the handheld sheet. */
  {
    id: "fronts",
    wave: 4,
    axis: "v",
    stops: frontStops(b1),
    at: CHAIN_X.drawers,
    feature: b1.x,
    wide: true,
  },
] as const;

/** Wave order, for the choreography. */
export const WAVES: readonly Wave[] = [1, 2, 3, 4];

/* ---------------------------------------------------------------------
 * UNIT SPECS — what inspect mode reads back.
 *
 * Sizes are DERIVED from the runs above rather than retyped, so a spec
 * can never disagree with the cabinet it describes. Only the two i18n
 * keys are authored. Edit real materials by changing `material` here;
 * nothing else needs to move.
 * ------------------------------------------------------------------ */
export interface UnitSpec {
  id: string;
  /** Key under `drawing.units`. */
  name: string;
  /** Key under `drawing.materials`. */
  material: string;
  w: number;
  h: number;
  d: number;
}

const specOf = (
  unit: Unit,
  height: number,
  depth: number,
  material: string,
): UnitSpec => ({
  id: unit.id,
  name: unit.kind,
  material,
  w: unit.w,
  h: height,
  d: depth,
});

export const UNIT_SPECS: readonly UnitSpec[] = [
  specOf(BASE[0]!, BASE_HEIGHT, DEPTH, "lacquer"),
  specOf(BASE[1]!, BASE_HEIGHT, DEPTH, "oak"),
  specOf(BASE[2]!, BASE_HEIGHT, DEPTH, "lacquer"),
  specOf(BASE[3]!, BASE_HEIGHT, DEPTH, "oak"),
  specOf(BASE[4]!, BASE_HEIGHT, DEPTH, "stone"),
  specOf(UPPER[0]!, UPPER_HEIGHT, UPPER_DEPTH, "lacquer"),
  specOf(UPPER[1]!, UPPER_HEIGHT, UPPER_DEPTH, "lacquer"),
  specOf(UPPER[3]!, UPPER_HEIGHT, UPPER_DEPTH, "lacquer"),
  specOf(UPPER[4]!, UPPER_HEIGHT, UPPER_DEPTH, "veneer"),
] as const;

export const SPEC_BY_ID = new Map(UNIT_SPECS.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------
 * THE SHEET
 *
 * Two framings of the same drawing. Handheld drops the two outermost
 * annotations rather than cabinets: cropping the run would leave the
 * overall dimension reading 3600 across a kitchen that is visibly
 * shorter than that, which is the one thing a drawing may not do.
 * ------------------------------------------------------------------ */
/*
 * The height has to clear the title block, which sits 760 mm below the
 * floor line — the first cut ended at 2960 and clipped it clean off the
 * bottom of a full-bleed sheet. Cheap to get wrong, because in a boxed
 * layout the same viewBox looked fine.
 */
/*
 * The top margin is headroom for the copy, not whitespace. On a
 * full-bleed sheet the wall units start at the very top of the frame and
 * the section's eyebrow was printing over them; giving the viewBox 500 mm
 * of sky drops the drawing clear of the copy block at every width, and
 * costs a drawing that is slightly smaller but never collides.
 */
export const SHEET = {
  /** 390px: no left chains and no depth, so the left margin comes in. */
  handheld: { x: -60, y: -560, w: 4460, h: 3800 },
  /** Room for every chain, including the two on the left. */
  desktop: { x: -560, y: -820, w: 5000, h: 4060 },
} as const;

/** Above this width the desktop framing is used. */
export const SHEET_BREAKPOINT = 768;

/* ---------------------------------------------------------------------
 * RENDERED SIZES
 *
 * A technical drawing's line weight is a property of the DRAWING, not of
 * the zoom: 1.5px at 390px and 1.5px at 1440px, or it stops reading as a
 * sheet and starts reading as clip art. Since user units are millimetres,
 * these are px targets that the component converts to mm each time the
 * sheet is measured.
 *
 * `vector-effect: non-scaling-stroke` is the obvious way to hold a line
 * weight and it CANNOT be used here. It moves the whole stroke — dash
 * pattern included — into device space, while `getTotalLength()` keeps
 * returning millimetres, so a dash-based draw-on is measured in one unit
 * and rendered in another. Verified in Chromium: a 4000-unit path at
 * dashoffset 2000 renders half-drawn without the vector-effect and
 * essentially COMPLETE with it. Scaling the widths by hand is what keeps
 * the draw-on honest.
 * ------------------------------------------------------------------ */
export const WEIGHT = {
  /** Cabinet work — the drawing proper. */
  line: 1.5,
  /** Dimension lines, extension lines, leaders. Deliberately lighter:
   *  annotation must never out-weigh the thing annotated. */
  dim: 1,
  /** Dimension numbers and notes. */
  label: 11,
  /** Title block and the units note. */
  note: 9.5,
} as const;

/* ---------------------------------------------------------------------
 * CHOREOGRAPHY
 *
 * Stage boundaries in timeline seconds. The overlaps are intentional —
 * a stage starts before its predecessor finishes so the sheet is never
 * momentarily still, which is what would turn one continuous drawing
 * into nine separate animations.
 *
 * `built` claims the last fifth, which is the crossfade the whole
 * section exists for.
 * ------------------------------------------------------------------ */
export const STAGE = {
  carcass: { at: 0, dur: 2.6 },
  dividers: { at: 2.2, dur: 1.6 },
  fronts: { at: 3.4, dur: 3 },
  worktop: { at: 6, dur: 1.4 },
  appliances: { at: 7.1, dur: 1.5 },
  details: { at: 8.4, dur: 1.2 },
  /** The last wave, and the settle back to a legible sheet. */
  dims: { at: 9.6, dur: 2.4 },
  /** The hold — and the window inspect mode is live in. Long enough to
   *  be a room the visitor can stop in rather than a beat they pass. */
  approved: { at: 12, dur: 3 },
  built: { at: 15, dur: 4 },
} as const;

export type StageName = keyof typeof STAGE;

/** Total timeline length. Derived, so retiming a stage cannot desync it. */
export const TIMELINE = Math.max(
  ...Object.values(STAGE).map((s) => s.at + s.dur),
);

/** Stage names in play order, for the progress readout. */
export const STAGE_ORDER = Object.keys(STAGE) as StageName[];

/**
 * The stage a given timeline progress falls in. Reads backwards so an
 * overlap always reports the stage that most recently STARTED — which is
 * the one the visitor is watching, not the one still finishing.
 */
export function stageAt(progress: number): StageName {
  const t = progress * TIMELINE;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const name = STAGE_ORDER[i]!;
    if (t >= STAGE[name].at) return name;
  }
  return STAGE_ORDER[0]!;
}

/**
 * When each dimension wave arrives: the instant the thing it measures
 * has finished being drawn. Derived from the stages so retiming a stage
 * moves its wave with it.
 */
export const WAVE_AT: Record<Wave, number> = {
  1: STAGE.carcass.at + STAGE.carcass.dur,
  2: STAGE.fronts.at + STAGE.fronts.dur,
  3: STAGE.appliances.at + STAGE.appliances.dur,
  4: STAGE.details.at + STAGE.details.dur,
};

/** How long one wave takes to lay itself down. */
export const WAVE_DUR = 1.6;

/** Pinned scroll distance, in vh. Extended from 300 to give the hold —
 *  and therefore inspect mode — a window worth stopping in. */
export const SCROLL_LENGTH = 340;

/** Opacity the finished linework settles to over the photograph, before
 *  it leaves entirely. Low enough to read as a ghost, high enough that
 *  the overlay moment is legible. */
export const GHOST_OPACITY = 0.12;

/** Tint carried by the two panels that gain depth late in the sequence. */
export const PANEL_TINT = 0.04;
