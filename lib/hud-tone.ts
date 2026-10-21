import { useEffect, useState } from "react";

/*
 * HUD TONE — fixed chrome is charcoal ink by default and turns white wherever a
 * photograph sits under it. Surfaces opt in with data-hud-tone ("light" =
 * photo, "ink" = pale surface); chrome marks itself data-hud so it never
 * samples itself.
 */
export type HudTone = "ink" | "light";

export const HUD_TONE_TEXT: Record<HudTone, string> = {
  ink: "text-[#2A2723]",
  light: "text-[#FFFFFF]",
};

/* The first surface under the point that declares a tone wins. */
export function toneAt(x: number, y: number): HudTone {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.closest("[data-hud]")) continue;
    const tone = el.getAttribute("data-hud-tone");
    if (tone === "light" || tone === "ink") return tone;
  }
  return "ink";
}

/* Viewport points to sample, as functions of (width, height). Pass a
 * module-level object so the effect is set up once. */
export type HudPoints<K extends string> = Record<
  K,
  (w: number, h: number) => [number, number]
>;

export function useHudTones<K extends string>(
  points: HudPoints<K>
): Partial<Record<K, HudTone>> {
  const [tones, setTones] = useState<Partial<Record<K, HudTone>>>({});

  useEffect(() => {
    const keys = Object.keys(points) as K[];
    let frame = 0;
    let settleUntil = 0;
    let lastSample = 0;
    const sample = () => {
      lastSample = performance.now();
      const w = window.innerWidth;
      const h = window.innerHeight;
      const next = {} as Record<K, HudTone>;
      for (const key of keys) next[key] = toneAt(...points[key](w, h));
      setTones((prev) =>
        keys.every((key) => prev[key] === next[key]) ? prev : next
      );
    };
    /* Scrubbed timelines keep moving ~1s after the last scroll event,
     * so keep sampling (every ~120ms) until they have settled. */
    const loop = (now: number) => {
      if (now - lastSample > 120) sample();
      frame = now < settleUntil ? requestAnimationFrame(loop) : 0;
    };
    const schedule = () => {
      settleUntil = performance.now() + 1600;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    sample();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [points]);

  return tones;
}
