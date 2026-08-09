import manifest from "@/public/frames/manifest.json";
import { LINGER, type LingerStop } from "@/lib/motion";

/* =====================================================================
 * WALKTHROUGH CONFIG — the scroll-scrubbed hero.
 * Frame counts/sizes come from public/frames/manifest.json, written by
 * `npm run frames`, so swapping the video never means editing code.
 *
 * LONGER / SLOWER SCRUB  → raise scrollLength (vh pinned).
 * MORE CINEMATIC LAG     → raise scrub (seconds of catch-up).
 * RE-FRAME THE CROP      → move focal x/y (0–1, share of the frame kept
 *                          centred when the viewport is narrower than
 *                          the source; 0.5/0.5 is dead centre).
 * ================================================================== */
export const WALKTHROUGH = {
  /** Pinned scroll distance, in vh. The whole story plays across this. */
  scrollLength: 350,
  /** ScrollTrigger scrub: seconds the frames take to catch up. 1.5 is
   *  the cinematic setting — the shot glides through wheel ticks
   *  instead of stepping with them. */
  scrub: 1.5,

  /**
   * Cover-crop focal point. The source is landscape (16:9); on a 390px
   * portrait phone most of the width is cropped away, so bias slightly
   * above centre to keep the doorway and eye-line in frame rather than
   * the floor.
   */
  focal: { x: 0.5, y: 0.42 },

  /** Frames fetched before the scrub is armed — the rest stream after. */
  eagerFrames: 30,
  /** Parallel fetches while streaming the remainder. */
  loadConcurrency: 6,

  /** Device-pixel-ratio ceiling — 2 is plenty and halves the fill cost. */
  maxDpr: 2,

  /** Connections that get the small tier regardless of screen. */
  slowConnections: ["slow-2g", "2g", "3g"],

  /*
   * Narrative beats as scroll-progress windows (0–1). Each overlay fades
   * fully out before the next fades in, so two beats never overlap.
   *
   * `linger` additionally paces the FOOTAGE under each beat: the walk
   * slows through the middle of the window, where the copy is at full
   * opacity and being read, and covers the ends of the window quickly.
   * See lingerStops in lib/motion.ts — every window boundary stays
   * pinned to the frame it was already on, so these values re-pace the
   * shot without re-timing the story.
   *
   * The empty stretch between `craft` and `cue` carries no linger on
   * purpose. It is the only part of the walk with nothing to read, so it
   * is the only part that should move at full speed.
   */
  beats: {
    welcome: { in: 0.0, out: 0.15, linger: LINGER.brush },
    headline: { in: 0.15, out: 0.45, linger: LINGER.read },
    craft: { in: 0.45, out: 0.75, linger: LINGER.read },
    /** 0.75–0.95 is deliberately empty — the space speaks. */
    cue: { in: 0.95, out: 1.0, linger: LINGER.brush },
  },

  /**
   * The idle drift — the film NEVER freezes mid-section. When the
   * wheel rests, the painted position keeps creeping in the direction
   * the visitor was last scrolling, so the walkthrough reads as one
   * continuous shot rather than a scrubber that parks between inputs.
   *
   * `speed` is progress per second (0.012 ≈ two frames a second — a
   * breath, not a playback). `lead` caps how far the drift may run
   * ahead of the true scroll position, so resuming the scroll never
   * has a visible jump to recover.
   */
  drift: { speed: 0.012, lead: 0.05 },

  /** Fallback hero (reduced motion / data-saver / load failure). */
  fallback: { fromScale: 1, toScale: 1.15 },
} as const;

/**
 * The beats as an ordered stop list, for `lingerStops`. Derived rather
 * than hand-written so the pacing can never drift out of step with the
 * windows the copy actually uses — one edit above re-paces both.
 */
export const WALKTHROUGH_STOPS: readonly LingerStop[] = Object.values(
  WALKTHROUGH.beats,
)
  .slice()
  .sort((a, b) => a.in - b.in);

export type FrameTier = "desktop" | "mobile";

/**
 * Fired on window by FrameSequence every time a frame lands, with
 * `detail: { loaded, total }`. The preloader listens: the moment the
 * first event arrives it switches from its short poster-only wait to
 * holding the curtain for the whole sequence, with the counter showing
 * the genuine download.
 */
export const FRAMES_EVENT = "alma:frames";

export const FRAMES = manifest;

export function frameUrl(tier: FrameTier, index: number): string {
  const n = String(index + 1).padStart(4, "0");
  return `/frames/${tier}/frame_${n}.webp`;
}

export function posterUrl(tier: FrameTier): string {
  return `/frames/${tier === "mobile" ? manifest.poster.mobile : manifest.poster.desktop}`;
}

/** Frame count for a tier, straight from the generated manifest. */
export function frameCount(tier: FrameTier): number {
  return manifest.tiers[tier].frames;
}

/**
 * Pick a tier from the Network Information API alone — NOT from screen
 * width. A portrait phone cover-crops the landscape walkthrough to its
 * middle third and stretches that across the whole screen, the harshest
 * upscale in the sequence's life, so the small tier looked worst exactly
 * where it was served (the same lesson the services reel learned). The
 * small tier is a fallback for constrained connections, not a class of
 * device — and the preloader now holds the curtain for the real
 * download, so the extra bytes are paid where the visitor can see them.
 */
export function pickTier(): FrameTier {
  if (typeof window === "undefined") return "mobile";

  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;

  if (conn?.saveData) return "mobile";
  if (
    conn?.effectiveType &&
    (WALKTHROUGH.slowConnections as readonly string[]).includes(
      conn.effectiveType,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}
