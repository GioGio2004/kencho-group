"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IMAGES, src } from "@/lib/images";
import ElevationScene from "@/app/_components/ElevationScene";
import {
  DIM,
  K01,
  WAVES,
  WEIGHT,
  buildScene,
  type SceneHit,
} from "@/lib/elevation";
import {
  GHOST_OPACITY,
  PANEL_TINT,
  PRINT,
  SCROLL_LENGTH,
  SHEET,
  SHEET_BREAKPOINT,
  STAGE,
  TIMELINE,
  WAVE_AT,
  WAVE_DUR,
  stageProgressAt,
} from "@/lib/drawing";
import { DUR, EASE, MASK_DESCENDER, smoothstep } from "@/lib/motion";

/*
 * THE DRAWING — the sheet the workshop builds from, drawing itself.
 *
 * A front elevation of a 3600 mm kitchen assembles line by line as the
 * section is scrolled: carcasses, panels, fronts, worktop, appliances,
 * details, then the dimensions, each measurement counting up to its own
 * value. It holds for a beat as an approved sheet — and then the sheet
 * is sent to OUTPUT: the chains and the paper clear, the linework
 * settles to a ghost, and a gold print head sweeps the viewport left to
 * right with the photograph of the built kitchen laid down behind it.
 * The ghost holds over the printed reality for a long beat, then leaves.
 * Scroll back up and the plot runs in reverse — the machine unprints.
 *
 * The argument the section is making is the company's: precision first,
 * then reality. Nothing here is decorative "technical" styling — the
 * SVG's user units ARE millimetres, every dimension is measured off the
 * geometry rather than typed next to it (lib/drawing.ts), the readout
 * counts every phase of the job to its own 100%, and the elevation is
 * the arrangement in the finale photograph, so the print edge is always
 * revealing the thing the drawing already promised.
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
const TIP_PX = 30;

/** Hot-ink weight multiplier: what a stroke goes down at, before it
 *  cures to its documented weight. High enough to read as molten
 *  against the finished sheet, low enough that a curing line still
 *  reads as the same line rather than as a replacement. */
const HEAT = 1.85;

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
          /*
           * THE STARFIELD BUG.
           *
           * `scale: 0` alone does NOT hide these. A handle is a two-point
           * <path> with `stroke-linecap: round`, and a round cap on a
           * zero-length stroke is a filled CIRCLE of the stroke's own
           * width — so scaling forty handles to nothing left forty
           * bone-white dots scattered over the sheet, which on charcoal
           * read as a night sky. Invisible on paper, obvious on coal,
           * and shipped for as long as the section had existed.
           *
           * `autoAlpha` is what actually removes them; the scale stays
           * because it is what makes them pop rather than fade.
           */
          gsap.set(live("[data-pop]"), {
            scale: 0,
            autoAlpha: 0,
            transformOrigin: "50% 50%",
          });
          gsap.set(qsa("[data-tint]"), { opacity: 0 });
          gsap.set(qsa("[data-chain] text"), { opacity: 0 });
          // K-01 has no tall units, so this sheet carries no written
          // notes — but the scene builder emits them for any spec that
          // does, and a note left out of every stage would sit at full
          // dashoffset forever. Same class of bug as the title block's
          // rule below; handled rather than left to be rediscovered.
          gsap.set(qsa("#notes text"), { opacity: 0 });
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
                // Per-PHASE progress, not overall: the readout is a
                // plotter's job line, and a plotter reports the pass it
                // is on. Every phase counts 000% to its own 100%, resets
                // on hand-off, and the section signs off at 100% BUILT.
                const job = stageProgressAt(self.progress);
                if (label) label.textContent = t(`stages.${job.stage}`);
                if (pct) {
                  pct.textContent = `${String(Math.round(job.pct * 100)).padStart(3, "0")}%`;
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

          const heated: SVGGElement[] = [];

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

            /*
             * HOT INK. The group's strokes go down at HEAT× weight and
             * cure to the documented line while the stage hands over —
             * the cure deliberately outlives its slot, so a cooling
             * group is always visible behind the one being drawn. The
             * multiplier rides a CSS variable the halo clones inherit,
             * which is what makes the glow swell and settle with the
             * line for zero extra tweens. Groups, not paths: 95 curing
             * strokes would be 95 tweens saying the same thing.
             */
            const groups = selector
              .split(",")
              .map((s) => s.trim().split(" ")[0])
              .filter((id): id is string => !!id && id.startsWith("#"))
              .map((id) => svg.querySelector<SVGGElement>(id))
              .filter((g): g is SVGGElement => !!g);
            if (groups.length) {
              heated.push(...groups);
              gsap.set(groups, { "--dwg-heat": HEAT });
              tl.to(
                groups,
                {
                  "--dwg-heat": 1,
                  duration: slot.dur * 0.6,
                  ease: smoothstep,
                },
                slot.at + slot.dur * 0.55,
              );
            }

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
                autoAlpha: 1,
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
          draw(
            "#details [data-draw], #titleblock [data-draw], #notes [data-draw]",
            STAGE.details,
          );
          pop("#notes [data-pop]", STAGE.details);
          const noteText = qsa("#notes text");
          if (noteText.length) {
            tl.to(
              noteText,
              { opacity: 1, duration: STAGE.details.dur * 0.4 },
              STAGE.details.at + STAGE.details.dur * 0.6,
            );
          }
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
                autoAlpha: 1,
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
           * ATMOSPHERE — paper, then light.
           *
           * Opacity only. A glow is normally a `filter`, and a filter on
           * a scrubbed full-viewport layer repaints the whole thing every
           * frame; these are gradients that were always there, being
           * faded up. The paper arrives before the first line, because
           * nobody draws on a sheet that is not on the table yet. The
           * exits live in the print below — the paper leaves when the
           * sheet is released to output, not on a clock of its own.
           * ------------------------------------------------------ */
          const grid = q("[data-grid]")[0];
          const glow = q("[data-glow]")[0];
          const frameEl = q("[data-frame]")[0];
          gsap.set([grid, glow, frameEl].filter(Boolean), { opacity: 0 });

          if (grid) tl.to(grid, { opacity: 1, duration: 1.2 }, 0);
          if (frameEl) tl.to(frameEl, { opacity: 1, duration: 1.6 }, 0.4);
          if (glow) {
            tl.to(glow, { opacity: 0.7, duration: 2.4 }, 0.6);
            // The sheet is brightest at the moment it is signed off.
            tl.to(glow, { opacity: 1, duration: 1.6, ease: smoothstep }, STAGE.dims.at);
          }

          /* ---------------------------------------------------------
           * THE PRINT — the money shot, and it is a plot, not a fade.
           *
           * The approved sheet is released to output. In this order:
           * the chains and the paper clear and the linework settles to
           * a ghost; the gold head arrives; the head sweeps the
           * viewport left to right with the photograph of the built
           * kitchen laid down behind it; the ghost holds over the
           * printed reality for a long beat; the ghost leaves. The
           * photograph sits BELOW every drawing layer, so the
           * ghost-over-reality moment costs nothing — by the end of the
           * sweep the sheet simply has nothing under it any more except
           * the thing it promised.
           *
           * ONE NUMBER DRIVES THE EDGE. The head is translateX'd by
           * --print-x and the photograph's clip is inset by
           * calc(100% − --print-x): one custom property, tweened once,
           * read by both. Two parallel tweens — a transform and a clip
           * — would drift under scrub lag by exactly the amount that
           * turns a print edge into a crossfade.
           *
           * THE HEAD RUNS LINEAR. Everything else in the section eases;
           * the head must not. Constant feed is the difference between
           * a machine laying down reality and a slide changing.
           * ------------------------------------------------------ */
          const output = STAGE.output;
          const built = STAGE.built;
          const sweep = {
            at: output.at + PRINT.sweep.at,
            dur: PRINT.sweep.dur,
          };
          const head = q("[data-head]")[0];

          // Release to print: measurements off, paper off, line weight
          // down to a ghost. The drawing stops being a document and
          // becomes a preview of what the head is about to lay down.
          tl.to(
            qsa("[data-chain]"),
            { opacity: 0, duration: PRINT.settle.dur, ease: smoothstep },
            output.at,
          );
          const paper = [grid, frameEl].filter(Boolean);
          if (paper.length) {
            tl.to(
              paper,
              { opacity: 0, duration: PRINT.settle.dur, ease: smoothstep },
              output.at,
            );
          }
          if (sheet) {
            tl.to(
              sheet,
              {
                opacity: GHOST_OPACITY,
                duration: PRINT.settle.dur,
                ease: smoothstep,
              },
              output.at,
            );
          }

          /*
           * The trace arrives with the settle: as the engineering sheet
           * recedes to a ghost, the pencil study of the finished room
           * develops in its place — the drawing re-registering onto
           * reality before the head starts to print. Clipped to the
           * complement of the head's variable, so it exists only where
           * the photograph does not yet; the sweep consumes it and
           * scrubbing back restores it, with nothing to fade out.
           */
          const trace = q("[data-trace]")[0];
          if (trace) {
            gsap.set(trace, {
              opacity: 0,
              clipPath: "inset(0% 0% 0% var(--print-x, 0%))",
            });
            tl.to(
              trace,
              { opacity: 0.9, duration: PRINT.settle.dur, ease: smoothstep },
              output.at,
            );
            cleanups.push(() =>
              gsap.set(trace, { clearProps: "opacity,clipPath" }),
            );
          }

          if (photo) {
            /*
             * The print itself. The photograph is clipped to the head's
             * own variable, so reality only ever exists where the head
             * has already passed. Its opacity flips on while the clip
             * still hides everything — the one moment a flip cannot be
             * seen — and reverses the same way.
             *
             * The lights still come on: brightness rides up under the
             * sweep, so the room warms as it is printed rather than
             * arriving developed. `filter` is normally banned in this
             * codebase's scroll vocabulary, and this is still the one
             * place it earns its keep: a single element, for one beat,
             * at the moment the section exists for.
             */
            gsap.set(stage, { "--print-x": "0%" });
            gsap.set(photo, {
              clipPath: "inset(0% calc(100% - var(--print-x, 0%)) 0% 0%)",
              filter: "brightness(0.5) saturate(0.9)",
            });
            tl.set(photo, { opacity: 1 }, sweep.at - 0.05);
            tl.to(
              stage,
              { "--print-x": "100%", duration: sweep.dur },
              sweep.at,
            );
            tl.to(
              photo,
              {
                filter: "brightness(1) saturate(1)",
                duration: sweep.dur * 0.7,
                ease: smoothstep,
              },
              sweep.at + sweep.dur * 0.15,
            );
            cleanups.push(() => {
              gsap.set(photo, { clearProps: "filter,clipPath,opacity" });
              (stage as HTMLElement).style.removeProperty("--print-x");
            });
          }

          if (head) {
            // The gantry arrives just before the cut and lifts as it
            // clears the far edge. autoAlpha, so the parked machine is
            // not even in the hit-test tree.
            gsap.set(head, { autoAlpha: 0 });
            tl.to(
              head,
              { autoAlpha: 1, duration: 0.3, ease: smoothstep },
              sweep.at - 0.3,
            );
            tl.to(
              head,
              { autoAlpha: 0, duration: 0.35, ease: smoothstep },
              sweep.at + sweep.dur - 0.1,
            );
          }

          // The reading light dies across the sweep — by the time the
          // head clears the far edge the room is lit by its own photo.
          if (glow) {
            tl.to(
              glow,
              { opacity: 0, duration: sweep.dur * 0.8, ease: smoothstep },
              sweep.at,
            );
          }

          /*
           * The overlay hold. Ghost linework over printed reality — the
           * two compositions landing on each other is still the whole
           * argument — and it has to be authored as dead time, same as
           * ever: run the ghost straight into its own fade and the
           * moment lasts two frames. It holds for seven tenths of the
           * built stage, and only then does the drawing leave the
           * photograph to speak for itself.
           */
          if (sheet) {
            tl.to(
              sheet,
              { opacity: 0, duration: built.dur * 0.25, ease: smoothstep },
              built.at + built.dur * 0.7,
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
            /*
             * The closing line lands WHILE reality is printing — "we
             * build exactly this" is strongest said over the head that
             * is currently doing it, not after the job is finished.
             */
            {
              sel: "[data-beat='3']",
              in: sweep.at + sweep.dur * 0.3,
              out: TIMELINE,
            },
          ];

          document.fonts.ready.then(() => {
            ctx.add(() => {
              beatSlots.forEach((slot, i) => {
                const el = q(slot.sel)[0] as HTMLElement | undefined;
                if (!el) return;
                const split = SplitText.create(el, {
                  type: "lines",
                  mask: "lines",
                  // aria-label is permitted on the h2 and prohibited on
                  // the two <p> beats (paragraph role) — see RevealText.
                  aria: /^H[1-6]$/.test(el.tagName) ? "auto" : "none",
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

                /*
                 * The planner link belongs to the closing beat, so it
                 * arrives with it and holds with it. `autoAlpha` rather
                 * than `opacity`: an invisible link that is still in the
                 * tab order is a keyboard trap in an otherwise empty
                 * section, and this is a link rather than a heading, so
                 * taking it out of the accessibility tree while it is
                 * not being offered is the correct reading.
                 */
                if (i === beatSlots.length - 1) {
                  const cta = q("[data-cta]")[0];
                  if (cta) {
                    gsap.set(cta, { autoAlpha: 0, y: 14 });
                    tl.to(
                      cta,
                      {
                        autoAlpha: 1,
                        y: 0,
                        duration: span * 0.14,
                        ease: EASE.narrative,
                      },
                      slot.in + span * 0.12,
                    );
                  }
                }

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
             * before it there is a sheet still being drawn, and after
             * it the machine is printing. The units are only focusable
             * inside it too, so a keyboard visitor scrolling past never
             * lands on nine invisible buttons.
             */
            const gateOpen = STAGE.approved.at / TIMELINE;
            const gateShut = output.at / TIMELINE;
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
           * The `data-chapter` flip on <html> tells the fixed header it
           * is over the deep surface rather than the page one. It used to
           * say `data-surface="dark"` and force a charcoal theme onto a
           * light page — which is precisely why this section read as a
           * different website for four screens. The sheet now takes its
           * ink and its paper from whatever theme is running, so all
           * this has left to announce is the change of DEPTH.
           *
           * It carries HYSTERESIS: flipping on a bare 0.5 crossing makes
           * a fast scroll across the boundary strobe, because the wash
           * opacity dithers either side of the threshold. Enter at 0.55,
           * leave at 0.45, and the flip happens once in each direction no
           * matter how fast the crossing is.
           * ------------------------------------------------------ */
          const wash = q("[data-wash]")[0];
          let deep = false;
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
             * The wash holds through the print, but what is behind the
             * fixed pills by then is not the wash — it is a bright
             * photograph being laid across the viewport. The flag
             * closes when the head crosses the centre line: from that
             * frame on, most of what is under the header is photo.
             */
            const pinned = gsap.utils.clamp(
              0,
              1,
              -rect.top / Math.max(1, root.offsetHeight - vh),
            );
            const litByPhoto =
              pinned > (sweep.at + sweep.dur * 0.5) / TIMELINE;

            const wantDeep = level > 0.55 && !litByPhoto;
            const keepDeep = level > 0.45 && !litByPhoto;

            if (!deep && wantDeep) {
              deep = true;
              document.documentElement.setAttribute("data-chapter", "drawing");
            } else if (deep && !keepDeep) {
              deep = false;
              document.documentElement.removeAttribute("data-chapter");
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
            document.documentElement.removeAttribute("data-chapter");
          });

          cleanups.push(() => {
            observer.disconnect();
            pointer.abort();
            root.removeAttribute("data-live");
            tl.scrollTrigger?.kill();
            tl.kill();
            splits.forEach((s) => s.revert());
            hidden.forEach((el) => gsap.set(el, { clearProps: "display" }));
            heated.forEach((g) => g.style.removeProperty("--dwg-heat"));
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
          {/*
            THE TRACE — a graphite rendering generated from the finale
            photograph itself, so ahead of the print head the visitor is
            looking at a pencil study of EXACTLY the image being laid
            down behind it. Clipped to the complement of --print-x: the
            head is the seam where the study becomes the thing. Below
            the photograph in the stack, so the printed side needs no
            masking at all.
          */}
          <div data-trace aria-hidden="true" className="dwg-trace absolute inset-0">
            <Image
              src={src(IMAGES.drawingTrace, 2000)}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>

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

              {/*
                THE HAND-OFF. The section's argument ends at "then we
                build exactly this" — which is the moment the visitor has
                the most reason to want a sheet of their own, and the
                only moment on the page where they have just watched one
                being made. The planner link belongs here rather than in
                the nav for the same reason a showroom puts the order
                desk at the end of the floor.

                Outside the stacked beat cell, so SplitText never sees
                it, and `pointer-events-auto` because the copy layer it
                sits in is deliberately transparent to the pointer.
              */}
              <Link
                data-cta
                href="/planner"
                className="dwg-cta u-press pointer-events-auto mt-6 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 lg:mt-8"
              >
                {t("plannerCta")}
                <span aria-hidden="true">→</span>
              </Link>
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
              noteLabel={(note) => t(`notes.${note.key}`)}
            />
              </svg>

              {/*
                THE PRINT HEAD. A stage-sized wrapper moved by
                translateX(var(--print-x)) — a percentage translate of a
                full-width element IS a percentage of the stage, which
                keeps the sweep on the compositor and off layout. The
                photograph's clip reads the same variable, so the gantry
                line and the print edge are one number. Above the sheet,
                below the copy; GSAP owns its visibility.
              */}
              <div
                data-head
                aria-hidden="true"
                className="dwg-head pointer-events-none absolute inset-0 z-[15] opacity-0"
              >
                <span className="dwg-head-trail" />
                <span className="dwg-head-halo" />
                <span className="dwg-head-line" />
                <span className="dwg-head-cap dwg-head-cap-t" />
                <span className="dwg-head-cap dwg-head-cap-b" />
              </div>

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
