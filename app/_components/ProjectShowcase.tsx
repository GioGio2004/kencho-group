"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS } from "./projects";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * The abvtek-style synchronized split gallery: per project, one half of
 * the viewport is a pinned full-bleed image, the other a scrolling strip
 * of framed photos with the project title locked over it in blend mode.
 * Scrolling a card past center crossfades the pinned image to match; the
 * active viewer image runs a slow Ken Burns drift; each card runs a
 * center-focus lens (largest and brightest at viewport center). Projects
 * alternate sides. All motion is skipped under prefers-reduced-motion.
 */
export default function ProjectShowcase() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const sections = gsap.utils.toArray<HTMLElement>("[data-project]");

        sections.forEach((section) => {
          const viewerImgs = Array.from(
            section.querySelectorAll<HTMLElement>("[data-viewer-img]"),
          );
          const cards = Array.from(
            section.querySelectorAll<HTMLElement>("[data-card]"),
          );
          if (!viewerImgs.length || !cards.length) return;

          gsap.set(viewerImgs, { autoAlpha: 0 });
          gsap.set(viewerImgs[0], { autoAlpha: 1 });

          let kenBurns: gsap.core.Tween | null = null;
          const drift = (wrap: HTMLElement) => {
            const img = wrap.querySelector("img");
            if (!img) return;
            kenBurns?.kill();
            kenBurns = gsap.fromTo(
              img,
              { scale: 1.04 },
              { scale: 1.13, duration: 8, ease: "none" },
            );
          };
          drift(viewerImgs[0]);

          let active = 0;
          const activate = (i: number) => {
            if (i === active || !viewerImgs[i]) return;
            const prev = viewerImgs[active];
            const next = viewerImgs[i];
            active = i;
            gsap.killTweensOf([prev, next]);
            gsap.to(prev, { autoAlpha: 0, duration: 0.45, ease: "power2.out" });
            gsap.fromTo(
              next,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.6, ease: "power2.out" },
            );
            drift(next);
          };

          cards.forEach((card, i) => {
            ScrollTrigger.create({
              trigger: card,
              start: "top 55%",
              end: "bottom 45%",
              onEnter: () => activate(i),
              onEnterBack: () => activate(i),
            });

            // Center-focus lens: peak scale/opacity as the card crosses
            // the viewport center, sunken at the edges.
            const inner = card.querySelector<HTMLElement>("[data-card-inner]");
            if (inner) {
              gsap
                .timeline({
                  defaults: { ease: "none" },
                  scrollTrigger: {
                    trigger: card,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                })
                .fromTo(
                  inner,
                  { scale: 0.88, opacity: 0.65, y: 44 },
                  { scale: 1.04, opacity: 1, y: 0, duration: 0.5 },
                )
                .to(inner, {
                  scale: 0.88,
                  opacity: 0.65,
                  y: -44,
                  duration: 0.5,
                });
            }
          });
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="projects"
      className="relative bg-paper text-ink"
    >
      <div className="px-6 pb-16 pt-24 text-center sm:pt-32">
        <p
          data-srev
          className="text-[0.65rem] uppercase tracking-[0.35em] text-gold-deep sm:text-xs"
        >
          (01) — ნამუშევრები
        </p>
        <h2
          data-srev
          className="mt-4 font-serif-ka text-[clamp(2.4rem,6vw,5rem)] uppercase leading-none"
        >
          შერჩეული პროექტები
        </h2>
      </div>

      {PROJECTS.map((project) => (
        <article key={project.id} data-project className="relative">
          <div
            className={`flex ${
              project.side === "right" ? "lg:flex-row-reverse" : "lg:flex-row"
            }`}
          >
            <div className="hidden w-1/2 lg:block">
              <div className="sticky top-0 h-svh overflow-hidden">
                {project.images.map((img) => (
                  <div
                    key={img.id}
                    data-viewer-img
                    className="absolute inset-0 overflow-hidden"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-full lg:w-1/2">
              <div className="pointer-events-none sticky top-[38svh] z-20 h-0">
                <div className="mix-blend-difference px-6 text-center text-white">
                  <h3 className="font-serif-ka text-[clamp(1.9rem,3.2vw,3.2rem)] uppercase leading-tight">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] opacity-80 sm:text-sm">
                    {project.location}
                  </p>
                  <a
                    href="#contact"
                    className="pointer-events-auto mt-5 inline-block border-b border-white/60 pb-1 text-xs uppercase tracking-[0.25em] transition-opacity hover:opacity-70 sm:text-sm"
                  >
                    ვრცლად პროექტზე ↗
                  </a>
                </div>
              </div>

              <div className="px-[8%] pb-[16svh] pt-[26svh]">
                {project.images.map((img) => (
                  <figure
                    key={img.id}
                    data-card
                    data-cursor="view"
                    className="group mb-[16svh] last:mb-0"
                  >
                    <div
                      data-card-inner
                      className="relative aspect-[4/5] overflow-hidden will-change-transform"
                    >
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 1024px) 38vw, 84vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                  </figure>
                ))}
              </div>

              <div className="px-[12%] pb-[14svh]">
                <p
                  data-srev
                  className="mx-auto max-w-md text-center text-xs uppercase leading-relaxed tracking-[0.15em] text-ink/65 sm:text-sm"
                >
                  {project.description}
                </p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
