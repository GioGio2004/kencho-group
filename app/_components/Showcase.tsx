"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
import { SHOWCASE, SHOWCASE_MOTION as M } from "@/lib/showcase";
import { whatsappUrl } from "@/lib/site";
import { track } from "@/lib/analytics";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/*
 * SHOWCASE — the split-screen synced gallery.
 *
 * One half holds a sticky viewer; the other scrolls a strip of the same
 * photos past it. Whichever card crosses the active line drives the
 * viewer, so the two halves stay locked together. The project title sits
 * pinned between them in mix-blend-difference, so it inverts against
 * whatever photo happens to be behind it — no scrim needed, and it reads
 * on a dark lobby and a bright kitchen alike.
 *
 * The layout is a CSS `sticky` column, not a ScrollTrigger pin: sticky
 * costs nothing, survives resize, and behaves identically on touch. On
 * phones the split becomes horizontal — viewer on top, strip beneath —
 * so the effect survives at 390px instead of being dropped.
 */
export default function Showcase() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("showcase");
  const tCommon = useTranslations("common");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];

        gsap.utils
          .toArray<HTMLElement>("[data-project]", root)
          .forEach((project) => {
            const viewers = gsap.utils.toArray<HTMLElement>(
              "[data-viewer]",
              project,
            );
            const cards = gsap.utils.toArray<HTMLElement>("[data-card]", project);
            if (!viewers.length || !cards.length) return;

            gsap.set(viewers, { autoAlpha: 0 });
            gsap.set(viewers[0]!, { autoAlpha: 1 });

            /* Ken Burns on whichever photo is currently showing. */
            let drift: gsap.core.Tween | null = null;
            const driftOn = (wrap: HTMLElement) => {
              const img = wrap.querySelector("img");
              if (!img) return;
              drift?.kill();
              drift = gsap.fromTo(
                img,
                { scale: 1 },
                { scale: M.drift.to, duration: M.drift.duration, ease: "none" },
              );
            };
            driftOn(viewers[0]!);
            cleanups.push(() => drift?.kill());

            let active = 0;
            const show = (i: number) => {
              const next = viewers[i];
              const prev = viewers[active];
              if (i === active || !next || !prev) return;
              active = i;
              gsap.killTweensOf([prev, next]);
              gsap.to(prev, {
                autoAlpha: 0,
                duration: M.swap.duration,
                ease: M.swap.ease,
              });
              gsap.fromTo(
                next,
                { autoAlpha: 0, scale: M.swapScale },
                {
                  autoAlpha: 1,
                  scale: 1,
                  duration: M.swap.duration,
                  ease: M.swap.ease,
                },
              );
              driftOn(next);
              const counter = project.querySelector("[data-counter]");
              if (counter) {
                counter.textContent = String(i + 1).padStart(2, "0");
              }
            };

            cards.forEach((card, i) => {
              /* The card crossing the active line drives the viewer. */
              const st = ScrollTrigger.create({
                trigger: card,
                start: `top ${M.activeLine * 100}%`,
                end: `bottom ${M.activeLine * 100}%`,
                onEnter: () => show(i),
                onEnterBack: () => show(i),
              });
              cleanups.push(() => st.kill());

              /* Slow drift of each photo inside its own frame. */
              const inner = card.querySelector<HTMLElement>("[data-card-img]");
              if (inner) {
                const tl = gsap.fromTo(
                  inner,
                  { yPercent: -M.cardParallax },
                  {
                    yPercent: M.cardParallax,
                    ease: "none",
                    scrollTrigger: {
                      trigger: card,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: true,
                    },
                  },
                );
                cleanups.push(() => {
                  tl.scrollTrigger?.kill();
                  tl.kill();
                });
              }
            });
          });

        /* Section header + per-project meta reveals. */
        gsap.utils.toArray<HTMLElement>("[data-srev]", root).forEach((el) => {
          const tw = gsap.from(el, {
            y: 26,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: { trigger: el, start: REVEAL_START },
          });
          cleanups.push(() => {
            tw.scrollTrigger?.kill();
            tw.kill();
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
      id="showcase"
      aria-labelledby="showcase-title"
      className="relative bg-charcoal text-sand"
    >
      <div className="px-5 pt-24 pb-14 text-center sm:px-8 sm:pt-32">
        <p
          data-srev
          className="text-[0.65rem] tracking-[0.35em] text-clay uppercase sm:text-xs"
        >
          {t("eyebrow")}
        </p>
        <h2
          data-srev
          id="showcase-title"
          className="u-display mt-4 text-[clamp(2rem,6vw,4.5rem)] text-sand uppercase"
        >
          {t("title")}
        </h2>
      </div>

      {SHOWCASE.map((project) => (
        <article key={project.id} data-project className="relative">
          <div
            className={`flex flex-col ${
              project.side === "right" ? "lg:flex-row-reverse" : "lg:flex-row"
            }`}
          >
            {/*
              The viewer: full-height beside the strip on desktop, a tall
              band above it on phones.

              `display: contents` on mobile is load-bearing. A sticky
              element only travels within its parent's box, and this
              wrapper is exactly as tall as the viewer — so on a phone the
              viewer would unstick immediately and scroll away. Removing
              the wrapper from layout makes the viewer a direct child of
              the tall flex column, which is what it needs to stick
              through the whole strip. The wrapper returns at lg, where
              the flex row already stretches both halves to equal height.
            */}
            <div className="contents lg:block lg:w-1/2">
              <div className="sticky top-0 h-[52svh] overflow-hidden lg:h-svh">
                {project.images.map((key, i) => (
                  <div
                    key={key + i}
                    data-viewer
                    className="absolute inset-0 overflow-hidden"
                  >
                    <Image
                      src={src(IMAGES[key], 1600)}
                      alt={IMAGES[key].alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}

                {/*
                  A soft dark band sits under the title only. Difference
                  blending alone inverts to whatever the photo happens to
                  be, which lands near-invisible over a bright window;
                  against a predictably dark backdrop it always resolves
                  close to white, while the edges keep the inverted look.
                */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 lg:top-1/2 lg:bottom-auto lg:h-2/5 lg:-translate-y-1/2"
                  style={{
                    background:
                      "linear-gradient(to top, color-mix(in srgb, var(--charcoal) 62%, transparent) 0%, color-mix(in srgb, var(--charcoal) 28%, transparent) 55%, transparent 100%)",
                  }}
                />

                {/* Pinned title — inverts against whatever is behind it. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-8 mix-blend-difference sm:px-8 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 lg:pb-0">
                  <h3 className="u-display text-[clamp(1.6rem,4vw,3.2rem)] text-white uppercase">
                    {t(`items.${project.id}.title`)}
                  </h3>
                  <p className="mt-2 text-[0.65rem] tracking-[0.3em] text-white uppercase sm:text-xs">
                    {t(`items.${project.id}.location`)}
                  </p>
                </div>

                {/* Photo counter, small and quiet. */}
                <div className="absolute top-5 right-5 z-20 text-[0.6rem] tracking-[0.25em] text-white uppercase mix-blend-difference sm:top-8 sm:right-8">
                  <span data-counter className="tabular-nums">
                    01
                  </span>
                  <span className="opacity-60">
                    {" "}
                    / {String(project.images.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* The scrolling strip. */}
            <div className="lg:w-1/2">
              <div className="px-5 pt-10 pb-6 sm:px-8 lg:px-[8%] lg:pt-[22svh]">
                {project.images.map((key, i) => (
                  <figure
                    key={key + i}
                    data-card
                    className="mb-[10svh] overflow-hidden last:mb-0 lg:mb-[16svh]"
                  >
                    <div
                      data-card-img
                      className="relative aspect-[4/5] scale-[1.14]"
                    >
                      <Image
                        src={src(IMAGES[key], 1200)}
                        alt={IMAGES[key].alt}
                        fill
                        sizes="(min-width: 1024px) 38vw, 84vw"
                        className="object-cover"
                      />
                    </div>
                  </figure>
                ))}
              </div>

              <div className="px-5 pb-20 sm:px-8 lg:px-[12%]">
                <p
                  data-srev
                  className="max-w-md text-sm leading-relaxed text-sand/70 sm:text-base"
                >
                  {t(`items.${project.id}.line`)}
                </p>
                <a
                  data-srev
                  href={whatsappUrl(tCommon("whatsappPrefill"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("Contact", { method: "whatsapp" })}
                  className="u-link mt-6 inline-block text-sm text-clay"
                >
                  {t("cta")} ↗
                </a>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
