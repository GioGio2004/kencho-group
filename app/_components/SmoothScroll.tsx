"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/*
 * Site-wide smooth scroll, wired into GSAP's ticker so ScrollTrigger and
 * Lenis share one clock. Held while the intro overlay plays (it dispatches
 * "kg:intro-done"), and skipped entirely for reduced-motion users.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onIntroDone = () => lenis.start();
    if (document.documentElement.classList.contains("intro-pending")) {
      lenis.stop();
      window.addEventListener("kg:intro-done", onIntroDone);
    }

    // Anchor navigation glides instead of jumping.
    const onAnchorClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!link) return;
      const target = document.querySelector(link.getAttribute("href") ?? "");
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { duration: 1.4 });
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      window.removeEventListener("kg:intro-done", onIntroDone);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
