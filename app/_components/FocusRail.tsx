"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DUR, EASE, STAGGER } from "@/lib/motion";

/*
 * FOCUS RAIL — Combo 11, the hover accordion.
 *
 * One project holds the floor at ~45% of the rail; the rest wait as
 * blurred slivers. RESTING on a sliver is what opens it — the widths
 * trade in ~0.75s power3.inOut, the leaving text drops first and the
 * arriving text rises while the panel is still growing, and the two
 * image layers (sharp + genuinely pre-blurred) crossfade by opacity
 * only. No input lock: a pointer sweeping three slivers retargets the
 * tweens mid-flight (overwrite) and lands on the last one it touched.
 *
 * Every panel IS its link — hover opens, click travels. "View project"
 * is a cursor-trailing chip inside the open panel (the reference's
 * floating Learn More), with a static fallback wherever there is no
 * pointer to follow: phones, keyboards, reduced motion, no JS.
 * Keyboard focus counts as hover, so tabbing walks the accordion.
 *
 * Server-rendered truth: panel 0 ships [data-active] with its copy
 * visible and all text in the HTML. Under 768px there is no accordion —
 * a scroll-snap swipe deck with a position counter.
 */

export type FocusProject = {
  slug: string;
  title: string;
  description: string;
  /** Monospace craft row, e.g. "27 photographs · 2026". */
  meta: string;
  coverUrl: string;
  coverAlt: string;
};

const SWAP = 0.75;

export default function FocusRail({ projects }: { projects: FocusProject[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("featured");
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const swapRef = useRef<(to: number) => void>(() => {});
  const [page, setPage] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);

  const step = useCallback((delta: number) => {
    const count = rootRef.current
      ? rootRef.current.querySelectorAll("[data-focus-panel]").length
      : 0;
    if (count > 0) {
      swapRef.current((activeRef.current + delta + count) % count);
    }
  }, []);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;

      const panels = Array.from(
        root.querySelectorAll<HTMLElement>("[data-focus-panel]"),
      );
      const viewport = root.querySelector<HTMLElement>("[data-focus-viewport]");
      const track = root.querySelector<HTMLElement>("[data-focus-track]");
      if (!viewport || !track || panels.length < 2) return;

      const copies = panels.map((p) =>
        Array.from(p.querySelectorAll<HTMLElement>("[data-focus-copy] > *")),
      );
      const sharps = panels.map((p) =>
        p.querySelector<HTMLElement>("[data-focus-sharp]"),
      );
      const blurs = panels.map((p) =>
        p.querySelector<HTMLElement>("[data-focus-blur]"),
      );
      const float = root.querySelector<HTMLElement>("[data-focus-float]");

      const GAP = 10;
      const widths = (activeIndex: number) => {
        const vw = track.clientWidth;
        const activeW = vw * 0.45;
        const sliverW = (vw - activeW - GAP * (panels.length - 1)) /
          (panels.length - 1);
        return panels.map((_, i) => (i === activeIndex ? activeW : sliverW));
      };
      const pinFlex = { flexGrow: 0, flexShrink: 0, flexBasis: "auto" };

      /* The attribute flip happens at swap START — aria state and the
       * CSS resting rules always describe where the rail is heading;
       * inline tween styles carry the journey. */
      const settle = (index: number) => {
        panels.forEach((panel, i) =>
          panel.toggleAttribute("data-active", i === index),
        );
      };

      const trackX = (target: number[], to: number) => {
        const left = target.slice(0, to).reduce((sum, w) => sum + w + GAP, 0);
        const trackW =
          target.reduce((sum, w) => sum + w, 0) + GAP * (panels.length - 1);
        const overflow = Math.max(0, trackW - viewport.clientWidth);
        return -Math.min(overflow, Math.max(0, left - GAP));
      };

      const mm = gsap.matchMedia();

      /* -------- Desktop, full motion: the hover accordion. -------- */
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          root.classList.add("focus-cursor-on");
          gsap.set(panels, {
            width: (i: number) => widths(activeRef.current)[i],
            ...pinFlex,
          });
          const onResize = () => {
            gsap.set(panels, {
              width: (i: number) => widths(activeRef.current)[i],
            });
          };
          window.addEventListener("resize", onResize);

          /* ONE timeline per swap, and each swap's first act is killing
           * the previous swap's timeline wherever it got to. This is
           * what makes a pointer sweeping four slivers deterministic:
           * no tween — least of all the DELAYED text arrival — can
           * outlive the move that scheduled it and fire later on a
           * panel that went back to being a sliver. */
          let swapTl: gsap.core.Timeline | null = null;

          swapRef.current = (to: number) => {
            const from = activeRef.current;
            if (to === from) return;
            activeRef.current = to;
            setActive(to);
            settle(to);

            swapTl?.kill();
            const target = widths(to);
            gsap.set(panels, { willChange: "width" });

            const tl = gsap.timeline({
              onComplete: () => gsap.set(panels, { clearProps: "willChange" }),
            });
            tl.to(
              panels,
              {
                width: (i: number) => target[i],
                duration: SWAP,
                ease: "power3.inOut",
              },
              0,
            )
              .to(
                track,
                { x: trackX(target, to), duration: SWAP, ease: "power3.inOut" },
                0,
              )
              /* Blur trade, opacity only. */
              .to(
                sharps[to],
                { opacity: 1, duration: 0.6, ease: EASE.crossfade },
                0,
              )
              .to(
                blurs[to],
                { opacity: 0, duration: 0.6, ease: EASE.crossfade },
                0,
              )
              .to(
                sharps.filter((_, i) => i !== to),
                { opacity: 0, duration: 0.6, ease: EASE.crossfade },
                0,
              )
              .to(
                blurs.filter((_, i) => i !== to),
                { opacity: 1, duration: 0.6, ease: EASE.crossfade },
                0,
              )
              /* EVERY other panel's text stands down — not just the one
               * we think was open; a killed mid-sweep swap may have left
               * a third panel's text partway up. */
              .to(
                copies.filter((_, i) => i !== to).flat(),
                { opacity: 0, duration: 0.2, ease: "power2.in" },
                0,
              )
              /* The arriving text rises while the panel is still
               * growing — as in the reference capture. */
              .fromTo(
                copies[to],
                { opacity: 0, y: 18 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.5,
                  ease: "power3.out",
                  stagger: STAGGER.items,
                },
                0.22,
              );
            swapTl = tl;
          };

          /* Hover opens; keyboard focus counts as hover. */
          const enters = panels.map((panel, i) => {
            const onEnter = () => swapRef.current(i);
            panel.addEventListener("pointerenter", onEnter);
            panel.addEventListener("focusin", onEnter);
            return onEnter;
          });

          /* The cursor-trailing "View project" chip, alive only over
           * the open panel. */
          let chipShown = false;
          const xTo = float
            ? gsap.quickTo(float, "x", { duration: 0.35, ease: EASE.drift })
            : null;
          const yTo = float
            ? gsap.quickTo(float, "y", { duration: 0.35, ease: EASE.drift })
            : null;
          const onMove = (e: PointerEvent) => {
            if (!float || !xTo || !yTo) return;
            const box = viewport.getBoundingClientRect();
            const activePanel = panels[activeRef.current];
            const inActive = activePanel
              .getBoundingClientRect()
              .toJSON();
            const over =
              e.clientX >= inActive.left &&
              e.clientX <= inActive.right &&
              e.clientY >= inActive.top &&
              e.clientY <= inActive.bottom;
            xTo(e.clientX - box.left);
            yTo(e.clientY - box.top);
            if (over !== chipShown) {
              chipShown = over;
              gsap.to(float, {
                autoAlpha: over ? 1 : 0,
                duration: 0.25,
                ease: EASE.soft,
                overwrite: "auto",
              });
            }
          };
          const onLeave = () => {
            if (!float) return;
            chipShown = false;
            gsap.to(float, { autoAlpha: 0, duration: 0.2, ease: EASE.soft });
          };
          viewport.addEventListener("pointermove", onMove);
          viewport.addEventListener("pointerleave", onLeave);

          /* ENTRANCE — one-time, at top 70%. */
          gsap.set(panels, { autoAlpha: 0, scale: 0.965 });
          gsap.set(copies[activeRef.current], { opacity: 0, y: 24 });
          const entrance = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          });
          entrance
            .to(panels, {
              autoAlpha: 1,
              scale: 1,
              duration: DUR.base,
              ease: EASE.out,
              stagger: 0.06,
            })
            .to(
              copies[activeRef.current],
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: "power3.out",
                stagger: STAGGER.items,
              },
              "-=0.3",
            );

          return () => {
            root.classList.remove("focus-cursor-on");
            panels.forEach((panel, i) => {
              panel.removeEventListener("pointerenter", enters[i]);
              panel.removeEventListener("focusin", enters[i]);
            });
            viewport.removeEventListener("pointermove", onMove);
            viewport.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("resize", onResize);
            swapRef.current = () => {};
          };
        },
      );

      /* -------- Desktop, reduced motion: hover still opens, but the
       * state simply swaps with a short fade. */
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: reduce)",
        () => {
          gsap.set(panels, {
            width: (i: number) => widths(activeRef.current)[i],
            ...pinFlex,
          });
          swapRef.current = (to: number) => {
            const from = activeRef.current;
            if (to === from) return;
            activeRef.current = to;
            setActive(to);
            gsap.set(panels, { width: (i: number) => widths(to)[i] });
            settle(to);
            gsap.set([sharps[to], blurs[from]], { opacity: 1 });
            gsap.set([blurs[to], sharps[from]], { opacity: 0 });
            gsap.fromTo(
              copies[to],
              { opacity: 0 },
              { opacity: 1, duration: 0.3, ease: "none" },
            );
            gsap.set(copies[from], { opacity: 0 });
          };
          const enters = panels.map((panel, i) => {
            const onEnter = () => swapRef.current(i);
            panel.addEventListener("pointerenter", onEnter);
            panel.addEventListener("focusin", onEnter);
            return onEnter;
          });
          return () => {
            panels.forEach((panel, i) => {
              panel.removeEventListener("pointerenter", enters[i]);
              panel.removeEventListener("focusin", enters[i]);
            });
            swapRef.current = () => {};
          };
        },
      );

      /* -------- Phones: the swipe deck needs no GSAP at all. */
      mm.add("(max-width: 767px)", () => {
        swapRef.current = () => {};
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /* Arrow keys still walk the rail — quiet a11y, no visible chrome. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    },
    [step],
  );

  /* Mobile counter follows the snap position. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const w = track.clientWidth;
      if (w > 0) setPage(Math.round(track.scrollLeft / w));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  if (projects.length < 2) return null;

  return (
    <section
      id="featured"
      ref={rootRef}
      aria-labelledby="featured-title"
      className="focus u-band"
      onKeyDown={onKeyDown}
    >
      <div className="focus-head">
        <p className="u-eyebrow">{t("eyebrow")}</p>
        <h2
          id="featured-title"
          className="u-display mt-4 max-w-[16ch] text-[clamp(1.9rem,5vw,3.6rem)] text-ink"
        >
          {t("title")}
        </h2>
      </div>

      <div data-focus-viewport className="focus-viewport">
        <ul
          ref={trackRef}
          data-focus-track
          aria-label={t("railLabel")}
          className="focus-track"
        >
          {projects.map((project, index) => (
            <li
              key={project.slug}
              data-focus-panel
              {...(index === 0 ? { "data-active": "" } : {})}
              className="focus-panel"
            >
              <div data-focus-blur className="focus-img focus-img-blur">
                <Image
                  src={project.coverUrl}
                  alt=""
                  fill
                  sizes="48px"
                  quality={50}
                  className="object-cover"
                />
              </div>
              <div data-focus-sharp className="focus-img focus-img-sharp">
                <Image
                  src={project.coverUrl}
                  alt={project.coverAlt}
                  fill
                  sizes="(min-width: 768px) 45vw, 100vw"
                  preload={index === 0}
                  className="object-cover"
                />
              </div>
              <span aria-hidden="true" className="focus-scrim" />

              <span data-focus-copy className="focus-copy">
                <span className="u-display focus-name">{project.title}</span>
                {/* Static CTA — stands in wherever no cursor trails:
                    phones, keyboards, reduced motion, no JS. */}
                <span className="focus-view">
                  <span aria-hidden="true" className="focus-spark">
                    ✦
                  </span>
                  <span className="gx-mono u-link">{t("view")}</span>
                </span>
                <span className="focus-foot">
                  <span className="gx-mono focus-meta">{project.meta}</span>
                  <span aria-hidden="true" className="focus-divider" />
                  <span className="focus-desc">{project.description}</span>
                </span>
              </span>

              {/* The panel IS the link: hover opens it, click travels. */}
              <Link
                data-focus-link
                href={`/gallery/${project.slug}`}
                className="focus-hit"
                aria-label={`${t("view")}: ${project.title}`}
              />
            </li>
          ))}
        </ul>

        {/* The cursor-trailing chip, positioned by quickTo. */}
        <span data-focus-float aria-hidden="true" className="focus-float">
          <span className="focus-spark">✦</span>
          <span className="gx-mono">{t("view")}</span>
        </span>

        <span className="gx-mono focus-counter" aria-hidden="true">
          {String(Math.max(active, page) + 1).padStart(2, "0")} /{" "}
          {String(projects.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
