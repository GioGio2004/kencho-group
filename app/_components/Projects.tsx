"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { useTranslations } from "next-intl";
import { IMAGES, src, type ImageAsset } from "@/lib/images";
import {
  DUR,
  EASE,
  REVEAL_START,
  STAGGER,
  prefersReducedMotion,
} from "@/lib/motion";

type ProjectItem = {
  /** Message key under `projects.items` — caption + alt live there. */
  key: "p1" | "p2" | "p3" | "p4" | "p5" | "p6";
  asset: ImageAsset;
  /** Grid placement for the <figure> cell. */
  cell: string;
  /** Frame proportions per breakpoint. */
  frame: string;
  /** Rendered width of the frame, mobile-first. */
  sizes: string;
};

/*
 * Six frames in a deliberately uneven rhythm: one wide opener, a tall
 * column beside it, a staggered middle row, and a full-width closer.
 */
const ITEMS: ProjectItem[] = [
  {
    key: "p1",
    asset: IMAGES.project01,
    cell: "sm:col-span-2 lg:col-span-2",
    frame: "aspect-[4/5] sm:aspect-[16/11]",
    sizes: "(min-width: 1024px) 62vw, 100vw",
  },
  {
    key: "p2",
    asset: IMAGES.project02,
    cell: "lg:mt-16",
    frame: "aspect-[4/5] sm:aspect-[3/4]",
    sizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
  {
    key: "p3",
    asset: IMAGES.project03,
    cell: "lg:mt-24",
    frame: "aspect-[4/5]",
    sizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
  {
    key: "p4",
    asset: IMAGES.project04,
    cell: "",
    frame: "aspect-[4/5] sm:aspect-[3/4]",
    sizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
  {
    key: "p5",
    asset: IMAGES.project05,
    cell: "lg:mt-24",
    frame: "aspect-[4/5]",
    sizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
  {
    key: "p6",
    asset: IMAGES.project06,
    cell: "sm:col-span-2 lg:col-span-3",
    frame: "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]",
    sizes: "100vw",
  },
];

/*
 * PROJECTS
 * --------
 * Frames wipe open on a clip-path, their contents drift inside the crop as
 * the page moves, and any frame can be lifted full-screen with GSAP Flip —
 * the real image element travels, so there is never a cross-fade seam.
 * Without JS every photo is already fully visible; the overlay stays
 * display:none until a click opens it.
 */
export default function Projects() {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");

  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, Flip);

      const grid = gridRef.current;
      const overlay = overlayRef.current;
      const backdrop = backdropRef.current;
      const stage = stageRef.current;
      const closeBtn = closeRef.current;
      if (!grid || !overlay || !backdrop || !stage || !closeBtn) return;

      /* ---------------------------------------------------------------
       * LIGHTBOX — available at every motion setting. Reduced motion gets
       * a plain fade instead of the Flip flight.
       * ------------------------------------------------------------ */
      let media: HTMLElement | null = null;
      let home: HTMLElement | null = null;
      let opener: HTMLElement | null = null;
      let htmlOverflow = "";
      let locked = false;

      const settle = () => {
        overlay.style.display = "";
        overlay.hidden = true;
        gsap.set(stage, { clearProps: "width,height" });
      };

      const openFrame = (frame: HTMLElement) => {
        if (media) return;
        const target = frame.querySelector<HTMLElement>("[data-media]");
        const parent = target?.parentElement ?? null;
        if (!target || !parent) return;

        const reduce = prefersReducedMotion();
        const rect = target.getBoundingClientRect();
        // Measured before any layout change so the flight starts exactly
        // where the visitor last saw the frame.
        const state = reduce ? null : Flip.getState(target);

        media = target;
        home = parent;
        opener = frame;

        // The dialog announces as the picture it is showing.
        const alt = target.querySelector("img")?.alt;
        if (alt) overlay.setAttribute("aria-label", alt);

        // The stage keeps the frame's own proportions, so the enlargement
        // is the same composition — no crop pop on arrival.
        const pad = window.innerWidth < 640 ? 20 : 72;
        const maxW = Math.max(window.innerWidth - pad * 2, 160);
        const maxH = Math.max(window.innerHeight - pad * 2, 160);
        const ratio = rect.width / Math.max(rect.height, 1);
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }

        htmlOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        locked = true;

        overlay.hidden = false;
        overlay.style.display = "flex";
        gsap.set(stage, { width: Math.round(w), height: Math.round(h) });
        stage.appendChild(target);

        gsap.killTweensOf([overlay, backdrop, closeBtn, target]);
        gsap.set([overlay, target], { clearProps: "opacity" });
        gsap.set([backdrop, closeBtn], { opacity: 1 });

        if (state) {
          gsap.fromTo(
            backdrop,
            { opacity: 0 },
            { opacity: 1, duration: DUR.fast, ease: EASE.soft },
          );
          gsap.fromTo(
            closeBtn,
            { opacity: 0 },
            { opacity: 1, duration: DUR.fast, delay: 0.3, ease: EASE.soft },
          );
          Flip.from(state, {
            duration: 0.7,
            ease: EASE.inOut,
            absolute: true,
          });
        } else {
          gsap.fromTo(
            overlay,
            { opacity: 0 },
            { opacity: 1, duration: 0.24, ease: EASE.soft },
          );
        }

        closeBtn.focus({ preventScroll: true });
      };

      const closeFrame = () => {
        const target = media;
        const parent = home;
        const returnTo = opener;
        if (!target || !parent) return;
        media = null;
        home = null;
        opener = null;

        if (locked) {
          document.documentElement.style.overflow = htmlOverflow;
          locked = false;
        }
        returnTo?.focus({ preventScroll: true });

        gsap.killTweensOf([overlay, backdrop, closeBtn, target]);

        if (prefersReducedMotion()) {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.24,
            ease: EASE.soft,
            onComplete: () => {
              parent.appendChild(target);
              settle();
            },
          });
          return;
        }

        const state = Flip.getState(target);
        parent.appendChild(target);
        gsap.to([backdrop, closeBtn], {
          opacity: 0,
          duration: 0.55,
          ease: EASE.soft,
        });
        Flip.from(state, {
          duration: 0.6,
          ease: EASE.inOut,
          absolute: true,
          onComplete: settle,
        });
      };

      const onGridClick = (event: MouseEvent) => {
        const frame = (event.target as Element | null)?.closest<HTMLElement>(
          "[data-frame]",
        );
        if (frame) openFrame(frame);
      };
      const onOverlayClick = (event: MouseEvent) => {
        if (event.target === overlay || event.target === backdrop) closeFrame();
      };
      const onCloseClick = () => closeFrame();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && media) closeFrame();
      };

      grid.addEventListener("click", onGridClick);
      overlay.addEventListener("click", onOverlayClick);
      closeBtn.addEventListener("click", onCloseClick);
      document.addEventListener("keydown", onKeyDown);

      /* ---------------------------------------------------------------
       * ENTRANCE + SCROLL — motion visitors only.
       * ------------------------------------------------------------ */
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const header = headerRef.current;
        if (header) {
          gsap.from(gsap.utils.toArray<HTMLElement>("[data-head]", header), {
            opacity: 0,
            y: 22,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: { trigger: header, start: REVEAL_START },
          });
        }

        gsap.utils
          .toArray<HTMLElement>("[data-figure]", grid)
          .forEach((figure) => {
            const frame = figure.querySelector<HTMLElement>("[data-frame]");
            const caption = figure.querySelector<HTMLElement>("[data-caption]");
            const inner = figure.querySelector<HTMLElement>("[data-parallax]");
            if (!frame) return;

            const reveal = gsap.timeline({
              scrollTrigger: { trigger: figure, start: REVEAL_START },
            });
            reveal.from(frame, {
              clipPath: "inset(0% 0% 100% 0%)",
              duration: DUR.slow,
              ease: EASE.inOut,
            });
            if (caption) {
              reveal.from(
                caption,
                {
                  opacity: 0,
                  y: 14,
                  duration: DUR.base,
                  ease: EASE.out,
                },
                0.3,
              );
            }

            if (!inner) return;
            // Oversized so the drift never exposes an edge; transform only.
            gsap.set(inner, { scale: 1.15, willChange: "transform" });
            gsap.fromTo(
              inner,
              { yPercent: -6 },
              {
                yPercent: 6,
                ease: EASE.none,
                scrollTrigger: {
                  trigger: frame,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });
      });

      return () => {
        mm.revert();
        grid.removeEventListener("click", onGridClick);
        overlay.removeEventListener("click", onOverlayClick);
        closeBtn.removeEventListener("click", onCloseClick);
        document.removeEventListener("keydown", onKeyDown);
        if (media && home) {
          home.appendChild(media);
          media = null;
          home = null;
        }
        if (locked) {
          document.documentElement.style.overflow = htmlOverflow;
          locked = false;
        }
      };
    },
    { scope: sectionRef },
  );

  return (
    <>
      <section
        ref={sectionRef}
        id="projects"
        aria-labelledby="projects-title"
        className="bg-sand-deep py-24 sm:py-32 lg:py-40"
      >
        <div className="mx-auto w-full max-w-[88rem] px-6 sm:px-8 lg:px-12">
          <div ref={headerRef}>
            <p data-head="" className="u-eyebrow flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 bg-clay"
              />
              {t("eyebrow")}
            </p>
            <h2
              data-head=""
              id="projects-title"
              className="u-display mt-6 max-w-[16ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
            >
              {t("title")}
            </h2>
          </div>

          <div
            ref={gridRef}
            className="mt-14 grid grid-cols-1 items-start gap-x-6 gap-y-12 sm:mt-20 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-14 lg:mt-24 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16"
          >
            {ITEMS.map((item, index) => (
              <figure
                key={item.key}
                data-figure=""
                className={`min-w-0 ${item.cell}`}
              >
                {/* The clip-path rests fully open, written out in four
                    values so the wipe interpolates number for number. */}
                <button
                  type="button"
                  data-frame=""
                  aria-haspopup="dialog"
                  aria-label={t(`items.${item.key}.alt`)}
                  style={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  className={`u-press relative block w-full cursor-pointer overflow-hidden bg-shell ${item.frame}`}
                >
                  <span
                    data-media=""
                    className="absolute inset-0 block overflow-hidden"
                  >
                    <span data-parallax="" className="absolute inset-0 block">
                      <Image
                        src={src(item.asset)}
                        alt={t(`items.${item.key}.alt`)}
                        fill
                        sizes={item.sizes}
                        className="object-cover"
                      />
                    </span>
                  </span>
                </button>
                <figcaption
                  data-caption=""
                  className="mt-3 flex items-baseline justify-between gap-4 sm:mt-4"
                >
                  <span className="text-xs tracking-[0.18em] text-ink-55">
                    {t(`items.${item.key}.caption`)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-[0.6875rem] tracking-[0.24em] text-ink-40"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox. Kept out of the flow with `hidden`; JS sets display:flex.
          Its aria-label is set on open to the shown image's localized alt. */}
      <div
        ref={overlayRef}
        hidden
        role="dialog"
        aria-label={t("title")}
        className="fixed inset-0 z-50 items-center justify-center"
      >
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="absolute inset-0 bg-sand"
        />
        <button
          ref={closeRef}
          type="button"
          aria-label={tCommon("close")}
          className="u-press absolute right-5 top-5 z-10 flex h-11 w-11 cursor-pointer items-center justify-center border border-line-strong bg-shell text-ink sm:right-8 sm:top-8"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          >
            <path d="M3 3 13 13M13 3 3 13" />
          </svg>
        </button>
        <div ref={stageRef} className="relative" />
      </div>
    </>
  );
}
