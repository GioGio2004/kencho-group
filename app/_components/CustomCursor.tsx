"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/*
 * Minimal blend-difference cursor: a dot that tracks tightly and a ring
 * that trails on a softer spring. Ring grows over links/buttons; over
 * elements marked data-cursor="view" it fills and shows "ნახე".
 * Only activates on fine pointers without reduced-motion; the native
 * cursor is hidden via the .kg-cursor-on class while active.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!fine || reduce || !dot || !ring) return;

    document.documentElement.classList.add("kg-cursor-on");
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3.out" });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.25 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const label = ring.querySelector<HTMLElement>("[data-cursor-label]");
    const setMode = (mode: "default" | "link" | "view") => {
      gsap.to(ring, {
        width: mode === "view" ? 72 : mode === "link" ? 44 : 28,
        height: mode === "view" ? 72 : mode === "link" ? 44 : 28,
        backgroundColor:
          mode === "view" ? "rgba(255,255,255,1)" : "rgba(255,255,255,0)",
        duration: 0.3,
        ease: "power3.out",
      });
      gsap.to(dot, {
        autoAlpha: mode === "view" ? 0 : 1,
        duration: 0.2,
      });
      if (label) {
        gsap.to(label, {
          autoAlpha: mode === "view" ? 1 : 0,
          duration: 0.2,
        });
      }
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest('[data-cursor="view"]')) setMode("view");
      else if (t.closest("a, button")) setMode("link");
      else setMode("default");
    };

    const onLeaveWindow = () => {
      shown = false;
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.25 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);

    return () => {
      document.documentElement.classList.remove("kg-cursor-on");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener(
        "pointerleave",
        onLeaveWindow,
      );
    };
  });

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="kg-cursor h-1.5 w-1.5 rounded-full bg-white"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="kg-cursor flex h-7 w-7 items-center justify-center rounded-full border border-white/70"
      >
        <span
          data-cursor-label
          className="text-[0.6rem] font-medium tracking-[0.15em] text-coal opacity-0"
        >
          ნახე
        </span>
      </div>
    </>
  );
}
