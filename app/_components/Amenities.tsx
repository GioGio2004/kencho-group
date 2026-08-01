"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/*
 * AMENITIES — a velocity-reactive marquee, three counting figures and a
 * hairline list of what the building shares.
 *
 * Everything renders complete without JavaScript: the marquee sits still,
 * the figures are already printed at their final value in the HTML, and no
 * element carries a hidden initial state in CSS. All motion lives inside a
 * `(prefers-reduced-motion: no-preference)` matchMedia block.
 */

/** Words in the strip. The second run is a duplicate, hidden from AT. */
const MARQUEE_WORDS = [
  "Courtyard garden",
  "Concierge",
  "Underground parking",
  "Wellness room",
  "Roof terrace",
  "Bicycle store",
] as const;

type Stat = {
  /** Numeric target for the count-up. */
  value: number;
  /** Decimal places — 3.2 keeps one, a year keeps none. */
  decimals: number;
  /** Optional unit printed beside the figure. */
  unit?: string;
  label: string;
};

const STATS: Stat[] = [
  { value: 3.2, decimals: 1, unit: "m", label: "Ceiling height" },
  { value: 240, decimals: 0, unit: "m²", label: "Largest residence" },
  { value: 2027, decimals: 0, label: "Completion" },
];

const AMENITY_LINES = [
  {
    title: "Courtyard garden",
    note: "Mature olive and fig, planted over the parking deck.",
  },
  {
    title: "Concierge",
    note: "Staffed from seven until eleven, seven days a week.",
  },
  {
    title: "Wellness room",
    note: "One quiet room for movement, with daylight on two sides.",
  },
  {
    title: "Roof terrace",
    note: "Shared tables and shade, open to every resident.",
  },
  {
    title: "Underground parking",
    note: "Twenty-eight bays, each one wired for charging.",
  },
  {
    title: "Bicycle store",
    note: "Secure racks and a workbench, level with the street.",
  },
] as const;

export default function Amenities() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const track = trackRef.current;
      const heads = Array.from(
        root.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      const stats = Array.from(
        root.querySelectorAll<HTMLElement>("[data-stat]"),
      );
      const lines = Array.from(
        root.querySelectorAll<HTMLElement>("[data-line]"),
      );
      const counters = Array.from(
        root.querySelectorAll<HTMLElement>("[data-count-to]"),
      );

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: Array<() => void> = [];

        /* ---- Marquee: linear loop, nudged by scroll velocity ---------- */
        if (track) {
          const loop = gsap.to(track, {
            xPercent: -50,
            duration: 30,
            ease: EASE.none,
            repeat: -1,
          });

          // Once the scroll settles, drift back to the base speed.
          const settle = gsap.delayedCall(0.45, () => {
            gsap.to(loop, {
              timeScale: 1,
              duration: 0.9,
              ease: EASE.soft,
              overwrite: true,
            });
          });
          settle.pause();

          const velocity = ScrollTrigger.create({
            trigger: root,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              const boost = gsap.utils.clamp(
                1,
                3,
                1 + Math.abs(self.getVelocity()) / 1400,
              );
              gsap.to(loop, {
                timeScale: boost * self.direction,
                duration: 0.25,
                ease: EASE.soft,
                overwrite: true,
              });
              settle.restart(true);
            },
          });

          cleanups.push(() => {
            velocity.kill();
            settle.kill();
            gsap.killTweensOf(loop);
            loop.kill();
            gsap.set(track, { clearProps: "transform" });
          });
        }

        /* ---- Heading, figures and list: one-shot entrances ------------ */
        if (heads.length) {
          gsap.from(heads, {
            y: 26,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.lines,
            scrollTrigger: { trigger: heads[0], start: REVEAL_START },
          });
        }

        if (stats.length) {
          gsap.from(stats, {
            y: 22,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.lines,
            scrollTrigger: { trigger: stats[0], start: REVEAL_START },
          });
        }

        if (lines.length) {
          gsap.from(lines, {
            y: 18,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: { trigger: lines[0], start: REVEAL_START },
          });
        }

        /* ---- Count-up: HTML already holds the final value ------------- */
        counters.forEach((el) => {
          const target = Number(el.dataset.countTo);
          const decimals = Number(el.dataset.countDecimals ?? "0");
          if (!Number.isFinite(target) || !Number.isFinite(decimals)) return;

          const final = target.toFixed(decimals);
          const state = { v: 0 };

          const trigger = ScrollTrigger.create({
            trigger: el,
            start: REVEAL_START,
            once: true,
            onEnter: () => {
              el.textContent = (0).toFixed(decimals);
              gsap.to(state, {
                v: target,
                duration: 1.6,
                ease: EASE.out,
                onUpdate: () => {
                  el.textContent = state.v.toFixed(decimals);
                },
                onComplete: () => {
                  el.textContent = final;
                },
              });
            },
          });

          cleanups.push(() => {
            trigger.kill();
            gsap.killTweensOf(state);
            el.textContent = final;
          });
        });

        return () => cleanups.forEach((fn) => fn());
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="amenities"
      aria-labelledby="amenities-title"
      className="bg-sand py-24 sm:py-32 lg:py-40"
    >
      <div className="px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <p data-reveal className="u-eyebrow">
            Shared spaces
          </p>
          <h2
            data-reveal
            id="amenities-title"
            className="u-display mt-5 max-w-[14ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
          >
            Held in common
          </h2>
          <p
            data-reveal
            className="mt-6 max-w-[46ch] text-base leading-relaxed text-ink-70 sm:mt-8 sm:text-lg"
          >
            The building gives back the ground it stands on. A planted
            courtyard, a room for the mornings you would rather not go far, and
            the practical things kept quietly out of sight.
          </p>
        </div>
      </div>

      {/* Marquee — full bleed, hairline above and below. */}
      <div className="mt-14 border-y border-line sm:mt-20 lg:mt-24">
        <div className="marquee py-7 sm:py-10 lg:py-12">
          <div ref={trackRef} className="marquee-track">
            <ul role="list" className="flex shrink-0 items-center">
              {MARQUEE_WORDS.map((word) => (
                <li key={word} className="flex items-center">
                  <span className="u-display text-[clamp(1.35rem,4.5vw,2.5rem)] whitespace-nowrap text-ink">
                    {word}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mx-6 block size-1.5 shrink-0 rounded-full bg-clay sm:mx-10 lg:mx-14"
                  />
                </li>
              ))}
            </ul>
            <ul aria-hidden="true" className="flex shrink-0 items-center">
              {MARQUEE_WORDS.map((word) => (
                <li key={word} className="flex items-center">
                  <span className="u-display text-[clamp(1.35rem,4.5vw,2.5rem)] whitespace-nowrap text-ink">
                    {word}
                  </span>
                  <span className="mx-6 block size-1.5 shrink-0 rounded-full bg-clay sm:mx-10 lg:mx-14" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          {/* Figures — the HTML ships the final value; JS counts up to it. */}
          <ul
            role="list"
            className="mt-16 grid grid-cols-1 gap-y-12 sm:mt-20 sm:grid-cols-3 sm:gap-x-8 lg:mt-24 lg:gap-x-16"
          >
            {STATS.map((stat) => (
              <li key={stat.label} data-stat>
                <p className="u-display flex items-baseline text-[clamp(2.5rem,9vw,5rem)] text-ink">
                  <span
                    data-count-to={stat.value}
                    data-count-decimals={stat.decimals}
                  >
                    {stat.value.toFixed(stat.decimals)}
                  </span>
                  {stat.unit ? (
                    <span className="ml-2 font-sans text-base tracking-normal text-ink-55 sm:text-lg">
                      {stat.unit}
                    </span>
                  ) : null}
                </p>
                <p className="u-eyebrow mt-6 border-t border-line pt-4">
                  {stat.label}
                </p>
              </li>
            ))}
          </ul>

          {/* The list itself — hairline separated, small stagger. */}
          <dl className="mt-20 grid grid-cols-1 sm:mt-24 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-16">
            {AMENITY_LINES.map((item) => (
              <div
                key={item.title}
                data-line
                className="border-t border-line py-6"
              >
                <dt className="font-display text-lg text-ink sm:text-xl">
                  {item.title}
                </dt>
                <dd className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-55">
                  {item.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
