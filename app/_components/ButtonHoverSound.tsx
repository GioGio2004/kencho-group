"use client";

import { useEffect } from "react";

// Sound is limited to the navbar and the explicitly enabled gallery filter.
export default function ButtonHoverSound({ src }: { src: string }) {
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.22;
    const selector = 'button, a[href], select, [role="button"], summary, input[type="submit"], input[type="button"]';
    const hover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      const control = event.target.closest(selector);
      if (!control?.closest(".site-header, [data-gallery-filter-sound]")) return;
      if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('[inert], [data-hover-sound="off"]')) return;
      // Moving between a button's label and icon must not replay the sound.
      if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;
      audio.currentTime = 0;
      // Browsers may block audio until the user's first click or key press.
      void audio.play().catch(() => {});
    };
    document.addEventListener("pointerover", hover);
    return () => {
      document.removeEventListener("pointerover", hover);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [src]);
  return null;
}
