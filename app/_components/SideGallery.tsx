"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { IMAGES, src, type ImageAsset } from "@/lib/images";
import { DUR, EASE } from "@/lib/motion";

/*
 * SIDE GALLERY — the wall. Seven photographs hung at different heights
 * and sizes, walked past rather than clicked through.
 *
 * Desktop with motion and JS: the section pins and vertical scroll
 * becomes a lateral walk. The walk itself is only the stage — the show
 * is the choreography riding it, every piece scrubbed off the same
 * container animation so scrolling back plays it all in reverse:
 *
 *   - each print SETTLES as it enters: rises, un-scales and takes full
 *     ink over its own approach, so the wall assembles as it is walked
 *   - each photograph drifts INSIDE its frame against the direction of
 *     travel (scale headroom + xPercent) — frame and image moving at
 *     different rates is the whole depth illusion
 *   - the track SKEWS with scroll velocity and relaxes when the wheel
 *     rests: the wall leans into a fast scroll like water taking a turn
 *   - captions rise per print; a counter ticks the walk over; a
 *     hairline underlines the progress
 *
 * The walk runs at EVERY width — phones pin and walk exactly like
 * desktop, tuned smaller (shallower settle, gentler lean). Only
 * reduced motion and no-JS visitors get the fallback: the same DOM as
 * a native horizontal scroller with snap — the server HTML is already
 * the finished state, nothing hidden behind hydration.
 *
 * The prints are flat (no radius) and close-hung (small gap): a wall
 * of photographs, not a deck of cards. Both are the client's brief.
 */

/** The seven prints, in hanging order — kitchens, storage and
 *  commercial alternated so no two neighbours rhyme. */
const WALL: ImageAsset[] = [
  IMAGES.portfolio15,
  IMAGES.portfolio02,
  IMAGES.portfolio05,
  IMAGES.portfolio03,
  IMAGES.portfolio13,
  IMAGES.portfolio09,
  IMAGES.portfolio12,
];

/*
 * The hang: per-print width and drop, cycled by index. Uneven on
 * purpose — a filmstrip of identical frames is what read as "basic".
 * Widths only apply from lg (the phone carousel stays uniform); drops
 * only exist in the pinned mode, where there is height to spare.
 */
const HANG = [
  { width: "lg:w-[44vw]", drop: "mt-0 lg:mt-0" },
  { width: "lg:w-[34vw]", drop: "mt-8 lg:mt-16" },
  { width: "lg:w-[48vw]", drop: "-mt-4 lg:-mt-8" },
  { width: "lg:w-[38vw]", drop: "mt-5 lg:mt-10" },
  { width: "lg:w-[46vw]", drop: "-mt-2 lg:-mt-4" },
  { width: "lg:w-[34vw]", drop: "mt-10 lg:mt-20" },
  { width: "lg:w-[44vw]", drop: "mt-1 lg:mt-2" },
] as const;

/** Photograph headroom inside its frame; the drift spends it. */
const INNER_SCALE = 1.16;
/** How far the photograph drifts against the walk, in percent. */
const INNER_DRIFT = 7;
/** Velocity → lean. Divisor tames it; clamp is the hard ceiling. */
const SKEW_DIVISOR = -350;
const SKEW_MAX = 3;

export default function SideGallery() {
  const t = useTranslations("wall");

  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      const pin = pinRef.current;
      const track = trackRef.current;
      const rule = ruleRef.current;
      const count = countRef.current;
      if (!root || !pin || !track) return;

      const panels = gsap.utils.toArray<HTMLElement>(
        track.querySelectorAll("[data-wall-panel]"),
      );

      const mm = gsap.matchMedia();

      mm.add(
        {
          motionOk: "(prefers-reduced-motion: no-preference)",
          compact: "(max-width: 767px)",
        },
        (ctx) => {
          const { motionOk, compact } = ctx.conditions as {
            motionOk: boolean;
            compact: boolean;
          };
          if (!motionOk) return;

          /* A thumb-length of screen wants smaller gestures than an
           * arm's length of desk: shallower settle, gentler lean. */
          const settleY = compact ? 40 : 64;
          const settleScale = compact ? 0.95 : 0.92;
          const skewMax = compact ? 2 : SKEW_MAX;

          // The class flips the scroller from native overflow to the
          // pinned transform mode (see .wall-* in globals.css).
          root.classList.add("wall-on");

          /*
           * Function-based values, re-read on every refresh: the track
           * is sized by viewport width, so a resize changes both the
           * travel and the pin distance and both must be re-measured.
           */
          const travel = () => track.scrollWidth - pin.clientWidth;

          const walk = gsap.to(track, {
            x: () => -travel(),
            ease: EASE.none,
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: () => `+=${travel()}`,
              pin: true,
              // The lag is the glide — `scrub: true` would weld the
              // wall to the wheel and it would feel like a spreadsheet.
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          /* ------------------------------------------------------
           * PER-PRINT CHOREOGRAPHY — every trigger rides the walk
           * via containerAnimation, so "left 90%" means 90% of the
           * pinned viewport, measured against the moving track.
           * --------------------------------------------------- */
          panels.forEach((panel, i) => {
            const img = panel.querySelector<HTMLElement>("img");
            const caption = panel.querySelector<HTMLElement>("figcaption");

            /*
             * The settle. Scrubbed, not played: the print's rise is
             * literally the reader's approach, and walking backwards
             * un-hangs it. The first print skips this — it is already
             * on stage when the pin begins, and a pre-settled start
             * frame would flash mid-animation.
             */
            if (i > 0) {
              gsap.fromTo(
                panel,
                { y: settleY, scale: settleScale, opacity: 0.3 },
                {
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  ease: EASE.none,
                  scrollTrigger: {
                    trigger: panel,
                    containerAnimation: walk,
                    start: "left 98%",
                    end: "left 52%",
                    scrub: true,
                  },
                },
              );
            }

            /*
             * The drift. The photograph crosses its own frame against
             * the direction of travel while the frame crosses the
             * viewport — two rates, one gesture, all the depth. The
             * scale supplies the headroom the drift spends; ±7% stays
             * inside ±8% of margin so an edge never enters the frame.
             */
            if (img) {
              gsap.fromTo(
                img,
                { scale: INNER_SCALE, xPercent: -INNER_DRIFT },
                {
                  scale: INNER_SCALE,
                  xPercent: INNER_DRIFT,
                  ease: EASE.none,
                  scrollTrigger: {
                    trigger: panel,
                    containerAnimation: walk,
                    start: "left 100%",
                    end: "right 0%",
                    scrub: true,
                  },
                },
              );
            }

            /* The caption rises once its print has landed. */
            if (caption) {
              gsap.from(caption, {
                y: 18,
                opacity: 0,
                duration: DUR.base,
                ease: EASE.out,
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: walk,
                  start: "left 72%",
                  toggleActions: "play none none reverse",
                },
              });
            }

            /* The counter ticks as a print takes the room's centre. */
            if (count) {
              ScrollTrigger.create({
                trigger: panel,
                containerAnimation: walk,
                start: "left 55%",
                end: "right 55%",
                onToggle: (self) => {
                  if (!self.isActive) return;
                  count.textContent = String(i + 1).padStart(2, "0");
                  gsap.fromTo(
                    count,
                    { y: 12, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.35, ease: EASE.out },
                  );
                },
              });
            }
          });

          /*
           * THE LEAN. Scroll velocity skews the whole track a few
           * degrees and a short delayed call relaxes it to upright the
           * moment the wheel rests — the wall behaves like something
           * with mass. quickTo keeps this one tween reused, never a
           * tween-per-event.
           */
          const clampSkew = gsap.utils.clamp(-skewMax, skewMax);
          const skewTo = gsap.quickTo(track, "skewX", {
            duration: 0.4,
            ease: "power3.out",
          });
          let relax: gsap.core.Tween | gsap.core.Timeline | null = null;
          const skewWatch = ScrollTrigger.create({
            trigger: pin,
            start: "top top",
            end: () => `+=${travel()}`,
            onUpdate: (self) => {
              skewTo(clampSkew(self.getVelocity() / SKEW_DIVISOR));
              (relax as gsap.core.Tween | null)?.kill();
              relax = gsap.delayedCall(0.12, () => skewTo(0));
            },
          });

          if (rule) {
            gsap.fromTo(
              rule,
              { scaleX: 0 },
              {
                scaleX: 1,
                ease: EASE.none,
                scrollTrigger: {
                  trigger: pin,
                  start: "top top",
                  end: () => `+=${travel()}`,
                  scrub: 1,
                },
              },
            );
          }

          return () => {
            (relax as gsap.core.Tween | null)?.kill();
            skewWatch.kill();
            root.classList.remove("wall-on");
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      id="wall"
      ref={rootRef}
      data-thread-anchor=""
      aria-labelledby="wall-title"
      className="wall relative bg-charcoal text-bone"
    >
      <div
        ref={pinRef}
        className="wall-pin relative flex min-h-svh flex-col justify-center overflow-hidden py-20 sm:py-24"
      >
        <div className="px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="block h-px w-8 bg-clay" />
            <p className="u-eyebrow u-eyebrow--plain text-bone/60">
              {t("eyebrow")}
            </p>
          </div>
          <h2
            id="wall-title"
            className="u-display mt-6 max-w-[24ch] text-[clamp(1.9rem,5vw,3.6rem)]"
          >
            {t("title")}
          </h2>
        </div>

        {/* Native horizontal scroller until .wall-on swaps it for the
            pinned transform — one DOM, two behaviours. */}
        <div className="wall-scroller mt-10 sm:mt-14">
          <div
            ref={trackRef}
            className="wall-track flex w-max items-center gap-3 px-5 sm:gap-4 sm:px-8 lg:px-12"
          >
            {WALL.map((img, i) => {
              const hang = HANG[i % HANG.length];
              return (
                <figure
                  key={img.file}
                  data-wall-panel
                  className={`wall-panel w-[78vw] shrink-0 sm:w-[52vw] ${hang.width} ${hang.drop}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-none bg-bone/5">
                    <Image
                      src={src(img, 1600)}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 48vw, (min-width: 640px) 52vw, 78vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="gx-mono mt-3 text-[0.6875rem] tracking-[0.18em] text-bone/45">
                    [ {String(i + 1).padStart(2, "0")} /{" "}
                    {String(WALL.length).padStart(2, "0")} ]
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        {/* The walk's odometer and its underline — pinned mode only; a
            phone's thumb already knows where it is. */}
        <div aria-hidden="true" className="wall-count gx-mono">
          <span ref={countRef}>01</span>
          <span className="wall-count-total"> / {String(WALL.length).padStart(2, "0")}</span>
        </div>
        <span ref={ruleRef} aria-hidden="true" className="wall-rule" />
      </div>
    </section>
  );
}
