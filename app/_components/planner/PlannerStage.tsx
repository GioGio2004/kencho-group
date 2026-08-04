"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import ElevationScene from "@/app/_components/ElevationScene";
import {
  GROUP_ORDER,
  WEIGHT,
  type KitchenSpec,
  type Scene,
} from "@/lib/elevation";
import { PANEL_TINT } from "@/lib/drawing";
import { REDRAW } from "@/lib/planner";
import { EASE } from "@/lib/motion";

/*
 * THE PLANNER'S STAGE — the same sheet, amended rather than replayed.
 *
 * The drawing is a pure function of the spec, so the honest thing to do
 * on every edit is throw the SVG away and render a new one. That reads
 * as a page refresh: ninety strokes blinking because one cabinet got
 * 50 mm wider tells the visitor nothing about what they just changed.
 *
 * So the sheet is diffed. The scene builder returns each group's paths
 * as strings, which makes "did the carcass move?" a string comparison
 * rather than a guess — and only the groups whose geometry actually
 * changed are re-drawn, in the same 0.4s stroke-on the section uses at
 * length. Past half the sheet the whole thing redraws instead: at that
 * point "only what changed" is most of it, and animating it in pieces
 * reads as a glitch rather than as an amendment.
 *
 * THE ANIMATION IS DECORATION, AND THAT IS LOAD-BEARING. React renders
 * the finished sheet — every path complete, every dimension at its real
 * number — and GSAP then winds it back and plays it forward. So a cold
 * load, a restored session, reduced motion and a dead bundle all show a
 * correct drawing rather than a blank frame waiting for an effect. The
 * numbers on this sheet are never produced by an animation, for the same
 * reason the section's counters are computed from scroll position: a
 * value that only exists while a tween is rendering is a value that is
 * wrong every other time.
 */

interface Props {
  spec: KitchenSpec;
  scene: Scene;
  /** The module the rail has selected, outlined on the sheet. */
  selected: string | null;
  /**
   * False until the client has resolved the stored spec and the sheet's
   * framing. Holds the intro draw back so it plays once, against the
   * kitchen the visitor is actually going to see.
   */
  ready: boolean;
}

/** Signature of a scene, for the diff. */
function signature(scene: Scene) {
  const groups: Record<string, string> = {};
  for (const group of scene.groups) {
    groups[group.id] = group.paths.map((p) => p.d).join("|");
  }
  groups.notes = scene.notes
    .map((n) => `${n.key}:${n.x}:${n.paths.map((p) => p.d).join("|")}`)
    .join("~");

  const chains: Record<string, string> = {};
  const values: Record<string, number[]> = {};
  for (const chain of scene.chains) {
    chains[chain.id] = chain.paths.map((p) => p.d).join("|");
    values[chain.id] = chain.labels.map((l) => l.value);
  }

  return { groups, chains, values };
}

/** Every group the sheet can have, including the note layer. */
const LAYERS: readonly string[] = [...GROUP_ORDER, "notes"];

export default function PlannerStage({ spec, scene, selected, ready }: Props) {
  const t = useTranslations("planner");
  const td = useTranslations("drawing");
  const svgRef = useRef<SVGSVGElement>(null);
  const prevRef = useRef<ReturnType<typeof signature> | null>(null);

  const { viewBox } = scene;

  /* -------------------------------------------------------------------
   * LINE WEIGHT
   *
   * User units are millimetres and the sheet is scaled to fit, so the
   * conversion has to be re-run whenever EITHER the box or the drawing
   * changes size — and in this planner the drawing changes size for a
   * reason the section never had: a 1200 mm kitchen and a 6000 mm one
   * are different viewBoxes. A weight computed once at mount would leave
   * a wide kitchen drawn in hairlines and a narrow one in rope.
   *
   * `meet` fits the SHORTER axis, so the scale is the smaller of the two
   * ratios. Taking the width alone silently under-reports the weight on
   * any sheet the height constrains.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const apply = () => {
      const box = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const scale = Math.min(box.width / viewBox.w, box.height / viewBox.h);
      if (!scale) return;
      const mmPerPx = 1 / scale;
      svg.style.setProperty("--dwg-line", `${WEIGHT.line * mmPerPx}`);
      svg.style.setProperty("--dwg-dim", `${WEIGHT.dim * mmPerPx}`);
      svg.style.setProperty("--dwg-label", `${WEIGHT.label * mmPerPx}px`);
      svg.style.setProperty("--dwg-note", `${WEIGHT.note * mmPerPx}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [viewBox.w, viewBox.h]);

  /* -------------------------------------------------------------------
   * THE REDRAW
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !ready) return;

    const sig = signature(scene);
    const prev = prevRef.current;
    prevRef.current = sig;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The first pass after hydration draws the whole sheet — the
    // planner's one piece of theatre, and the same gesture the section
    // spends a full screen on.
    const first = !prev;
    const movedLayers = first
      ? LAYERS.slice()
      : LAYERS.filter((id) => sig.groups[id] !== prev.groups[id]);

    const movedChains = first
      ? scene.chains.map((c) => c.id)
      : scene.chains
          .filter((c) => sig.chains[c.id] !== prev.chains[c.id])
          .map((c) => c.id);

    if (!movedLayers.length && !movedChains.length) return;

    // Past half the sheet, "only what changed" is most of it.
    const wholeSheet =
      first || movedLayers.length / LAYERS.length > REDRAW.full;
    const layers = wholeSheet ? LAYERS.slice() : movedLayers;
    const chains = wholeSheet ? scene.chains.map((c) => c.id) : movedChains;

    const pick = <T extends Element>(selector: string) =>
      Array.from(svg.querySelectorAll<T>(selector));

    const strokes: SVGGeometryElement[] = [];
    const heads: SVGGeometryElement[] = [];
    for (const id of layers) {
      strokes.push(...pick<SVGGeometryElement>(`#${id} [data-draw]`));
      heads.push(...pick<SVGGeometryElement>(`#${id} [data-pop]`));
    }
    for (const id of chains) {
      strokes.push(
        ...pick<SVGGeometryElement>(`[data-chain="${id}"] [data-draw]`),
      );
      heads.push(
        ...pick<SVGGeometryElement>(`[data-chain="${id}"] [data-pop]`),
      );
    }

    const tweens: gsap.core.Tween[] = [];

    if (strokes.length) {
      strokes.forEach((el) => {
        const len = el.getTotalLength();
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      });
      tweens.push(
        gsap.to(strokes, {
          strokeDashoffset: 0,
          duration: REDRAW.duration,
          ease: EASE.narrative,
          stagger: { amount: REDRAW.stagger },
          clearProps: "strokeDasharray,strokeDashoffset",
        }),
      );
    }

    if (heads.length) {
      // autoAlpha too — a round-capped zero-length stroke paints a dot.
      gsap.set(heads, { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%" });
      tweens.push(
        gsap.to(heads, {
          scale: 1,
          autoAlpha: 1,
          duration: REDRAW.duration * 0.5,
          ease: EASE.pop,
          stagger: { amount: REDRAW.stagger },
          delay: REDRAW.duration * 0.4,
          clearProps: "scale,opacity,visibility,transformOrigin",
        }),
      );
    }

    /*
     * COUNT-UP, on changed values only.
     *
     * A chain whose numbers did not move must not re-count: five
     * dimensions rolling because a sixth cabinet appeared says the whole
     * run was re-measured, which is exactly the impression a drawing
     * must not give.
     *
     * Never runs on the first pass. The sheet's numbers are correct in
     * the server's markup, and rolling them up from zero on load would
     * mean a screenshot — or a visitor — arriving mid-roll reads a
     * kitchen that does not exist.
     */
    const counted: SVGTextElement[] = [];
    if (!first) {
      for (const chain of scene.chains) {
        const before = prev.values[chain.id];
        if (!before) continue;
        const texts = pick<SVGTextElement>(
          `[data-chain="${chain.id}"] text`,
        );
        texts.forEach((el, i) => {
          const to = chain.labels[i]?.value;
          const from = before[i];
          if (to === undefined || from === undefined || from === to) return;
          const roll = { v: from };
          counted.push(el);
          /*
           * The starting value is written by the tween, never here.
           * React has already put the CORRECT number in the DOM, and a
           * synchronous write back to the old one would leave it there
           * for as long as the ticker takes to run — which, in a tab the
           * browser has stopped compositing, is indefinitely. Let the
           * roll own the wrong values and only the wrong values.
           */
          tweens.push(
            gsap.to(roll, {
              v: to,
              duration: REDRAW.duration,
              ease: EASE.narrative,
              onUpdate: () => {
                el.textContent = String(Math.round(roll.v));
              },
              onComplete: () => {
                el.textContent = String(to);
              },
            }),
          );
        });
      }
    }

    return () => {
      /*
       * A killed draw-on must never leave a stroke half laid down or a
       * dimension mid-roll. Every property this effect touched is put
       * back to the finished state React already rendered, so an edit
       * arriving during an animation lands on a complete sheet.
       */
      tweens.forEach((tween) => tween.kill());
      if (strokes.length) {
        gsap.set(strokes, { clearProps: "strokeDasharray,strokeDashoffset" });
      }
      if (heads.length) {
        gsap.set(heads, { clearProps: "scale,opacity,visibility,transformOrigin" });
      }
      counted.forEach((el) => {
        el.textContent = el.dataset.value ?? el.textContent;
      });
    };
  }, [scene, ready]);

  const summary = t("stage.aria", {
    wall: spec.wallWidth,
    modules: spec.baseUnits.length,
  });

  return (
    <div data-plan-stage className="plan-stage">
      <div aria-hidden="true" className="dwg-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="dwg-frame pointer-events-none absolute inset-3 sm:inset-4"
      >
        <span className="dwg-tick -top-px -left-px border-t border-l" />
        <span className="dwg-tick -top-px -right-px border-t border-r" />
        <span className="dwg-tick -bottom-px -left-px border-b border-l" />
        <span className="dwg-tick -right-px -bottom-px border-r border-b" />
      </div>

      <svg
        ref={svgRef}
        data-sheet
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={summary}
        className="dwg plan-sheet"
      >
        <ElevationScene
          scene={scene}
          halo={false}
          interactive={false}
          tint={PANEL_TINT}
          highlight={selected}
          unitLabel={(hit) =>
            `${td(`units.${hit.type}`)} — ${hit.w} × ${hit.h} × ${hit.d3} mm`
          }
          noteLabel={(note) => td(`notes.${note.key}`)}
        />
      </svg>

      {/* The corner block, same three lines and same order as the sheet
          the section draws — this is the same drawing, so it carries the
          same title block. */}
      <div
        aria-hidden="true"
        className="dwg-corner pointer-events-none absolute right-0 bottom-0 flex flex-col items-end gap-1 px-5 pb-4 text-right sm:px-7 sm:pb-6"
      >
        <p className="dwg-note-dom">
          KENCHO — {t("stage.sheet")} · {td("scaleLabel")} 1:20
        </p>
        <p className="dwg-note-dom">{td("unitsNote")}</p>
      </div>
    </div>
  );
}
