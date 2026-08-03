"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
import ElevationScene from "@/app/_components/ElevationScene";
import {
  DIM,
  K01,
  WAVES,
  buildScene,
  type SceneHit,
} from "@/lib/elevation";
import {
  GHOST_OPACITY,
  PANEL_TINT,
  SCROLL_LENGTH,
  SHEET,
  SHEET_BREAKPOINT,
  STAGE,
  TIMELINE,
  WAVE_AT,
  WAVE_DUR,
  WEIGHT,
  stageAt,
} from "@/lib/drawing";
import { DUR, EASE, MASK_DESCENDER, smoothstep } from "@/lib/motion";

/*
 * THE DRAWING — the sheet the workshop builds from, drawing itself.
 *
 * A front elevation of a 3600 mm kitchen assembles line by line as the
 * section is scrolled: carcasses, panels, fronts, worktop, appliances,
 * details, then the dimensions, each measurement counting up to its own
 * value. It holds for a beat as an approved sheet — and then the
 * photograph of the built kitchen rises underneath it, the linework
 * settles to a ghost on top of the real thing, and leaves.
 *
 * The argument the section is making is the company's: precision first,
 * then reality. Nothing here is decorative "technical" styling — the
 * SVG's user units ARE millimetres, every dimension is measured off the
 * geometry rather than typed next to it (lib/drawing.ts), and the
 * elevation is the arrangement in the finale photograph, so the two
 * compositions land on each other instead of merely dissolving.
 *
 * LINE WEIGHT. A drawing's line weight belongs to the drawing, not to
 * the zoom: 1.5px at 390px and 1.5px at 1440px. `non-scaling-stroke`
 * would be the obvious way to hold that and is unusable here — it moves
 * the dash pattern into device space while getTotalLength() keeps
 * answering in millimetres, so the draw-on renders complete at half
 * progress (measured in Chromium; see WEIGHT in lib/drawing.ts). Instead
 * the sheet is measured and the weights converted to millimetres, which
 * also scales the annotation type by the same factor — so the sheet
 * looks identical at every width rather than merely fitting.
 *
 * STICKY, NOT PINNED. The stage is a CSS `position: sticky` child of a
 * tall section. Same result as a ScrollTrigger pin, no pin-spacer for
 * the rail and ScrollFX to re-measure around, and identical under a
 * thumb.
 *
 * SSR / REDUCED MOTION. The server renders `data-static`: the sheet
 * complete, every dimension at its final number, and the photograph
 * below it as an ordinary figure. That is the state a crawler, a failed
 * bundle and a reduced-motion visitor all get, and it still makes the
 * section's argument. JS removes the attribute before it animates
 * anything.
 */

/** The pen tip's length on screen, in CSS pixels. Converted to
 *  millimetres per sheet width, so it looks the same at 390 and 1440. */
const TIP_PX = 22;

/** Scroll either side of the section that the surface ramps across, as a
 *  share of the viewport. The dark has to arrive before the sheet does. */
const SURFACE_RAMP = 0.4;

/*
 * The sheet this section draws. Built once at module scope: the spec is
 * constant, buildScene is pure, and the wide variant is always rendered
 * because the handheld sheet hides its extra chains with .dwg-wide
 * rather than omitting them.
 *
 * `sky` is the headroom the copy block sits in — the section frames the
 * sheet through SHEET below rather than through scene.viewBox, so this
 * only has to match what that framing expects.
 */
const scene = buildScene(K01, { wide: true, sky: 520 });

/* ---------------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------------ */

export default function Drawing() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("drawing");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      // gsap's selector types resolve to the HTML element map, which has
      // no SVG entries — the cast has to go through unknown.
      const svg = root.querySelector<SVGSVGElement>("svg[data-sheet]");
      const stage = q("[data-stage]")[0];
      if (!svg || !stage) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          wide: `(min-width: ${SHEET_BREAKPOINT}px)`,
          handheld: `(max-width: ${SHEET_BREAKPOINT - 1}px)`,
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const wide = !!ctx.conditions?.wide;
          const motion = !!ctx.conditions?.motion;

          /*
           * The sheet's framing. Handheld drops the two outermost
           * annotations rather than cabinets — cropping the run would
           * leave the overall dimension reading 3600 across a kitchen
           * that is visibly shorter, and a drawing may not lie.
           */
          const frame = wide ? SHEET.desktop : SHEET.handheld;
          svg.setAttribute(
            "viewBox",
            `${frame.x} ${frame.y} ${frame.w} ${frame.h}`,
          );

          /*
           * Weights, converted from px to millimetres for THIS width.
           * Re-run whenever the sheet is resized, which is what holds
           * the line weight constant instead of merely scaling it.
           */
          const applyWeights = () => {
            const rendered = svg.getBoundingClientRect().width;
            if (!rendered) return;
            const mmPerPx = frame.w / rendered;
            svg.style.setProperty("--dwg-line", `${WEIGHT.line * mmPerPx}`);
            svg.style.setProperty("--dwg-dim", `${WEIGHT.dim * mmPerPx}`);
            svg.style.setProperty("--dwg-label", `${WEIGHT.label * mmPerPx}px`);
            svg.style.setProperty("--dwg-note", `${WEIGHT.note * mmPerPx}px`);
          };
          applyWeights();

          const observer = new ResizeObserver(applyWeights);
          observer.observe(svg);

          if (!motion) {
            /*
             * Reduced motion: the static sheet the server already sent.
             * Nothing to build and nothing to undo — `data-static` stays
             * on, so the drawing is complete, the dimensions read their
             * real values and the photograph sits below as a figure.
             */
            return () => observer.disconnect();
          }

          root.removeAttribute("data-static");

          const cleanups: (() => void)[] = [];
          const qsa = <T extends Element>(sel: string) =>
            Array.from(svg.querySelectorAll<T>(sel));

          /* Wide-only annotations are out of the DOM's reach on a phone. */
          const hidden = wide ? [] : qsa<SVGGElement>(".dwg-wide");
          hidden.forEach((el) => gsap.set(el, { display: "none" }));

          const live = (sel: string) =>
            qsa<SVGGeometryElement>(sel).filter(
              (el) => !(!wide && el.closest(".dwg-wide")),
            );

          /* ---------------------------------------------------------
           * START STATES — all applied by GSAP, never by CSS, so the
           * server's markup stays the finished sheet.
           * ------------------------------------------------------ */
          const drawable = live("[data-draw]");
          drawable.forEach((el) => {
            const len = el.getTotalLength();
            gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
          });
          gsap.set(live("[data-pop]"), { scale: 0, transformOrigin: "50% 50%" });
          gsap.set(qsa("[data-tint]"), { opacity: 0 });
          gsap.set(qsa("[data-chain] text"), { opacity: 0 });
          qsa<SVGTextElement>("[data-chain] text").forEach((el) => {
            el.textContent = "0";
          });

          const photo = q("[data-photo]")[0];
          const sheet = q("[data-sheet]")[0];
          if (photo) gsap.set(photo, { opacity: 0 });

          /* ---------------------------------------------------------
           * THE MASTER TIMELINE
           * ------------------------------------------------------ */
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: `+=${SCROLL_LENGTH}%`,
              scrub: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const label = q("[data-readout-stage]")[0];
                const pct = q("[data-readout-pct]")[0];
                if (label) label.textContent = t(`stages.${stageAt(self.progress)}`);
                if (pct) {
                  pct.textContent = `${String(Math.round(self.progress * 100)).padStart(3, "0")}%`;
                }
                // Every dimension number, computed from where the scroll
                // is rather than from whether a tween happened to render.
                paintCounters(self.progress);
              },
            },
          });

          /**
           * Draws one group's strokes left to right inside its own slot.
           * `amount` spreads the stagger across a share of the slot and
           * the tween takes the rest, so a stage occupies exactly the
           * time lib/drawing.ts gave it — a per-item `each` would let a
           * dense group run over the next stage.
           */
          /*
           * THE PEN TIP. A short bright dash riding the head of each
           * stroke as it is laid down.
           *
           * The trick is one dash in an otherwise empty pattern:
           * `dasharray = tip, len` leaves exactly one visible segment,
           * and offsetting it by `tip - head` parks that segment on the
           * head, which is at `len - mainOffset`. So the tip's offset
           * runs from `tip` down to `tip - len` over the same window the
           * line's runs from `len` to 0 — the same tween shape, which is
           * why it can share the group's stagger and stay in step.
           *
           * Built here rather than in the markup because it is generated
           * per path and filtered by length: a tip on a 40 mm detail is
           * longer than the line it leads.
           */
          const tipLayer = svg.querySelector<SVGGElement>("#tips");
          const mmPerPx = frame.w / (svg.getBoundingClientRect().width || 1);
          const tipLen = TIP_PX * mmPerPx;

          const draw = (
            selector: string,
            slot: { at: number; dur: number },
            spread = 0.55,
          ) => {
            const paths = live(selector);
            if (!paths.length) return;
            tl.to(
              paths,
              {
                strokeDashoffset: 0,
                duration: slot.dur * (1 - spread),
                stagger: { amount: slot.dur * spread },
              },
              slot.at,
            );

            if (!tipLayer) return;
            const tips: SVGPathElement[] = [];
            const ends: number[] = [];
            paths.forEach((path) => {
              const len = path.getTotalLength();
              // Anything this short is a detail, not a stroke.
              if (len < tipLen * 3) return;
              const tip = path.cloneNode(false) as SVGPathElement;
              tip.removeAttribute("data-draw");
              tip.setAttribute("class", "dwg-tip");
              gsap.set(tip, {
                strokeDasharray: `${tipLen} ${len}`,
                strokeDashoffset: tipLen,
              });
              tipLayer.appendChild(tip);
              tips.push(tip);
              ends.push(tipLen - len);
            });
            if (!tips.length) return;

            /*
             * Same duration and the same stagger amount as the line
             * tween above, over the same array in the same order — which
             * is the only reason a tip and its stroke stay together. The
             * filtered-out short paths would break that, so `paths` is
             * NOT re-filtered here; the tips array simply has holes where
             * a path was skipped, and its own stagger is scaled to match.
             */
            tl.to(
              tips,
              {
                strokeDashoffset: (i) => ends[i]!,
                duration: slot.dur * (1 - spread),
                stagger: { amount: slot.dur * spread },
              },
              slot.at,
            );
            // The tip is a pen, not a highlight: once the group is
            // finished it has nothing left to lead.
            tl.to(
              tips,
              { opacity: 0, duration: slot.dur * 0.2 },
              slot.at + slot.dur * 0.85,
            );
            cleanups.push(() => tips.forEach((tip) => tip.remove()));
          };

          const pop = (selector: string, slot: { at: number; dur: number }) => {
            const items = live(selector);
            if (!items.length) return;
            tl.to(
              items,
              {
                scale: 1,
                duration: slot.dur * 0.3,
                ease: EASE.pop,
                stagger: { amount: slot.dur * 0.6 },
              },
              slot.at + slot.dur * 0.35,
            );
          };

          draw("#carcass [data-draw]", STAGE.carcass);
          draw("#dividers [data-draw]", STAGE.dividers);
          draw("#fronts [data-draw]", STAGE.fronts, 0.6);
          pop("#fronts [data-pop]", STAGE.fronts);
          // One long sweep, no stagger — the worktop is a single run of
          // stone and it should read as one gesture.
          draw("#countertop [data-draw]", STAGE.worktop, 0);
          draw("#appliances [data-draw]", STAGE.appliances);
          // The title block's rule belongs to `details` — left out of
          // every stage it simply never drew, and sat at full dashoffset
          // for the life of the section. Invisible, so nothing looked
          // broken; the verifier is what found it (52 of 53 paths).
          draw("#details [data-draw], #titleblock [data-draw]", STAGE.details);
          tl.to(
            qsa("[data-tint]"),
            {
              opacity: PANEL_TINT,
              duration: STAGE.details.dur * 0.8,
              stagger: { amount: STAGE.details.dur * 0.2 },
            },
            STAGE.details.at,
          );

          /* ---------------------------------------------------------
           * DIMENSIONS, IN FOUR WAVES
           *
           * Each wave arrives the moment the thing it measures has
           * finished being drawn, rather than all of them queueing up at
           * the end. That is the difference between a sheet being
           * dimensioned as it is drawn — which is what a draughtsman
           * does — and a drawing that gets annotated afterwards.
           *
           * Focus follows the newest information: when a wave lands, the
           * earlier ones drop to DIM.dimmed, and everything returns to
           * DIM.settled for the hold so the finished sheet reads whole.
           * ------------------------------------------------------ */
          const chainsOf = (wave: number) =>
            qsa<SVGGElement>(`[data-wave="${wave}"]`).filter(
              (g) => wide || !g.classList.contains("dwg-wide"),
            );

          const everyChain = WAVES.flatMap(chainsOf);

          /**
           * Every dimension number on the sheet, with the timeline window
           * it counts up across. Read from scroll position rather than
           * animated, so the value is correct at ANY scroll position
           * including one arrived at without passing through the others.
           */
          const counters: {
            el: SVGTextElement;
            target: number;
            start: number;
            dur: number;
          }[] = [];

          const paintCounters = (progress: number) => {
            const time = progress * TIMELINE;
            for (const c of counters) {
              const f = gsap.utils.clamp(0, 1, (time - c.start) / c.dur);
              c.el.textContent = String(Math.round(f * c.target));
            }
          };

          WAVES.forEach((wave, i) => {
            const groups = chainsOf(wave);
            if (!groups.length) return;

            const at = WAVE_AT[wave];
            const paths = groups.flatMap((g) =>
              Array.from(g.querySelectorAll<SVGGeometryElement>("[data-draw]")),
            );
            const heads = groups.flatMap((g) =>
              Array.from(g.querySelectorAll<SVGGeometryElement>("[data-pop]")),
            );
            const texts = groups.flatMap((g) =>
              Array.from(g.querySelectorAll<SVGTextElement>("text")),
            );

            // Extension lines and dimension lines grow out together.
            tl.to(
              paths,
              {
                strokeDashoffset: 0,
                duration: WAVE_DUR * 0.45,
                stagger: { amount: WAVE_DUR * 0.3 },
              },
              at,
            );
            tl.to(
              heads,
              {
                scale: 1,
                duration: WAVE_DUR * 0.18,
                ease: EASE.pop,
                stagger: { amount: WAVE_DUR * 0.2 },
              },
              at + WAVE_DUR * 0.4,
            );

            // Then every number in the wave counts up at once — a chain
            // is one measurement of one thing, so its segments should
            // resolve together rather than in sequence.
            //
            // The COUNT itself is not a tween. Its window is registered
            // here and the value is computed from scroll position in the
            // trigger's onUpdate below, because a tween writing text
            // through onUpdate only writes while it is being rendered:
            // land in the middle of this section from a deep link, a
            // restored scroll position or a hard flick and the tweens are
            // seeked past rather than played, so every label stays on its
            // start value. Measured — a direct jump to the hold showed a
            // fully drawn sheet dimensioned entirely in zeroes, while the
            // verifier missed it because it scrolls through 0.5 and 0.005
            // on its way and those renders happen to write the numbers.
            texts.forEach((text) => {
              counters.push({
                el: text,
                target: Number(text.dataset.value ?? 0),
                start: at + WAVE_DUR * 0.42,
                dur: WAVE_DUR * 0.45,
              });
              tl.to(
                text,
                { opacity: 1, duration: WAVE_DUR * 0.12 },
                at + WAVE_DUR * 0.42,
              );
            });

            if (i > 0) {
              const earlier = WAVES.slice(0, i).flatMap(chainsOf);
              if (earlier.length) {
                tl.to(
                  earlier,
                  { opacity: DIM.dimmed, duration: 0.6, ease: smoothstep },
                  at,
                );
              }
            }
          });

          // The sheet settles: every wave back to one legible weight.
          if (everyChain.length) {
            tl.to(
              everyChain,
              { opacity: DIM.settled, duration: 0.9, ease: smoothstep },
              STAGE.approved.at,
            );
          }

          /* ---------------------------------------------------------
           * THE FINALE — the money shot. Slow, and in this order:
           * the photograph arrives UNDER the sheet, the sheet settles to
           * a ghost ON TOP of it for a beat, then leaves. Reversing any
           * two of those turns it into a plain cross-dissolve.
           * ------------------------------------------------------ */
          const built = STAGE.built;
          if (photo) {
            /*
             * The lights coming on in the finished room.
             *
             * Fading a bright photograph up out of a near-black section
             * as a plain opacity ramp reads as a slide change: at 50% you
             * are looking at a grey rectangle. Starting it dark and
             * desaturated and bringing it UP as it fades means the light
             * appears to come from inside the photograph — the warmth
             * blooms out of the surface rather than being pasted over it.
             *
             * `filter` is normally banned in this codebase's scroll
             * vocabulary, and this is the one place it earns its keep: a
             * single element, for a fifth of one section, at the moment
             * the section exists for. Everything else in the finale is
             * opacity.
             */
            gsap.set(photo, { filter: "brightness(0.4) saturate(0.85)" });
            tl.to(
              photo,
              { opacity: 1, duration: built.dur * 0.4, ease: smoothstep },
              built.at,
            );
            tl.to(
              photo,
              {
                filter: "brightness(1) saturate(1)",
                duration: built.dur * 0.55,
                ease: smoothstep,
              },
              built.at + built.dur * 0.05,
            );
            cleanups.push(() => gsap.set(photo, { clearProps: "filter" }));
          }
          tl.to(
            qsa("[data-chain]"),
            { opacity: 0, duration: built.dur * 0.25, ease: smoothstep },
            built.at + built.dur * 0.05,
          );
          if (sheet) {
            tl.to(
              sheet,
              { opacity: GHOST_OPACITY, duration: built.dur * 0.4, ease: smoothstep },
              built.at + built.dur * 0.1,
            );
            /*
             * A quarter of the finale is the hold, and it has to be
             * authored as dead time or it does not exist: the first cut
             * of this ran the ghost straight into its own fade-out, so
             * the drawing-over-reality moment lasted a couple of frames
             * and the whole thing read as a plain cross-dissolve.
             */
            tl.to(
              sheet,
              { opacity: 0, duration: built.dur * 0.25, ease: smoothstep },
              built.at + built.dur * 0.75,
            );
          }

          /* ---------------------------------------------------------
           * TEXT BEATS — masked lines, scrubbed against the same clock.
           * ------------------------------------------------------ */
          const splits: SplitText[] = [];
          /*
           * The beats hand over; they never share the panel. The first
           * cut had beat 1 running to the dimensions and beat 2 starting
           * at the fronts, which overlapped them for a fifth of the
           * section — the title printed straight through the sentence.
           * Each `out` is now the next one's `in`, less the crossover the
           * fade already occupies.
           */
          const beatSlots = [
            { sel: "[data-beat='1']", in: 0, out: STAGE.fronts.at },
            {
              sel: "[data-beat='2']",
              in: STAGE.fronts.at + 0.4,
              out: STAGE.dims.at + STAGE.dims.dur * 0.5,
            },
            { sel: "[data-beat='3']", in: built.at, out: TIMELINE },
          ];

          document.fonts.ready.then(() => {
            ctx.add(() => {
              beatSlots.forEach((slot, i) => {
                const el = q(slot.sel)[0] as HTMLElement | undefined;
                if (!el) return;
                const split = SplitText.create(el, {
                  type: "lines",
                  mask: "lines",
                  aria: "auto",
                });
                splits.push(split);
                gsap.set(split.lines, {
                  paddingBottom: `${MASK_DESCENDER}em`,
                });
                gsap.set(split.masks, {
                  marginBottom: `${-MASK_DESCENDER}em`,
                });

                const span = slot.out - slot.in;

                /*
                 * `set` to the hidden state, then `to` — never `from`.
                 * A `from` tween added to a timeline a ScrollTrigger has
                 * already scrubbed resolves its start values against
                 * whatever the playhead was doing at creation, and with a
                 * stagger it does so per target: measured here, line 1 of
                 * this beat was left at a partial offset and line 2 was
                 * never touched at all, so half a paragraph sat visible
                 * on top of the paragraph before it. An explicit start
                 * state cannot be resolved against anything.
                 */
                gsap.set(split.lines, { yPercent: 115 });
                tl.to(
                  split.lines,
                  {
                    yPercent: 0,
                    duration: span * 0.16,
                    ease: EASE.narrative,
                    stagger: { amount: span * 0.06 },
                  },
                  slot.in,
                );

                // The last beat never leaves — it is the section's
                // closing line, and it holds over the photograph.
                //
                // `opacity`, not `autoAlpha`: beat 1 is the <h2> this
                // section is named by, and visibility:hidden would take
                // the name out of the accessibility tree every time the
                // heading faded.
                if (i < beatSlots.length - 1) {
                  tl.to(
                    el,
                    { opacity: 0, duration: span * 0.14, ease: smoothstep },
                    slot.out - span * 0.14,
                  );
                }
              });
              ScrollTrigger.refresh();
            });
          });

          /* ---------------------------------------------------------
           * ATMOSPHERE — paper, then light.
           *
           * Opacity only. A glow is normally a `filter`, and a filter on
           * a scrubbed full-viewport layer repaints the whole thing every
           * frame; these are gradients that were always there, being
           * faded up. The paper arrives before the first line, because
           * nobody draws on a sheet that is not on the table yet.
           * ------------------------------------------------------ */
          const grid = q("[data-grid]")[0];
          const glow = q("[data-glow]")[0];
          const frameEl = q("[data-frame]")[0];
          const atmosphere = [grid, glow, frameEl].filter(Boolean);
          gsap.set(atmosphere, { opacity: 0 });

          if (grid) tl.to(grid, { opacity: 1, duration: 1.2 }, 0);
          if (frameEl) tl.to(frameEl, { opacity: 1, duration: 1.6 }, 0.4);
          if (glow) {
            tl.to(glow, { opacity: 0.7, duration: 2.4 }, 0.6);
            // The sheet is brightest at the moment it is signed off.
            tl.to(glow, { opacity: 1, duration: 1.6, ease: smoothstep }, STAGE.dims.at);
          }
          // All of it leaves as the photograph takes over — the room is
          // lit by then, and the paper is not in it.
          tl.to(
            atmosphere,
            { opacity: 0, duration: built.dur * 0.4, ease: smoothstep },
            built.at,
          );

          /* ---------------------------------------------------------
           * THE INTERACTIVE LAYER
           *
           * Hovering a cabinet lights it and reads back its size. Live
           * only between the sheet being finished and the photograph
           * arriving, because outside that window there is either
           * nothing drawn to point at or nothing left of it.
           *
           * The chip only ever prints numbers that came from the same
           * geometry the drawing did, so it cannot contradict the sheet.
           * ------------------------------------------------------ */
          const highlight = svg.querySelector<SVGPathElement>("[data-highlight]");
          const spec = q("[data-spec]")[0];
          const specName = q("[data-spec-name]")[0];
          const specSize = q("[data-spec-size]")[0];
          const specMaterial = q("[data-spec-material]")[0];
          const hint = q("[data-hint]")[0];
          const hits = qsa<SVGPathElement>(".dwg-hit");
          const pointer = new AbortController();

          if (highlight && spec) {
            let selected: SVGPathElement | null = null;

            /*
             * The readout is placed on the side of the stage the unit is
             * NOT on, and clamped inside the viewport. Collision-safe by
             * construction rather than by hoping a fixed corner happens
             * to be free — the unit under the pointer can be anywhere
             * along a run that spans the whole screen.
             */
            const place = (hit: SVGPathElement) => {
              const stageBox = stage.getBoundingClientRect();
              const unitBox = hit.getBoundingClientRect();
              const specBox = spec.getBoundingClientRect();
              const pad = 24;

              const unitCentre = unitBox.left + unitBox.width / 2 - stageBox.left;
              const onLeft = unitCentre > stageBox.width / 2;
              const x = onLeft
                ? unitBox.left - stageBox.left - specBox.width - pad
                : unitBox.right - stageBox.left + pad;
              const y = unitBox.top - stageBox.top + unitBox.height / 2 - specBox.height / 2;

              gsap.set(spec, {
                x: gsap.utils.clamp(pad, stageBox.width - specBox.width - pad, x),
                y: gsap.utils.clamp(pad, stageBox.height - specBox.height - pad, y),
              });
            };

            // Specs come off the scene the sheet was built from, so an
            // inspected cabinet can never report a size the drawing does
            // not have.
            const specById = new Map<string, SceneHit>(
              scene.hits.map((hit) => [hit.unitId, hit]),
            );

            const select = (hit: SVGPathElement) => {
              const id = hit.dataset.hit ?? "";
              const unitSpec = specById.get(id);
              if (!unitSpec) return;

              selected = hit;
              root.setAttribute("data-inspecting", "");
              highlight.setAttribute("d", hit.getAttribute("d") ?? "");

              if (specName) specName.textContent = t(`units.${unitSpec.type}`);
              if (specSize) {
                specSize.textContent = `${unitSpec.w} × ${unitSpec.h} × ${unitSpec.d3} mm`;
              }
              if (specMaterial) {
                specMaterial.textContent = t(`materials.${unitSpec.material}`);
              }

              gsap.to(highlight, {
                opacity: 1,
                duration: DUR.tap,
                ease: EASE.pointer,
                overwrite: true,
              });
              gsap.to(spec, {
                opacity: 1,
                duration: DUR.tap,
                ease: EASE.pointer,
                overwrite: true,
                onStart: () => place(hit),
              });
              place(hit);
              if (hint) gsap.to(hint, { opacity: 0, duration: DUR.tap });
            };

            const clear = (restoreHint = true) => {
              selected = null;
              root.removeAttribute("data-inspecting");
              gsap.to([highlight, spec], {
                opacity: 0,
                duration: DUR.fast,
                ease: EASE.exit,
                overwrite: true,
              });
              if (restoreHint && hint && root.hasAttribute("data-live")) {
                gsap.to(hint, { opacity: 1, duration: DUR.fast });
              }
            };

            hits.forEach((hit) => {
              // Pointer: hover selects, leaving clears. Touch has no
              // hover, so a tap fires pointerenter and the toggle below
              // is what lets a second tap dismiss it.
              hit.addEventListener("pointerenter", () => select(hit), {
                signal: pointer.signal,
              });
              hit.addEventListener(
                "pointerleave",
                (event) => {
                  if ((event as PointerEvent).pointerType === "touch") return;
                  clear();
                },
                { signal: pointer.signal },
              );
              hit.addEventListener(
                "click",
                () => (selected === hit ? clear() : select(hit)),
                { signal: pointer.signal },
              );
              hit.addEventListener(
                "keydown",
                (event) => {
                  const key = (event as KeyboardEvent).key;
                  if (key === "Enter" || key === " ") {
                    event.preventDefault();
                    if (selected === hit) clear();
                    else select(hit);
                  }
                },
                { signal: pointer.signal },
              );
              hit.addEventListener("focus", () => select(hit), {
                signal: pointer.signal,
              });
            });

            // Escape anywhere, and a tap on the sheet itself, dismiss.
            window.addEventListener(
              "keydown",
              (event) => {
                if (event.key === "Escape" && selected) clear();
              },
              { signal: pointer.signal },
            );
            stage.addEventListener(
              "pointerdown",
              (event) => {
                if (selected && !(event.target as Element).closest(".dwg-hit")) {
                  clear();
                }
              },
              { signal: pointer.signal },
            );

            /*
             * THE WINDOW. Inspect mode is live only through the hold —
             * before it there is a sheet still being drawn, and after it
             * the photograph has taken the screen. The units are only
             * focusable inside it too, so a keyboard visitor scrolling
             * past never lands on nine invisible buttons.
             */
            const gateOpen = STAGE.approved.at / TIMELINE;
            const gateShut = built.at / TIMELINE;
            let live = false;

            const gate = ScrollTrigger.create({
              trigger: root,
              start: "top top",
              end: `+=${SCROLL_LENGTH}%`,
              onUpdate: (self) => {
                const next =
                  self.progress > gateOpen && self.progress < gateShut;
                if (next === live) return;
                live = next;
                root.toggleAttribute("data-live", live);
                hits.forEach((hit) => hit.setAttribute("tabindex", live ? "0" : "-1"));
                if (live) {
                  if (hint) gsap.to(hint, { opacity: 1, duration: DUR.base });
                } else {
                  if (hint) gsap.to(hint, { opacity: 0, duration: DUR.fast });
                  if (selected) clear(false);
                }
              },
            });
            cleanups.push(() => gate.kill());
          }

          /* ---------------------------------------------------------
           * THE SURFACE RAMP
           *
           * The page has to already be dark when the sheet arrives, so
           * the wash is driven by the section's POSITION rather than by
           * the pin's timeline — the pin does not exist yet during the
           * approach. Read straight off the rect on a rAF-coalesced
           * scroll listener, same as the journey rail, because the two
           * ramps overlap nothing and a pair of scrubbed tweens on one
           * property would spend the middle of the section arguing.
           *
           * The `data-surface` flip on <html> is what swaps the header
           * and the two glass pills. It carries HYSTERESIS: flipping on a
           * bare 0.5 crossing makes a fast scroll across the boundary
           * strobe, because the wash opacity dithers either side of the
           * threshold. Enter dark at 0.55, leave at 0.45, and the flip
           * happens once in each direction no matter how fast the
           * crossing is.
           * ------------------------------------------------------ */
          const wash = q("[data-wash]")[0];
          let dark = false;
          let surfaceFrame = 0;

          const readSurface = () => {
            surfaceFrame = 0;
            const rect = root.getBoundingClientRect();
            const vh = window.innerHeight;
            const ramp = vh * SURFACE_RAMP;

            // In as the section's top climbs the last 40vh to the pin;
            // out as its bottom clears the viewport by the same 40vh —
            // which is exactly when the photograph has finished, so the
            // two transitions never run at once.
            const entering = gsap.utils.clamp(0, 1, (ramp - rect.top) / ramp);
            const leaving = gsap.utils.clamp(
              0,
              1,
              (rect.bottom - (vh - ramp)) / ramp,
            );
            const level = Math.min(entering, leaving);

            if (wash) gsap.set(wash, { opacity: level });

            /*
             * The wash stays dark through the finale, but what is behind
             * the fixed pills by then is not the wash — it is a bright
             * photograph filling the viewport. Leaving them in their
             * dark variant put bone-white type on a white worktop.
             * So the surface flag also closes once the photograph has
             * substantially arrived, a beat before the exit ramp starts.
             */
            const pinned = gsap.utils.clamp(
              0,
              1,
              -rect.top / Math.max(1, root.offsetHeight - vh),
            );
            const litByPhoto =
              pinned > (built.at + built.dur * 0.3) / TIMELINE;

            const wantDark = level > 0.55 && !litByPhoto;
            const keepDark = level > 0.45 && !litByPhoto;

            if (!dark && wantDark) {
              dark = true;
              document.documentElement.setAttribute("data-surface", "dark");
            } else if (dark && !keepDark) {
              dark = false;
              document.documentElement.removeAttribute("data-surface");
            }
          };

          const onSurfaceScroll = () => {
            if (!surfaceFrame) surfaceFrame = requestAnimationFrame(readSurface);
          };

          const surfaceListeners = new AbortController();
          window.addEventListener("scroll", onSurfaceScroll, {
            passive: true,
            signal: surfaceListeners.signal,
          });
          window.addEventListener("resize", onSurfaceScroll, {
            passive: true,
            signal: surfaceListeners.signal,
          });
          readSurface();

          cleanups.push(() => {
            surfaceListeners.abort();
            if (surfaceFrame) cancelAnimationFrame(surfaceFrame);
            document.documentElement.removeAttribute("data-surface");
          });

          cleanups.push(() => {
            observer.disconnect();
            pointer.abort();
            root.removeAttribute("data-live");
            tl.scrollTrigger?.kill();
            tl.kill();
            splits.forEach((s) => s.revert());
            hidden.forEach((el) => gsap.set(el, { clearProps: "display" }));
          });

          return () => cleanups.forEach((fn) => fn());
        },
      );

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /* -------------------------------------------------------------------
   * MARKUP
   * ---------------------------------------------------------------- */

  return (
    <section
      ref={rootRef}
      id="drawing"
      data-static
      data-drawing
      data-surface="dark"
      aria-labelledby="drawing-title"
      className="relative"
    >
      {/*
        THE SURFACE WASH. Fixed rather than absolute, and at z-index -1 so
        it covers the body's sand without covering any content: the page
        has to be dark BEFORE this section reaches the top of the screen,
        and a wash that scrolls with the section can only arrive with it.
        Its opacity is the entry and exit ramp.
      */}
      <div
        data-wash
        aria-hidden="true"
        className="dwg-surface pointer-events-none fixed inset-0 -z-1 opacity-0"
      >
        <div className="dwg-noise absolute inset-0" />
      </div>

      {/*
        The scroller is exactly one viewport taller than the pin, derived
        rather than typed. Hard-coding 400svh against a 340vh timeline —
        which is what happened when the pin was extended for the hold —
        leaves the last 40vh of the choreography playing after the sticky
        stage has already let go, so the finale and inspect mode both fire
        somewhere off the bottom of the section.
      */}
      <div
        className="relative"
        data-scroller
        style={{ height: `${100 + SCROLL_LENGTH}svh` }}
      >
        <div data-stage className="sticky top-0 flex h-svh flex-col overflow-hidden">
          {/*
            LAYERS, back to front: the photograph waiting underneath, the
            paper it is all drawn on, the light falling on that paper, the
            sheet itself, its border, and the copy on top.

            The sheet is full-bleed rather than a column in a grid — it is
            the subject of the section, and a 3600 mm run boxed into eight
            of twelve columns reads as an illustration of a drawing rather
            than as one.
          */}
          <div data-photo className="absolute inset-0">
            <Image
              src={src(IMAGES.drawingReality, 2000)}
              alt={t("photoAlt")}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="dwg-scrim absolute inset-0" />
          </div>

          <div
            data-grid
            aria-hidden="true"
            className="dwg-grid pointer-events-none absolute inset-0"
          />
          <div
            data-glow
            aria-hidden="true"
            className="dwg-glow pointer-events-none absolute inset-0"
          />

          {/* The border and its four registration ticks. */}
          <div
            data-frame
            aria-hidden="true"
            className="dwg-frame pointer-events-none absolute inset-3 sm:inset-5 lg:inset-7"
          >
            <span className="dwg-tick -top-px -left-px border-t border-l" />
            <span className="dwg-tick -top-px -right-px border-t border-r" />
            <span className="dwg-tick -bottom-px -left-px border-b border-l" />
            <span className="dwg-tick -right-px -bottom-px border-r border-b" />
          </div>

          {/*
            The copy sits in a panel rather than loose on the sheet. A
            full-bleed drawing leaves no empty corner to put type in — the
            first cut ran the eyebrow straight through the wall units —
            and a drawing's own answer to that problem is a title panel.
            It also solves the second half of the problem for free: the
            same panel keeps the copy legible once the photograph is
            underneath it.
          */}
          {/* Copy sits directly on the surface. The card the light
              version needed is gone — on charcoal a panel reads as a
              patch, and the wash behind the text does the same job with
              no edge to see. */}
          <div
            data-copy
            className="pointer-events-none absolute inset-x-0 top-0 z-20 px-6 pt-20 sm:px-10 sm:pt-24 lg:px-14 lg:pt-28"
          >
            <div
              aria-hidden="true"
              className="dwg-copy-wash pointer-events-none absolute -top-10 -left-10 h-[26rem] w-[46rem] max-w-[140%]"
            />
            <div data-panel className="relative max-w-[34ch]">
              <p className="u-eyebrow flex items-center gap-3 text-[var(--dwg-bone-dim)]!">
                <span aria-hidden="true" className="text-[var(--dwg-gold)]">
                  {t("index")}
                </span>
                {t("eyebrow")}
              </p>

              {/*
                The three beats share one stacked cell at EVERY width —
                they are sequential, never concurrent, so giving each its
                own row would reserve two empty paragraphs' worth of the
                390px viewport for copy that is not on screen. The static
                stylesheet un-stacks them for the no-JS and reduced-motion
                readers, who get all three as an ordinary column.
              */}
              {/* Reserved for the tallest beat and no more — the beats
                  are absolute, so this height is the panel's height, and
                  an over-generous value leaves a large empty box on the
                  sheet through the whole approved hold. */}
              <div className="relative mt-3 min-h-[7rem] sm:min-h-[7.5rem] lg:mt-4 lg:min-h-[8.5rem]">
                <h2
                  data-beat="1"
                  id="drawing-title"
                  className="u-display absolute inset-x-0 top-0 text-[clamp(2rem,9vw,4rem)] text-[var(--dwg-bone)]"
                >
                  {t("title")}
                </h2>
                {/* One word per beat carries the emphasis, in gold
                    italic. The markup lives in the message so each locale
                    can emphasise its own word rather than a translated
                    position — Georgian and Russian do not put the load on
                    the same part of the sentence English does. */}
                <p
                  data-beat="2"
                  className="u-display absolute inset-x-0 top-0 max-w-[26ch] text-[clamp(1.05rem,4.4vw,1.75rem)] leading-[1.3]! text-[var(--dwg-bone-soft)]"
                >
                  {t.rich("beatTwo", { em: (chunks) => <em>{chunks}</em> })}
                </p>
                <p
                  data-beat="3"
                  className="u-display absolute inset-x-0 top-0 max-w-[26ch] text-[clamp(1.05rem,4.4vw,1.75rem)] leading-[1.3]! text-[var(--dwg-bone)]"
                >
                  {t.rich("beatThree", { em: (chunks) => <em>{chunks}</em> })}
                </p>
              </div>
            </div>
          </div>

          {/* The sheet, edge to edge. */}
          <svg
            data-sheet
            viewBox={`${SHEET.handheld.x} ${SHEET.handheld.y} ${SHEET.handheld.w} ${SHEET.handheld.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-labelledby="drawing-svg-title drawing-svg-desc"
            className="dwg pointer-events-none absolute inset-0 z-10 block h-full w-full"
          >
                <title id="drawing-svg-title">{t("svgTitle")}</title>
                <desc id="drawing-svg-desc">{t("svgDesc")}</desc>

            <ElevationScene
              scene={scene}
              unitLabel={(hit) =>
                `${t(`units.${hit.type}`)} — ${hit.w} × ${hit.h} × ${hit.d3} mm`
              }
            />
              </svg>

              {/*
                THE CORNER. One block, one column, in document order —
                title, units note, readout. The title block used to live
                inside the SVG at the bottom of the viewBox while the
                readout was DOM at the bottom of the stage, and on a
                full-bleed sheet those two coordinate systems put them on
                the same line. Nothing here can overlap anything else,
                because it is one flex column.
              */}
              <div
                aria-hidden="true"
                className="dwg-corner pointer-events-none absolute right-0 bottom-0 z-20 flex flex-col items-end gap-1 px-6 pb-6 text-right sm:px-10 sm:pb-8 lg:px-14 lg:pb-10"
              >
                <p className="dwg-note-dom">
                  KENCHO — {t("sheet")} · {t("scaleLabel")} 1:20
                </p>
                <p className="dwg-note-dom">{t("unitsNote")}</p>
                <p className="dwg-readout mt-1 flex items-center gap-3">
                  <span data-readout-pct className="tabular-nums">
                    000%
                  </span>
                  <span data-readout-stage>{t("stages.carcass")}</span>
                </p>
              </div>

              {/*
                INSPECT MODE's readout. A typographic block, not a card:
                a gold rule, the unit's name, its size in mono, and the
                material. Positioned from JS so it always lands on the
                side of the viewport the unit is NOT on.
              */}
              <div
                data-spec
                aria-live="polite"
                className="dwg-spec pointer-events-none absolute z-30 opacity-0"
              >
                <span aria-hidden="true" className="dwg-spec-rule" />
                <p data-spec-name className="dwg-spec-name" />
                <p data-spec-size className="dwg-spec-size" />
                <p data-spec-material className="dwg-spec-material" />
              </div>

              {/* The invitation, during the hold. */}
              <p
                data-hint
                className="dwg-hint pointer-events-none absolute inset-x-0 bottom-0 z-20 px-6 pb-6 text-center opacity-0 sm:pb-8 lg:pb-10"
              >
                {t("inspectHint")}
              </p>
        </div>
      </div>
    </section>
  );
}
