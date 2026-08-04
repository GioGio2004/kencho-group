/* =====================================================================
 * THE DRAWING — the scroll section's choreography.
 * ---------------------------------------------------------------------
 * The kitchen itself, its geometry and its dimension chains moved to
 * lib/elevation/, which the planner and the PDF exporter share. What is
 * left here is everything that only makes sense for a section that
 * draws itself as you scroll: stage timings, wave timings, the sheet's
 * framing on screen, and the rendered line weights.
 *
 * If a value describes the KITCHEN it belongs in lib/elevation. If it
 * describes the SCROLL it belongs here.
 * ================================================================== */

import type { Wave } from "@/lib/elevation";

/* ---------------------------------------------------------------------
 * THE SHEET ON SCREEN
 *
 * The section frames the sheet itself rather than using the scene's own
 * viewBox, because it needs sky for the copy block and it drops the
 * outermost chains on a phone rather than reflowing them.
 *
 * The top margin is headroom for the copy, not whitespace. On a
 * full-bleed sheet the wall units start at the very top of the frame and
 * the section's eyebrow printed over them.
 * ------------------------------------------------------------------ */
export const SHEET = {
  /** 390px: no left chains and no depth, so the left margin comes in. */
  handheld: { x: -60, y: -560, w: 4460, h: 3800 },
  /** Room for every chain, including the two on the left. */
  desktop: { x: -560, y: -820, w: 5000, h: 4060 },
} as const;

/** Above this width the desktop framing is used. */
export const SHEET_BREAKPOINT = 768;

/*
 * WEIGHT moved to lib/elevation/scene.ts when the planner arrived. A
 * rendered line weight describes the SHEET, not the scroll, and three
 * surfaces now draw that sheet — leaving it here would have made the
 * planner import the scroll section's choreography module to find out
 * how thick a cabinet line is.
 */

/* ---------------------------------------------------------------------
 * CHOREOGRAPHY
 *
 * Stage boundaries in timeline seconds. The overlaps are intentional —
 * a stage starts before its predecessor finishes so the sheet is never
 * momentarily still, which is what would turn one continuous drawing
 * into nine separate animations.
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

/** Pinned scroll distance, in vh. Long enough that the hold — and so
 *  inspect mode — is a window worth stopping in. */
export const SCROLL_LENGTH = 340;

/** Opacity the finished linework settles to over the photograph, before
 *  it leaves entirely. Low enough to read as a ghost, high enough that
 *  the overlay moment is legible. */
export const GHOST_OPACITY = 0.12;

/** Tint carried by the panels that gain depth late in the sequence. */
export const PANEL_TINT = 0.04;
