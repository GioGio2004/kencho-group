"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
import { SITE } from "@/lib/site";
import { DUR, EASE, lingerStops, smoothstep } from "@/lib/motion";
import { FrameSequence } from "@/lib/frame-sequence";
import {
  WALKTHROUGH as W,
  WALKTHROUGH_STOPS,
  pickTier,
  posterUrl,
  type FrameTier,
} from "@/lib/walkthrough";
import IntroSequence from "./IntroSequence";

/*
 * HERO — the scroll-scrubbed walkthrough.
 *
 * A pinned section paints a WebP frame sequence onto a canvas as you
 * scroll, with four narrative beats overlaid as real DOM (server
 * rendered, so the h1 and copy are always crawlable — nothing that
 * matters is drawn into the canvas).
 *
 * The kinetic type intro still owns the first ~3s and lives in
 * IntroSequence; this component is what sits behind its curtain. Every
 * tunable — scroll length, scrub, focal point, beat windows — is in
 * lib/walkthrough.ts.
 *
 * Fallback: reduced motion, a data-saver/slow connection, or frames that
 * fail to load all land on the poster with a slow scroll-driven zoom.
 * That path is a deliberate design, not a broken state.
 */
export default function Hero() {
  const t = useTranslations("hero");
  const rootRef = useRef<HTMLElement>(null);
  const seqRef = useRef<FrameSequence | null>(null);

  const headlineLines = t("lines").split("\n");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const canvas = q("canvas")[0] as HTMLCanvasElement | undefined;
      const poster = q("[data-hero-poster]")[0];
      const stage = q("[data-hero-stage]")[0];
      const heading = q("[data-hero-heading]")[0];
      const progressFill = q("[data-hero-progress]")[0];
      const beats = {
        welcome: q("[data-beat='welcome']")[0],
        headline: q("[data-beat='headline']")[0],
        craft: q("[data-beat='craft']")[0],
        cue: q("[data-beat='cue']")[0],
      };
      if (!stage) return;

      const mm = gsap.matchMedia();

      /* -----------------------------------------------------------------
       * FALLBACK — reduced motion. Poster only, no scrub, no pin.
       *
       * The four beats share one grid cell because they cross-fade in
       * place; showing them all at once overprints the h1 with three
       * other strings. The static layout un-stacks the grid instead (see
       * the `data-static` rule in globals.css) so the copy reads as an
       * ordinary column — which is also exactly what the no-JS HTML
       * gives a crawler, since the attribute is in the server markup.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([beats.welcome, beats.headline, beats.craft, beats.cue], {
          opacity: 1,
        });
      });

      /* -----------------------------------------------------------------
       * SCRUBBED WALKTHROUGH
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];
        let split: SplitText | null = null;
        const lines = () => {
          split ??= SplitText.create(heading, { type: "lines", mask: "lines" });
          return split.lines;
        };

        /*
         * Motion is on, so collapse the static column into the single
         * stacked cell the cross-fade needs, and hide the beats that have
         * not had their turn. Both are set from JS, so the server HTML
         * stays a complete, readable column.
         */
        const beatWrap = q("[data-beats]")[0];
        if (beatWrap) beatWrap.removeAttribute("data-static");

        const beatEls = [beats.headline, beats.craft, beats.cue].filter(
          Boolean,
        );
        // opacity, not autoAlpha: visibility:hidden would strip the only
        // <h1> from the accessibility tree and from the section's name.
        gsap.set(beatEls, { opacity: 0 });
        gsap.set(lines(), { yPercent: 110 });

        /*
         * Beat windows are expressed as a share of the PIN's scroll
         * distance, resolved through function-based start/end that read
         * the pin trigger's own start/end in pixels.
         *
         * The obvious `top+=45% top` form is wrong here on two counts: a
         * percentage start resolves against the element height (100svh)
         * while the pin length is a vh multiple (lvh on mobile, where the
         * two units differ by the browser chrome), so every beat fired
         * early on a phone; and it silently depends on the pin trigger
         * existing first, since a pinned element's positions shift.
         */
        const pinSpan = () => {
          const pin = pinTriggerRef.current;
          if (pin) return { start: pin.start, end: pin.end };
          const top = root.getBoundingClientRect().top + window.scrollY;
          return {
            start: top,
            end: top + (W.scrollLength / 100) * window.innerHeight,
          };
        };
        const atProgress = (p: number) => () => {
          const { start, end } = pinSpan();
          return start + (end - start) * p;
        };

        /* Fade a beat in across its window and out before the next. */
        const beatTween = (
          el: Element | undefined,
          window_: { in: number; out: number },
          extra?: gsap.TweenVars,
        ) => {
          if (!el) return;
          const span = window_.out - window_.in;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: atProgress(window_.in),
              end: atProgress(window_.out),
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          /*
           * Fade in over the first fifth, hold, fade out over the last
           * fifth — each on smoothstep rather than linear.
           *
           * This is a scrub, so the visitor is the clock, and a linear
           * opacity ramp under a hand-driven clock reads as a dimmer
           * being turned: the copy is at 50% for exactly as long as it is
           * at 5% or 95%, and there is no moment where it *arrives*.
           * Smoothstep spends its slope in the middle, so the beat
           * appears and departs decisively and holds legible in between.
           *
           * Not a GSAP named ease: those are shaped for a tween the page
           * plays itself, and an expo under a scrub is over inside the
           * first tenth of the scroll it was given.
           */
          tl.to(el, { opacity: 1, duration: span * 0.2, ease: smoothstep })
            .to(el, { duration: span * 0.6 }, ">")
            .to(
              el,
              { opacity: 0, duration: span * 0.2, ease: smoothstep, ...extra },
              ">",
            );
          cleanups.push(() => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        };

        /*
         * The welcome label is already on screen when the curtain lifts —
         * fading it in from nothing would leave the opening frame empty.
         * It only fades OUT, as the headline takes over.
         */
        if (beats.welcome) {
          gsap.set(beats.welcome, { opacity: 1 });
          const wb = W.beats.welcome;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: atProgress(wb.in),
              end: atProgress(wb.out),
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          tl.to({}, { duration: 0.65 }).to(beats.welcome, {
            opacity: 0,
            duration: 0.35,
            ease: smoothstep,
          });
          cleanups.push(() => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        }

        beatTween(beats.craft, W.beats.craft);
        beatTween(beats.cue, { in: W.beats.cue.in, out: 1.02 });

        /* The headline: masked lines rise, hold, then drift up and out. */
        if (beats.headline) {
          const hb = W.beats.headline;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: atProgress(hb.in),
              end: atProgress(hb.out),
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          tl.set(beats.headline, { opacity: 1 })
            .to(lines(), {
              yPercent: 0,
              duration: 0.35,
              ease: EASE.out,
              stagger: 0.06,
            })
            .to({}, { duration: 0.35 })
            .to(
              beats.headline,
              { yPercent: -14, opacity: 0, duration: 0.3, ease: smoothstep },
              ">",
            );
          cleanups.push(() => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        }

        /* The gold progress rail. */
        if (progressFill) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: atProgress(0),
              end: atProgress(1),
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          tl.fromTo(
            progressFill,
            { scaleY: 0 },
            { scaleY: 1, ease: "none" },
          );
          cleanups.push(() => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        }

        /* ---------------------------------------------------------------
         * The canvas scrub, or the poster zoom if frames are unavailable.
         * ------------------------------------------------------------ */
        const pinTriggerRef: { current: ScrollTrigger | null } = {
          current: null,
        };

        /*
         * The canvas is opaque (alpha:false, for fill speed), so it would
         * composite as a black rectangle over the poster from the first
         * paint. It ships hidden and cross-fades in once a real frame has
         * been drawn; the poster only leaves after the canvas is up.
         */
        const revealCanvas = () => {
          if (!canvas) return;
          gsap.to(canvas, {
            autoAlpha: 1,
            duration: DUR.fast,
            ease: EASE.soft,
          });
          if (poster) {
            gsap.to(poster, {
              autoAlpha: 0,
              duration: DUR.fast,
              ease: EASE.soft,
              delay: 0.05,
              onComplete: () => gsap.set(poster, { clearProps: "willChange" }),
            });
          }
        };

        const armPosterFallback = () => {
          if (!poster) return;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: `+=${W.scrollLength}%`,
              scrub: true,
              pin: true,
              anticipatePin: 1,
              onRefresh: (self) => {
                pinTriggerRef.current = self;
              },
            },
          });
          /* Paced by the same stops as the frame walk, so the fallback is
           * a quieter version of the same shot rather than a different
           * one. lingerStops is monotone and pinned at both ends, which
           * is exactly the contract a GSAP ease has to satisfy. */
          tl.fromTo(
            poster,
            { scale: W.fallback.fromScale },
            {
              scale: W.fallback.toScale,
              ease: (p: number) => lingerStops(p, WALKTHROUGH_STOPS),
            },
          );
          cleanups.push(() => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        };

        const tier: FrameTier = pickTier();
        const conn = (
          navigator as Navigator & { connection?: { saveData?: boolean } }
        ).connection;

        if (!canvas || conn?.saveData) {
          armPosterFallback();
        } else {
          let seq: FrameSequence | null = null;
          try {
            seq = new FrameSequence(canvas, tier);
          } catch {
            seq = null;
          }

          if (!seq) {
            armPosterFallback();
          } else {
            seqRef.current = seq;
            seq.resize();

            const onResize = () => seq.resize();
            window.addEventListener("resize", onResize);
            cleanups.push(() => {
              window.removeEventListener("resize", onResize);
              seq.dispose();
              seqRef.current = null;
            });

            /*
             * SMOOTHNESS — the frames are scrubbed through a proxy value
             * rather than read straight off the trigger.
             *
             * `scrub` on a bare ScrollTrigger has nothing to interpolate:
             * self.progress is the raw scroll position, so painting from
             * it steps the sequence in lockstep with scroll events and
             * reads mechanical. Tweening a proxy gives GSAP something to
             * ease, and painting on the ticker decouples the repaint rate
             * from how often the browser chooses to fire scroll — so the
             * sequence glides at display refresh instead of stuttering
             * with input. The head tween below is what `W.scrub` tunes.
             */
            const playhead = { v: 0 };

            const scrubTween = gsap.to(playhead, {
              v: 1,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top top",
                end: `+=${W.scrollLength}%`,
                scrub: W.scrub,
                pin: true,
                anticipatePin: 1,
              },
            });
            pinTriggerRef.current = scrubTween.scrollTrigger ?? null;
            // Beats were created before the pin existed; re-resolve their
            // function-based bounds now that it does.
            ScrollTrigger.refresh();

            /*
             * Paint once per frame from the eased playhead, re-paced by
             * the beat stops on the way through. draw() skips redundant
             * indices, so a still page costs one comparison.
             *
             * TWO DIFFERENT SMOOTHINGS, and they do different jobs. The
             * proxy tween above smooths the INPUT — it decouples the
             * playhead from the browser's scroll-event cadence, which is
             * what stops the sequence stepping. lingerStops re-paces the
             * OUTPUT — it decides which part of the walk is worth more
             * scroll, so the camera all but stops while a beat is being
             * read and covers the empty stretch at full speed. Neither
             * substitutes for the other, and neither moves a beat
             * boundary: every window's ends stay on the frame they were
             * already on.
             */
            const paint = () => {
              seq.draw(lingerStops(playhead.v, WALKTHROUGH_STOPS));
            };
            gsap.ticker.add(paint);

            cleanups.push(() => {
              gsap.ticker.remove(paint);
              scrubTween.scrollTrigger?.kill();
              scrubTween.kill();
            });

            seq
              .loadHead()
              .then(() => {
                /* Only hand off once pixels are genuinely on the canvas —
                 * fading the poster on mere promise resolution left an
                 * opaque black canvas covering everything. */
                if (seq.hasPainted) revealCanvas();
                seq.loadRest();
              })
              .catch(() => {
                /* Total frame failure: tear the scrub down and let the
                 * poster carry the section. */
                gsap.ticker.remove(paint);
                scrubTween.scrollTrigger?.kill();
                scrubTween.kill();
                pinTriggerRef.current = null;
                armPosterFallback();
                ScrollTrigger.refresh();
              });
          }
        }

        if (process.env.NODE_ENV === "development") {
          (window as unknown as Record<string, unknown>).__almaWalk = {
            tier,
            get frames() {
              return seqRef.current?.frameTotal ?? 0;
            },
            get complete() {
              return seqRef.current?.isComplete ?? false;
            },
            trigger: () => pinTriggerRef.current,
          };
        }

        return () => {
          cleanups.forEach((fn) => fn());
          if (split) gsap.killTweensOf(split.lines);
          split?.revert();
          split = null;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <>
      {/* The kinetic type intro still plays over everything on first
          visit; this hero is what its curtain reveals. */}
      <IntroSequence />

      <section
        ref={rootRef}
        id="hero"
        aria-labelledby="hero-title"
        /* No `isolate`: it would trap the intro overlay's stacking order. */
        className="relative h-svh overflow-hidden bg-charcoal"
      >
        <div data-hero-stage className="absolute inset-0">
          {/*
            Poster is the LCP element: real <img> via next/image, eager,
            sized to the viewport. The canvas fades over it once the first
            frames decode, so there is no gap and no layout shift — both
            layers are absolutely positioned at the same rect.
          */}
          <div
            data-hero-poster
            className="absolute inset-0 will-change-transform"
          >
            {/* Phones fetch the 900px poster, desktops the wide one. */}
            <Image
              src={posterUrl("desktop")}
              alt={t("walkthroughAlt")}
              fill
              sizes="100vw"
              loading="eager"
              fetchPriority="high"
              className="object-cover"
              style={{ objectPosition: `${W.focal.x * 100}% ${W.focal.y * 100}%` }}
            />
          </div>

          {/* Hidden until a real frame is painted — see revealCanvas(). */}
          <canvas
            aria-hidden="true"
            className="invisible absolute inset-0 block h-full w-full opacity-0"
          />

          {/* Warm-dark scrim so overlay copy reads against any frame. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--ink) 72%, transparent) 0%, color-mix(in srgb, var(--ink) 34%, transparent) 38%, color-mix(in srgb, var(--ink) 12%, transparent) 68%, transparent 100%)",
            }}
          />
        </div>

        {/* Gold progress rail, right edge. */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 right-3 z-10 h-24 w-px -translate-y-1/2 bg-sand/20 sm:right-6 sm:h-32"
        >
          <div
            data-hero-progress
            className="h-full w-full origin-top bg-clay"
          />
        </div>

        {/* ---------------------------------------------------------------
            Narrative beats. All real DOM, server-rendered and stacked in
            one centred grid cell so they cross-fade in place.
            --------------------------------------------------------- */}
        <div
          data-beats
          data-static
          className="pointer-events-none absolute inset-0 z-10 grid"
        >
          {/* 0–15% — the door opens. */}
          <p
            data-beat="welcome"
            className="col-start-1 row-start-1 self-end justify-self-start px-5 pb-28 text-xs tracking-[0.28em] text-sand/85 uppercase sm:px-8 sm:pb-24 sm:text-sm lg:px-12"
          >
            {t("beatWelcome")}
          </p>

          {/* 15–45% — the headline. */}
          <div
            data-beat="headline"
            className="col-start-1 row-start-1 self-end px-5 pb-32 sm:px-8 sm:pb-28 lg:px-12 lg:pb-24"
          >
            <h1
              id="hero-title"
              data-hero-heading
              className="u-display max-w-[20ch] text-[clamp(2.4rem,9vw,6.5rem)] text-sand"
            >
              {headlineLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h1>
          </div>

          {/* 45–75% — the craft line. */}
          <div
            data-beat="craft"
            className="col-start-1 row-start-1 self-end px-5 pb-32 sm:px-8 sm:pb-28 lg:px-12 lg:pb-24"
          >
            <p className="max-w-md text-base leading-relaxed text-sand sm:text-lg">
              {t("beatCraft")}
            </p>
            <p className="mt-4 text-[0.6rem] tracking-[0.55em] text-clay uppercase">
              {SITE.wordmarkSub}
            </p>
          </div>

          {/* 95–100% — keep going. */}
          <div
            data-beat="cue"
            className="col-start-1 row-start-1 flex flex-col items-center gap-2 self-end justify-self-center pb-28 sm:pb-24"
          >
            <span className="text-[0.6rem] tracking-[0.3em] text-sand/75 uppercase">
              {t("beatContinue")}
            </span>
            <span className="relative block h-9 w-px overflow-hidden bg-sand/25">
              <span className="cue-travel absolute inset-x-0 top-0 block h-4 bg-sand/80" />
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
