"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IMAGES, src, type ImageAsset } from "@/lib/images";

/* =====================================================================
 * RESIDENCES CHOREOGRAPHY CONFIG — `at` offsets and durations are in
 * scrub-units (one unit = the scroll distance between two residences).
 * The glass material itself is tuned in globals.css (--glass-*).
 * ================================================================== */
const STACK = {
  /** Scroll distance per transition, as a fraction of viewport height. */
  step: 1.05,
  wipe: { duration: 1, ease: "expo.inOut" },
  cardIn: { y: 60, duration: 0.55, ease: "power3.out", at: 0.4 },
  cardOut: { scale: 0.94, y: -26, duration: 0.45, ease: "power2.in", at: 0.05 },
  /** Background drift inside its frame — ~10% slower than the scroll. */
  parallax: { fromY: -5.5, toY: 5.5 },
  snapDuration: { min: 0.2, max: 0.5 },
} as const;

type Residence = {
  id: string;
  name: string;
  area: string;
  floor: string;
  rooms: string;
  price: string;
  line: string;
  image: ImageAsset;
};

const RESIDENCES: Residence[] = [
  {
    id: "one-bedroom",
    name: "One bedroom",
    area: "62 m²",
    floor: "Floors 2–5",
    rooms: "2 rooms",
    price: "from €240,000",
    line: "A calm plan for one or two — morning light in the kitchen, evening light in the living room.",
    image: IMAGES.residenceOne,
  },
  {
    id: "two-bedroom",
    name: "Two bedroom",
    area: "94 m²",
    floor: "Floors 2–6",
    rooms: "3 rooms",
    price: "from €365,000",
    line: "A corner aspect with two exposures, a deep terrace, and a study that becomes a nursery.",
    image: IMAGES.residenceTwo,
  },
  {
    id: "penthouse",
    name: "Penthouse",
    area: "180 m²",
    floor: "Floor 7",
    rooms: "5 rooms",
    price: "price on request",
    line: "Double-height living under the roofline, with the old town laid out beyond the terrace.",
    image: IMAGES.residencePenthouse,
  },
];

/*
 * The server-rendered DOM is a plain stacked flow: one full-height block
 * per residence with its glass card bottom-anchored inside it. That is
 * exactly what no-JS visitors, crawlers, and reduced-motion visitors
 * get. Motion mode converts the stack into a single pinned stage and
 * scrubs wipes/card handoffs between residences — and matchMedia
 * reverts the conversion automatically if conditions change.
 */
export default function Residences() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const blocks = gsap.utils.toArray<HTMLElement>("[data-block]", root);
      const bgs = gsap.utils.toArray<HTMLElement>("[data-block-bg]", root);
      const pars = gsap.utils.toArray<HTMLElement>("[data-block-par]", root);
      const cards = gsap.utils.toArray<HTMLElement>("[data-block-card]", root);
      const glasses = gsap.utils.toArray<HTMLElement>("[data-glass]", root);
      const pill = root.querySelector<HTMLElement>("[data-progress]");
      const counter = root.querySelector<HTMLElement>("[data-progress-count]");
      const ticks = gsap.utils.toArray<HTMLElement>(
        "[data-progress-tick]",
        root,
      );
      if (!stage || blocks.length < 2) return;

      const setActive = (index: number) => {
        if (counter) counter.textContent = String(index + 1).padStart(2, "0");
        ticks.forEach((t, i) => {
          t.classList.toggle("bg-ink", i === index);
          t.classList.toggle("bg-ink-40", i !== index);
        });
        // Perf rule: only the active card composites real glass — the
        // pill is the second and last live backdrop-filter per frame.
        glasses.forEach((g, i) =>
          g.classList.toggle("glass--off", i !== index),
        );
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const n = blocks.length;

        gsap.set(stage, { height: "100svh", overflow: "hidden" });
        gsap.set(blocks, { position: "absolute", inset: 0, height: "100%" });
        blocks.slice(1).forEach((_, i) => {
          gsap.set(bgs[i + 1], { clipPath: "inset(100% 0% 0% 0%)" });
          gsap.set(cards[i + 1], { autoAlpha: 0, y: STACK.cardIn.y });
        });
        if (pill) gsap.set(pill, { autoAlpha: 1 });
        setActive(0);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${(n - 1) * window.innerHeight * STACK.step}`,
            pin: true,
            scrub: 1,
            snap: {
              snapTo: 1 / (n - 1),
              duration: STACK.snapDuration,
              ease: "power2.inOut",
            },
            onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
          },
        });

        for (let i = 1; i < n; i++) {
          const at = i - 1;
          tl.to(
            bgs[i],
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: STACK.wipe.duration,
              ease: STACK.wipe.ease,
            },
            at,
          )
            .to(
              cards[i - 1],
              {
                scale: STACK.cardOut.scale,
                y: STACK.cardOut.y,
                autoAlpha: 0,
                duration: STACK.cardOut.duration,
                ease: STACK.cardOut.ease,
              },
              at + STACK.cardOut.at,
            )
            .to(
              cards[i],
              {
                y: 0,
                autoAlpha: 1,
                duration: STACK.cardIn.duration,
                ease: STACK.cardIn.ease,
              },
              at + STACK.cardIn.at,
            );
        }

        // Slow drift inside each frame, ~10% slower than the scroll.
        pars.forEach((par) => {
          tl.fromTo(
            par,
            { yPercent: STACK.parallax.fromY },
            { yPercent: STACK.parallax.toY, duration: n - 1, ease: "none" },
            0,
          );
        });

        if (process.env.NODE_ENV === "development") {
          (window as unknown as Record<string, unknown>).__almaStack = tl;
        }

        return () => setActive(0);
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Static stack: every card keeps its glass (one per viewport),
        // no pill, no pinning.
        glasses.forEach((g) => g.classList.remove("glass--off"));
        if (pill) gsap.set(pill, { autoAlpha: 0 });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="residences"
      aria-labelledby="residences-title"
      className="relative bg-sand"
    >
      <div className="px-5 pt-24 pb-12 sm:px-8 sm:pt-32 lg:px-12">
        <p className="u-eyebrow" data-srev>
          The residences
        </p>
        <h2
          id="residences-title"
          data-srev
          className="u-display mt-4 max-w-3xl text-[clamp(1.9rem,6vw,4rem)] text-ink"
        >
          Three plans, one courtyard
        </h2>
      </div>

      <div data-stage className="relative">
        {RESIDENCES.map((r) => (
          <article
            key={r.id}
            data-block
            aria-label={r.name}
            className="relative h-svh overflow-hidden"
          >
            <div data-block-bg className="absolute inset-0 overflow-hidden">
              <div data-block-par className="absolute inset-0 scale-[1.12]">
                <Image
                  src={src(r.image, 1800)}
                  alt={r.image.alt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
              {/* Soft warm grade so glass and text always read. */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in srgb, var(--ink) 38%, transparent) 0%, transparent 46%)",
                }}
              />
            </div>

            <div
              data-block-card
              className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-5 will-change-transform sm:bottom-10 lg:inset-x-auto lg:left-12 lg:bottom-16 lg:px-0"
            >
              <div
                data-glass
                className="glass glass-interactive w-full max-w-[24rem] p-6 sm:p-8 lg:w-[26rem] lg:max-w-none"
              >
                <h3 className="u-display text-[1.75rem] text-ink sm:text-4xl">
                  {r.name}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {r.line}
                </p>

                <dl
                  className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  {(
                    [
                      ["Area", r.area],
                      ["Level", r.floor],
                      ["Layout", r.rooms],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[0.6rem] tracking-[0.24em] text-ink/60 uppercase">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="text-sm text-ink/60">
                    {r.price}
                    <span className="sr-only"> (indicative)</span>
                  </span>
                  <a
                    href="#contact"
                    className="u-link text-sm text-ink"
                    aria-label={`View the ${r.name.toLowerCase()} residence`}
                  >
                    View residence →
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* Progress pill — revealed only in motion mode. */}
        <div
          data-progress
          aria-hidden="true"
          className="glass pointer-events-none absolute top-24 right-5 z-20 flex items-center gap-3 px-4 py-2.5 opacity-0 sm:right-8"
          style={{ borderRadius: "9999px" }}
        >
          <span
            data-progress-count
            className="text-xs tracking-[0.18em] text-ink tabular-nums"
          >
            01
          </span>
          <span className="flex items-center gap-1.5">
            {RESIDENCES.map((r, i) => (
              <span
                key={r.id}
                data-progress-tick
                className={`block h-3 w-px ${i === 0 ? "bg-ink" : "bg-ink-40"}`}
              />
            ))}
          </span>
          <span className="text-xs tracking-[0.18em] text-ink/60 tabular-nums">
            {String(RESIDENCES.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
