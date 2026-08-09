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

    /* Touch devices get syncTouch: Lenis takes over the touch scroll
     * instead of leaving it native. Two things depend on this: the
     * glide matches the wheel's, and — because the page never scrolls
     * natively — the mobile URL bar never collapses mid-pin, which is
     * what made the pinned sections stutter on phones. */
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    const lenis = new Lenis({
      // 1.5 is the plush setting: the page glides to rest rather than
      // stopping with the wheel — the difference between scrolling a
      // website and turning the pages of a printed portfolio.
      duration: 1.5,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      syncTouch: isTouch,
      syncTouchLerp: 0.08,
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

    /*
     * Modal scroll lock. `overflow: hidden` alone does not hold here —
     * Lenis scrolls the page programmatically via transforms/scrollTo, so
     * a modal must freeze the instance itself. Any component can ask by
     * dispatching these events (see the Projects lightbox).
     */
    const onLock = () => lenis.stop();
    const onUnlock = () => lenis.start();
    window.addEventListener("alma:scroll-lock", onLock);
    window.addEventListener("alma:scroll-unlock", onUnlock);

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
      window.removeEventListener("alma:scroll-lock", onLock);
      window.removeEventListener("alma:scroll-unlock", onUnlock);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
