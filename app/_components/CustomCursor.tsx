"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/*
 * Desktop-only cursor: a small clay dot that tracks tightly plus a ring
 * that trails. The ring expands over interactive elements. Never mounts
 * on touch devices or for reduced-motion visitors — the native cursor is
 * only hidden while this is active.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    const enabled =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || !dot || !ring) return;

    document.documentElement.classList.add("has-cursor");
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, autoAlpha: 0 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.09, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.09, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.4, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.4, ease: "power3.out" });

    let visible = false;
    const onMove = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const onOver = (e: PointerEvent) => {
      const interactive = (e.target as Element | null)?.closest(
        "a, button, input, [data-cursor-grow]",
      );
      gsap.to(ring, {
        scale: interactive ? 1.9 : 1,
        opacity: interactive ? 0.5 : 1,
        duration: 0.35,
        ease: "power3.out",
      });
    };

    const onLeave = () => {
      visible = false;
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  });

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="cursor-dot h-1.5 w-1.5 bg-clay"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="cursor-dot h-8 w-8 border border-ink-40"
      />
    </>
  );
}
