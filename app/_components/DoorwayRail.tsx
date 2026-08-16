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
import { DUR, EASE, SCRUB, STAGGER, smoothstep } from "@/lib/motion";

/*
 * THE DOORWAYS — a pinned rail whose axis is DEPTH.
 *
 * The panorama this replaces walked sideways. This one walks FORWARD.
 * Five planes stand in a line receding from the camera: the title, the
 * three collections, the founder's quote. Scrolling dollies the whole
 * corridor toward the visitor, so each plane starts as a small lit
 * aperture far off, grows until it fills the frame — the moment you
 * cross its threshold, and the moment its copy is readable — then keeps
 * growing past the camera and out of the frame as the next one arrives
 * behind it. You do not scroll past the rooms; you walk into them.
 *
 * WHY NO CSS 3D. `perspective` + `translateZ` is the obvious build and
 * the wrong one here: it forces the whole subtree onto its own 3D
 * rendering context, which on Windows/Chrome resamples every photograph
 * per frame, and it gives no honest control over when a plane should
 * stop being painted. A dolly is just an EXPONENTIAL SCALE — a plane one
 * step further away is `DEPTH` times smaller — so the same optics come
 * out of `scale` and `opacity` alone, which are the two properties the
 * compositor can carry for free.
 *
 * ONE FUNCTION OWNS THE FRAME. `layout()` maps scroll progress to every
 * plane's scale, opacity and copy state in one pass. Splitting that
 * across per-plane tweens would mean fifteen ScrollTriggers racing over
 * shared z-order, and the seam between two planes is exactly where that
 * would show.
 *
 * DEGRADES TO A PAGE. The corridor exists only under desktop + motion +
 * JavaScript (the `.door-on` class). The base DOM is a plain vertical
 * document — title block, three linked cards, quote — which is what
 * phones, reduced motion, crawlers and no-JS get.
 */

export type DoorProject = {
  slug: string;
  title: string;
  description: string;
  /** Monospace craft row, shown bracketed: "[ 27 photographs · 2026 ]". */
  meta: string;
  coverUrl: string;
  coverAlt: string;
};

export type DoorQuote = {
  text: string;
  attribution: string;
  /** Optional press/client mark; the wordmark stands in when absent. */
  logoUrl?: string;
};

/*
 * THE OPTICS.
 *
 * `DEPTH` is the scale ratio between neighbouring planes — how much
 * bigger a room gets when you take one step toward it. 2.6 is the value
 * where the corridor reads as deep without the far plane collapsing to
 * an illegible chip.
 *
 * The windows below are in PLANE-STEPS of `u`, the signed distance from
 * the camera: u < 0 is ahead of you, u = 0 is the threshold, u > 0 is
 * behind you. They are deliberately asymmetric — a room is visible from
 * far off as you approach and leaves quickly once you are through it,
 * which is how walking works.
 */
const DEPTH = 2.6;
/** Plane opacity: fades up across `in`, holds, fades out across `out`. */
const VISIBLE = { in: [-2.1, -1.15], out: [0.4, 0.95] } as const;
/** Copy is readable only near the threshold — sooner than the plane. */
const READABLE = { in: [-1.05, -0.5], out: [0.05, 0.42] } as const;
/** How far the copy drifts, in px, across its own fade. */
const COPY_DRIFT = 40;
/** Scroll length of the pin. Five stops need room to breathe. */
const PIN_DISTANCE = "+=520%";

const SCENES = {
  opening: IMAGES.portfolio15,
  closing: IMAGES.portfolio02,
} as const;

/** Rising ramp across [a, b], smoothstepped and clamped. */
function ramp(x: number, a: number, b: number): number {
  return smoothstep((x - a) / (b - a));
}

export default function DoorwayRail({
  projects,
  quote,
}: {
  projects: DoorProject[];
  quote: DoorQuote;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("panorama");
  const tFeatured = useTranslations("featured");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      if (!root) return;

      const pin = root.querySelector<HTMLElement>("[data-door-pin]");
      const rule = root.querySelector<HTMLElement>("[data-door-rule]");
      const readout = root.querySelector<HTMLElement>("[data-door-num]");
      const planes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-door-plane]"),
      );
      if (!pin || planes.length === 0) return;

      const mm = gsap.matchMedia();

      /* -------- The corridor: desktop + motion + JS only. -------- */
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          root.classList.add("door-on");

          const last = planes.length - 1;
          /* One stop per plane, each where that plane sits at the
           * threshold. Snapping to these is what makes the corridor feel
           * like rooms rather than a continuous zoom. */
          const stops = planes.map((_, i) => i / last);

          const copies = planes.map((plane) =>
            plane.querySelector<HTMLElement>("[data-door-copy]"),
          );

          /*
           * Nearer planes paint over farther ones, and the order never
           * changes — plane 0 is always the one closest to the camera —
           * so z-index is set once rather than per frame.
           */
          planes.forEach((plane, i) => {
            gsap.set(plane, { zIndex: planes.length - i });
          });

          const state = { p: 0 };

          const layout = () => {
            const travelled = state.p * last;
            planes.forEach((plane, i) => {
              /* Signed distance from the camera, in plane-steps. */
              const u = travelled - i;
              const visible =
                ramp(u, VISIBLE.in[0], VISIBLE.in[1]) *
                (1 - ramp(u, VISIBLE.out[0], VISIBLE.out[1]));
              gsap.set(plane, {
                scale: Math.pow(DEPTH, u),
                autoAlpha: visible,
              });

              const copy = copies[i];
              if (!copy) return;
              const read =
                ramp(u, READABLE.in[0], READABLE.in[1]) *
                (1 - ramp(u, READABLE.out[0], READABLE.out[1]));
              gsap.set(copy, {
                autoAlpha: read,
                /* Rises to meet you, then continues past — the copy is
                 * travelling with the room, not pinned to the screen. */
                y: (1 - read) * COPY_DRIFT * (u < 0 ? 1 : -1),
                /* Undo the plane's own scale so type is the same size at
                 * every threshold; without this the far rooms' copy is
                 * rendered at a third scale and reads as a different
                 * typeface. */
                scale: 1 / Math.pow(DEPTH, u),
              });
            });

            if (rule) gsap.set(rule, { scaleX: state.p });
            if (readout) {
              const n = Math.min(last, Math.round(travelled)) + 1;
              const label = String(n).padStart(2, "0");
              if (readout.textContent !== label) readout.textContent = label;
            }
          };

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: PIN_DISTANCE,
              pin: true,
              scrub: SCRUB.pinned,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              snap: { snapTo: stops, duration: 0.4, ease: "power1.inOut" },
            },
          });
          tl.to(state, {
            p: 1,
            ease: EASE.none,
            duration: 1,
            onUpdate: layout,
          });
          layout();

          /*
           * Arrow keys walk the corridor, and focusing a room walks to
           * it. The move is a synthetic wheel burst so Lenis stays the
           * one scroller — writing scrollTop directly desyncs its
           * virtual position.
           */
          const st = tl.scrollTrigger!;
          const wheelTo = (index: number) => {
            const target = Math.min(last, Math.max(0, index));
            const delta = (stops[target] - st.progress) * (st.end - st.start);
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
            stops.reduce(
              (best, p, i) =>
                Math.abs(p - st.progress) < Math.abs(stops[best] - st.progress)
                  ? i
                  : best,
              0,
            );
          const onKey = (e: KeyboardEvent) => {
            if (!st.isActive) return;
            /* Both axes: the motion reads as forward, but the corridor
             * is walked with the same keys as any other rail. */
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              wheelTo(nearest() + 1);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              wheelTo(nearest() - 1);
            }
          };
          window.addEventListener("keydown", onKey);

          const focusHandlers = planes.map((plane, i) => {
            const onFocus = () => wheelTo(i);
            plane.addEventListener("focusin", onFocus);
            return onFocus;
          });

          return () => {
            root.classList.remove("door-on");
            window.removeEventListener("keydown", onKey);
            planes.forEach((plane, i) =>
              plane.removeEventListener("focusin", focusHandlers[i]),
            );
            /* The corridor's inline transforms have no meaning in the
             * stacked layout this reverts to. */
            planes.forEach((plane) => gsap.set(plane, { clearProps: "all" }));
            copies.forEach((copy) => {
              if (copy) gsap.set(copy, { clearProps: "all" });
            });
          };
        },
      );

      /* -------- The vertical page: phones with motion. -------- */
      mm.add(
        "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        () => {
          planes.forEach((plane) => {
            gsap.from(
              plane.querySelectorAll("[data-door-bit], h2, h3"),
              {
                y: 30,
                opacity: 0,
                duration: DUR.base,
                ease: EASE.out,
                stagger: STAGGER.items,
                scrollTrigger: {
                  trigger: plane,
                  start: "top 82%",
                  toggleActions: "play none none none",
                },
              },
            );
          });
        },
      );

      /* -------- Reduced motion, any width: 0.3s fades only. -------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        planes.forEach((plane) => {
          gsap.from(plane, {
            opacity: 0,
            duration: 0.3,
            ease: EASE.none,
            scrollTrigger: {
              trigger: plane,
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
      className="door"
    >
      <div data-door-pin className="door-pin">
        <div className="door-stage">
          {/* Plane 1 — the threshold you are standing at. */}
          <header data-door-plane className="door-plane door-head">
            <span aria-hidden="true" className="door-aperture">
              <Image
                src={src(SCENES.opening, 1800)}
                alt=""
                fill
                sizes="(min-width: 768px) 70vw, 100vw"
                preload
                className="object-cover"
              />
            </span>
            <div data-door-copy className="door-copy">
              <p
                data-door-bit
                className="u-eyebrow u-eyebrow--plain door-eyebrow"
              >
                {t("eyebrow")}
              </p>
              <h2
                id="panorama-title"
                data-door-bit
                className="u-display door-giant"
              >
                {t("title")}
              </h2>
              <p data-door-bit className="door-intro">
                {t("intro")}
              </p>
            </div>
          </header>

          {/* Planes 2–4 — the rooms. Each one is its own link. */}
          {projects.map((project) => (
            <article
              key={project.slug}
              data-door-plane
              className="door-plane door-room"
            >
              <span aria-hidden="true" className="door-aperture">
                <Image
                  src={project.coverUrl}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 70vw, 92vw"
                  className="object-cover"
                />
              </span>
              <div data-door-copy className="door-copy">
                <h3 data-door-bit className="u-display door-room-title">
                  {project.title}
                </h3>
                <p data-door-bit className="door-room-desc">
                  {project.description}
                </p>
                <span data-door-bit className="gx-mono door-room-meta">
                  [ {project.meta} ]
                </span>
                <span data-door-bit className="door-room-view">
                  <span aria-hidden="true" className="focus-spark">
                    ✦
                  </span>
                  <span className="gx-mono u-link">{tFeatured("view")}</span>
                </span>
              </div>
              <Link
                href={`/gallery/${project.slug}`}
                className="door-hit"
                aria-label={`${tFeatured("view")}: ${project.title} — ${
                  project.coverAlt
                }`}
              />
            </article>
          ))}

          {/* Plane 5 — the room at the end of the corridor. */}
          <figure data-door-plane className="door-plane door-quote">
            <span aria-hidden="true" className="door-aperture">
              <Image
                src={src(SCENES.closing, 1800)}
                alt=""
                fill
                sizes="(min-width: 768px) 70vw, 100vw"
                className="object-cover"
              />
            </span>
            <div data-door-copy className="door-copy">
              {quote.logoUrl ? (
                <Image
                  src={quote.logoUrl}
                  alt=""
                  width={120}
                  height={40}
                  className="door-quote-logo"
                />
              ) : (
                <span data-door-bit className="door-quote-mark">
                  {SITE.wordmark}
                </span>
              )}
              <blockquote data-door-bit className="u-display door-quote-text">
                {quote.text}
              </blockquote>
              <figcaption data-door-bit className="gx-mono door-quote-attr">
                {quote.attribution}
              </figcaption>
            </div>
          </figure>
        </div>

        {/* How far down the corridor you are. */}
        <div data-door-progress aria-hidden="true" className="door-progress">
          <span data-door-num className="gx-mono door-num">
            01
          </span>
          <span className="door-track">
            <span data-door-rule className="door-rule" />
          </span>
          <span className="gx-mono door-num">
            {String(projects.length + 2).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
