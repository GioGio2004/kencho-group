"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import { GREETING_REVEAL_EVENT } from "@/lib/greeting";
import type { Locale } from "@/i18n/routing";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const photographs = [IMAGES.heroMain, IMAGES.heroOak, IMAGES.heroGreen];
const chapterPositions = [0.27, 0.56, 0.86];

const HOTSPOTS: Record<
  number,
  { x: string; y: string; label: Record<Locale, string> }[]
> = {
  0: [
    {
      x: "62%",
      y: "66%",
      label: {
        en: "01 · Fluted Walnut Island",
        ka: "01 · კაკლის რელიეფური კუნძული",
        ru: "01 · Рифлёный остров из ореха",
      },
    },
    {
      x: "48%",
      y: "36%",
      label: {
        en: "02 · Crown-Cut Walnut Veneer",
        ka: "02 · ნატურალური კაკლის შპონი",
        ru: "02 · Шпон американского ореха",
      },
    },
  ],
  1: [
    {
      x: "56%",
      y: "44%",
      label: {
        en: "01 · Solid White Oak Fluting",
        ka: "01 · მუხის მასიური პროფილი",
        ru: "01 · Рифлёный массив дуба",
      },
    },
    {
      x: "72%",
      y: "62%",
      label: {
        en: "02 · Shadow-Gap Joinery",
        ka: "02 · ზუსტი შეერთების დეტალი",
        ru: "02 · Теневой шов и столярка",
      },
    },
  ],
  2: [
    {
      x: "44%",
      y: "48%",
      label: {
        en: "01 · Matte Forest Lacquer",
        ka: "01 · გლუვი მწვანე ემალი",
        ru: "01 · Матовая эмаль глубокого тона",
      },
    },
    {
      x: "66%",
      y: "68%",
      label: {
        en: "02 · Monolithic Stone Island",
        ka: "02 · ქვის მონოლითური ზედაპირი",
        ru: "02 · Монолитный каменный остров",
      },
    },
  ],
};

/** A photograph-led ERA-inspired arch portal opening. Native sticky positioning also works without GSAP. */
export default function Arrival() {
  const t = useTranslations("home.arrival");
  const locale = useLocale() as Locale;
  const root = useRef<HTMLElement>(null);
  const journey = useRef<gsap.core.Timeline | null>(null);
  const current = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [openSpot, setOpenSpot] = useState<string | null>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const media = gsap.matchMedia();

      const observer = new IntersectionObserver(
        ([entry]) => {
          section.dataset.inView = String(entry.isIntersecting);
        },
        { rootMargin: "-90px 0px 0px 0px" },
      );
      observer.observe(section);

      media.add(
        {
          mobile: "(max-width: 767px)",
          desktop: "(min-width: 768px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          if (!context.conditions?.motion) return;
          section.dataset.motion = "true";
          const select = gsap.utils.selector(section);
          const portal = select(".arrival-portal");
          const scenes = select(".arrival-scene");
          const photos = select(".arrival-photo");
          const captions = select(".arrival-caption");
          const bars = select(".arrival-chapter-fill");
          const counter = select(".arrival-current");
          const mobile = context.conditions.mobile;

          gsap.set(scenes.slice(1), { autoAlpha: 0, clipPath: "inset(0 0 0 100%)" });
          gsap.set(captions, { autoAlpha: 0, y: 20 });
          gsap.set(bars, { scaleX: 0, transformOrigin: "left center" });

          const entrance = gsap
            .timeline({
              defaults: { ease: "power3.out" },
              paused: Boolean(document.documentElement.dataset.greeting),
            })
            .from(".arrival-letter", {
              yPercent: 110,
              rotationX: -55,
              transformOrigin: "50% 100%",
              duration: 1.35,
              stagger: 0.055,
            })
            .from(".arrival-group", { opacity: 0, x: -18, duration: 0.8 }, 0.45)
            .from(
              ".arrival-lead-rule, .arrival-lead h2, .arrival-lead > p, .arrival-topline > span, .arrival-footer",
              {
                opacity: 0,
                y: 16,
                duration: 0.9,
                stagger: 0.1,
              },
              0.5,
            )
            .from(".arrival-entrance", { opacity: 0, y: 36, duration: 1.25 }, 0.3);
          const revealEntrance = () => {
            entrance.play();
          };
          window.addEventListener(GREETING_REVEAL_EVENT, revealEntrance);

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
            onUpdate() {
              const progress = this.progress();
              const index = progress < 0.45 ? 0 : progress < 0.76 ? 1 : 2;
              if (current.current !== index) {
                current.current = index;
                setChapter(index);
              }
              section.dataset.chapter = String(index);
              bars.forEach((bar, i) => {
                const starts = [0, 0.45, 0.76];
                const ends = [0.45, 0.76, 1];
                const amount = gsap.utils.clamp(
                  0,
                  1,
                  (progress - starts[i]) / (ends[i] - starts[i]),
                );
                gsap.set(bar, { scaleX: amount });
              });
              gsap.set(counter, { yPercent: (-index * 100) / 3 });
            },
          });
          journey.current = timeline;

          timeline
            .to(
              portal,
              {
                left: "0%",
                top: "0%",
                width: "100%",
                height: "100%",
                borderRadius: "0px 0px 0px 0px",
                rotation: 0,
                rotationY: 0,
                duration: 1.5,
                ease: "power2.inOut",
              },
              0.12,
            )
            .to(
              ".arrival-wordmark",
              { y: mobile ? -70 : -150, opacity: 0, duration: 0.85 },
              0.05,
            )
            .to(
              ".arrival-lead, .arrival-topline",
              { y: -35, autoAlpha: 0, duration: 0.65 },
              0.08,
            )
            .to(photos[0], { scale: 1.13, xPercent: -2.5, duration: 2.7 }, 0)
            .to(".arrival-scrim", { opacity: 1, duration: 0.7 }, 0.95)
            .to(captions[0], { autoAlpha: 1, y: 0, duration: 0.5 }, 1.15)
            .to(captions[0], { autoAlpha: 0, y: -18, duration: 0.3 }, 2.5)
            .set(scenes[1], { autoAlpha: 1 }, 2.65)
            .to(
              scenes[1],
              { clipPath: "inset(0 0 0 0%)", duration: 0.7, ease: "power2.inOut" },
              2.65,
            )
            .fromTo(
              photos[1],
              { scale: 1.18, xPercent: 3, rotationY: 8 },
              {
                scale: 1.05,
                xPercent: -2,
                rotationY: 0,
                duration: 1.95,
              },
              2.65,
            )
            .to(captions[1], { autoAlpha: 1, y: 0, duration: 0.5 }, 3.1)
            .to(captions[1], { autoAlpha: 0, y: -18, duration: 0.3 }, 4.5)
            .set(scenes[2], { autoAlpha: 1 }, 4.7)
            .to(
              scenes[2],
              { clipPath: "inset(0 0 0 0%)", duration: 0.7, ease: "power2.inOut" },
              4.7,
            )
            .fromTo(
              photos[2],
              { scale: 1.16, xPercent: -3, rotationY: -7 },
              {
                scale: 1,
                xPercent: 0,
                rotationY: 0,
                duration: 1.8,
              },
              4.7,
            )
            .to(captions[2], { autoAlpha: 1, y: 0, duration: 0.5 }, 5.15)
            .to(".arrival-continue", { autoAlpha: 1, y: 0, duration: 0.4 }, 5.5)
            .to({}, { duration: 0.35 });

          let stopPointer = () => {};
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            const xTo = gsap.quickTo(".arrival-parallax", "x", {
              duration: 0.8,
              ease: "power2.out",
            });
            const yTo = gsap.quickTo(".arrival-parallax", "y", {
              duration: 0.8,
              ease: "power2.out",
            });
            const move = (event: PointerEvent) => {
              xTo((event.clientX / window.innerWidth - 0.5) * -16);
              yTo((event.clientY / window.innerHeight - 0.5) * -12);
            };
            const reset = () => {
              xTo(0);
              yTo(0);
            };
            section.addEventListener("pointermove", move);
            section.addEventListener("pointerleave", reset);
            stopPointer = () => {
              section.removeEventListener("pointermove", move);
              section.removeEventListener("pointerleave", reset);
              xTo.tween.kill();
              yTo.tween.kill();
            };
          }

          let live = true;
          document.fonts.ready.then(() => {
            if (live) ScrollTrigger.refresh();
          });
          ScrollTrigger.refresh();

          return () => {
            live = false;
            window.removeEventListener(GREETING_REVEAL_EVENT, revealEntrance);
            stopPointer();
            journey.current = null;
            section.dataset.motion = "false";
            current.current = 0;
            setChapter(0);
          };
        },
      );

      return () => {
        observer.disconnect();
        media.revert();
      };
    },
    { scope: root },
  );

  function goToChapter(index: number) {
    const trigger = journey.current?.scrollTrigger;
    if (!trigger) return;
    const top =
      trigger.start + (trigger.end - trigger.start) * chapterPositions[index];
    const lenis = (window as Window & { __lenis?: Lenis }).__lenis;
    if (lenis) lenis.scrollTo(top, { duration: 1.25 });
    else window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <section
      ref={root}
      className="home-arrival"
      aria-labelledby="arrival-heading"
      data-in-view="true"
      data-chapter="0"
    >
      <div className="arrival-sticky">
        <div className="arrival-frame" aria-hidden="true" />
        <div className="arrival-topline">
          <span>{t("eyebrow")}</span>
          <span className="arrival-edition">{t("edition")}</span>
        </div>

        <div className="arrival-head">
          <div className="arrival-wordmark" aria-label={SITE.name}>
            <div className="arrival-letters" aria-hidden="true">
              {SITE.wordmark.split("").map((letter, i) => (
                <span className="arrival-letter" key={i}>
                  {letter}
                </span>
              ))}
            </div>
            <span className="arrival-group" aria-hidden="true">
              {SITE.wordmarkSub}
            </span>
          </div>

          <div className="arrival-lead">
            <span className="arrival-lead-rule" aria-hidden="true" />
            <h2 id="arrival-heading">{t("title")}</h2>
            <p>{t("intro")}</p>
          </div>
        </div>

        <div className="arrival-portal">
          <div className="arrival-entrance">
            <div className="arrival-parallax">
              {photographs.map((photo, i) => (
                <div
                  className="arrival-scene"
                  key={photo.file}
                  aria-hidden={chapter !== i}
                >
                  <Image
                    className="arrival-photo"
                    src={src(photo)}
                    alt={t(`chapters.${i}.alt`)}
                    fill
                    sizes={
                      i === 1
                        ? "(max-width: 767px) 70vh, 100vw"
                        : "(max-width: 767px) 150vh, 100vw"
                    }
                    loading="eager"
                    fetchPriority={i === 0 ? "high" : "low"}
                  />
                  <div className="arrival-hotspots" aria-hidden="true">
                    {(HOTSPOTS[i] ?? []).map((spot, sIdx) => {
                      const id = `${i}-${sIdx}`;
                      return (
                        <div
                          key={id}
                          className="arrival-hotspot"
                          data-open={openSpot === id}
                          style={
                            {
                              "--hx": spot.x,
                              "--hy": spot.y,
                            } as React.CSSProperties
                          }
                          onClick={() =>
                            setOpenSpot((prev) => (prev === id ? null : id))
                          }
                        >
                          <span className="arrival-hotspot-ring">
                            <span className="arrival-hotspot-dot" />
                          </span>
                          <span className="arrival-hotspot-card">
                            {spot.label[locale] ?? spot.label.en}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="arrival-scrim" aria-hidden="true" />
          <div className="arrival-captions">
            {photographs.map((photo, i) => (
              <div
                className="arrival-caption"
                key={photo.file}
                aria-hidden={chapter !== i}
              >
                <p className="arrival-caption-label">
                  0{i + 1} / {t(`chapters.${i}.label`)}
                </p>
                <p className="arrival-caption-title">{t(`chapters.${i}.title`)}</p>
                <p className="arrival-caption-line">{t(`chapters.${i}.line`)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="arrival-footer">
          <a href="#introduction" className="arrival-scroll">
            <span className="arrival-scroll-icon" aria-hidden="true">
              ↓
            </span>
            <span>{t("scroll")}</span>
          </a>
          <div
            className="arrival-chapters"
            role="group"
            aria-label={t("navigation")}
          >
            <span className="arrival-count" aria-hidden="true">
              <span className="arrival-count-window">
                <span className="arrival-current">
                  <span>01</span>
                  <span>02</span>
                  <span>03</span>
                </span>
              </span>
              <span className="arrival-count-total">/ 03</span>
            </span>
            {photographs.map((photo, i) => (
              <button
                type="button"
                className="arrival-chapter"
                key={photo.file}
                aria-label={t("goTo", { chapter: t(`chapters.${i}.label`) })}
                aria-pressed={chapter === i}
                onClick={() => goToChapter(i)}
              >
                <span className="arrival-chapter-track">
                  <span className="arrival-chapter-fill" />
                </span>
              </button>
            ))}
          </div>
          <a href="#work" className="arrival-explore">
            {t("explore")} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <a
          href="#introduction"
          className="arrival-continue"
          aria-label={t("continue")}
        >
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
