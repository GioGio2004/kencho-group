"use client";
import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let frame = 0;
    const animate = (time: number) => {
      lenis?.raf(time);
      frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
      lenis = undefined;
      if (motion.matches) return;
      lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.9,
        allowNestedScroll: true,
        anchors: true,
        stopInertiaOnNavigate: true,
      });
      (window as Window & { __lenis?: Lenis }).__lenis = lenis;
      if (document.querySelector("dialog[open]") || document.documentElement.dataset.greeting) lenis.stop();
      frame = requestAnimationFrame(animate);
    };
    sync();
    motion.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
      lenis?.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
    };
  }, []);
  return null;
}
