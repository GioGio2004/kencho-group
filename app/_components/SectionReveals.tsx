"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * Global scroll-in reveals: any element with [data-srev] rises and fades
 * in when it enters the viewport. Skipped under prefers-reduced-motion
 * (elements simply stay visible).
 */
export default function SectionReveals() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-srev]").forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    });
    return () => mm.revert();
  });

  return null;
}
