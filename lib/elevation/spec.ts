/* =====================================================================
 * KITCHEN SPEC — what a kitchen IS, independent of how it is drawn.
 * ---------------------------------------------------------------------
 * The scroll-driven section and the planner both start here. The section
 * hands in a fixed spec (K-01, the sheet the site has always shown); the
 * planner hands in whatever the visitor has configured. Neither knows
 * anything about SVG.
 *
 * Everything a drawing needs beyond these fields is DERIVED — front
 * heights, panel positions, dimension chains, unit specs. That is the
 * same rule the original sheet was built on and the reason a label can
 * never disagree with the geometry it measures.
 * ================================================================== */

/** The five module types the MVP offers. */
export type UnitType = "doors" | "drawers" | "oven" | "sink" | "tall";

export interface SpecUnit {
  /** Stable across edits, so a re-render can animate rather than replace. */
  id: string;
  type: UnitType;
  /** Finished width in mm. */
  width: number;
}

export interface UpperRow {
  units: SpecUnit[];
  /**
   * Index into `units` that the extractor occupies instead of a cabinet.
   * `null` means no hood. The planner keeps this over the hob.
   */
  hoodIndex: number | null;
  /** The last unit becomes open shelving rather than a door. */
  openShelfLast: boolean;
}

export interface KitchenSpec {
  /** Wall the run is fitted to, mm. Units may total less, never more. */
  wallWidth: number;
  baseUnits: SpecUnit[];
  /** Absent or null means a base run only. */
  upperRow?: UpperRow | null;
  heights: {
    /** Top of the worktop above the floor. */
    worktop: number;
    /** Top of the wall units above the floor. */
    upper: number;
    /** Clear gap between worktop and the underside of the wall units. */
    backsplash: number;
  };
}

/* ---------------------------------------------------------------------
 * CONSTRAINTS
 *
 * Enforced continuously by the planner rather than on submit — a
 * configurator that lets you build something invalid and then refuses it
 * is a configurator that wasted your time.
 * ------------------------------------------------------------------ */
export const LIMITS = {
  wall: { min: 1200, max: 6000, step: 10 },
  /** Presets offered as chips. Real Georgian apartment kitchen runs. */
  wallPresets: [2400, 3000, 3600] as const,
  unit: { min: 300, max: 1200, step: 50 },
  /** An oven or a sink will not fit a carcass narrower than this. */
  minWidthFor: { oven: 600, sink: 600, tall: 600 } as Partial<
    Record<UnitType, number>
  >,
  /** MVP: one of each appliance. */
  maxOf: { oven: 1, sink: 1 } as Partial<Record<UnitType, number>>,
  worktop: { min: 850, max: 980, step: 10 },
  upper: { min: 1900, max: 2400, step: 10 },
} as const;

/** Smallest module that could ever be added — the "does anything fit" test. */
export const SMALLEST_UNIT = LIMITS.unit.min;

export function minWidthOf(type: UnitType): number {
  return LIMITS.minWidthFor[type] ?? LIMITS.unit.min;
}

/** Total width the base run occupies. */
export function usedWidth(spec: KitchenSpec): number {
  return spec.baseUnits.reduce((sum, u) => sum + u.width, 0);
}

/** Wall left over. Negative means the run overflows the wall. */
export function freeWidth(spec: KitchenSpec): number {
  return spec.wallWidth - usedWidth(spec);
}

export function countOf(spec: KitchenSpec, type: UnitType): number {
  return spec.baseUnits.filter((u) => u.type === type).length;
}

/** Whether one more of this type may be added right now, and why not. */
export function canAdd(
  spec: KitchenSpec,
  type: UnitType,
): { ok: boolean; reason?: "space" | "limit" } {
  const cap = LIMITS.maxOf[type];
  if (cap !== undefined && countOf(spec, type) >= cap) {
    return { ok: false, reason: "limit" };
  }
  if (freeWidth(spec) < minWidthOf(type)) return { ok: false, reason: "space" };
  return { ok: true };
}

/** Clamp a unit width to its type's range AND the wall's spare capacity. */
export function clampUnitWidth(
  spec: KitchenSpec,
  unitId: string,
  next: number,
): number {
  const unit = spec.baseUnits.find((u) => u.id === unitId);
  if (!unit) return next;
  const others = usedWidth(spec) - unit.width;
  const ceiling = Math.min(LIMITS.unit.max, spec.wallWidth - others);
  const floor = minWidthOf(unit.type);
  return Math.max(floor, Math.min(ceiling, next));
}

/* ---------------------------------------------------------------------
 * THE UPPER ROW
 *
 * Deliberately not independently editable in the MVP. A wall run that
 * does not line up with the base run below it reads as a mistake, and
 * giving the visitor two rows to reconcile is how a guided configurator
 * turns into CAD. So the row MIRRORS the base rhythm and the visitor
 * only chooses where the hood sits and whether the last bay is open.
 * ------------------------------------------------------------------ */
export function deriveUpperRow(
  base: SpecUnit[],
  previous?: UpperRow | null,
): UpperRow {
  const units = base.map((u) => ({
    id: `u-${u.id}`,
    // A tall unit occupies the full height, so the wall run skips it.
    type: (u.type === "tall" ? "tall" : "doors") as UnitType,
    width: u.width,
  }));

  // Keep the hood where it was if that bay still exists and can hold it.
  const wanted = previous?.hoodIndex ?? defaultHoodIndex(base);
  const hoodIndex =
    wanted !== null && wanted >= 0 && wanted < units.length && units[wanted]!.type !== "tall"
      ? wanted
      : defaultHoodIndex(base);

  return {
    units,
    hoodIndex,
    openShelfLast: previous?.openShelfLast ?? true,
  };
}

/** The hood belongs over the hob, and the hob belongs over the widest
 *  run of doors — which is where a joiner would put it. */
function defaultHoodIndex(base: SpecUnit[]): number | null {
  let best: number | null = null;
  let bestWidth = 0;
  base.forEach((u, i) => {
    if (u.type !== "doors") return;
    if (u.width > bestWidth) {
      bestWidth = u.width;
      best = i;
    }
  });
  return best;
}

/* ---------------------------------------------------------------------
 * K-01 — the sheet the site has always drawn.
 *
 * This is the section's spec AND the planner's starting point, so the
 * first screen of the configurator is never an empty wall, and the two
 * surfaces demonstrably render the same kitchen.
 * ------------------------------------------------------------------ */
export const K01: KitchenSpec = {
  wallWidth: 3600,
  baseUnits: [
    { id: "b1", type: "oven", width: 600 },
    { id: "b2", type: "drawers", width: 600 },
    { id: "b3", type: "doors", width: 800 },
    { id: "b4", type: "drawers", width: 600 },
    { id: "b5", type: "sink", width: 1000 },
  ],
  upperRow: {
    units: [
      { id: "u1", type: "doors", width: 600 },
      { id: "u2", type: "doors", width: 600 },
      { id: "u3", type: "doors", width: 800 },
      { id: "u4", type: "doors", width: 600 },
      { id: "u5", type: "doors", width: 1000 },
    ],
    hoodIndex: 2,
    openShelfLast: true,
  },
  heights: { worktop: 900, upper: 2200, backsplash: 600 },
};

/** A fresh id that will not collide with the ones already in a spec. */
export function nextUnitId(spec: KitchenSpec): string {
  let n = spec.baseUnits.length + 1;
  const taken = new Set(spec.baseUnits.map((u) => u.id));
  while (taken.has(`b${n}`)) n++;
  return `b${n}`;
}
