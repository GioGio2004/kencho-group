/* =====================================================================
 * THE OPENING SCENE — two of them, and the visitor picks.
 * ---------------------------------------------------------------------
 * "cinematic"  the scroll-scrubbed walkthrough. Full bleed, charcoal,
 *              a camera moving through a finished interior.
 * "editorial"  a split: the name at poster scale on the page surface,
 *              one large photograph of the work bleeding off the right.
 *
 * Both ship. Both are in the served HTML, and CSS shows one — which is
 * why the choice can be stamped on <html> before first paint and swapped
 * without a re-render, a route change or a flash.
 *
 * Same shape as lib/theme.ts on purpose: localStorage IS the state, the
 * control subscribes rather than keeping a copy, and `storage` makes the
 * change follow the visitor into every other open tab.
 * ================================================================== */

export type HeroVariant = "cinematic" | "editorial";

export const HERO_VARIANTS: readonly HeroVariant[] = ["cinematic", "editorial"];

/** The one the site opens with when nobody has said otherwise. */
export const HERO_DEFAULT: HeroVariant = "cinematic";

export const HERO_KEY = "alma:hero";

/** Fired after a swap so scroll-driven measurements can be rebuilt. */
export const HERO_EVENT = "alma:hero-change";

export function isVariant(value: unknown): value is HeroVariant {
  return value === "cinematic" || value === "editorial";
}

export function readVariant(): HeroVariant {
  if (typeof window === "undefined") return HERO_DEFAULT;
  try {
    const raw = window.localStorage.getItem(HERO_KEY);
    return isVariant(raw) ? raw : HERO_DEFAULT;
  } catch {
    return HERO_DEFAULT;
  }
}

const listeners = new Set<() => void>();

export function subscribeVariant(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Stamp the choice on the document. The one writer. */
export function applyVariant(variant: HeroVariant): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.hero = variant;
}

export function setVariant(variant: HeroVariant): void {
  if (typeof window === "undefined") return;
  try {
    if (variant === HERO_DEFAULT) window.localStorage.removeItem(HERO_KEY);
    else window.localStorage.setItem(HERO_KEY, variant);
  } catch {
    /* an opening that cannot be remembered still opens */
  }
  applyVariant(variant);
  listeners.forEach((fn) => fn());
  /*
   * The swap changes the height of the first screen, so every
   * ScrollTrigger start and end measured against the old one is now
   * wrong. The components listen for this rather than this module
   * importing GSAP — a preference store has no business pulling in an
   * animation library.
   */
  window.dispatchEvent(new CustomEvent(HERO_EVENT, { detail: variant }));
}

/* ---------------------------------------------------------------------
 * THE BOOT SCRIPT
 *
 * Inline in <head>, alongside the theme's. Both hero variants are in the
 * markup and CSS hides one, so this attribute is what decides which —
 * and it has to land before the first paint or the visitor watches the
 * wrong opening for a frame and then sees it replaced.
 * ------------------------------------------------------------------ */
export const HERO_BOOT = `(function(){try{
var v=localStorage.getItem(${JSON.stringify(HERO_KEY)});
document.documentElement.dataset.hero=(v==="editorial"||v==="cinematic")?v:${JSON.stringify(HERO_DEFAULT)};
}catch(e){document.documentElement.dataset.hero=${JSON.stringify(HERO_DEFAULT)}}})()`.replace(
  /\n/g,
  "",
);
