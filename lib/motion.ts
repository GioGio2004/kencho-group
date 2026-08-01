/*
 * Shared motion vocabulary. Every animation on the site pulls its easing
 * and duration from here so the whole page moves with one signature.
 */

/** Easing tokens — never use GSAP's default ease. */
export const EASE = {
  /** Primary reveal ease: fast out, long settle. */
  out: "expo.out",
  /** Symmetric wipes and curtains. */
  inOut: "expo.inOut",
  /** Softer variant for small UI moves. */
  soft: "power3.out",
  /** Scrub-friendly linear. */
  none: "none",
} as const;

/** Duration tokens in seconds. */
export const DUR = {
  fast: 0.4,
  base: 0.9,
  slow: 1.3,
} as const;

/** Standard stagger values. */
export const STAGGER = {
  lines: 0.09,
  items: 0.07,
  chars: 0.02,
} as const;

/** Default ScrollTrigger start for one-shot entrance reveals. */
export const REVEAL_START = "top 82%";

/** True when the visitor asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
