/* =====================================================================
 * CONSTRAINTS — what makes a kitchen buildable, as a pure function.
 * ---------------------------------------------------------------------
 * `validate(spec)` returns the list of things wrong with a spec. It has
 * no opinion about how any of them should be worded, coloured or placed;
 * the planner renders from the list, the PDF exporter refuses to print
 * a sheet with errors on it, and a future quote endpoint can run the
 * same gate server-side without importing a component.
 *
 * That separation is the reason this file exists rather than the checks
 * living inside the configurator: a rule that only exists inside a React
 * component is a rule the export path does not have.
 *
 * The planner runs this on EVERY edit and renders the result inline, so
 * an invalid kitchen is never something the visitor finds out about by
 * pressing a button.
 * ================================================================== */

import { placeUnits } from "./geometry";
import {
  LIMITS,
  countOf,
  freeWidth,
  minWidthOf,
  type KitchenSpec,
  type SpecUnit,
  type UnitType,
  type UpperRow,
} from "./spec";

/* ---------------------------------------------------------------------
 * ISSUES
 * ------------------------------------------------------------------ */

/**
 * Issue codes double as message keys under `planner.issues`, so a new
 * rule is a code here and a string in three message files — never a
 * sentence typed into a component.
 */
export type IssueCode =
  | "empty"
  | "overfull"
  | "wallRange"
  | "unitBelowMin"
  | "unitAboveMax"
  | "tooMany"
  | "worktopRange"
  | "upperRange"
  | "upperTooLow";

export interface Issue {
  code: IssueCode;
  /**
   * `error` blocks: the kitchen as described cannot be built, and the
   * export path must refuse it. `notice` is a state worth naming that
   * is not wrong — an empty wall is where everyone starts.
   */
  severity: "error" | "notice";
  /** Set when the issue belongs to one module, so the strip can mark it. */
  unitId?: string;
  type?: UnitType;
  /** Numbers the message interpolates. */
  values?: Record<string, number>;
}

/**
 * Smallest wall cabinet worth drawing. Below this the upper row is a
 * strip of trim rather than storage, and the visitor has almost
 * certainly dragged a height slider past the point of usefulness.
 */
export const MIN_UPPER_CABINET = 300;

/** Everything wrong with a spec, in the order a person would notice it. */
export function validate(spec: KitchenSpec): Issue[] {
  const issues: Issue[] = [];

  if (spec.wallWidth < LIMITS.wall.min || spec.wallWidth > LIMITS.wall.max) {
    issues.push({
      code: "wallRange",
      severity: "error",
      values: { min: LIMITS.wall.min, max: LIMITS.wall.max },
    });
  }

  if (spec.baseUnits.length === 0) {
    issues.push({ code: "empty", severity: "notice" });
  }

  const spare = freeWidth(spec);
  if (spare < 0) {
    issues.push({
      code: "overfull",
      severity: "error",
      values: { mm: -spare },
    });
  }

  for (const unit of spec.baseUnits) {
    const floor = minWidthOf(unit.type);
    if (unit.width < floor) {
      issues.push({
        code: "unitBelowMin",
        severity: "error",
        unitId: unit.id,
        type: unit.type,
        values: { min: floor },
      });
    }
    if (unit.width > LIMITS.unit.max) {
      issues.push({
        code: "unitAboveMax",
        severity: "error",
        unitId: unit.id,
        type: unit.type,
        values: { max: LIMITS.unit.max },
      });
    }
  }

  for (const [type, cap] of Object.entries(LIMITS.maxOf)) {
    if (cap === undefined) continue;
    const found = countOf(spec, type as UnitType);
    if (found > cap) {
      issues.push({
        code: "tooMany",
        severity: "error",
        type: type as UnitType,
        values: { max: cap, count: found },
      });
    }
  }

  const { worktop, upper, backsplash } = spec.heights;
  if (worktop < LIMITS.worktop.min || worktop > LIMITS.worktop.max) {
    issues.push({
      code: "worktopRange",
      severity: "error",
      values: { min: LIMITS.worktop.min, max: LIMITS.worktop.max },
    });
  }
  if (upper < LIMITS.upper.min || upper > LIMITS.upper.max) {
    issues.push({
      code: "upperRange",
      severity: "error",
      values: { min: LIMITS.upper.min, max: LIMITS.upper.max },
    });
  }

  /*
   * The three heights are not independent: the wall units hang between
   * the backsplash gap and their own top, so a low `upper` and a high
   * worktop can between them describe a cabinet of negative height. The
   * two range checks above cannot catch that — only their difference can.
   */
  if (spec.upperRow && upper - worktop - backsplash < MIN_UPPER_CABINET) {
    issues.push({
      code: "upperTooLow",
      severity: "error",
      values: { min: MIN_UPPER_CABINET },
    });
  }

  return issues;
}

/** Whether anything in the list blocks building — or exporting — this. */
export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/** The issues belonging to one module, for the strip's per-chip mark. */
export function issuesFor(issues: Issue[], unitId: string): Issue[] {
  return issues.filter((i) => i.unitId === unitId);
}

/* ---------------------------------------------------------------------
 * WHAT AN EDIT WOULD COST THE UPPER ROW
 *
 * The wall run mirrors the base rhythm, so most base edits carry it
 * along without the visitor losing anything they chose. Two things in
 * that row ARE choices — where the extractor sits, and whether the last
 * bay is open shelving — and a tall unit can silently destroy either,
 * because a tall unit occupies its bay's full height and the wall run
 * simply skips it.
 *
 * Silently is the problem. This reports the cost so the planner can ask
 * first, and it is a pure comparison of two specs rather than a special
 * case buried in the add handler, so reordering a tall unit into the
 * extractor's bay is caught by exactly the same code path.
 * ------------------------------------------------------------------ */

export type UpperLoss = "hood" | "openShelf";

/** Which bays a row's two choices actually land on, after the tall
 *  units have taken theirs. `-1` means the choice has nowhere to live. */
function upperChoices(
  base: SpecUnit[],
  row: UpperRow | null | undefined,
): { hood: number; shelf: number } {
  if (!row) return { hood: -1, shelf: -1 };
  const swallowed = (i: number) => base[i]?.type === "tall";

  const hood =
    row.hoodIndex !== null &&
    row.hoodIndex >= 0 &&
    row.hoodIndex < row.units.length &&
    !swallowed(row.hoodIndex)
      ? row.hoodIndex
      : -1;

  const last = row.units.length - 1;
  const shelf = row.openShelfLast && last >= 0 && !swallowed(last) ? last : -1;

  return { hood, shelf };
}

/**
 * What `next` would take away from `current`. Compared by BAY INDEX
 * rather than by unit id: `deriveUpperRow` mints fresh ids for the whole
 * row on every base edit, so an id comparison would report every change
 * as a total loss.
 */
export function upperRowLoss(
  current: KitchenSpec,
  next: KitchenSpec,
): UpperLoss[] {
  const before = upperChoices(current.baseUnits, current.upperRow);
  const after = upperChoices(next.baseUnits, next.upperRow);
  const lost: UpperLoss[] = [];

  // Relocated counts as lost: the visitor put the extractor over the hob
  // on purpose, and finding it somewhere else is not a smaller surprise
  // than finding it gone.
  if (before.hood >= 0 && after.hood !== before.hood) lost.push("hood");
  if (before.shelf >= 0 && after.shelf < 0) lost.push("openShelf");

  return lost;
}

/* ---------------------------------------------------------------------
 * RESTORING A STORED SPEC
 *
 * sessionStorage is not a trusted input: it survives a deploy, so it can
 * hold a spec written by a previous version of the schema, and it can be
 * edited by hand. A restore therefore goes through the same shape gate
 * that a fresh spec would, and anything unrecognisable is dropped rather
 * than rendered — a planner that throws on load because of a stale key
 * is worse than one that starts from K-01.
 *
 * Note what this does NOT do: it does not enforce `validate`. A spec
 * that was legitimately saved overfull comes back overfull, with the
 * readout already red, because that is the state the visitor left.
 * ------------------------------------------------------------------ */

const UNIT_TYPES: readonly UnitType[] = [
  "doors",
  "drawers",
  "oven",
  "sink",
  "tall",
];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function finite(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseUnits(raw: unknown, prefix: string): SpecUnit[] {
  if (!Array.isArray(raw)) return [];
  const out: SpecUnit[] = [];
  const taken = new Set<string>();

  raw.forEach((entry, i) => {
    if (!isRecord(entry)) return;
    const type = entry.type;
    if (typeof type !== "string" || !UNIT_TYPES.includes(type as UnitType)) {
      return;
    }
    const width = finite(entry.width);
    if (width === null) return;

    // Ids have to be unique or React keys and the redraw diff both break.
    let id = typeof entry.id === "string" && entry.id ? entry.id : `${prefix}${i + 1}`;
    while (taken.has(id)) id = `${id}x`;
    taken.add(id);

    out.push({
      id,
      type: type as UnitType,
      width: clamp(
        Math.round(width),
        minWidthOf(type as UnitType),
        LIMITS.unit.max,
      ),
    });
  });

  return out;
}

/** A stored spec, or null if there is nothing usable in it. */
export function parseSpec(raw: unknown): KitchenSpec | null {
  if (!isRecord(raw)) return null;

  const wall = finite(raw.wallWidth);
  const baseUnits = parseUnits(raw.baseUnits, "b");
  if (wall === null || baseUnits.length === 0) return null;

  const heights = isRecord(raw.heights) ? raw.heights : {};
  const worktop = finite(heights.worktop) ?? 900;
  const upper = finite(heights.upper) ?? 2200;
  const backsplash = finite(heights.backsplash) ?? 600;

  let upperRow: UpperRow | null = null;
  if (isRecord(raw.upperRow)) {
    const units = parseUnits(raw.upperRow.units, "u");
    if (units.length) {
      const hood = finite(raw.upperRow.hoodIndex);
      upperRow = {
        units,
        hoodIndex:
          hood !== null && hood >= 0 && hood < units.length
            ? Math.round(hood)
            : null,
        openShelfLast: raw.upperRow.openShelfLast === true,
      };
    }
  }

  return {
    wallWidth: clamp(Math.round(wall), LIMITS.wall.min, LIMITS.wall.max),
    baseUnits,
    upperRow,
    heights: {
      worktop: clamp(
        Math.round(worktop),
        LIMITS.worktop.min,
        LIMITS.worktop.max,
      ),
      upper: clamp(Math.round(upper), LIMITS.upper.min, LIMITS.upper.max),
      backsplash: clamp(Math.round(backsplash), 300, 900),
    },
  };
}

/**
 * A one-line summary of a spec, for the drawing's accessible name and
 * for the export's filename. Numbers only — the caller supplies the
 * words, because this module carries no user-facing text.
 */
export function specSummary(spec: KitchenSpec): {
  wall: number;
  modules: number;
  upper: number;
  run: number;
} {
  const { upper, runWidth } = placeUnits(spec);
  return {
    wall: spec.wallWidth,
    modules: spec.baseUnits.length,
    upper: upper.length,
    run: runWidth,
  };
}
