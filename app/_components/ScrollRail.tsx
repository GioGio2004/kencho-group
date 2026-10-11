"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";

/*
 * THE RAIL — the page's scrollbar, in place of the browser's (hidden in
 * globals.css). A hairline down the right edge with an orange thumb the
 * length of the viewport's share of the page. It shows while the page
 * moves and for a moment after, and on a fine pointer it can be dragged
 * or pressed like a scrollbar. Phones only read it.
 *
 * Nothing here is React state: the scroll fires every frame under Lenis,
 * so the thumb is placed on the element directly.
 */
export default function ScrollRail() {
  const rail = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rail.current;
    const th = thumb.current;
    if (!el || !th) return;
    const root = document.documentElement;

    let railH = 0;
    let thumbH = 0;
    let hide = 0;
    let dragging = false;
    let grab = 0;

    const travel = () => root.scrollHeight - window.innerHeight;

    const place = () => {
      const max = travel();
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      th.style.transform = `translate3d(0, ${(p * (railH - thumbH)).toFixed(1)}px, 0)`;
    };

    const measure = () => {
      railH = el.clientHeight;
      const share = root.scrollHeight > 0 ? window.innerHeight / root.scrollHeight : 1;
      thumbH = Math.min(railH, Math.max(28, Math.round(railH * share)));
      th.style.height = `${thumbH}px`;
      el.classList.toggle("is-off", travel() <= 1);
      place();
    };

    const wake = () => {
      el.classList.add("is-live");
      window.clearTimeout(hide);
      hide = window.setTimeout(() => {
        if (!dragging) el.classList.remove("is-live");
      }, 1200);
    };

    const onScroll = () => {
      place();
      wake();
    };

    const jump = (y: number) => {
      const lenis = (window as Window & { __lenis?: Lenis }).__lenis;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };

    const follow = (clientY: number) => {
      const top = el.getBoundingClientRect().top;
      const span = railH - thumbH;
      const p = span > 0 ? Math.min(1, Math.max(0, (clientY - top - grab) / span)) : 0;
      jump(p * travel());
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      el.classList.add("is-drag", "is-live");
      el.setPointerCapture(e.pointerId);
      // Hold the thumb where it was taken; a press on the line jumps there.
      const thumbTop = th.getBoundingClientRect().top;
      const onThumb = e.clientY >= thumbTop && e.clientY <= thumbTop + thumbH;
      grab = onThumb ? e.clientY - thumbTop : thumbH / 2;
      if (!onThumb) follow(e.clientY);
    };
    const move = (e: PointerEvent) => {
      if (dragging) follow(e.clientY);
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-drag");
      wake();
    };

    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    measure();

    return () => {
      ro.disconnect();
      window.clearTimeout(hide);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div ref={rail} className="rail" aria-hidden="true">
      <div ref={thumb} className="rail-thumb" />
    </div>
  );
}
