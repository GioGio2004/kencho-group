"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, MARQUEE } from "@/lib/motion";

/*
 * MARQUEE — a band of type crossing the page, reacting to the scroll.
 *
 * At rest it drifts at MARQUEE.speed. As the page moves it speeds up in
 * proportion to the scroll velocity, reverses when the visitor scrolls
 * back, and leans into the direction of travel. Stop scrolling and it
 * settles to its resting pace, upright. The band is doing nothing the
 * visitor asked for and everything the visitor caused, which is the whole
 * trick: it turns the scrollbar into an instrument.
 *
 * SEAMLESSNESS. The track is one phrase repeated. The loop travels
 * exactly the width of a single copy and wraps, so the seam always lands
 * on an identical glyph and is invisible. Two copies are server-rendered;
 * the rest are cloned on mount, because how many it takes to cover the
 * viewport depends on a measured width that does not exist on the server.
 *
 * ACCESSIBILITY. The first copy is the real text. Every other copy is
 * `aria-hidden`, so the phrase is announced once rather than six times,
 * and the whole band is skipped by anyone who does not want decoration.
 *
 * REDUCED MOTION. Nothing runs. The band renders as a static line of
 * type, clipped by its own overflow — legible, still, and the same thing
 * the server sent.
 */

/** Copies rendered on the server. One read, one for the seam. */
const SSR_COPIES = 2;

/** Ceiling on cloning, so a one-word phrase on a wide screen cannot spin
 *  up an unbounded number of nodes. */
const MAX_COPIES = 24;

/** Cycles the loop is seeded ahead, so scrolling back never runs it out
 *  of timeline. At the resting pace that is upwards of twenty minutes of
 *  continuous reverse scrolling. */
const REVERSE_RUNWAY = 100;

export interface MarqueeProps {
  /** The phrase. Repeated; keep it short enough to read while moving. */
  children: ReactNode;
  /** Classes for the type itself — size, colour, tracking. */
  className?: string;
  /** Classes for the band. Background, borders, vertical padding. */
  bandClassName?: string;
  /** Travel direction at rest. `-1` runs the band right to left. */
  direction?: 1 | -1;
}

export default function Marquee({
  children,
  className,
  bandClassName,
  direction = -1,
}: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const host = rootRef.current;
      const track = trackRef.current;
      if (!host || !track) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let cleanup: (() => void) | null = null;
        let cancelled = false;

        // The copy width depends on the display face, so the loop cannot
        // be measured until it has landed.
        document.fonts.ready.then(() => {
          if (cancelled) return;

          ctx.add(() => {
            const seed = track.firstElementChild as HTMLElement | null;
            if (!seed) return;

            const clones: HTMLElement[] = [];

            /*
             * Fill the track, then rebuild the loop. Runs again on resize
             * because both numbers it depends on — the copy width and the
             * viewport — change together.
             */
            let loop: gsap.core.Tween | null = null;

            const build = () => {
              loop?.kill();
              gsap.set(track, { x: 0 });

              const copyWidth = seed.offsetWidth;
              // A zero here means the band is display:none or the face
              // never resolved. Looping on it would divide by zero.
              if (!copyWidth) return;

              // The track has to cover the host plus one whole copy, so
              // that the moment the loop wraps there is already an
              // identical copy sitting where the first one was.
              const needed = Math.min(
                MAX_COPIES,
                Math.ceil((host.offsetWidth + copyWidth) / copyWidth) + 1,
              );

              while (track.children.length > needed && clones.length) {
                clones.pop()?.remove();
              }
              while (track.children.length < needed) {
                const clone = seed.cloneNode(true) as HTMLElement;
                clone.setAttribute("aria-hidden", "true");
                track.appendChild(clone);
                clones.push(clone);
              }

              /*
               * The track's visible offset always lives in [-copyWidth, 0);
               * only which end the tween starts from changes. Keeping the
               * range fixed rather than flipping it with the direction is
               * what lets `needed` above stay a single calculation — the
               * track is never shifted further than one copy, either way.
               */
              const wrap = gsap.utils.wrap(-copyWidth, 0);
              const from = direction < 0 ? 0 : -copyWidth;
              const to = direction < 0 ? -copyWidth : 0;

              loop = gsap.fromTo(
                track,
                { x: from },
                {
                  x: to,
                  duration: copyWidth / MARQUEE.speed,
                  ease: "none",
                  repeat: -1,
                  modifiers: {
                    // Wrapping in a modifier rather than restarting the
                    // tween is what makes the loop seamless: x never
                    // jumps, it is only ever reported modulo one copy.
                    x: (value) => `${wrap(parseFloat(value))}px`,
                  },
                },
              );

              /*
               * Runway for the reverse. Scrolling up drives timeScale
               * negative, and a tween sitting at totalTime 0 has nowhere
               * to go — the band would stall on the first upward flick.
               * Starting it a hundred cycles in costs nothing and puts
               * that wall out of reach.
               */
              loop.totalTime(loop.duration() * REVERSE_RUNWAY);
            };

            build();

            const skewTo = gsap.quickTo(track, "skewX", {
              duration: MARQUEE.skewDuration,
              ease: EASE.pointer,
            });

            /*
             * Velocity coupling. ScrollTrigger reports px/s of scroll;
             * that maps onto the loop's timeScale and onto a lean in the
             * direction of travel. `settle` puts both back to rest,
             * because the last onUpdate before the page stops still
             * carries the velocity it had a frame earlier.
             */
            let settle = 0;

            const trigger = ScrollTrigger.create({
              trigger: host,
              start: "top bottom",
              end: "bottom top",
              onUpdate: (self) => {
                const velocity = self.getVelocity();
                const boost = Math.min(
                  MARQUEE.maxTimeScale,
                  1 + Math.abs(velocity) / MARQUEE.velocityScale,
                );

                // Scrolling back runs the band back. Multiplying by the
                // authored direction keeps `direction` meaningful: the
                // band always reverses relative to its own resting way.
                loop?.timeScale(boost * (self.direction < 0 ? -1 : 1));

                skewTo(
                  gsap.utils.clamp(
                    -MARQUEE.maxSkew,
                    MARQUEE.maxSkew,
                    (velocity / MARQUEE.velocityScale) * MARQUEE.maxSkew,
                  ),
                );

                /*
                 * The release goes back through the same quickTo rather
                 * than through a fresh tween. A second tween on skewX
                 * would be writing the property the quickTo still owns,
                 * and the two would trade frames for as long as both were
                 * alive — which is why the band gets one skew duration
                 * rather than the site's usual quick-in, slow-out pair.
                 */
                window.clearTimeout(settle);
                settle = window.setTimeout(() => {
                  loop?.timeScale(1);
                  skewTo(0);
                }, MARQUEE.settleDelay);
              },
            });

            // Rebuilding on every resize frame would thrash layout; the
            // band can be a beat late to a window drag.
            let resizeTimer = 0;
            const onResize = () => {
              window.clearTimeout(resizeTimer);
              resizeTimer = window.setTimeout(build, 180);
            };
            window.addEventListener("resize", onResize);

            cleanup = () => {
              window.removeEventListener("resize", onResize);
              window.clearTimeout(resizeTimer);
              window.clearTimeout(settle);
              trigger.kill();
              loop?.kill();
              gsap.killTweensOf(track);
              clones.forEach((clone) => clone.remove());
              gsap.set(track, { clearProps: "transform" });
            };
          });
        });

        return () => {
          cancelled = true;
          cleanup?.();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [direction] },
  );

  return (
    <div
      ref={rootRef}
      className={`marquee ${bandClassName ?? ""}`}
      data-marquee
    >
      <div ref={trackRef} className="marquee-track">
        {Array.from({ length: SSR_COPIES }, (_, i) => (
          <span
            key={i}
            aria-hidden={i > 0 ? "true" : undefined}
            className={`shrink-0 whitespace-nowrap ${className ?? ""}`}
          >
            {children}
          </span>
        ))}
      </div>
    </div>
  );
}
