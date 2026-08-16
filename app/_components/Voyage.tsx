"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealText from "@/app/_components/RevealText";
import ScrambleText from "@/app/_components/ScrambleText";
import { track } from "@/lib/analytics";
import { IMAGES, src } from "@/lib/images";
import {
  DUR,
  EASE,
  PARALLAX,
  REVEAL_START,
  SCRUB,
  SCRUB_RANGE,
  STAGGER,
} from "@/lib/motion";
import { SITE, whatsappUrl } from "@/lib/site";

/*
 * THE VOYAGE — Q&A, contact and the road between them, told as a journey.
 * =====================================================================
 * Modelled on the reference's flight-map sequence, translated to what
 * this company actually does: the flight from Cape Town to the ice
 * becomes the road a piece of furniture travels from the workshop to
 * the visitor's home.
 *
 * Three scenes in one section:
 *
 *   I    THE DRIFT — a dark photograph with the route-codes TBS — HOME
 *        ghosted across it, layers parting slightly as it passes.
 *        ScrollFX attributes only; nothing here ships script.
 *   II   THE COORDINATES — a dashed rule with the workshop's real
 *        position at one end and "your address" at the other, the title
 *        centred under it.
 *   III  THE MAP — a dark canvas where an SVG route draws itself from
 *        the workshop dot to "your home" as the visitor scrolls, its
 *        head a pulsing traveller. The waypoints it calls at are the
 *        five questions everyone asks; a stats panel carries the
 *        journey's numbers and a small card offers the direct line.
 *
 * THE ROUTE IS BUILT, NOT AUTHORED. After fonts settle, the path is a
 * Catmull-Rom curve threaded through the measured centres of the
 * [data-voyage-node] dots — so it survives any locale's line lengths,
 * any viewport, and any future re-ordering of the waypoints. It is
 * rebuilt on every ScrollTrigger refreshInit, so a resize re-threads it
 * before trigger positions are recalculated.
 *
 * WITHOUT JAVASCRIPT the section is a complete, ordinary page: every
 * question and answer is served in the HTML, the route SVG is empty and
 * aria-hidden, and nothing is positioned by script. Reduced motion gets
 * the route fully drawn, resting.
 *
 * The Q&A here is the home page's TEASER — five of the seven questions,
 * linking to /faq, which keeps the FAQPage schema and the full list.
 */

/**
 * The ghost route-codes. Latin in every locale, like the wordmark — which
 * is also what makes the per-glyph split below safe: the site's
 * lines-or-words rule exists for Mkhedruli and Cyrillic, and none of
 * either is in this string. Each glyph renders as its own span so the
 * scroll can drift them apart at their own speeds; aria-hidden, so the
 * split costs assistive tech nothing.
 */
const GHOST_CODES = "TBS — HOME";

/**
 * The five questions the journey calls at, in travel order — how it
 * works, what it costs, how long it takes, what it is made of, and who
 * else we build for. `warranty` and `area` stay on /faq: both still
 * carry [FILL] placeholders and must not ship on the home page.
 * Keys into the `faq.items` messages, same as FAQ.tsx.
 */
const WAYPOINT_KEYS = [
  "process",
  "pricing",
  "timeline",
  "materials",
  "commercial",
] as const;

/**
 * Where each node sits horizontally on the desktop canvas, as a class.
 * The alternation is what threads the route into its gentle S — the
 * measured dots are the curve's own control points.
 */
const NODE_X = [
  "lg:left-[49%]", // origin
  "lg:left-[53%]", // wp 1 (copy left, dot right of centre)
  "lg:left-[46%]", // wp 2
  "lg:left-[53%]", // wp 3
  "lg:left-[46%]", // wp 4
  "lg:left-[53%]", // wp 5
  "lg:left-1/2", // destination
] as const;

/** Degrees–minutes–seconds, the way the reference letters its ends. */
function toDMS(value: number, positive: string, negative: string): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${min}′${sec}″ ${value >= 0 ? positive : negative}`;
}

/** A cubic Bézier chain through every point — Catmull-Rom converted. */
function routeThrough(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function Voyage() {
  const t = useTranslations("voyage");
  const tFaq = useTranslations("faq");
  const tContact = useTranslations("contact");
  const tCommon = useTranslations("common");

  const rootRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const basePathRef = useRef<SVGPathElement>(null);
  const drawPathRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const map = mapRef.current;
      const svgEl = svgRef.current;
      const base = basePathRef.current;
      const draw = drawPathRef.current;
      const plane = planeRef.current;
      if (!map || !svgEl || !base || !draw || !plane) return;

      const nodes = Array.from(
        map.querySelectorAll<HTMLElement>("[data-voyage-node]"),
      );
      if (nodes.length < 2) return;

      /** Route length, and the arc length at which it passes each node.
       *  Written by build(), read by the scrub. */
      let total = 0;
      let nodeLengths: number[] = [];

      /*
       * Thread the route through the dots as they sit RIGHT NOW. The
       * nodes are deliberately outside every reveal wrapper, so no
       * entrance tween can be holding one somewhere else while this
       * measures. Node centres are taken relative to the canvas, which
       * makes the numbers scroll-position-independent.
       */
      const build = () => {
        const frame = map.getBoundingClientRect();
        svgEl.setAttribute("viewBox", `0 0 ${frame.width} ${frame.height}`);

        const points = nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return {
            x: r.left - frame.left + r.width / 2,
            y: r.top - frame.top + r.height / 2,
          };
        });

        const d = routeThrough(points);
        base.setAttribute("d", d);
        draw.setAttribute("d", d);
        total = draw.getTotalLength();

        /*
         * Where along the arc each node lives, by nearest sample. The
         * curve passes through the points, so 600 samples land within a
         * pixel or two — plenty for lighting a 10px dot.
         */
        const SAMPLE_COUNT = 600;
        const best = points.map(() => Infinity);
        nodeLengths = points.map(() => 0);
        for (let s = 0; s <= SAMPLE_COUNT; s++) {
          const len = (total * s) / SAMPLE_COUNT;
          const p = draw.getPointAtLength(len);
          points.forEach((pt, i) => {
            const dx = p.x - pt.x;
            const dy = p.y - pt.y;
            const dist = dx * dx + dy * dy;
            if (dist < best[i]) {
              best[i] = dist;
              nodeLengths[i] = len;
            }
          });
        }
      };

      /** Put the traveller at the head of the drawn stroke and light
       *  every waypoint it has already called at. The class lands on the
       *  row as well as the dot: CSS answers it by igniting the index
       *  and drawing the short rule under it — text choreography keyed
       *  to the route's arrival rather than to the viewport's. */
      const place = () => {
        const offset = Number(gsap.getProperty(draw, "strokeDashoffset"));
        const drawn = Math.min(total, Math.max(0, total - offset));
        const head = draw.getPointAtLength(drawn);
        gsap.set(plane, { x: head.x, y: head.y });
        nodes.forEach((node, i) => {
          const hit = drawn >= nodeLengths[i] - 2;
          node.classList.toggle("is-passed", hit);
          node.closest("[data-vg-row]")?.classList.toggle("is-passed", hit);
        });
      };

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let tween: gsap.core.Tween | null = null;
        let cancelled = false;

        /*
         * Rebuild on refreshInit rather than on resize: it runs before
         * ScrollTrigger recomputes positions, so the refresh that
         * follows measures the re-threaded route, not the stale one.
         */
        const rethread = () => {
          if (!cancelled) build();
        };

        // Measured after the display face lands — Georgian metrics move
        // line breaks, line breaks move the dots the route runs through.
        document.fonts.ready.then(() => {
          if (cancelled) return;
          ctx.add(() => {
            build();

            tween = gsap.fromTo(
              draw,
              { strokeDasharray: () => total, strokeDashoffset: () => total },
              {
                strokeDashoffset: 0,
                ease: EASE.none,
                scrollTrigger: {
                  trigger: map,
                  start: "top 62%",
                  end: "bottom 88%",
                  scrub: SCRUB.near,
                  invalidateOnRefresh: true,
                  onUpdate: place,
                },
              },
            );
            place();

            ScrollTrigger.addEventListener("refreshInit", rethread);
          });
        });

        /* The two panels arrive the way the site's rows do; everything
           typographic in this section reveals through its own primitive
           (RevealText masks, ScrambleText decodes) instead. */
        gsap.utils
          .toArray<HTMLElement>(map.querySelectorAll("[data-vg-item]"))
          .forEach((item) => {
            gsap.from(item, {
              y: 26,
              autoAlpha: 0,
              duration: DUR.base,
              ease: EASE.soft,
              scrollTrigger: { trigger: item, start: REVEAL_START, once: true },
            });
          });

        /* -----------------------------------------------------------
           THE TYPE CHOREOGRAPHY this section owns itself — the moves
           that belong to the voyage rather than to the house library.
           All synchronous, so the matchMedia context collects them.
           ----------------------------------------------------------- */
        const rootEl = rootRef.current;

        /* The route-codes drift apart glyph by glyph while the band
           passes — the cycled offsets are PARALLAX.items' authored
           unevenness, halved: at full strength the word comes apart. */
        const drift = rootEl?.querySelector<HTMLElement>("[data-vg-drift]");
        if (drift) {
          gsap.utils
            .toArray<HTMLElement>(drift.querySelectorAll("[data-vg-ghost]"))
            .forEach((glyph, i) => {
              const travel = PARALLAX.items[i % PARALLAX.items.length] * 0.5;
              gsap.fromTo(
                glyph,
                { y: travel * 0.35 },
                {
                  y: travel * -0.65,
                  ease: EASE.none,
                  scrollTrigger: {
                    trigger: drift,
                    ...SCRUB_RANGE.travel,
                    scrub: SCRUB.mid,
                  },
                },
              );
            });
        }

        /* The dashed rule is laid down like a line on a drawing, its
           end ticks uncovered as the wipe reaches them. The negative
           vertical insets keep the ticks — which stand proud of the
           rule — out of the clip. */
        const dash = rootEl?.querySelector<HTMLElement>("[data-vg-dash]");
        if (dash) {
          gsap.fromTo(
            dash,
            { clipPath: "inset(-8px 100% -8px 0%)" },
            {
              clipPath: "inset(-8px 0% -8px 0%)",
              duration: DUR.curtain,
              ease: EASE.narrative,
              scrollTrigger: { trigger: dash, start: "top 88%", once: true },
            },
          );
        }

        /* The watermark slides a hand's width against the journey —
           an ocean label on a chart that is being panned. */
        const mark = map.querySelector<HTMLElement>("[data-vg-watermark]");
        if (mark) {
          gsap.fromTo(
            mark,
            { x: -44 },
            {
              x: 44,
              ease: EASE.none,
              scrollTrigger: {
                trigger: map,
                ...SCRUB_RANGE.travel,
                scrub: SCRUB.far,
              },
            },
          );
        }

        return () => {
          cancelled = true;
          ScrollTrigger.removeEventListener("refreshInit", rethread);
          tween?.scrollTrigger?.kill();
          tween?.kill();
        };
      });

      /* Reduced motion: the journey already made, resting. */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        let cancelled = false;
        document.fonts.ready.then(() => {
          if (cancelled) return;
          build();
          gsap.set(draw, { strokeDasharray: "none", strokeDashoffset: 0 });
          const end = draw.getPointAtLength(total);
          gsap.set(plane, { x: end.x, y: end.y });
          nodes.forEach((node) => {
            node.classList.add("is-passed");
            node.closest("[data-vg-row]")?.classList.add("is-passed");
          });
        });
        return () => {
          cancelled = true;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const latitude = toDMS(SITE.geo.latitude, "N", "S");
  const longitude = toDMS(SITE.geo.longitude, "E", "W");

  return (
    <section
      ref={rootRef}
      id="faq"
      data-thread-anchor=""
      aria-labelledby="voyage-title"
      className="relative"
    >
      {/* =============================================================
          SCENE I — THE DRIFT. Route-codes ghosted over the material.
          ============================================================= */}
      <div
        data-vg-drift
        className="relative h-[58vh] min-h-[420px] overflow-hidden"
      >
        <div
          aria-hidden="true"
          data-fx="parallax"
          data-fx-speed="0.5"
          className="vg-drift-backdrop"
        >
          <div data-fx-inner className="absolute inset-0">
            <Image
              src={src(IMAGES.voyageDrift, 2000)}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
        <div aria-hidden="true" className="vg-drift-scrim" />
        {/* Texture, not copy — the header below says it in words. The
            block drifts as one layer via ScrollFX; the glyphs inside it
            drift again, each at its own speed, in this component. */}
        <p
          aria-hidden="true"
          data-fx="parallax"
          data-fx-speed="1.5"
          className="vg-ghost"
        >
          {[...GHOST_CODES].map((glyph, i) =>
            glyph === " " ? (
               
              <span key={i} className="inline-block w-[0.22em]" />
            ) : (
              <span
                 
                key={i}
                data-vg-ghost
                className={`inline-block ${glyph === "—" ? "opacity-60" : ""}`}
              >
                {glyph}
              </span>
            ),
          )}
        </p>
      </div>

      {/* =============================================================
          SCENE II — THE COORDINATES.
          ============================================================= */}
      <div className="relative px-5 pt-14 pb-20 sm:px-8 sm:pt-16 sm:pb-28 lg:px-12">
        <div className="mx-auto w-full max-w-[88rem]">
          <div data-vg-dash className="vg-dash" aria-hidden="true" />

          {/* The coordinates resolve out of noise, both ends of the rule
              locking on like instruments acquiring a position. */}
          <div className="mt-5 flex items-start justify-between gap-8">
            <p className="vg-mono text-ink-55">
              <ScrambleText
                as="span"
                className="block"
                text={`${latitude} ${longitude}`}
              />
              <ScrambleText
                as="span"
                className="block"
                delay={0.2}
                text={t("coordsFromLabel")}
              />
            </p>
            <p className="vg-mono text-right text-ink-55">
              <ScrambleText
                as="span"
                className="block"
                delay={0.35}
                text="··° ··′ — ··° ··′"
              />
              <ScrambleText
                as="span"
                className="block"
                delay={0.5}
                text={t("coordsToLabel")}
              />
            </p>
          </div>

          <RevealText
            as="h2"
            id="voyage-title"
            className="u-display mx-auto mt-16 max-w-[18ch] text-center text-[clamp(2rem,6.5vw,4.6rem)] text-ink sm:mt-20"
          >
            {t("title")}
          </RevealText>
          {/* Scrubbed rather than played: the words brighten in reading
              order as the visitor travels — the Manifesto's language,
              carried forward so the page keeps one voice. */}
          <RevealText
            as="p"
            variant="scrub"
            className="mx-auto mt-8 max-w-xl text-center text-base leading-[1.7] text-ink-70 sm:text-lg"
          >
            {t("intro")}
          </RevealText>
        </div>
      </div>

      {/* =============================================================
          SCENE III — THE MAP. data-surface="dark" flips every token
          in the subtree, so this canvas is coal in both themes and
          the accent inside it is the lit brass.
          ============================================================= */}
      <div
        ref={mapRef}
        data-surface="dark"
        className="relative overflow-hidden bg-sand text-ink"
      >
        {/* The route. Empty until the client threads it; decoration
            only, so no-JS visitors simply read the page. */}
        <svg ref={svgRef} aria-hidden="true" className="vg-map-svg">
          <path ref={basePathRef} className="vg-path vg-path--base" />
          <path ref={drawPathRef} className="vg-path vg-path--draw" />
          <g ref={planeRef}>
            <circle className="vg-plane-ring" r="14" />
            <circle className="vg-plane-ring vg-plane-ring--late" r="21" />
            <circle className="vg-plane-core" r="4.5" />
          </g>
        </svg>

        <p
          aria-hidden="true"
          data-vg-watermark
          className="vg-watermark top-[16rem] left-[6%]"
        >
          {t("watermark")}
        </p>

        <div className="relative mx-auto w-full max-w-[88rem] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          {/* ---- the starting point ---- */}
          <div data-vg-row className="relative">
            <span
              data-voyage-node
              aria-hidden="true"
              className={`vg-node top-2 left-0 ${NODE_X[0]}`}
            />
            <div className="pl-8 lg:pl-[52.5%]">
              <ScrambleText
                as="p"
                className="vg-mono text-clay"
                text={t("originLabel")}
              />
              <RevealText
                as="p"
                className="font-display mt-2 text-xl text-ink sm:text-2xl"
              >
                {t("originName")}
              </RevealText>
              <ScrambleText
                as="p"
                className="vg-mono mt-2 text-ink-55"
                delay={0.2}
                text={tContact("address")}
              />
            </div>
          </div>

          {/* ---- the journey's numbers ---- */}
          <aside
            data-vg-item
            className="vg-card mt-20 w-full max-w-sm sm:mt-28"
            aria-label={t("eyebrow")}
          >
            <div>
              <ScrambleText
                as="p"
                className="vg-mono text-ink-55"
                text={t("statProductionLabel")}
              />
              <RevealText
                as="p"
                className="font-display mt-2 text-3xl text-ink sm:text-4xl"
              >
                {t("statProductionValue")}
              </RevealText>
            </div>
            <div className="mt-6 border-t border-dashed border-line pt-6">
              <ScrambleText
                as="p"
                className="vg-mono text-ink-55"
                delay={0.15}
                text={t("statInstallLabel")}
              />
              <RevealText
                as="p"
                className="font-display mt-2 text-3xl text-ink sm:text-4xl"
                delay={0.1}
              >
                {t("statInstallValue")}
              </RevealText>
            </div>
            <div className="mt-6 border-t border-dashed border-line pt-6">
              <ScrambleText
                as="p"
                className="vg-mono text-ink-55"
                delay={0.3}
                text={t("statPriceLabel")}
              />
              <RevealText
                as="p"
                className="font-display mt-2 text-3xl text-ink sm:text-4xl"
                delay={0.2}
              >
                {t("statPriceValue")}
              </RevealText>
            </div>
          </aside>

          {/* ---- the waypoints: the five questions ---- */}
          {WAYPOINT_KEYS.map((key, index) => {
            const onLeft = index % 2 === 0;
            return (
              <div
                key={key}
                data-vg-row
                className="relative mt-20 sm:mt-28 lg:mt-36 lg:grid lg:grid-cols-12"
              >
                <span
                  data-voyage-node
                  aria-hidden="true"
                  className={`vg-node top-2 left-0 lg:top-1/2 ${NODE_X[index + 1]}`}
                />
                <article
                  className={`max-w-[34rem] pl-8 lg:pl-0 ${
                    onLeft
                      ? "lg:col-span-5 lg:col-start-1"
                      : "lg:col-span-5 lg:col-start-8"
                  }`}
                >
                  {/* The index decodes on entry; the ignition — clay and
                      the drawn rule — waits for the route to arrive. */}
                  <ScrambleText
                    as="p"
                    className="vg-mono vg-wp-index"
                    text={`${String(index + 1).padStart(2, "0")} / ${String(
                      WAYPOINT_KEYS.length,
                    ).padStart(2, "0")}`}
                  />
                  <span aria-hidden="true" className="vg-wp-rule" />
                  <RevealText
                    as="h3"
                    className="font-display mt-3 text-lg leading-snug text-ink sm:text-xl"
                  >
                    {tFaq(`items.${key}.q`)}
                  </RevealText>
                  <RevealText
                    as="p"
                    className="mt-4 max-w-2xl text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base"
                    stagger={STAGGER.linesTight}
                    delay={0.12}
                  >
                    {tFaq(`items.${key}.a`)}
                  </RevealText>
                </article>

                {/* The direct line rides beside the middle waypoint,
                    where the reference floats its film card. */}
                {index === 2 && (
                  <aside
                    data-vg-item
                    className="vg-card mt-14 max-w-xs pl-8 lg:col-span-4 lg:col-start-1 lg:mt-0 lg:self-center lg:justify-self-start"
                  >
                    <ScrambleText
                      as="p"
                      className="vg-mono text-ink-55"
                      text={t("talkLabel")}
                    />
                    {/* A control, so the hover re-scramble is earned:
                        the number churns under the pointer and settles. */}
                    <a
                      className="u-link font-display mt-3 inline-block text-xl text-ink sm:text-2xl"
                      href={`tel:${SITE.phoneHref}`}
                      onClick={() => track("Contact", { method: "phone" })}
                    >
                      <ScrambleText as="span" hover text={SITE.phone} />
                    </a>
                    <div className="mt-6">
                      <a
                        href={whatsappUrl(tCommon("whatsappPrefill"))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          track("Contact", { method: "whatsapp" })
                        }
                        className="u-press inline-flex items-center justify-center rounded-full bg-clay px-7 py-3.5 text-xs tracking-[0.16em] text-charcoal uppercase hover:bg-clay-deep"
                      >
                        {tCommon("whatsappCta")}
                      </a>
                    </div>
                  </aside>
                )}
              </div>
            );
          })}

          {/* ---- the destination ---- */}
          <div data-vg-row className="relative mt-24 pb-4 text-center sm:mt-36">
            <span
              data-voyage-node
              aria-hidden="true"
              className={`vg-node top-0 left-0 ${NODE_X[6]}`}
            />
            <div className="pt-10">
              <ScrambleText
                as="p"
                className="vg-mono text-clay"
                text={t("destLabel")}
              />
              <RevealText
                as="p"
                className="u-display mt-3 text-[clamp(2rem,6vw,4rem)] text-ink"
                delay={0.15}
              >
                {t("destName")}
              </RevealText>
              <Link
                href="/faq"
                className="u-link vg-mono mt-8 inline-block text-ink-55"
              >
                {t("allQuestions")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
