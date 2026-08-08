"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import { DUR, EASE, STAGGER } from "@/lib/motion";

/*
 * PANORAMA RAIL — Combo 12, the pinned horizontal journey.
 *
 * Four viewport-heights of scroll become one lateral walk. Two tracks
 * share the scrub: three full-bleed scenes slide slowly underneath
 * (100vw each, seamless — no cuts, the neighbour always entering as
 * the current one leaves) while the content track travels 1.625×
 * faster over them, which is the whole depth illusion. Five stops,
 * snapped: the title scene, three floating project cards over the
 * macro texture, and a full-bleed quote to close. A hairline at the
 * bottom is the journey's progress.
 *
 * Stops sit at progress 0 / 0.285 / 0.5 / 0.715 / 1 of a 400%-height
 * pin. Arrow keys walk the stops while pinned (as a synthetic wheel
 * burst, so Lenis stays the one scroller); focusing a card walks to
 * it the same way.
 *
 * The horizontal layout exists only under (min-width: 768px) AND
 * motion-ok AND JavaScript (a .pano-on class the GSAP context adds).
 * Everything else — phones, reduced motion, no JS, crawlers — reads
 * the same DOM as a vertical page: title block, cards, quote, each
 * with its scene as a cover image. Only transforms ride the scrub.
 */

export type PanoProject = {
  slug: string;
  title: string;
  description: string;
  /** Monospace craft row, shown bracketed: "[ 27 photographs · 2026 ]". */
  meta: string;
  coverUrl: string;
  coverAlt: string;
};

export type PanoQuote = {
  text: string;
  attribution: string;
  /** Optional press/client mark; the wordmark stands in when absent. */
  logoUrl?: string;
};

/* Geometry (vw units). Content: title 100 · gap 15 · three cards of 55
 * with 15 gaps · gap 15 · quote 100 → track 425, travel 325.
 * Background: three 100vw scenes → track 300, travel 200.
 * Ratio 325/200 = 1.625 — the spec'd ~1.6× parallax. */
const CONTENT_TRACK = 425;
const CONTENT_TRAVEL = 325;
const BG_TRACK = 300;
const BG_TRAVEL = 200;
/* Stop centres as progress through the travel. */
export const PANO_STOPS = [0, 92.5 / 325, 162.5 / 325, 232.5 / 325, 1];
const PIN_DISTANCE = "+=400%";

const SCENES = [
  { image: IMAGES.portfolio15, preload: true },
  { image: IMAGES.textureFluted, preload: false },
  { image: IMAGES.portfolio02, preload: false },
] as const;

export default function PanoramaRail({
  projects,
  quote,
}: {
  projects: PanoProject[];
  quote: PanoQuote;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("panorama");
  const tFeatured = useTranslations("featured");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;

      const pin = root.querySelector<HTMLElement>("[data-pano-pin]");
      const bg = root.querySelector<HTMLElement>("[data-pano-bg]");
      const track = root.querySelector<HTMLElement>("[data-pano-track]");
      const rule = root.querySelector<HTMLElement>("[data-pano-rule]");
      const stops = Array.from(
        root.querySelectorAll<HTMLElement>("[data-pano-stop]"),
      );
      const cards = Array.from(
        root.querySelectorAll<HTMLElement>("[data-pano-card]"),
      );
      if (!pin || !bg || !track) return;

      const mm = gsap.matchMedia();

      /* -------- The journey: desktop + motion + JS only. -------- */
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          root.classList.add("pano-on");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: PIN_DISTANCE,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              snap: {
                snapTo: PANO_STOPS,
                duration: 0.4,
                ease: "power1.inOut",
              },
            },
          });
          tl.fromTo(
            track,
            { xPercent: 0 },
            {
              xPercent: -(CONTENT_TRAVEL / CONTENT_TRACK) * 100,
              ease: EASE.none,
              duration: 1,
            },
            0,
          )
            .fromTo(
              bg,
              { xPercent: 0 },
              {
                xPercent: -(BG_TRAVEL / BG_TRACK) * 100,
                ease: EASE.none,
                duration: 1,
              },
              0,
            )
            .fromTo(
              rule,
              { scaleX: 0 },
              { scaleX: 1, ease: EASE.none, duration: 1 },
              0,
            );

          /* Per-card micro-entrance as it crosses the viewport —
           * subtle on purpose; the rail itself is the show. */
          cards.forEach((card) => {
            const bits = Array.from(
              card.querySelectorAll<HTMLElement>("[data-pano-bit]"),
            );
            gsap.from(card, {
              y: 30,
              opacity: 0.85,
              duration: DUR.base,
              ease: EASE.out,
              scrollTrigger: {
                trigger: card,
                containerAnimation: tl,
                start: "left 72%",
                toggleActions: "play none none reverse",
              },
            });
            if (bits.length) {
              gsap.from(bits, {
                y: 16,
                opacity: 0,
                duration: 0.6,
                ease: EASE.out,
                stagger: 0.06,
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: tl,
                  start: "left 66%",
                  toggleActions: "play none none reverse",
                },
              });
            }
          });

          /* Arrow keys (and card focus) walk the stops. The move is a
           * synthetic wheel burst so Lenis remains the only scroller —
           * writing scrollTop directly desyncs its virtual position. */
          const st = tl.scrollTrigger!;
          const wheelTo = (stopIndex: number) => {
            const target = Math.min(
              PANO_STOPS.length - 1,
              Math.max(0, stopIndex),
            );
            const delta = (PANO_STOPS[target] - st.progress) * (st.end - st.start);
            if (Math.abs(delta) < 2) return;
            window.dispatchEvent(
              new WheelEvent("wheel", {
                deltaY: delta,
                bubbles: true,
                cancelable: true,
              }),
            );
          };
          const nearest = () =>
            PANO_STOPS.reduce(
              (best, p, i) =>
                Math.abs(p - st.progress) < Math.abs(PANO_STOPS[best] - st.progress)
                  ? i
                  : best,
              0,
            );
          const onKey = (e: KeyboardEvent) => {
            if (!st.isActive) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              wheelTo(nearest() + 1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              wheelTo(nearest() - 1);
            }
          };
          window.addEventListener("keydown", onKey);

          const focusHandlers = cards.map((card, i) => {
            const onFocus = () => wheelTo(i + 1);
            card.addEventListener("focusin", onFocus);
            return onFocus;
          });

          return () => {
            root.classList.remove("pano-on");
            window.removeEventListener("keydown", onKey);
            cards.forEach((card, i) =>
              card.removeEventListener("focusin", focusHandlers[i]),
            );
          };
        },
      );

      /* -------- The vertical page: phones with motion. -------- */
      mm.add(
        "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        () => {
          stops.forEach((stop) => {
            gsap.from(stop.querySelectorAll("[data-pano-bit], h2, h3"), {
              y: 30,
              opacity: 0,
              duration: DUR.base,
              ease: EASE.out,
              stagger: STAGGER.items,
              scrollTrigger: {
                trigger: stop,
                start: "top 82%",
                toggleActions: "play none none none",
              },
            });
          });
        },
      );

      /* -------- Reduced motion, any width: 0.3s fades only. -------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        stops.forEach((stop) => {
          gsap.from(stop, {
            opacity: 0,
            duration: 0.3,
            ease: EASE.none,
            scrollTrigger: {
              trigger: stop,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      id="panorama"
      ref={rootRef}
      aria-labelledby="panorama-title"
      className="pano"
    >
      <div data-pano-pin className="pano-pin">
        {/* LAYER 1 — the scenes, sliding slowly underneath. */}
        <div data-pano-bg aria-hidden="true" className="pano-bg">
          {SCENES.map((scene) => (
            <div key={scene.image.file} className="pano-scene">
              <Image
                src={src(scene.image, 2000)}
                alt=""
                fill
                sizes="(min-width: 768px) 110vw, 100vw"
                preload={scene.preload}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* LAYER 2 — the content track, 1.625× faster. */}
        <div data-pano-track className="pano-track">
          {/* Stop 1 — the title scene. */}
          <header data-pano-stop className="pano-stop pano-head">
            <div aria-hidden="true" className="pano-mbg">
              <Image
                src={src(SCENES[0].image, 1200)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <p data-pano-bit className="u-eyebrow u-eyebrow--plain pano-eyebrow">
              {t("eyebrow")}
            </p>
            <h2 id="panorama-title" data-pano-bit className="u-display pano-giant">
              {t("title")}
            </h2>
            <p data-pano-bit className="pano-intro">
              {t("intro")}
            </p>
          </header>

          {/* Stops 2–4 — the floating cards. */}
          {projects.map((project) => (
            <article
              key={project.slug}
              data-pano-stop
              data-pano-card
              className="pano-stop pano-card"
            >
              <h3 data-pano-bit className="u-display pano-card-title">
                {project.title}
              </h3>
              <p data-pano-bit className="pano-card-desc">
                {project.description}
              </p>
              <span data-pano-bit className="pano-card-view">
                <span aria-hidden="true" className="focus-spark">
                  ✦
                </span>
                <span className="gx-mono u-link">{tFeatured("view")}</span>
              </span>
              <span data-pano-bit className="pano-card-photo">
                <Image
                  src={project.coverUrl}
                  alt={project.coverAlt}
                  fill
                  sizes="(min-width: 768px) 55vw, 92vw"
                  className="object-cover"
                />
              </span>
              <span data-pano-bit className="gx-mono pano-card-meta">
                [ {project.meta} ]
              </span>
              <Link
                href={`/gallery/${project.slug}`}
                className="pano-hit"
                aria-label={`${tFeatured("view")}: ${project.title}`}
              />
            </article>
          ))}

          {/* Stop 5 — the quote scene. */}
          <figure data-pano-stop className="pano-stop pano-quote">
            <div aria-hidden="true" className="pano-mbg">
              <Image
                src={src(SCENES[2].image, 1200)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
            {quote.logoUrl ? (
              <Image
                src={quote.logoUrl}
                alt=""
                width={120}
                height={40}
                className="pano-quote-logo"
              />
            ) : (
              <span data-pano-bit className="pano-quote-mark">
                {SITE.wordmark}
              </span>
            )}
            <blockquote data-pano-bit className="u-display pano-quote-text">
              {quote.text}
            </blockquote>
            <figcaption data-pano-bit className="gx-mono pano-quote-attr">
              {quote.attribution}
            </figcaption>
          </figure>
        </div>

        {/* The journey's progress. */}
        <span data-pano-rule aria-hidden="true" className="pano-rule" />
      </div>
    </section>
  );
}
