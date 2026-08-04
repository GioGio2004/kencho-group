"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CLIP,
  DUR,
  EASE,
  ENTRANCE,
  PARALLAX,
  RULE_CADENCE,
  RULE_TIP_LENGTH,
  RULE_TIP_OVERRUN,
  SCRUB,
  SCRUB_RANGE,
  STAGGER,
  TICK_DELAY,
} from "@/lib/motion";

/*
 * SCROLLFX — the site-wide, attribute-driven scroll layer.
 * =======================================================
 * Mount once, next to <SmoothScroll />. After that any section opts into
 * the house scroll vocabulary by writing an attribute in its markup — no
 * import, no hook, no per-section GSAP. This component renders nothing,
 * holds no React state, and is one gsap.matchMedia context that reverts
 * itself completely on unmount.
 *
 * DIVISION OF LABOUR. This file owns motion driven by scroll POSITION and
 * the manipulation of whole components: drift, wipes, settles, departures.
 * Text is not its business — headlines, ledes and captions reveal through
 * <RevealText>, which owns every SplitText instance on the site. Nothing
 * here imports SplitText, so a single element can never be split twice.
 *
 * Every effect animates off the state the server already rendered, so the
 * SSR HTML *is* the finished state: with JS off, or for a reduced-motion
 * visitor, an opted-in element is simply visible. Start states are applied
 * by GSAP and never by CSS or inline style.
 *
 * Only transform, opacity and clip-path are animated. `filter` is
 * deliberately absent — blur-to-sharp was considered and dropped, because
 * an animated blur repaints the whole layer every frame and is the first
 * thing to collapse on a mid-range Android at 390px.
 *
 * ---------------------------------------------------------------------
 * SUPPORTED ATTRIBUTES
 * ---------------------------------------------------------------------
 * data-fx="parallax"
 *     Drifts the element vertically across its own pass through the
 *     viewport. Travel is PARALLAX.container.
 *       data-fx-speed   multiplier on that travel (default 1; negative
 *                       reverses; 1.67 reproduces PARALLAX.containerFar)
 *       data-fx-scrub   scrub lag (default SCRUB.near)
 *
 * data-fx="drift"
 *     Container variant. Every [data-fx-item] inside takes its offset
 *     from PARALLAX.items, cycled by index. The alternating sign and
 *     uneven magnitude are the whole point: a formula reads mechanical,
 *     this reads composed. Use it on a masonry wall or a card row.
 *
 * [data-fx-inner]
 *     OPTIONAL, on a media element inside a "parallax" element or a
 *     [data-fx-item]. It gets its own, always-heavier scrub, and that lag
 *     between frame and image is the depth cue — more than the distance
 *     either travels. Reads data-fx-speed / data-fx-scrub too (defaults 1
 *     and SCRUB.far).
 *
 * data-fx="clip"
 *     One-shot clip-path inset wipe on enter, direction cycled through
 *     CLIP.from by document order so a grid never reveals in lockstep.
 *     Batched: items crossing in the same frame share one staggered tween
 *     instead of racing each other.
 *       data-fx-from    index into CLIP.from, to pin one direction
 *
 * data-fx="scale-in"
 *     Media settles back to rest inside a clipped frame. Put this on the
 *     FRAME; the image is the first [data-fx-media] or <img> inside it.
 *       data-fx-scale   starting scale (default 1.16)
 *
 * data-fx="sticky-scale"
 *     Scrubbed departure over SCRUB_RANGE.hold — the element shrinks and
 *     fades while its section owns the viewport. Written for a CSS
 *     `position: sticky` child, which is what makes the shrink read as
 *     the section receding rather than as the element sliding.
 *       data-fx-scale     end scale   (default 0.86)
 *       data-fx-opacity   end opacity (default 0.3)
 *       data-fx-scrub     scrub lag   (default SCRUB.pinned)
 *     Driven by the nearest [data-fx-section] or <section> ancestor.
 *
 * data-fx="rule"
 *     A hairline DRAWS itself when it arrives — scaled from nothing
 *     along its own axis, which reads as a line being ruled rather than
 *     as a box fading in. The site's decorative language is drawn, not
 *     filled, and this is the primitive the whole of it is built from.
 *       data-fx-axis     "x" (default) or "y"
 *       data-fx-origin   "left"/"right"/"center" (x) or "top"/"bottom"/
 *                        "center" (y). Default left / top.
 *       data-fx-delay    seconds
 *     Batched, so a row of rules crossing together is ONE staggered
 *     tween instead of six racing each other.
 *
 * data-fx="ticks"
 *     Container. Every [data-tick] inside pops in with the overshoot the
 *     motion vocabulary reserves for small marks — registration ticks,
 *     corner marks, the punctuation of a drawn page.
 *
 * ---------------------------------------------------------------------
 * NOTES
 * ---------------------------------------------------------------------
 * - Scans the document ONCE, after the intro overlay clears, then never
 *   again. Sections that add or remove DOM later (the Projects filter)
 *   own their own motion and must not use these attributes.
 * - ONE data-fx value per element, and a [data-fx-item] must not also be
 *   data-fx="parallax". Two of these on one element means two tweens
 *   writing the same transform on different scrubs, and the loser wins
 *   at random. Nest instead: the frame drifts, [data-fx-inner] lags.
 * - Never put a CSS `transition` on transform / opacity / clip-path on an
 *   opted-in element: the transition would chase every GSAP frame.
 * - No breakpoint gating anywhere. Phones run exactly what desktop runs,
 *   which is the point of the design.
 */

/** Starting scale for a "scale-in" frame, when none is authored. */
const SCALE_IN_FROM = 1.16;

/** End state of a "sticky-scale" departure, when none is authored. */
const STICKY_SCALE = 0.86;
const STICKY_OPACITY = 0.3;

/* ---------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------ */

function qsa<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Reads a numeric data attribute, falling back when absent or malformed. */
function num(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(raw ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Tracks a tween so it can be killed on unmount. */
type Keep = (tween: gsap.core.Tween) => void;

/*
 * The slower half of a two-layer parallax. The recovered original gives
 * the image its headroom with `height: 110%` at `top: 0`; this uses a
 * top-anchored `scale` of the same 110% instead, because next/image lays
 * its <img> out as `position: absolute; inset: 0` and rewriting that
 * height is exactly how ports of this effect break the frame. Anchoring
 * the origin to the top edge puts all the headroom at the bottom, where
 * the upward travel needs it — a centred origin would split it in half
 * and PARALLAX.image would run straight past the edge.
 */
function wireInner(host: HTMLElement, keep: Keep): void {
  const inner = host.querySelector<HTMLElement>("[data-fx-inner]");
  if (!inner) return;

  const frame = inner.parentElement;
  // `clip`, not `hidden`: it never creates a scroll container, so a
  // sticky or pinned ancestor keeps working.
  if (frame) gsap.set(frame, { overflow: "clip" });
  gsap.set(inner, {
    transformOrigin: "50% 0%",
    scale: PARALLAX.headroom / 100,
  });

  /*
   * Clamped to the headroom that actually exists. PARALLAX.image sits
   * comfortably inside the default 10%, but an authored data-fx-speed
   * could ask for more travel than there is room for, and the failure is
   * the ugly one: the image's own edge scrolls into frame.
   */
  const headroom = PARALLAX.headroom - 100;
  const travel = gsap.utils.clamp(
    -headroom,
    headroom,
    PARALLAX.image * num(inner.dataset.fxSpeed, 1),
  );

  keep(
    gsap.to(inner, {
      yPercent: travel,
      ease: EASE.none,
      scrollTrigger: {
        trigger: host,
        ...SCRUB_RANGE.travelInner,
        scrub: num(inner.dataset.fxScrub, SCRUB.far),
        invalidateOnRefresh: true,
      },
    }),
  );
}

/* ---------------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------------ */

export default function ScrollFX() {
  /*
   * No `scope` here, deliberately — unlike every section component, this
   * one renders no DOM of its own, so there is no ref to scope to and a
   * scope would only narrow selector strings this file never uses (every
   * lookup below is an explicit document query). useGSAP still wraps the
   * body in a gsap.context and reverts it on unmount, which is what the
   * scoping is for; the cleanup below then kills the ScrollTriggers and
   * the late-born callback tweens the context cannot see. Same shape as
   * CustomCursor, for the same reason.
   */
  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
      /*
       * Tracked by hand as well as by the context: tweens created inside
       * a ScrollTrigger callback are born long after the context function
       * returned, so the context alone would not own them.
       */
      const tweens: gsap.core.Tween[] = [];
      const triggers: ScrollTrigger[] = [];
      const listeners = new AbortController();
      let refreshTimer = 0;
      let cancelled = false;

      const keep: Keep = (tween) => {
        tweens.push(tween);
      };

      /*
       * Refresh discipline. Most ported scroll systems break here rather
       * than in the animation code: late media changes the page height,
       * and every start/end measured before it landed is wrong. Debounced
       * so a gallery finishing decode does not refresh once per image.
       *
       * Deliberately NOT paired with forcing lazy images to eager, which
       * is what the recovered original did — next/image defers below-the-
       * fold art on purpose, and that is worth more than the convenience.
       */
      const refreshSoon = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
      };

      const build = () => {
        /* ---------------------------------------------------------
         * 1. PARALLAX — container drifting, inner image lagging.
         * ------------------------------------------------------ */
        qsa('[data-fx="parallax"]').forEach((el) => {
          keep(
            gsap.to(el, {
              y: PARALLAX.container * num(el.dataset.fxSpeed, 1),
              ease: EASE.none,
              scrollTrigger: {
                trigger: el,
                ...SCRUB_RANGE.travel,
                scrub: num(el.dataset.fxScrub, SCRUB.near),
                invalidateOnRefresh: true,
              },
            }),
          );
          wireInner(el, keep);
        });

        /* ---------------------------------------------------------
         * 2. DRIFT — per-index offsets across a group of items.
         * ------------------------------------------------------ */
        qsa('[data-fx="drift"]').forEach((group) => {
          const scrub = num(group.dataset.fxScrub, SCRUB.near);
          const speed = num(group.dataset.fxSpeed, 1);

          // querySelectorAll reaches through a nested drift group, which
          // would give those items two competing y tweens. Keep only the
          // items this group actually owns.
          const items = qsa("[data-fx-item]", group).filter(
            (item) => item.closest('[data-fx="drift"]') === group,
          );

          items.forEach((item, i) => {
            const offset = PARALLAX.items[i % PARALLAX.items.length] ?? 0;
            keep(
              gsap.to(item, {
                y: offset * speed,
                ease: EASE.none,
                scrollTrigger: {
                  trigger: item,
                  ...SCRUB_RANGE.travel,
                  scrub,
                  invalidateOnRefresh: true,
                },
              }),
            );
            wireInner(item, keep);
          });
        });

        /* ---------------------------------------------------------
         * 3. CLIP — directional inset wipe, cycled, played once.
         * ------------------------------------------------------ */
        const clipEls = qsa('[data-fx="clip"]');
        if (clipEls.length) {
          clipEls.forEach((el, i) => {
            // Normalised rather than indexed raw: an authored "-1" or
            // "1.5" should land on a real direction instead of silently
            // collapsing every tile onto CLIP.from[0].
            const authored = Math.trunc(num(el.dataset.fxFrom, i));
            const len = CLIP.from.length;
            const index = ((authored % len) + len) % len;
            gsap.set(el, { clipPath: CLIP.from[index] ?? CLIP.from[0] });
          });

          triggers.push(
            ...ScrollTrigger.batch(clipEls, {
              start: ENTRANCE.media,
              once: true,
              onEnter: (batch) => {
                keep(
                  gsap.to(batch, {
                    clipPath: CLIP.open,
                    duration: DUR.wipe,
                    ease: EASE.narrative,
                    stagger: STAGGER.items,
                    overwrite: true,
                  }),
                );
              },
            }),
          );
        }

        /* ---------------------------------------------------------
         * 4. SCALE-IN — media settling inside a clipped frame.
         * ------------------------------------------------------ */
        qsa('[data-fx="scale-in"]').forEach((frame) => {
          const media =
            frame.querySelector<HTMLElement>("[data-fx-media]") ??
            frame.querySelector<HTMLElement>("img");
          if (!media) return;

          gsap.set(frame, { overflow: "clip" });
          keep(
            gsap.from(media, {
              scale: num(frame.dataset.fxScale, SCALE_IN_FROM),
              duration: DUR.wipe,
              ease: EASE.narrative,
              scrollTrigger: {
                trigger: frame,
                start: ENTRANCE.media,
                once: true,
              },
            }),
          );
        });

        /* ---------------------------------------------------------
         * 5. STICKY-SCALE — the departure, scrubbed by the section.
         * ------------------------------------------------------ */
        qsa('[data-fx="sticky-scale"]').forEach((el) => {
          // Searched from the PARENT, so an element that is itself the
          // marked section never ends up triggering off itself.
          const driver =
            el.parentElement?.closest<HTMLElement>(
              "[data-fx-section], section",
            ) ?? el.parentElement;
          if (!driver) return;

          keep(
            gsap.to(el, {
              scale: num(el.dataset.fxScale, STICKY_SCALE),
              opacity: num(el.dataset.fxOpacity, STICKY_OPACITY),
              ease: EASE.none,
              scrollTrigger: {
                trigger: driver,
                ...SCRUB_RANGE.hold,
                scrub: num(el.dataset.fxScrub, SCRUB.pinned),
                invalidateOnRefresh: true,
              },
            }),
          );
        });

        /* ---------------------------------------------------------
         * 6. RULE — a hairline being ruled.
         *
         * Each line takes its cadence from RULE_CADENCE, cycled by
         * document index, so neighbours never arrive the same way. See
         * that table for why the unevenness is authored rather than
         * random and why there are seven entries.
         *
         * Both modes are composited: `scale` is a transform, `wipe` is a
         * clip-path. Neither touches layout, so a page carrying forty of
         * these costs what a page carrying one does.
         * ------------------------------------------------------ */
        const ruleEls = qsa('[data-fx="rule"]');
        if (ruleEls.length) {
          const ORIGIN: Record<string, string> = {
            left: "left center",
            right: "right center",
            center: "center center",
            top: "center top",
            bottom: "center bottom",
          };

          /* Closed states, per axis and per end. */
          const SHUT = {
            x: {
              left: "inset(0% 100% 0% 0%)",
              right: "inset(0% 0% 0% 100%)",
              center: "inset(0% 50% 0% 50%)",
            },
            y: {
              left: "inset(0% 0% 100% 0%)",
              right: "inset(100% 0% 0% 0%)",
              center: "inset(50% 0% 50% 0%)",
            },
          } as const;

          const OPEN = "inset(0% 0% 0% 0%)";

          /** What this element was dealt, honouring anything authored. */
          const cadenceOf = (el: HTMLElement, i: number) => {
            const step = RULE_CADENCE[i % RULE_CADENCE.length]!;
            const authored = el.dataset.fxOrigin;
            const from =
              authored === "left" || authored === "right" || authored === "center"
                ? authored
                : // "top"/"bottom" are the vertical spellings of the two ends.
                  authored === "top"
                  ? "left"
                  : authored === "bottom"
                    ? "right"
                    : step.from;
            return { ...step, from };
          };

          ruleEls.forEach((el, i) => {
            const step = cadenceOf(el, i);
            const axis = el.dataset.fxAxis === "y" ? "y" : "x";
            if (step.mode === "scale") {
              gsap.set(el, {
                transformOrigin:
                  ORIGIN[axis === "y" && step.from === "left" ? "top" : step.from] ??
                  ORIGIN.left!,
                [axis === "y" ? "scaleY" : "scaleX"]: 0,
              });
            } else {
              gsap.set(el, { clipPath: SHUT[axis][step.from] });
            }
            const tip = el.querySelector<HTMLElement>("[data-rule-tip]");
            if (tip) gsap.set(tip, { autoAlpha: 0 });
          });

          triggers.push(
            ...ScrollTrigger.batch(ruleEls, {
              start: ENTRANCE.text,
              once: true,
              onEnter: (batch) => {
                batch.forEach((node, i) => {
                  const el = node as HTMLElement;
                  // Index within the whole document, not within this
                  // batch — otherwise two sections entering separately
                  // would both start the cycle at its first entry and
                  // the repetition would be back.
                  const step = cadenceOf(el, ruleEls.indexOf(el));
                  const axis = el.dataset.fxAxis === "y" ? "y" : "x";
                  const delay =
                    step.delay +
                    i * STAGGER.items +
                    num(el.dataset.fxDelay, 0);

                  keep(
                    gsap.to(el, {
                      ...(step.mode === "scale"
                        ? { scaleX: 1, scaleY: 1 }
                        : { clipPath: OPEN }),
                      duration: step.dur,
                      ease: EASE[step.ease],
                      delay,
                      overwrite: true,
                    }),
                  );

                  /*
                   * THE NIB. A short brass segment running ahead of the
                   * stroke and lifted at the end of it — the same gesture
                   * THE DRAWING makes, at the scale of a page rule.
                   * Only ever on a `wipe`: a `scale` stretches its own
                   * children, so a tip inside one would smear rather
                   * than travel.
                   */
                  const tip = el.querySelector<HTMLElement>("[data-rule-tip]");
                  if (!step.tip || !tip || step.mode !== "wipe") return;

                  const back = step.from === "right";
                  const travel = axis === "y" ? "yPercent" : "xPercent";
                  // The tip is a fraction of the rule's own length, so
                  // its journey is measured in its own widths — hence
                  // the multiplier rather than a flat 100.
                  const span = 100 / RULE_TIP_LENGTH;

                  gsap.set(tip, { autoAlpha: 1, [travel]: back ? span : -span });
                  keep(
                    gsap.to(tip, {
                      [travel]: (back ? -1 : 1) * span * RULE_TIP_OVERRUN,
                      duration: step.dur,
                      ease: EASE[step.ease],
                      delay,
                    }),
                  );
                  keep(
                    gsap.to(tip, {
                      autoAlpha: 0,
                      duration: DUR.fast,
                      ease: EASE.exit,
                      delay: delay + step.dur * 0.78,
                    }),
                  );
                });
              },
            }),
          );
        }

        /* ---------------------------------------------------------
         * 7. EYEBROW RULES — the site's most repeated line.
         *
         * Every section opens with a `.u-eyebrow`, and globals.css gives
         * each one a hairline tick after the label. Driving them from
         * here rather than from a component means a section cannot be
         * added to this page without joining the line system — and
         * because the tick is a pseudo-element, the tween runs on a
         * CUSTOM PROPERTY the ::after reads rather than on the element,
         * which is the only way to animate something with no node.
         *
         * Same cadence table as the rules, so the ticks disagree with
         * each other about direction and speed exactly as much as the
         * hairlines do.
         * ------------------------------------------------------ */
        const eyebrows = qsa(".u-eyebrow:not(.u-eyebrow--plain)");
        if (eyebrows.length) {
          eyebrows.forEach((el, i) => {
            const step = RULE_CADENCE[i % RULE_CADENCE.length]!;
            el.style.setProperty("--rule-open", "0");
            el.style.setProperty(
              "--rule-origin",
              step.from === "right"
                ? "right center"
                : step.from === "center"
                  ? "center center"
                  : "left center",
            );
          });

          triggers.push(
            ...ScrollTrigger.batch(eyebrows, {
              start: ENTRANCE.text,
              once: true,
              onEnter: (batch) => {
                batch.forEach((node, i) => {
                  const el = node as HTMLElement;
                  const step =
                    RULE_CADENCE[eyebrows.indexOf(el) % RULE_CADENCE.length]!;
                  keep(
                    gsap.to(el, {
                      "--rule-open": 1,
                      duration: step.dur,
                      ease: EASE[step.ease],
                      delay: step.delay + i * STAGGER.items,
                      overwrite: true,
                    }),
                  );
                });
              },
            }),
          );
        }

        /* ---------------------------------------------------------
         * 8. TICKS — the corner marks, put down as they are reached.
         * ------------------------------------------------------ */
        qsa('[data-fx="ticks"]').forEach((group) => {
          const ticks = qsa("[data-tick]", group);
          if (!ticks.length) return;
          gsap.set(ticks, { scale: 0, transformOrigin: "50% 50%" });
          keep(
            gsap.to(ticks, {
              scale: 1,
              duration: DUR.base,
              ease: EASE.pop,
              delay: (i) => TICK_DELAY[i % TICK_DELAY.length]!,
              scrollTrigger: {
                trigger: group,
                start: ENTRANCE.text,
                once: true,
              },
            }),
          );
        });

        /* ---------------------------------------------------------
         * 9. REFRESH DISCIPLINE
         * ------------------------------------------------------ */
        qsa<HTMLImageElement>("img").forEach((img) => {
          if (img.complete) return;
          img.addEventListener("load", refreshSoon, {
            once: true,
            signal: listeners.signal,
          });
          img.addEventListener("error", refreshSoon, {
            once: true,
            signal: listeners.signal,
          });
        });

        qsa<HTMLVideoElement>("video").forEach((video) => {
          if (video.readyState >= 1) return;
          video.addEventListener("loadedmetadata", refreshSoon, {
            once: true,
            signal: listeners.signal,
          });
        });

        document.fonts.ready.then(() => {
          if (!cancelled) refreshSoon();
        });
      };

      /*
       * IntroSequence drops `is-loading` and fires "alma:loaded" in the
       * same breath, so the class is a reliable "has the intro finished"
       * probe at mount. Building any earlier would measure a scroll-locked
       * page and wipe above-the-fold media in behind the overlay.
       */
      if (document.documentElement.classList.contains("is-loading")) {
        window.addEventListener("alma:loaded", () => ctx.add(build), {
          once: true,
          signal: listeners.signal,
        });
      } else {
        build();
      }

      return () => {
        cancelled = true;
        listeners.abort();
        window.clearTimeout(refreshTimer);
        triggers.forEach((trigger) => trigger.kill());
        tweens.forEach((tween) => {
          tween.scrollTrigger?.kill();
          tween.kill();
        });
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      /*
       * Nothing to play. Every effect above animates off the rendered
       * markup, so the rendered markup already IS the finished state.
       * Only the measurements need to be honest for the rest of the page,
       * which matters most right here — matchMedia runs this branch after
       * reverting the motion branch when the visitor flips the OS setting
       * mid-session, and the reverted transforms have just changed the
       * height of everything below them.
       */
      ScrollTrigger.refresh();
    });

    return () => mm.revert();
  });

  return null;
}
