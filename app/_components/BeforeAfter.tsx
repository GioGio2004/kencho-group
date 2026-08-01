"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IMAGES, src } from "@/lib/images";
import { DUR, EASE, REVEAL_START, prefersReducedMotion } from "@/lib/motion";

/*
 * BEFORE / AFTER — the signature interactive moment.
 *
 * Two perfectly registered layers: the finished interior underneath, the raw
 * shell on top inside a wrapper that is clipped with `inset()`. The divider
 * is a zero-width element parked at left:50%, so its GSAP `x` is exactly the
 * offset from centre and the un-hydrated HTML already reads as a 50/50 split.
 *
 * Interaction is never gated behind motion preferences — only the entrance is.
 */

/** Divider step for keyboard control. */
const STEP = 0.05;
/** Below this many pixels a press counts as "already on the knob". */
const GRAB_SLOP = 26;

export default function BeforeAfter() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const fractionRef = useRef(0.5);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, Draggable);

      const frame = frameRef.current;
      const clip = clipRef.current;
      const handle = handleRef.current;
      const knob = knobRef.current;
      if (!frame || !clip || !handle || !knob) return;

      const reduced = prefersReducedMotion();
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const clamp = gsap.utils.clamp(0, 1);
      const setX = gsap.quickSetter(handle, "x", "px") as (v: number) => void;

      let width = frame.getBoundingClientRect().width || 1;
      let announced = -1;

      /** Writes the clip + the accessible value. Never touches the handle. */
      const paint = (f: number) => {
        fractionRef.current = f;
        clip.style.clipPath = `inset(0% ${((1 - f) * 100).toFixed(3)}% 0% 0%)`;
        const pct = Math.round(f * 100);
        if (pct !== announced) {
          announced = pct;
          knob.setAttribute("aria-valuenow", String(pct));
          knob.setAttribute("aria-valuetext", `Before view: ${pct}%`);
        }
      };

      /** Moves the divider outright — used for keyboard, taps and resize. */
      const place = (f: number) => {
        setX((f - 0.5) * width);
        paint(f);
      };

      // --- drag ------------------------------------------------------------
      let jump: gsap.core.Tween | null = null;
      let axis: "x" | "y" | null = null;
      let pressX = 0;
      let pressY = 0;
      let pressFraction = 0.5;
      let tapX = 0;
      let tapY = 0;
      let tapping = false;

      const killJump = () => {
        if (jump) {
          jump.kill();
          jump = null;
        }
      };

      /** Animates the divider to `to` and keeps the drag origin in sync. */
      const glide = (to: number) => {
        killJump();
        const state = { f: fractionRef.current };
        jump = gsap.to(state, {
          f: clamp(to),
          duration: reduced ? 0 : DUR.fast,
          ease: EASE.soft,
          onUpdate: () => {
            place(state.f);
            drag.update(false, true);
          },
          onComplete: () => {
            jump = null;
          },
        });
      };

      const [drag] = Draggable.create(handle, {
        type: "x",
        bounds: frame,
        trigger: frame,
        inertia: false,
        cursor: "ew-resize",
        activeCursor: "ew-resize",
        allowNativeTouchScrolling: false,
        onPress() {
          killJump();
          drag.update(false, true);
          clip.style.willChange = "clip-path";

          const rect = frame.getBoundingClientRect();
          width = rect.width || 1;
          axis = null;
          pressX = drag.pointerX;
          pressY = drag.pointerY;
          pressFraction = fractionRef.current;

          // Touch presses resolve on release instead, so that a page scroll
          // beginning on the photograph never displaces the divider.
          if (coarse) return;

          const target = clamp(
            (drag.pointerX - rect.left - window.scrollX) / width,
          );
          if (Math.abs(target - pressFraction) * width > GRAB_SLOP) {
            pressFraction = target;
            glide(target);
          }
        },
        onDrag() {
          killJump();

          // Touch only: lock to the gesture's dominant axis so a page scroll
          // that starts on the photo never nudges the divider.
          if (coarse) {
            if (axis === null) {
              const dx = Math.abs(drag.pointerX - pressX);
              const dy = Math.abs(drag.pointerY - pressY);
              if (dx > 5 || dy > 5) axis = dy > dx ? "y" : "x";
            }
            if (axis === "y") {
              place(pressFraction);
              drag.update(false, true);
              return;
            }
          }

          paint(clamp(0.5 + drag.x / width));
        },
        onThrowUpdate() {
          paint(clamp(0.5 + drag.x / width));
        },
        onRelease() {
          axis = null;
          clip.style.willChange = "";
        },
      });

      // --- tap (touch) -----------------------------------------------------
      // The browser fires pointercancel the moment it claims the gesture for
      // vertical scrolling, which is exactly how we tell a tap from a scroll.
      const onPointerDown = (event: PointerEvent) => {
        if (!coarse) return;
        tapX = event.clientX;
        tapY = event.clientY;
        tapping = true;
      };

      const onPointerCancel = () => {
        tapping = false;
      };

      const onPointerUp = (event: PointerEvent) => {
        if (!tapping) return;
        tapping = false;
        if (
          Math.abs(event.clientX - tapX) > 10 ||
          Math.abs(event.clientY - tapY) > 10
        ) {
          return;
        }
        const rect = frame.getBoundingClientRect();
        width = rect.width || 1;
        const target = clamp((event.clientX - rect.left) / width);
        if (Math.abs(target - fractionRef.current) * width > GRAB_SLOP) {
          glide(target);
        }
      };

      frame.addEventListener("pointerdown", onPointerDown);
      frame.addEventListener("pointerup", onPointerUp);
      frame.addEventListener("pointercancel", onPointerCancel);

      // --- keyboard --------------------------------------------------------
      const onKeyDown = (event: KeyboardEvent) => {
        let next = fractionRef.current;
        switch (event.key) {
          case "ArrowLeft":
          case "ArrowDown":
            next -= STEP;
            break;
          case "ArrowRight":
          case "ArrowUp":
            next += STEP;
            break;
          case "PageDown":
            next -= STEP * 2;
            break;
          case "PageUp":
            next += STEP * 2;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        glide(next);
      };
      knob.addEventListener("keydown", onKeyDown);

      // --- resize ----------------------------------------------------------
      const resize = new ResizeObserver(() => {
        width = frame.getBoundingClientRect().width || 1;
        place(fractionRef.current);
        drag.update(true);
      });
      resize.observe(frame);

      // --- entrance (motion only) -----------------------------------------
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        place(0.68);
        const sweep = { f: 0.68 };

        const tl = gsap.timeline({
          scrollTrigger: { trigger: frame, start: REVEAL_START, once: true },
        });

        tl.fromTo(
          frame,
          { clipPath: "inset(0% 100% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: DUR.slow,
            ease: EASE.inOut,
          },
          0,
        )
          .fromTo(
            knob,
            { autoAlpha: 0, scale: 0.4 },
            { autoAlpha: 1, scale: 1, duration: DUR.base, ease: EASE.out },
            0.4,
          )
          .to(
            sweep,
            {
              f: 0.5,
              duration: DUR.slow,
              ease: EASE.out,
              onUpdate: () => {
                place(sweep.f);
                drag.update();
              },
            },
            0.45,
          )
          .set(frame, { clearProps: "clipPath" });
      });

      return () => {
        resize.disconnect();
        frame.removeEventListener("pointerdown", onPointerDown);
        frame.removeEventListener("pointerup", onPointerUp);
        frame.removeEventListener("pointercancel", onPointerCancel);
        knob.removeEventListener("keydown", onKeyDown);
        killJump();
        drag.kill();
        mm.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="transformation"
      aria-labelledby="transformation-title"
      className="bg-sand-deep py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto w-full max-w-[86rem] px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="block h-px w-8 bg-clay" />
          <p className="u-eyebrow">Transformation</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
          <h2
            id="transformation-title"
            className="u-display text-[clamp(1.9rem,6vw,4rem)] text-ink lg:col-span-7"
          >
            From shell to home
          </h2>
          <p className="max-w-[42ch] text-[0.95rem] leading-relaxed text-ink-70 lg:col-span-5 lg:justify-self-end">
            Every residence is handed over complete — oak laid, joinery fitted,
            walls lime-washed. Move the divider to see the same room the day the
            concrete was poured.
          </p>
        </div>

        <div
          ref={frameRef}
          id="transformation-frame"
          className="relative mt-12 aspect-[3/4] w-full select-none overflow-hidden rounded-none bg-sand sm:mt-16 sm:aspect-[16/10] lg:aspect-[16/9]"
        >
          <Image
            src={src(IMAGES.shellAfter)}
            alt={IMAGES.shellAfter.alt}
            fill
            sizes="(min-width: 1024px) 80vw, 100vw"
            draggable={false}
            className="pointer-events-none object-cover"
          />

          <div
            ref={clipRef}
            className="absolute inset-0"
            style={{ clipPath: "inset(0% 50% 0% 0%)" }}
          >
            <Image
              src={src(IMAGES.shellBefore)}
              alt={IMAGES.shellBefore.alt}
              fill
              sizes="(min-width: 1024px) 80vw, 100vw"
              draggable={false}
              className="pointer-events-none object-cover"
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
            <span className="bg-sand px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.24em] text-ink">
              Before
            </span>
            <span className="bg-sand px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.24em] text-ink">
              After
            </span>
          </div>

          <div
            ref={handleRef}
            className="absolute left-1/2 top-0 z-10 h-full w-0"
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-px -translate-x-1/2 bg-sand"
            />
            <button
              ref={knobRef}
              type="button"
              role="slider"
              aria-label="Move the divider between the shell and the finished interior"
              aria-controls="transformation-frame"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={50}
              aria-valuetext="Before view: 50%"
              className="glass absolute left-0 top-1/2 -ml-6 -mt-6 flex h-12 w-12 items-center justify-center text-ink"
              style={{ borderRadius: "9999px" }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9.5 8 6 12l3.5 4" />
                <path d="M14.5 8 18 12l-3.5 4" />
              </svg>
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs text-ink-55">
          Drag the divider, tap anywhere on the photograph, or use the arrow
          keys.
        </p>
      </div>
    </section>
  );
}
