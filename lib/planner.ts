/* =====================================================================
 * THE PLANNER — every edit a visitor can make, as pure functions.
 * ---------------------------------------------------------------------
 * The configurator's whole state is one KitchenSpec plus which module is
 * selected. Everything below takes a spec and returns a new one; nothing
 * here touches the DOM, React or the drawing, which is what makes the
 * flow testable in plain Node and what stops the rules from existing in
 * only one of the three places that need them.
 *
 * Two invariants hold across every transform:
 *
 *   1. The upper row is DERIVED. Change the base run and the wall run
 *      re-mirrors it, keeping the extractor and the open shelf where the
 *      visitor put them if those bays still exist. A planner that let
 *      the two rows drift apart would be asking a visitor to reconcile a
 *      drawing, which is a joiner's job.
 *   2. Nothing silently deletes. A transform that would cost the visitor
 *      a choice they made is reported by `upperRowLoss` in
 *      lib/elevation/validate.ts and asked about first.
 * ================================================================== */

import {
  K01,
  LIMITS,
  clampUnitWidth,
  deriveUpperRow,
  freeWidth,
  minWidthOf,
  nextUnitId,
  parseSpec,
  upperRowLoss,
  type KitchenSpec,
  type SpecUnit,
  type UnitType,
  type UpperLoss,
} from "@/lib/elevation";

/* ---------------------------------------------------------------------
 * REDRAW
 *
 * The scene builder is pure and cheap, so every keystroke could rebuild
 * the whole sheet — and redrawing all ninety-odd strokes because one
 * cabinet got 50 mm wider would read as a page refresh rather than as an
 * edit. The stage diffs the new scene against the last one and re-draws
 * only the groups whose geometry actually moved.
 * ------------------------------------------------------------------ */
export const REDRAW = {
  /** One group's stroke-on. Short: this is feedback, not narrative. */
  duration: 0.4,
  /** Spread of the stagger across a group, in seconds. */
  stagger: 0.25,
  /**
   * Above this share of changed groups the sheet is redrawn whole.
   * Past roughly half, animating "only what changed" reads as the
   * drawing glitching in pieces rather than as it being amended.
   */
  full: 0.5,
} as const;

/** Where the working spec survives a reload. */
export const STORAGE_KEY = "alma:planner-spec";

/* ---------------------------------------------------------------------
 * MODULE DEFAULTS
 *
 * The width a module arrives at. Real carcass sizes, not round numbers
 * for their own sake: a 600 oven housing and an 800 sink base are what a
 * Georgian workshop actually cuts, so the first thing a visitor sees
 * after adding a module is a size they would have chosen anyway.
 * ------------------------------------------------------------------ */
export const DEFAULT_WIDTH: Record<UnitType, number> = {
  doors: 600,
  drawers: 600,
  oven: 600,
  sink: 800,
  tall: 600,
};

/** Module types in the order the palette offers them. */
export const PALETTE_ORDER: readonly UnitType[] = [
  "doors",
  "drawers",
  "oven",
  "sink",
  "tall",
];

const snapDown = (n: number, step: number) => Math.floor(n / step) * step;
const snapNear = (n: number, step: number) => Math.round(n / step) * step;

/* ---------------------------------------------------------------------
 * SPEC TRANSFORMS
 * ------------------------------------------------------------------ */

/** Replace the base run and re-derive the wall run over it. */
function withBase(spec: KitchenSpec, baseUnits: SpecUnit[]): KitchenSpec {
  return {
    ...spec,
    baseUnits,
    upperRow: spec.upperRow ? deriveUpperRow(baseUnits, spec.upperRow) : null,
  };
}

export function setWall(spec: KitchenSpec, mm: number): KitchenSpec {
  const wallWidth = Math.max(
    LIMITS.wall.min,
    Math.min(LIMITS.wall.max, snapNear(mm, LIMITS.wall.step)),
  );
  /*
   * Deliberately does NOT shrink the run to fit. Silently resizing five
   * cabinets because a slider moved would undo work the visitor did on
   * purpose; the run is left alone and the readout goes red, which says
   * what is wrong and leaves the fix to them.
   */
  return { ...spec, wallWidth };
}

export function setUnitWidth(
  spec: KitchenSpec,
  unitId: string,
  mm: number,
): KitchenSpec {
  const next = clampUnitWidth(spec, unitId, snapNear(mm, LIMITS.unit.step));
  return withBase(
    spec,
    spec.baseUnits.map((u) => (u.id === unitId ? { ...u, width: next } : u)),
  );
}

/** The width a module of this type would arrive at right now. */
export function widthForNew(spec: KitchenSpec, type: UnitType): number {
  const floor = minWidthOf(type);
  const room = freeWidth(spec);
  const want = Math.min(DEFAULT_WIDTH[type], room);
  return Math.max(floor, snapDown(want, LIMITS.unit.step));
}

/** Appends to the end of the run — where a joiner extends one. */
export function addUnit(spec: KitchenSpec, type: UnitType): KitchenSpec {
  if (freeWidth(spec) < minWidthOf(type)) return spec;
  const unit: SpecUnit = {
    id: nextUnitId(spec),
    type,
    width: widthForNew(spec, type),
  };
  return withBase(spec, [...spec.baseUnits, unit]);
}

export function removeUnit(spec: KitchenSpec, unitId: string): KitchenSpec {
  return withBase(
    spec,
    spec.baseUnits.filter((u) => u.id !== unitId),
  );
}

/** Swap a module with its neighbour. `-1` is left, `+1` is right. */
export function moveUnit(
  spec: KitchenSpec,
  unitId: string,
  dir: -1 | 1,
): KitchenSpec {
  const from = spec.baseUnits.findIndex((u) => u.id === unitId);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= spec.baseUnits.length) return spec;
  const base = [...spec.baseUnits];
  [base[from], base[to]] = [base[to]!, base[from]!];
  return withBase(spec, base);
}

export function setUpperEnabled(
  spec: KitchenSpec,
  on: boolean,
): KitchenSpec {
  return {
    ...spec,
    upperRow: on ? deriveUpperRow(spec.baseUnits, spec.upperRow) : null,
  };
}

export function setHood(
  spec: KitchenSpec,
  index: number | null,
): KitchenSpec {
  if (!spec.upperRow) return spec;
  return { ...spec, upperRow: { ...spec.upperRow, hoodIndex: index } };
}

export function setOpenShelf(spec: KitchenSpec, on: boolean): KitchenSpec {
  if (!spec.upperRow) return spec;
  return { ...spec, upperRow: { ...spec.upperRow, openShelfLast: on } };
}

export function setHeights(
  spec: KitchenSpec,
  next: { worktop?: number; upper?: number },
): KitchenSpec {
  const worktop =
    next.worktop === undefined
      ? spec.heights.worktop
      : Math.max(
          LIMITS.worktop.min,
          Math.min(
            LIMITS.worktop.max,
            snapNear(next.worktop, LIMITS.worktop.step),
          ),
        );
  const upper =
    next.upper === undefined
      ? spec.heights.upper
      : Math.max(
          LIMITS.upper.min,
          Math.min(LIMITS.upper.max, snapNear(next.upper, LIMITS.upper.step)),
        );
  return { ...spec, heights: { ...spec.heights, worktop, upper } };
}

/* ---------------------------------------------------------------------
 * THE STATE MACHINE
 *
 * A reducer rather than a handful of useStates, because two of these
 * actions are conditional on what a third would destroy: the ADD action
 * can resolve into a pending question instead of a new module, and that
 * decision has to be made against the same snapshot the edit applies to.
 * ------------------------------------------------------------------ */

export interface PendingTall {
  type: UnitType;
  loss: UpperLoss[];
}

export interface PlannerState {
  spec: KitchenSpec;
  /** The module the editor is showing. */
  selected: string | null;
  /** The add palette is open. */
  adding: boolean;
  /** An edit is waiting on an inline yes/no. */
  pending: PendingTall | null;
  /**
   * The client has resolved which kitchen this is. False through the
   * server's render and the first client one; true from the layout
   * effect on. Lives here rather than in a sibling useState because it
   * is the same fact as the restore.
   */
  ready: boolean;
}

export type PlannerAction =
  /** `spec: null` means "nothing was stored" — still a resolution. */
  | { type: "hydrate"; spec: KitchenSpec | null }
  | { type: "wall"; mm: number }
  /*
   * The two nudge actions carry a DIRECTION, not a result. A stepper
   * button that computed `value - step` in its own handler would lose
   * every press after the first in a batched frame, because all of them
   * close over the same rendered value. Resolving the arithmetic here,
   * against the state the reducer is holding, is what makes a rapid
   * double-tap move two steps.
   */
  | { type: "widthBy"; id: string; dir: -1 | 1 }
  | { type: "heightBy"; field: "worktop" | "upper"; dir: -1 | 1 }
  | { type: "select"; id: string | null }
  | { type: "palette"; open: boolean }
  | { type: "add"; unit: UnitType }
  /** The visitor said yes to the pending question. */
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dir: -1 | 1 }
  | { type: "upper"; on: boolean }
  | { type: "hood"; index: number | null }
  | { type: "shelf"; on: boolean }
  | { type: "reset" };

export const INITIAL_STATE: PlannerState = {
  spec: K01,
  selected: null,
  adding: false,
  pending: null,
  ready: false,
};

/** Add, unless doing so would quietly cost the visitor an upper-row
 *  choice — in which case the answer is a question, not a module. */
function tryAdd(state: PlannerState, type: UnitType): PlannerState {
  const next = addUnit(state.spec, type);
  if (next === state.spec) return state;

  const loss = upperRowLoss(state.spec, next);
  if (loss.length) {
    return { ...state, adding: false, pending: { type, loss } };
  }

  const added = next.baseUnits[next.baseUnits.length - 1];
  return {
    ...state,
    spec: next,
    adding: false,
    pending: null,
    selected: added?.id ?? state.selected,
  };
}

export function plannerReducer(
  state: PlannerState,
  action: PlannerAction,
): PlannerState {
  switch (action.type) {
    case "hydrate":
      return { ...INITIAL_STATE, spec: action.spec ?? K01, ready: true };

    case "wall":
      return { ...state, spec: setWall(state.spec, action.mm) };

    case "widthBy": {
      const unit = state.spec.baseUnits.find((u) => u.id === action.id);
      if (!unit) return state;
      return {
        ...state,
        spec: setUnitWidth(
          state.spec,
          action.id,
          unit.width + action.dir * LIMITS.unit.step,
        ),
      };
    }

    case "heightBy": {
      const step =
        action.field === "worktop" ? LIMITS.worktop.step : LIMITS.upper.step;
      const next = state.spec.heights[action.field] + action.dir * step;
      return {
        ...state,
        spec: setHeights(state.spec, { [action.field]: next }),
      };
    }

    case "select":
      return { ...state, selected: action.id, adding: false, pending: null };

    case "palette":
      return { ...state, adding: action.open, pending: null };

    case "add":
      return tryAdd(state, action.unit);

    case "confirm": {
      if (!state.pending) return state;
      const next = addUnit(state.spec, state.pending.type);
      const added = next.baseUnits[next.baseUnits.length - 1];
      return {
        ...state,
        spec: next,
        pending: null,
        adding: false,
        selected: added?.id ?? state.selected,
      };
    }

    case "cancel":
      return { ...state, pending: null };

    case "remove":
      return {
        ...state,
        spec: removeUnit(state.spec, action.id),
        selected: state.selected === action.id ? null : state.selected,
      };

    case "move":
      return { ...state, spec: moveUnit(state.spec, action.id, action.dir) };

    case "upper":
      return { ...state, spec: setUpperEnabled(state.spec, action.on) };

    case "hood":
      return { ...state, spec: setHood(state.spec, action.index) };

    case "shelf":
      return { ...state, spec: setOpenShelf(state.spec, action.on) };

    case "reset":
      return { ...INITIAL_STATE, ready: state.ready };

    default:
      return state;
  }
}

/* ---------------------------------------------------------------------
 * PERSISTENCE
 *
 * sessionStorage rather than localStorage: a plan is a working session,
 * and a visitor returning a fortnight later to find last month's
 * half-finished kitchen has been remembered for them is unsettling
 * rather than helpful.
 *
 * Both directions are total — a quota error, a disabled storage API or a
 * stale schema all resolve to "start from K-01" rather than to a blank
 * page. See `parseSpec` for why the read side is not merely JSON.parse.
 * ------------------------------------------------------------------ */
export function readStoredSpec(): KitchenSpec | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseSpec(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredSpec(spec: KitchenSpec): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    /* a plan that cannot be saved is still a plan that can be drawn */
  }
}
