"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/*
 * Site-wide smooth scroll. Lenis and ScrollTrigger share one clock via
 * gsap.ticker, so scroll-driven animations never desync from the scroll
 * position. Skipped entirely for reduced-motion visitors (native scroll).
 * Held while the preloader is up; released on `alma:loaded`.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onLoaded = () => {
      lenis.start();
      ScrollTrigger.refresh();
    };
    if (document.documentElement.classList.contains("is-loading")) {
      lenis.stop();
      window.addEventListener("alma:loaded", onLoaded);
    }

    // In-page anchors glide instead of jumping.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const hash = link?.getAttribute("href");
      if (!link || !hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { duration: 1.3 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("alma:loaded", onLoaded);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
