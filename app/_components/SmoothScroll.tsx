"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)");
    let lenis: Lenis | undefined;

    const tick = (time: number) => {
      lenis?.raf(time * 1000);
    };

    const sync = () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
      lenis = undefined;
      if (motion.matches) return;

      lenis = new Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.95,
        allowNestedScroll: true,
        anchors: true,
        stopInertiaOnNavigate: true,
      });

      lenis.on("scroll", ScrollTrigger.update);
      (window as Window & { __lenis?: Lenis }).__lenis = lenis;

      if (
        document.querySelector("dialog[open]") ||
        document.documentElement.dataset.greeting
      ) {
        lenis.stop();
      }

      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };

    sync();
    motion.addEventListener("change", sync);

    return () => {
      motion.removeEventListener("change", sync);
      gsap.ticker.remove(tick);
      lenis?.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return null;
}
