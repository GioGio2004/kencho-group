"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { EASE, SCRUB } from "@/lib/motion";

/*
 * SERVICES REEL — the workshop footage running as the PRIMARY
 * BACKGROUND for the entire section, never stopping, and nothing over
 * it but TYPE. One pinned scrub, three beats:
 *
 *   BEAT I    the section title at poster size, with a small meta
 *             line above it — text straight on the film.
 *   BEAT II   the four services take turns as a single large term
 *             and one sentence each; a dash fills per turn and a
 *             "1 / 4" counter walks along underneath.
 *   BEAT III  the close — the statement and the invitation, and the
 *             film is still running behind the words.
 *
 * Default DOM (no JS, reduced motion, crawlers) is an ordinary
 * vertical section: the footage's poster, the meta line, the title,
 * the four services as a readable list, the statement, the link.
 * `.reel-on` (added only by the GSAP context) recomposes the SAME
 * elements into the pinned scene — nothing duplicated, nothing hidden
 * from the server HTML.
 *
 * Playback is gated by an IntersectionObserver — the video runs only
 * while the section is on stage, and never for reduced-motion
 * visitors. Phones get the 960px encode.
 */

const VIDEO_SRC = "/video/workshop-reel.mp4"; // 1080p, ~9 MB
const VIDEO_SRC_MOBILE = "/video/workshop-reel-mobile.mp4"; // 960px, ~2.6 MB

/** The four turns, in the services' own order. */
const SLIDES = ["kitchens", "wardrobes", "paneling", "commercial"] as const;

/** Scrub windows, as fractions of the pin. */
const ACT = {
  titleIn: [0.02, 0.12],
  titleOut: [0.2, 0.28],
  slides: [0.32, 0.78],
  slidesOut: [0.78, 0.84],
  closeIn: [0.86, 0.96],
} as const;

export default function ServicesReel() {
  const t = useTranslations("reel");
  const tServices = useTranslations("services");

  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  /* Footage plays only while the section is on stage, and only for
   * visitors who have not asked for reduced motion. The source is
   * picked here rather than in the markup — phones get the 960px
   * encode at less than a third of the bytes. */
  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    video.src = window.matchMedia("(max-width: 767px)").matches
      ? VIDEO_SRC_MOBILE
      : VIDEO_SRC;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {
            /* Autoplay can be refused; the poster stands in. */
          });
        } else {
          video.pause();
        }
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      const pin = pinRef.current;
      const count = countRef.current;
      if (!root || !pin) return;

      const q = gsap.utils.selector(root);
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

          root.classList.add("reel-on");

          const meta = q(".reel-meta")[0];
          const title = q(".reel-title")[0];
          const slides = q(".reel-slide");
          const dashes = q(".reel-dash");
          const dashRow = q(".reel-dashes")[0];
          const countRow = q(".reel-count")[0];
          const close = q(".reel-close")[0];
          const cta = q(".reel-cta")[0];

          const span = (w: readonly [number, number]) => w[1] - w[0];

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: compact ? "+=280%" : "+=340%",
              pin: true,
              scrub: SCRUB.pinned,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          /* BEAT I — the title, straight on the film. */
          tl.fromTo(
            [meta, title],
            { autoAlpha: 0, y: compact ? 50 : 90 },
            {
              autoAlpha: 1,
              y: 0,
              duration: span(ACT.titleIn),
              ease: EASE.none,
              stagger: 0.015,
            },
            ACT.titleIn[0],
          ).to(
            [meta, title],
            {
              autoAlpha: 0,
              y: compact ? -40 : -70,
              duration: span(ACT.titleOut),
              ease: EASE.none,
              stagger: 0.01,
            },
            ACT.titleOut[0],
          );

          /* BEAT II — the four terms, one at a time. The dash rail
           * and counter arrive with the first and stand still while
           * the words swap over the footage. */
          if (dashRow && countRow) {
            tl.fromTo(
              [dashRow, countRow],
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.04, ease: EASE.none },
              ACT.slides[0] - 0.02,
            );
          }

          const window = span(ACT.slides) / SLIDES.length;
          SLIDES.forEach((_, i) => {
            const at = ACT.slides[0] + window * i;

            if (slides[i]) {
              tl.fromTo(
                slides[i],
                { autoAlpha: 0, y: 44 },
                { autoAlpha: 1, y: 0, duration: window * 0.28, ease: EASE.none },
                at,
              );
              if (i < SLIDES.length - 1) {
                tl.to(
                  slides[i],
                  { autoAlpha: 0, y: -36, duration: window * 0.2, ease: EASE.none },
                  at + window * 0.8,
                );
              }
            }

            /* This turn's dash draws itself across its own window. */
            if (dashes[i]) {
              tl.to(
                dashes[i],
                { scaleX: 1, duration: window, ease: EASE.none },
                at,
              );
            }
          });

          /* The last term and the rail leave together. */
          tl.to(
            [slides[SLIDES.length - 1], dashRow, countRow].filter(Boolean),
            {
              autoAlpha: 0,
              y: -36,
              duration: span(ACT.slidesOut),
              ease: EASE.none,
            },
            ACT.slidesOut[0],
          );

          /* BEAT III — the close, over the still-running film. */
          tl.fromTo(
            close,
            { autoAlpha: 0, y: compact ? 60 : 100 },
            { autoAlpha: 1, y: 0, duration: span(ACT.closeIn), ease: EASE.none },
            ACT.closeIn[0],
          );

          if (cta) {
            tl.fromTo(
              cta,
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: span(ACT.closeIn) * 0.4, ease: EASE.none },
              ACT.closeIn[0] + span(ACT.closeIn) * 0.55,
            );
          }

          /* The odometer follows the scrub, not the timeline — a text
           * swap has no tween to reverse, so it is derived instead. */
          const st = tl.scrollTrigger!;
          let shown = 0;
          const tick = ScrollTrigger.create({
            trigger: pin,
            start: "top top",
            end: st.vars.end as string,
            onUpdate: (self) => {
              if (!count) return;
              const p = self.progress;
              const i = gsap.utils.clamp(
                0,
                SLIDES.length - 1,
                Math.floor(
                  ((p - ACT.slides[0]) / span(ACT.slides)) * SLIDES.length,
                ),
              );
              if (i !== shown) {
                shown = i;
                count.textContent = String(i + 1);
                gsap.fromTo(
                  count,
                  { y: 10, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.3, ease: EASE.out },
                );
              }
            },
          });

          return () => {
            tick.kill();
            root.classList.remove("reel-on");
          };
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      id="services"
      ref={rootRef}
      data-thread-anchor=""
      aria-labelledby="services-title"
      className="reel relative bg-charcoal text-bone"
    >
      <div ref={pinRef} className="reel-pin relative">
        {/* The primary background — the footage, live the whole way.
            The poster is the film's own first frame, so the moment
            playback starts nothing visibly changes. */}
        <div className="reel-video-wrap">
          {/* No <source> in the markup: the effect above assigns the
              right encode for the screen, and without JS the video
              could never autoplay anyway — the poster is the fallback. */}
          <video
            ref={videoRef}
            className="reel-video"
            muted
            loop
            playsInline
            preload="metadata"
            poster="/video/workshop-reel-poster.jpg"
            aria-label={t("videoAlt")}
          />
          <div aria-hidden="true" className="reel-scrim" />
        </div>

        {/* BEAT I — the meta line and the title, type on film. */}
        <p className="reel-meta gx-mono text-[0.6875rem] tracking-[0.22em] uppercase">
          {t("caption")}
        </p>
        <h2 id="services-title" className="reel-title u-display">
          {tServices("title")}
        </h2>

        {/* BEAT II — the four terms. Without JS the articles read as
            a plain vertical list. */}
        <div className="reel-stage">
          {SLIDES.map((slide) => (
            <article key={slide} className="reel-slide">
              <h3 className="reel-slide-term u-display">
                {tServices(`items.${slide}.name`)}
              </h3>
              <p className="reel-slide-line">
                {tServices(`items.${slide}.line`)}
              </p>
            </article>
          ))}

          {/* One dash per turn, filling as the scrub walks the four —
              the rail stands still while the words swap above it. */}
          <div aria-hidden="true" className="reel-dashes">
            {SLIDES.map((slide) => (
              <span key={slide} className="reel-dash" />
            ))}
          </div>
          <div aria-hidden="true" className="reel-count gx-mono text-[0.75rem]">
            <span ref={countRef}>1</span>
            <span className="opacity-60">/ {SLIDES.length}</span>
          </div>
        </div>

        {/* BEAT III — the close, type on film. Without JS: the
            statement and the link, in the flow. */}
        <div className="reel-close">
          <p className="u-display reel-close-a text-[clamp(1.1rem,2.2vw,1.7rem)] opacity-60">
            {t("statementA")}
          </p>
          <p className="u-display mt-3 max-w-[30ch] text-[clamp(1.4rem,3.6vw,2.8rem)] leading-[1.2]!">
            {t("statementB")}
          </p>
          <a
            href="#contact"
            className="reel-cta u-press mt-8 inline-flex items-center gap-2 text-[0.6875rem] tracking-[0.18em] uppercase"
          >
            {tServices("cta")} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
