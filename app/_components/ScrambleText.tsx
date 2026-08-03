"use client";

import { useRef, type ElementType } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { REVEAL_START, SCRAMBLE } from "@/lib/motion";

/*
 * SCRAMBLETEXT — a label that resolves out of noise.
 *
 * Every character is replaced with a random one from its own script, then
 * settles into place left to right. It is a small, mechanical move, and
 * that is why it belongs on the eyebrows and counters rather than on the
 * headlines: it reads as a machine finding a word, which suits a label
 * announcing a section and undercuts a sentence that is trying to say
 * something.
 *
 * WHY A STRING AND NOT CHILDREN. The plugin rewrites the element's text
 * for the length of the tween, so whatever this renders has to survive
 * being reduced to a plain string and back. Taking `text` rather than
 * `children` makes that a type error instead of a silent bug when someone
 * later nests a link inside it.
 *
 * THE POOL IS PICKED FROM THE COPY. Scrambling Georgian through a Latin
 * pool reads as a broken font, not as an effect; the same string in three
 * locales has to resolve out of three different alphabets. The script is
 * detected from the text itself rather than from the active locale,
 * because a Latin brand name inside Georgian copy should still scramble
 * as Latin.
 *
 * THE ONE PLACE CHARACTERS ARE SPLIT. The site's rule is lines or words,
 * never characters, because Mkhedruli and Cyrillic break badly per glyph
 * when a line box is being measured or masked. Nothing is measured or
 * masked here — each glyph is swapped in place, the box is untouched —
 * so the rule's reason does not apply.
 *
 * SSR AND REDUCED MOTION. The element renders with its final text. The
 * scramble is a tween away from that state, so the server HTML, the
 * no-JavaScript state and the reduced-motion state are all the finished
 * label.
 */

/** Tags this may render as. Short-label elements only. */
export type ScrambleTag = "span" | "p" | "div" | "h2" | "h3" | "dt";

/** Detects the script of the copy, to pick the pool it resolves out of. */
function poolFor(text: string): string {
  if (/[Ⴀ-ჿ]/.test(text)) return SCRAMBLE.pool.georgian;
  if (/[Ѐ-ӿ]/.test(text)) return SCRAMBLE.pool.cyrillic;
  return SCRAMBLE.pool.latin;
}

export interface ScrambleTextProps {
  /** The finished label. Pass a translated string. */
  text: string;
  /** Element to render. Defaults to an inline span. */
  as?: ScrambleTag;
  /** Classes for the rendered element. */
  className?: string;
  /** DOM id, for the `aria-labelledby` on a section this label titles. */
  id?: string;
  /** ScrollTrigger start. Defaults to the shared REVEAL_START. */
  start?: string;
  /** Seconds to hold after the trigger fires. */
  delay?: number;
  /**
   * Re-run the scramble on pointer hover. For labels that are also
   * controls; pointless, and slightly manic, on static copy.
   */
  hover?: boolean;
}

export default function ScrambleText({
  text,
  as = "span",
  className,
  id,
  start = REVEAL_START,
  delay = 0,
  hover = false,
}: ScrambleTextProps) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

      const el = rootRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const chars = poolFor(text);

        /*
         * The box is frozen at its resting width for the length of the
         * tween. The site's faces are proportional, so a "W" standing in
         * for an "I" is wider than the glyph it replaced and the label's
         * own width changes frame to frame. Unpinned, a centred label
         * swims left and right the whole way through and anything laid
         * out beside it is dragged along.
         *
         * What this does NOT fix is characters shifting WITHIN the label
         * as the sweep passes — that would need a wrapper per glyph, which
         * the plugin does not give us. It stays small enough to read as
         * part of the effect, and it is the reason this belongs on short
         * tracked labels rather than on a sentence.
         *
         * Held only while the tween runs, never after. An inline width
         * left behind on a flex or grid child overrides the stretch it
         * would otherwise get, and would then be wrong at every width but
         * the one it was measured at.
         */
        const lock = () => {
          gsap.set(el, { display: "inline-block", whiteSpace: "nowrap" });
          // Measured after `inline-block` lands, so the value is the width
          // of the text rather than of whatever box it was filling.
          gsap.set(el, { width: el.getBoundingClientRect().width });
        };
        const unlock = () =>
          gsap.set(el, { clearProps: "display,width,whiteSpace" });

        const run = (duration: number) =>
          gsap.to(el, {
            duration,
            scrambleText: {
              text,
              chars,
              speed: SCRAMBLE.speed,
              // The finished string is the one already in the DOM, so
              // there is nothing to reveal into — every character simply
              // stops changing once the sweep passes it.
              revealDelay: 0,
            },
            overwrite: true,
            onStart: lock,
            onComplete: unlock,
          });

        const entrance = run(SCRAMBLE.duration);
        entrance.delay(delay);
        entrance.pause();

        const trigger = ScrollTrigger.create({
          trigger: el,
          start,
          once: true,
          onEnter: () => entrance.play(),
        });

        const listeners = new AbortController();
        if (hover) {
          el.addEventListener(
            "pointerenter",
            () => {
              // Never over the entrance: re-running the sweep from the
              // middle of the first one leaves half the label frozen in
              // noise, because the second tween's start state is that
              // noise.
              if (entrance.isActive()) return;
              run(SCRAMBLE.hoverDuration);
            },
            { signal: listeners.signal },
          );
        }

        return () => {
          listeners.abort();
          trigger.kill();
          gsap.killTweensOf(el);
          // The element's text is whatever the last frame left behind, so
          // it has to be put back by hand — clearProps only reaches the
          // inline styles. Both matter: a tween killed mid-sweep never
          // reached its own onComplete.
          el.textContent = text;
          unlock();
        };
      });

      /*
       * Reduced motion: nothing runs, and nothing needs to. The label is
       * already at its finished state, exactly as the server sent it.
       */
      mm.add("(prefers-reduced-motion: reduce)", () => {});

      return () => mm.revert();
    },
    {
      scope: rootRef,
      dependencies: [text, start, delay, hover],
      revertOnUpdate: true,
    },
  );

  const Tag = as as ElementType;

  return (
    <Tag ref={rootRef} id={id} className={className} data-scramble>
      {text}
    </Tag>
  );
}
