"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { IMAGES, src } from "@/lib/images";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/** Walking times from the entrance — kept short and factual. */
const DISTANCES = [
  { place: "Vera market", time: "4 min walk" },
  { place: "Old town", time: "6 min walk" },
  { place: "Riverside park", time: "10 min walk" },
  { place: "Rustaveli Avenue", time: "12 min walk" },
] as const;

/*
 * LOCATION — a short editorial note, then the district itself at full
 * bleed. The image opens outward from an inset mask on scrub while the
 * frame settles from a 1.08 scale; at rest it is simply the full photo,
 * so the section reads correctly with no JS at all.
 */
export default function Location() {
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = headingRef.current;
        const frame = frameRef.current;
        const image = imageRef.current;

        // Heading rises out of per-line masks. `autoSplit` re-splits after
        // font load and on resize, re-running the reveal cleanly.
        let split: SplitText | null = null;
        if (heading) {
          split = SplitText.create(heading, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 118,
                duration: DUR.slow,
                ease: EASE.out,
                stagger: STAGGER.lines,
                scrollTrigger: {
                  trigger: heading,
                  start: REVEAL_START,
                  once: true,
                },
              }),
          });
        }

        // Eyebrow, paragraph and each distance row, in document order.
        gsap.from("[data-reveal]", {
          y: 22,
          autoAlpha: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items,
          scrollTrigger: {
            trigger: textRef.current,
            start: REVEAL_START,
            once: true,
          },
        });

        if (frame && image) {
          gsap.set(frame, { willChange: "clip-path" });
          gsap.set(image, { willChange: "transform" });

          gsap
            .timeline({
              scrollTrigger: {
                trigger: frame,
                start: "top 92%",
                end: "top 26%",
                scrub: 0.8,
              },
            })
            .fromTo(
              frame,
              { clipPath: "inset(7% 9% 7% 9%)" },
              { clipPath: "inset(0% 0% 0% 0%)", ease: EASE.none },
              0,
            )
            .fromTo(image, { scale: 1.08 }, { scale: 1, ease: EASE.none }, 0);
        }

        return () => {
          split?.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="location"
      aria-labelledby="location-title"
      className="bg-sand py-24 sm:py-32 lg:py-40"
    >
      <div
        ref={textRef}
        className="mx-auto w-full max-w-[88rem] px-6 sm:px-10 lg:px-16"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p data-reveal className="u-eyebrow">
              Location
            </p>
            <h2
              ref={headingRef}
              id="location-title"
              className="u-display mt-6 max-w-[16ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
            >
              Held between the old town and the river
            </h2>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <p
              data-reveal
              className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-70 sm:text-lg"
            >
              Vera keeps its own pace. Plane trees over narrow pavements,
              timber balconies weathered to grey, and a handful of rooms
              where the coffee is still made slowly. The building stands on a
              side street above the ravine, far enough from the boulevard
              that the evenings stay quiet.
            </p>

            <dl className="mt-10 border-b border-line">
              {DISTANCES.map((item) => (
                <div
                  key={item.place}
                  data-reveal
                  className="flex items-baseline justify-between gap-6 border-t border-line py-3.5"
                >
                  <dt className="text-sm text-ink sm:text-base">
                    {item.place}
                  </dt>
                  <dd className="text-sm text-ink-55 sm:text-base">
                    {item.time}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <figure className="mt-16 sm:mt-24 lg:mt-28">
        <div
          ref={frameRef}
          className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[21/9]"
        >
          <div ref={imageRef} className="absolute inset-0">
            <Image
              src={src(IMAGES.locationAerial)}
              alt={IMAGES.locationAerial.alt}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>

        <figcaption className="mx-auto mt-5 flex w-full max-w-[88rem] items-center gap-4 px-6 sm:px-10 lg:px-16">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-clay" />
          <span className="text-sm text-ink-55">
            Vera and the ravine at golden hour, looking east toward the old
            town.
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
