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
  /** The print: the sheet is released to output. Chains and paper clear,
   *  then the head sweeps the viewport and reality is laid down behind
   *  it. */
  output: { at: 15, dur: 3.6 },
  /** The printed photograph holds — ghost linework over it, then bare. */
  built: { at: 18.6, dur: 2.6 },
} as const;

export type StageName = keyof typeof STAGE;

/** Total timeline length. Derived, so retiming a stage cannot desync it. */
export const TIMELINE = Math.max(
  ...Object.values(STAGE).map((s) => s.at + s.dur),
);

/** Stage names in play order, for the progress readout. */
export const STAGE_ORDER = Object.keys(STAGE) as StageName[];

/**
 * The stage a given timeline progress falls in, and how far through it
 * the readout should say the job is. Reads backwards so an overlap
 * always reports the stage that most recently STARTED — which is the one
 * the visitor is watching, not the one still finishing.
 *
 * `pct` runs over the window a stage OWNS THE READOUT for — its own
 * start to the next stage's start — rather than over its duration.
 * Overlapping stages would otherwise hand over at 85%, and a progress
 * counter that never reaches its own 100 reads as a stall, not a
 * hand-off. This is the plotter's contract: every phase completes.
 */
export function stageProgressAt(progress: number): {
  stage: StageName;
  pct: number;
} {
  const t = progress * TIMELINE;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const name = STAGE_ORDER[i]!;
    if (t >= STAGE[name].at) {
      const next = STAGE_ORDER[i + 1];
      const end = next ? STAGE[next].at : TIMELINE;
      const span = Math.max(end - STAGE[name].at, 1e-6);
      const pct = Math.min(Math.max((t - STAGE[name].at) / span, 0), 1);
      return { stage: name, pct };
    }
  }
  return { stage: STAGE_ORDER[0]!, pct: 0 };
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

/**
 * The print head's schedule INSIDE the output stage, as offsets from
 * STAGE.output.at. First the sheet settles — chains off, paper off,
 * linework to a ghost — and only then does the head start to travel;
 * a machine does not cut while the stock is still moving. The gap
 * between settle's end and sweep's start is the breath before the job.
 */
export const PRINT = {
  settle: { at: 0, dur: 0.5 },
  sweep: { at: 0.6, dur: 2.8 },
} as const;

/** Pinned scroll distance, in vh. Long enough that the hold — and so
 *  inspect mode — is a window worth stopping in, and that the print
 *  sweep is a shot rather than a flick. */
export const SCROLL_LENGTH = 400;

/** Opacity the finished linework settles to over the photograph, before
 *  it leaves entirely. Low enough to read as a ghost, high enough that
 *  the overlay moment is legible. */
export const GHOST_OPACITY = 0.12;

/** Tint carried by the panels that gain depth late in the sequence. */
export const PANEL_TINT = 0.04;
