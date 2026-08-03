"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EASE, MORPH, REFLOW_STAGGER, SCRUB } from "@/lib/motion";

/*
 * WORDMORPH — one set of words, two layouts, and the scroll in between.
 *
 * The words start as a stacked list. As the section is scrolled they
 * physically relocate into a scattered poster arrangement, then travel
 * back. Nothing is duplicated and nothing cross-fades: these are the same
 * four DOM nodes the whole way, moved between two sets of slots, with
 * Flip measuring the before and after and filling in the flight.
 *
 * WHY FLIP RATHER THAN COORDINATES. Both layouts are written in CSS, so
 * the arrangement survives every breakpoint, every locale's word lengths
 * and every font swap without a single hard-coded pixel. Hand-animating
 * x/y would mean re-deriving those numbers for each — and getting them
 * wrong for Georgian, whose words are meaningfully longer than the
 * English they were tuned against.
 *
 * THE DIP IS THE POINT. A straight Flip of four words reads as a convoy:
 * everything slides at once and the eye has nowhere to go. Shrinking each
 * word towards nothing at its own offset and growing it back on arrival
 * turns one move into four departures and four landings. It runs from the
 * end, like REFLOW_STAGGER, so the bottom of the list leaves first and
 * the reading order is broken on purpose.
 *
 * SCRUBBED, AND THEN BACK. The timeline is `yoyo` on a single repeat, so
 * the first half of the section scatters the words and the second half
 * gathers them. The visitor leaves the section with the list they arrived
 * at, which is what stops the effect from costing the page a layout.
 *
 * SSR AND REDUCED MOTION. The markup renders as the stacked list, in
 * document order, with the second set of slots empty. That is the state a
 * crawler, a broken bundle and a reduced-motion visitor all get.
 *
 * PLACEMENT. The scrub is measured against the nearest
 * [data-morph-section] ancestor, which has to be the tall element whose
 * spare height the morph is spending. Put this inside that section's
 * sticky panel; without the attribute it falls back to measuring itself,
 * which inside a sticky box is a window of nothing.
 */

export interface WordMorphProps {
  /** The words. Order is reading order in the stacked state. */
  words: string[];
  /**
   * One class string per word, placing its slot in the scattered state.
   * Written against a 12-column grid — see the caller for the geometry.
   * Shorter than `words` and the extra words simply do not travel.
   */
  slots: string[];
  /** Classes for each word. Sizing, colour, tracking. */
  wordClassName?: string;
  /** Classes for the stacked list container. */
  stackClassName?: string;
  /** Classes for the scattered grid container. */
  scatterClassName?: string;
}

export default function WordMorph({
  words,
  slots,
  wordClassName,
  stackClassName,
  scatterClassName,
}: WordMorphProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(Flip, ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let teardown: (() => void) | null = null;
        let cancelled = false;

        // Flip records geometry, and geometry is wrong until the display
        // face has landed — a fallback serif puts every word at a
        // different width and the recorded start state is a fiction.
        document.fonts.ready.then(() => {
          if (cancelled) return;

          ctx.add(() => {
            const wordEls = gsap.utils.toArray<HTMLElement>(
              "[data-morph-word]",
              root,
            );
            const homes = gsap.utils.toArray<HTMLElement>(
              "[data-morph-home]",
              root,
            );
            const targets = gsap.utils.toArray<HTMLElement>(
              "[data-morph-slot]",
              root,
            );
            if (!wordEls.length || targets.length < wordEls.length) return;

            let timeline: gsap.core.Timeline | null = null;
            let trigger: ScrollTrigger | null = null;

            /* Puts every word back in its own stacked slot. */
            const restore = () => {
              trigger?.kill();
              timeline?.kill();
              trigger = null;
              timeline = null;
              wordEls.forEach((word, i) => {
                gsap.killTweensOf(word);
                gsap.set(word, { clearProps: "all" });
                homes[i]?.appendChild(word);
              });
            };

            const build = () => {
              const state = Flip.getState(wordEls);
              wordEls.forEach((word, i) => targets[i]?.appendChild(word));

              timeline = Flip.from(state, {
                ease: EASE.narrative,
                duration: MORPH.duration,
                stagger: REFLOW_STAGGER,
                // Out through the first third of the section, held
                // through the middle, and gathered again through the
                // last — the repeatDelay is the held middle.
                repeat: 1,
                yoyo: true,
                repeatDelay: MORPH.hold,
                paused: true,
              });

              wordEls.forEach((word, i) => {
                const at = (wordEls.length - 1 - i) * MORPH.dipStagger;
                timeline
                  ?.to(
                    word,
                    {
                      scale: MORPH.dip,
                      duration: MORPH.dipDuration,
                      ease: EASE.narrative,
                    },
                    at,
                  )
                  .to(
                    word,
                    {
                      scale: 1,
                      duration: MORPH.dipDuration,
                      ease: EASE.narrative,
                    },
                    at + MORPH.dipDuration,
                  );
              });

              /*
               * Driven by the section's own spare height rather than a
               * pin. The inner is CSS-sticky, which costs nothing, never
               * fights Lenis, and behaves the same under a thumb — but a
               * sticky box is exactly as tall as the viewport, so
               * measuring the scrub against it would give a window of
               * zero. The tall ancestor is the one with the runway.
               */
              const driver =
                root.closest<HTMLElement>("[data-morph-section]") ?? root;

              /*
               * Deliberately NOT invalidateOnRefresh. Every other scrub on
               * this site wants it, and it is poison here: invalidating
               * makes a tween re-read its start values from the live DOM,
               * and the live DOM is the scattered state the Flip is
               * supposed to be travelling FROM. The recorded geometry is
               * discarded, start and end become the same place, and the
               * whole section renders as four words that never move.
               * ScrollFX refreshes on every image load, so this fails
               * within a second of page load rather than rarely.
               *
               * Re-measuring is handled by tearing the Flip down and
               * rebuilding it, below — the only correct way to do it.
               */
              trigger = ScrollTrigger.create({
                trigger: driver,
                start: "top top",
                end: "bottom bottom",
                scrub: SCRUB.far,
                animation: timeline,
              });
            };

            build();

            /*
             * A resize changes both layouts at once, and a Flip recorded
             * against the old one lands the words in the wrong places.
             * Cheaper to tear the whole thing down and measure again than
             * to try to patch a recorded state. Debounced, because a
             * window drag fires this continuously.
             */
            let resizeTimer = 0;
            const onResize = () => {
              window.clearTimeout(resizeTimer);
              resizeTimer = window.setTimeout(() => {
                restore();
                build();
                ScrollTrigger.refresh();
              }, 220);
            };
            window.addEventListener("resize", onResize);

            teardown = () => {
              window.removeEventListener("resize", onResize);
              window.clearTimeout(resizeTimer);
              restore();
            };
          });
        });

        return () => {
          cancelled = true;
          teardown?.();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative h-full">
      {/*
        The stacked state. Holds the words as the server rendered them.
        Plain divs rather than a list: the words leave this container
        during the morph, and an <ol> that empties out is claiming a
        structure it no longer has.
      */}
      <div className={stackClassName}>
        {words.map((word) => (
          <div key={word} data-morph-home>
            <span data-morph-word className={wordClassName}>
              {word}
            </span>
          </div>
        ))}
      </div>

      {/*
        The scattered state. Empty slots with real geometry — they are
        placed by CSS whether or not they currently hold a word, which is
        what gives Flip somewhere to measure to. Deliberately NOT
        aria-hidden: the words move into these boxes and would take the
        hiding with them.
      */}
      <div className={scatterClassName}>
        {words.map((word, i) => (
          <div key={word} data-morph-slot className={slots[i] ?? ""} />
        ))}
      </div>
    </div>
  );
}
