"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import {
  CLIP,
  DUR,
  EASE,
  MASK_DESCENDER,
  REVEAL_START,
  SCRUB,
  STAGGER,
} from "@/lib/motion";

/*
 * REVEALTEXT — the one text-reveal primitive.
 *
 * Every headline, lede and caption on the site should enter through this
 * component rather than hand-rolling a SplitText block, so the whole page
 * reveals with one signature instead of nine slightly different ones.
 *
 * The signature move is `variant="lines"`: whole lines rise out of a mask,
 * one after the next, on the narrative ease. Five supporting variants back
 * it up:
 *
 *   words    a lighter fade-rise that breaks a headline into its own words
 *   scrub    progressive word-by-word brightening, driven by scroll
 *            position rather than by the clock
 *   clip     each line uncovered left to right by a travelling edge, with
 *            nothing moving. The quietest of the six, and the only one
 *            safe against a headline the layout cannot afford to have
 *            shifting — it animates clip-path alone
 *   stack    words hinged up out of the page on their own bottom edge.
 *            The one variant with perspective, and the most expensive; it
 *            is for a single headline per page, not for body copy
 *   scatter  the departure. Words are thrown out of the frame as the
 *            block leaves, scrubbed by scroll rather than played, so
 *            scrolling back reels them in
 *
 * NON-NEGOTIABLES THIS FILE UPHOLDS
 * - The element renders as ordinary, fully-visible DOM. Nothing is hidden
 *   in CSS or in inline style, so the server HTML is complete and readable
 *   with JavaScript off, with JavaScript broken, and to a crawler. Every
 *   hidden state is a `from`/`fromTo` start value applied by GSAP.
 * - The split runs inside `document.fonts.ready`. Georgian and Cyrillic
 *   metrics differ enough from the fallback faces to move line breaks; a
 *   split taken before the real face lands masks the wrong boxes.
 * - `type` is only ever "lines" or "words,lines". Never chars — Mkhedruli
 *   and Cyrillic both break badly when split per glyph.
 * - All motion sits inside a matchMedia no-preference block. The reduce
 *   branch is deliberately empty because the finished state and the
 *   server-rendered state are the same thing: visible, static text.
 *
 * MOTION TOKENS. Ease, duration, stagger, scrub lag and the descender
 * measure all come from lib/motion.ts, so retuning the site's feel is one
 * edit there rather than ten here. The only local values are the two
 * travel distances and the scrub window, which describe these variants and
 * nothing else.
 */

/**
 * How far a masked line sits below its own box before it rises, in percent.
 * Past 100 so that a descender hanging into the padding below still starts
 * clear of the mask edge.
 */
const LINE_TRAVEL = 118;

/** How far a word drifts up while it fades in, in percent of its own box. */
const WORD_TRAVEL = 60;

/** The scrub sweep's own two values. */
const SWEEP = {
  /** The `start` prop opens the sweep's window; this closes it. */
  end: "bottom 60%",
  /** Words ahead of the sweep dim to this, never to zero — the copy stays
   *  legible at every scroll position, including the first frame. */
  dim: 0.16,
} as const;

/** Hidden state for the `clip` wipe: the line covered from the right. */
const CLIP_HIDDEN = "inset(0% 100% 0% 0%)";

/** The `stack` hinge. */
const HINGE = {
  /** Degrees each word is folded back before it swings up. Past 90 and
   *  the word starts the move already facing away from the visitor. */
  rotation: -88,
  /** Perspective on the line, in px. Tight enough to read as a fold
   *  rather than as a distant rotation. */
  perspective: 620,
  /** Where the hinge sits: the word's own baseline edge, pushed back so
   *  the top of the glyph swings towards the visitor rather than away. */
  origin: "50% 100% -0.35em",
} as const;

/** The `scatter` departure. Ranges are sampled per word, so no two leave
 *  on the same arc — a fixed offset reads as a shutter closing. */
const SCATTER = {
  /** Scroll window the departure is mapped onto. */
  start: "bottom 75%",
  end: "bottom 15%",
  /** Vertical throw, in px. */
  y: [60, 190] as const,
  /** Lateral drift, in px, sampled either side of zero. */
  x: 26,
  /** Tumble, in degrees, sampled either side of upright. */
  rotation: 18,
} as const;

/** Which reveal to run. `lines` is the house default. */
export type RevealVariant =
  | "lines"
  | "words"
  | "scrub"
  | "clip"
  | "stack"
  | "scatter";

/** Tags this primitive may render as. Text-bearing elements only. */
export type RevealTag =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "li"
  | "blockquote"
  | "figcaption";

/** The tags whose role may carry an aria-label — see the `aria` note in
 *  the split config below. */
const HEADING_TAGS: ReadonlySet<RevealTag> = new Set(["h1", "h2", "h3", "h4"]);

export interface RevealTextProps {
  /**
   * The copy to reveal. Pass translated strings from `useTranslations` —
   * this component never carries user-facing text of its own. Inline
   * markup (`<em>`, `<br />`, links) survives the split; block-level
   * children do not and should get their own RevealText.
   */
  children: ReactNode;
  /**
   * Element to render. Defaults to a paragraph. `span` is available for
   * inline slots, but note that splitting gives each line a block box —
   * only reach for it where the text already owns its own line.
   */
  as?: RevealTag;
  /** Classes for the rendered element — sizing, colour, tracking. */
  className?: string;
  /**
   * DOM id, for the `aria-labelledby` on a section this heading titles.
   * The split leaves it on the element it was given, so the reference
   * survives the reveal.
   */
  id?: string;
  /**
   * Seconds to hold after the trigger fires, for choreographing one block
   * against another. Ignored by `scrub` and `scatter`, where scroll
   * position rather than the clock drives the move.
   */
  delay?: number;
  /**
   * Override the per-variant stagger; `0` is honoured. Long paragraphs
   * want STAGGER.linesTight, or the tail of the reveal drags.
   */
  stagger?: number;
  /**
   * ScrollTrigger start. Defaults to the shared REVEAL_START. Pass
   * ENTRANCE.text where copy has to lead the media beside it. Ignored by
   * `scatter`, whose window is measured off the block leaving rather than
   * off it arriving.
   */
  start?: string;
  /** Which reveal to run. Defaults to the masked line rise. */
  variant?: RevealVariant;
}

export default function RevealText({
  children,
  as = "p",
  className,
  id,
  delay = 0,
  stagger,
  start = REVEAL_START,
  variant = "lines",
}: RevealTextProps) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const el = rootRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let split: SplitText | null = null;
        let tween: gsap.core.Tween | null = null;
        let cancelled = false;

        document.fonts.ready.then(() => {
          // The component may already have unmounted while fonts loaded.
          if (cancelled) return;

          // ctx.add registers everything built inside it with this
          // matchMedia context, so a later revert() collects the tween
          // and its ScrollTrigger even though both were made async.
          ctx.add(() => {
            /*
             * Only the two variants that slide a line behind its own edge
             * get mask wrappers. `scrub` moves nothing; `clip` cuts the
             * line itself; and `stack` and `scatter` both need to leave
             * their box, so a mask would be the thing clipping them.
             */
            const masked = variant === "lines" || variant === "words";

            const instance = SplitText.create(el, {
              // Words are only split when a variant actually animates
              // them. Never chars.
              type:
                variant === "lines" || variant === "clip"
                  ? "lines"
                  : "words,lines",
              mask: masked ? "lines" : undefined,
              /*
               * `auto` keeps the original string on the element as
               * aria-label and hides the split fragments — the right
               * thing for a heading, whose role may be named. It is
               * INVALID on p / span / div / li / blockquote / figcaption:
               * ARIA prohibits aria-label on the paragraph and generic
               * roles, and axe flags it ("Elements must only use
               * permitted ARIA attributes" — the Vercel agent-
               * accessibility audit, 2026-08-16). Those keep their real
               * text: SplitText 3.15 preserves the space text nodes
               * between word boxes and lines are block boxes, so a
               * screen reader reads the fragments as ordinary prose.
               */
              aria: HEADING_TAGS.has(as) ? "auto" : "none",
            });
            split = instance;

            if (variant === "scrub") {
              /*
               * Progressive word sweep. The tween's whole timeline —
               * duration plus the accumulated stagger — is mapped onto the
               * scroll window, so words brighten in reading order as the
               * block travels. Linear ease: the scrub already supplies the
               * curve, and anything else double-counts it.
               */
              tween = gsap.fromTo(
                instance.words,
                { opacity: SWEEP.dim },
                {
                  opacity: 1,
                  duration: DUR.fast,
                  ease: EASE.none,
                  stagger: stagger ?? STAGGER.words,
                  scrollTrigger: {
                    trigger: el,
                    start,
                    end: SWEEP.end,
                    scrub: SCRUB.near,
                  },
                },
              );
              return;
            }

            if (variant === "clip") {
              /*
               * A travelling edge, and nothing else. No mask wrappers, no
               * transform, no compositing layer per line — this is the
               * variant to reach for when a headline sits above content
               * whose position must not be negotiable, and the one that
               * survives being asked for twenty times on a page.
               *
               * `fromTo`, and the only variant here that has to be. The
               * resting value of clip-path is the keyword `none`, which
               * has no interpolable form: a plain `from` would set the
               * hidden inset, fail to find a numeric target to travel to,
               * and leave the headline clipped out of existence. The open
               * inset has to be written out.
               */
              tween = gsap.fromTo(
                instance.lines,
                { clipPath: CLIP_HIDDEN },
                {
                  clipPath: CLIP.open,
                  duration: DUR.wipe,
                  ease: EASE.narrative,
                  stagger: stagger ?? STAGGER.lines,
                  delay,
                  scrollTrigger: { trigger: el, start, once: true },
                },
              );
              return;
            }

            if (variant === "stack") {
              /*
               * The words are folded back on their own baseline and swing
               * up into the page. Perspective belongs on the line rather
               * than on each word: shared, the fold reads as one sheet
               * unfolding; per-word, every word gets its own vanishing
               * point and the line comes apart.
               */
              gsap.set(instance.lines, {
                perspective: HINGE.perspective,
                transformStyle: "preserve-3d",
              });

              tween = gsap.from(instance.words, {
                rotationX: HINGE.rotation,
                transformOrigin: HINGE.origin,
                opacity: 0,
                duration: DUR.reveal,
                ease: EASE.narrative,
                stagger: stagger ?? STAGGER.words,
                delay,
                scrollTrigger: { trigger: el, start, once: true },
                // The 3D transform is the only reason these words needed a
                // layer; leaving one behind on every word of a headline is
                // how a page ends up with a hundred idle composited boxes.
                onComplete: () => gsap.set(instance.lines, { perspective: 0 }),
              });
              return;
            }

            if (variant === "scatter") {
              /*
               * The departure, and the one variant that is not an
               * entrance. Scrubbed rather than played, so the words are
               * wherever the scroll position says they are — scroll back
               * and they come home. `from: "random"` on the stagger is
               * load-bearing: in document order this reads as a shutter
               * closing rather than as a block coming apart.
               */
              tween = gsap.to(instance.words, {
                y: () => gsap.utils.random(SCATTER.y[0], SCATTER.y[1]),
                x: () => gsap.utils.random(-SCATTER.x, SCATTER.x),
                rotation: () =>
                  gsap.utils.random(-SCATTER.rotation, SCATTER.rotation),
                opacity: 0,
                ease: EASE.exit,
                stagger: { each: stagger ?? STAGGER.words, from: "random" },
                scrollTrigger: {
                  trigger: el,
                  start: SCATTER.start,
                  end: SCATTER.end,
                  scrub: SCRUB.near,
                  // The sampled offsets above are re-rolled on refresh,
                  // which is what stops a resize from freezing one
                  // arrangement in place for the rest of the session.
                  invalidateOnRefresh: true,
                },
              });
              return;
            }

            /*
             * Both remaining variants ride inside the line masks, so both
             * need the descender pair: padding on the mover for a "g" or
             * "y" to hang into, the same measure of negative margin on the
             * mask so the box is unchanged and nothing below shifts.
             */
            gsap.set(instance.lines, { paddingBottom: `${MASK_DESCENDER}em` });
            gsap.set(instance.masks, { marginBottom: `${-MASK_DESCENDER}em` });

            /*
             * `once` rather than a replay: an entrance that re-runs on
             * scroll-back reads as a glitch. It also disposes the trigger
             * once it has fired, so a long page is not carrying a live
             * ScrollTrigger per paragraph.
             */
            tween =
              variant === "lines"
                ? gsap.from(instance.lines, {
                    yPercent: LINE_TRAVEL,
                    duration: DUR.reveal,
                    ease: EASE.narrative,
                    stagger: stagger ?? STAGGER.lines,
                    delay,
                    scrollTrigger: { trigger: el, start, once: true },
                  })
                : gsap.from(instance.words, {
                    yPercent: WORD_TRAVEL,
                    opacity: 0,
                    duration: DUR.reveal,
                    ease: EASE.narrative,
                    stagger: stagger ?? STAGGER.words,
                    delay,
                    scrollTrigger: { trigger: el, start, once: true },
                  });
          });
        });

        return () => {
          cancelled = true;
          tween?.scrollTrigger?.kill();
          tween?.kill();
          // revert() restores the original innerHTML, which also drops
          // every inline style the split and the tween wrote.
          split?.revert();
        };
      });

      /*
       * Reduced motion: nothing to land on. The text is already at its
       * finished state — split, mask and tween are simply never built, so
       * the paragraph stays exactly as the server sent it.
       */
      mm.add("(prefers-reduced-motion: reduce)", () => {});

      return () => mm.revert();
    },
    {
      scope: rootRef,
      // Primitives only: `children` changes identity every render, and a
      // re-split per render would thrash the DOM. A locale change remounts
      // the tree, which rebuilds the split anyway.
      dependencies: [variant, delay, stagger, start],
      revertOnUpdate: true,
    },
  );

  /*
   * Rendered as JSX rather than createElement so the ref stays a ref prop:
   * react-hooks reads a ref passed into a plain function call as a read
   * during render. The cast is what lets one ref serve ten element types —
   * every RevealTag is an HTMLElement, but their ref types are invariant.
   */
  const Tag = as as ElementType;

  return (
    /*
     * `data-reveal-variant` rather than `data-reveal`: FAQ and SocialProof
     * both sweep their own subtree for a bare [data-reveal] marker, and a
     * RevealText dropped into either would be collected by that sweep and
     * given a second, competing `from` tween on the same element.
     */
    <Tag
      ref={rootRef}
      id={id}
      className={className}
      data-reveal-variant={variant}
    >
      {children}
    </Tag>
  );
}
