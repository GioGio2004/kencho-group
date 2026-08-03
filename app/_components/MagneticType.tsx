"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { DUR, EASE, REPEL } from "@/lib/motion";

/*
 * MAGNETICTYPE — display type that gets out of the pointer's way.
 *
 * The fragments of one line each carry a vector away from the cursor,
 * strongest at the centre of the field and gone at its edge, and drift
 * back once it leaves. It is the only piece of motion on the site the
 * visitor drives frame by frame, which is exactly why it is rationed: one
 * instance per screen, on type that is already the largest thing there.
 *
 * OWNERSHIP. This component splits the element it is given, so it is the
 * second SplitText owner on the site after <RevealText>. The two must
 * never wrap the same element — a double split leaves the first
 * instance's wrappers orphaned inside the second's, and revert() then
 * restores the wrong innerHTML. Type either reveals or repels. Sections
 * that want both should reveal a container and repel a child inside it.
 *
 * UNITS. Words by default. `unit="chars"` is available and downgrades
 * itself to words unless the string is pure Latin — Mkhedruli and
 * Cyrillic are legible per glyph, but a Georgian word broken into
 * separately-transformed boxes loses the tracking that holds it together,
 * and the site's own rule is that text splits to lines or words. The
 * wordmark is Latin in all three locales, which is the case this exists
 * for.
 *
 * GATING. Desktop pointers only, and only for a visitor who has not asked
 * for reduced motion. There is no touch fallback and there should not be:
 * the effect IS the pointer, and a tap-triggered approximation would be a
 * different, worse animation wearing its name.
 *
 * SSR. The element renders as ordinary text. Every transform is applied
 * by GSAP after mount, so the server HTML is the finished, readable
 * state — with JavaScript off this is simply a headline.
 */

/** Only these render through this component. Text-bearing elements. */
export type MagneticTag = "span" | "p" | "div" | "h1" | "h2" | "h3";

/**
 * Strings this component will split per character. Latin letters, digits
 * and the punctuation a wordmark actually contains — anything else, and
 * `unit="chars"` falls back to words.
 */
const LATIN_ONLY = /^[\p{Script=Latin}\p{Nd}\p{P}\p{Zs}]+$/u;

export interface MagneticTypeProps {
  /** The copy. Pass translated strings; this component carries none. */
  children: ReactNode;
  /** Element to render. Defaults to an inline span. */
  as?: MagneticTag;
  /** Classes for the rendered element — sizing, colour, tracking. */
  className?: string;
  /** Fragment size. `chars` needs a Latin-only string; see the note above. */
  unit?: "words" | "chars";
  /** Scale the field's reach and strength together. 1 is REPEL as authored. */
  strength?: number;
}

export default function MagneticType({
  children,
  as = "span",
  className,
  unit = "words",
  strength = 1,
}: MagneticTypeProps) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(SplitText);

      const host = rootRef.current;
      if (!host) return;

      const mm = gsap.matchMedia();

      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        (ctx) => {
          let split: SplitText | null = null;
          let cleanup: (() => void) | null = null;
          let cancelled = false;

          /*
           * Behind fonts.ready like every other split on the site. Here the
           * reason is measurement rather than line breaks: the rest centres
           * cached below are taken from the laid-out fragments, and a
           * fallback face puts them in the wrong places.
           */
          document.fonts.ready.then(() => {
            if (cancelled) return;

            ctx.add(() => {
              const perChar =
                unit === "chars" && LATIN_ONLY.test(host.textContent ?? "");

              const instance = SplitText.create(host, {
                type: perChar ? "chars" : "words",
                // Keeps the whole string on the element for screen readers
                // and hides the fragments from them.
                aria: "auto",
              });
              split = instance;

              const parts: HTMLElement[] = perChar
                ? (instance.chars as HTMLElement[])
                : (instance.words as HTMLElement[]);
              if (!parts.length) return;

              // A transformed inline box does nothing. SplitText already
              // sets this, but it is cheap insurance against a future
              // stylesheet putting `display: inline` back.
              gsap.set(parts, { display: "inline-block", willChange: "transform" });

              /*
               * One quickTo pair per fragment, built once. The naive port
               * of this effect calls gsap.to() per fragment per pointer
               * event, which allocates a tween per letter per frame; a
               * quickTo re-targets the tween that is already running.
               */
              const movers = parts.map((part) => ({
                part,
                x: gsap.quickTo(part, "x", {
                  duration: DUR.magnet,
                  ease: EASE.drift,
                }),
                y: gsap.quickTo(part, "y", {
                  duration: DUR.magnet,
                  ease: EASE.drift,
                }),
                cx: 0,
                cy: 0,
              }));

              /*
               * Rest centres, cached relative to the host. Measuring every
               * fragment on every pointer move is the other half of what
               * makes ports of this effect stutter — and it is also wrong,
               * because a fragment's live rect includes the offset the
               * field is currently applying, so the field would feed on
               * itself. Reading the rect while everything is at rest is
               * both cheaper and the only correct measurement.
               */
              const measure = () => {
                const hostBox = host.getBoundingClientRect();
                movers.forEach((mover) => {
                  const box = mover.part.getBoundingClientRect();
                  const dx = Number(gsap.getProperty(mover.part, "x")) || 0;
                  const dy = Number(gsap.getProperty(mover.part, "y")) || 0;
                  mover.cx = box.left - hostBox.left + box.width / 2 - dx;
                  mover.cy = box.top - hostBox.top + box.height / 2 - dy;
                });
              };
              measure();

              const radius = REPEL.radius * strength;
              const push = REPEL.push * strength;

              /*
               * The pointer is tracked on the window rather than on the
               * host, so the type starts moving as the cursor approaches
               * instead of snapping the moment it crosses the box. The
               * bounds check below is what keeps that affordable: one rect
               * read and two comparisons for every pointer event that is
               * nowhere near this element.
               */
              let pointerX = 0;
              let pointerY = 0;
              let frame = 0;
              let engaged = false;

              const release = () => {
                engaged = false;
                movers.forEach((mover) => {
                  mover.x(0);
                  mover.y(0);
                });
              };

              const apply = () => {
                frame = 0;
                const hostBox = host.getBoundingClientRect();
                const reach = radius + REPEL.margin;

                const near =
                  pointerX > hostBox.left - reach &&
                  pointerX < hostBox.right + reach &&
                  pointerY > hostBox.top - reach &&
                  pointerY < hostBox.bottom + reach;

                if (!near) {
                  if (engaged) release();
                  return;
                }
                engaged = true;

                const px = pointerX - hostBox.left;
                const py = pointerY - hostBox.top;

                movers.forEach((mover) => {
                  const dx = px - mover.cx;
                  const dy = py - mover.cy;
                  const distance = Math.hypot(dx, dy);

                  if (distance >= radius) {
                    mover.x(0);
                    mover.y(0);
                    return;
                  }

                  // Linear ramp from the edge of the field to its centre,
                  // aimed directly away from the pointer.
                  const force = ((radius - distance) / radius) * push;
                  const angle = Math.atan2(dy, dx);
                  mover.x(-Math.cos(angle) * force);
                  mover.y(-Math.sin(angle) * force);
                });
              };

              const onMove = (event: PointerEvent) => {
                pointerX = event.clientX;
                pointerY = event.clientY;
                // Coalesced to one application per frame: a fast mouse
                // fires well above 60 events a second and every extra one
                // is thrown away by the next.
                if (!frame) frame = requestAnimationFrame(apply);
              };

              const listeners = new AbortController();
              window.addEventListener("pointermove", onMove, {
                passive: true,
                signal: listeners.signal,
              });
              // The pointer leaving the document never fires a move at the
              // far edge, so without this the type stays pushed aside.
              document.addEventListener("pointerleave", release, {
                signal: listeners.signal,
              });

              // Re-measure whenever the line boxes could have changed. A
              // resize alone is not enough: the host reflows when the
              // column around it does, which a resize event may not see.
              const observer = new ResizeObserver(measure);
              observer.observe(host);

              cleanup = () => {
                listeners.abort();
                observer.disconnect();
                if (frame) cancelAnimationFrame(frame);
                gsap.killTweensOf(parts);
              };
            });
          });

          return () => {
            cancelled = true;
            cleanup?.();
            // revert() restores the original innerHTML, which drops every
            // inline style the split and the quickTos wrote with it.
            split?.revert();
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [unit, strength], revertOnUpdate: true },
  );

  /*
   * JSX rather than createElement, so the ref stays a ref prop — passing
   * it into a plain function call reads as a render-phase ref access. The
   * cast is what lets one ref serve every MagneticTag; they are all
   * HTMLElements, but their ref types are invariant.
   */
  const Tag = as as ElementType;

  return (
    <Tag ref={rootRef} className={className} data-magnetic={unit}>
      {children}
    </Tag>
  );
}
