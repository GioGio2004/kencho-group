"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
import { SITE } from "@/lib/site";
import { DUR, EASE } from "@/lib/motion";
import { FrameSequence } from "@/lib/frame-sequence";
import {
  WALKTHROUGH as W,
  FRAMES,
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
       * FALLBACK — reduced motion. Poster only, no scrub, no pin. The
       * copy is simply present; nothing animates.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([beats.welcome, beats.headline, beats.craft, beats.cue], {
          autoAlpha: 1,
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

        /* Beats start hidden; set from JS so the SSR HTML stays complete. */
        const beatEls = [beats.headline, beats.craft, beats.cue].filter(
          Boolean,
        );
        gsap.set(beatEls, { autoAlpha: 0 });
        gsap.set(lines(), { yPercent: 110 });

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
              start: `top+=${window_.in * W.scrollLength}% top`,
              end: `top+=${window_.out * W.scrollLength}% top`,
              scrub: true,
            },
          });
          // Fade in over the first fifth, hold, fade out over the last fifth.
          tl.to(el, { autoAlpha: 1, duration: span * 0.2, ease: "none" })
            .to(el, { duration: span * 0.6 }, ">")
            .to(
              el,
              { autoAlpha: 0, duration: span * 0.2, ease: "none", ...extra },
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
          gsap.set(beats.welcome, { autoAlpha: 1 });
          const wb = W.beats.welcome;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: `top+=${wb.in * W.scrollLength}% top`,
              end: `top+=${wb.out * W.scrollLength}% top`,
              scrub: true,
            },
          });
          tl.to({}, { duration: 0.65 }).to(beats.welcome, {
            autoAlpha: 0,
            duration: 0.35,
            ease: "none",
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
              start: `top+=${hb.in * W.scrollLength}% top`,
              end: `top+=${hb.out * W.scrollLength}% top`,
              scrub: true,
            },
          });
          tl.set(beats.headline, { autoAlpha: 1 })
            .to(lines(), {
              yPercent: 0,
              duration: 0.35,
              ease: EASE.out,
              stagger: 0.06,
            })
            .to({}, { duration: 0.35 })
            .to(
              beats.headline,
              { yPercent: -14, autoAlpha: 0, duration: 0.3, ease: "none" },
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
              start: "top top",
              end: `+=${W.scrollLength}%`,
              scrub: true,
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
        let pinTrigger: ScrollTrigger | null = null;

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
            },
          });
          tl.fromTo(
            poster,
            { scale: W.fallback.fromScale },
            { scale: W.fallback.toScale, ease: "none" },
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

            /* Pin immediately so layout is stable while frames stream in;
             * the scrub simply paints the nearest loaded frame until the
             * head has arrived. No spinner, no blocked scroll. */
            pinTrigger = ScrollTrigger.create({
              trigger: root,
              start: "top top",
              end: `+=${W.scrollLength}%`,
              scrub: W.scrub,
              pin: true,
              anticipatePin: 1,
              onUpdate: (self) => seq.draw(self.progress),
            });
            cleanups.push(() => pinTrigger?.kill());

            seq
              .loadHead()
              .then(() => {
                if (!poster) return;
                // Hand off from poster to canvas once a frame is painted.
                gsap.to(poster, {
                  autoAlpha: 0,
                  duration: DUR.fast,
                  ease: EASE.soft,
                });
                seq.loadRest();
                ScrollTrigger.refresh();
              })
              .catch(() => {
                pinTrigger?.kill();
                pinTrigger = null;
                armPosterFallback();
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
            trigger: () => pinTrigger,
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

  const aspectPad = `${(1 / FRAMES.aspect) * 100}%`;

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
            style={{ ["--aspect-pad" as string]: aspectPad }}
          >
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

          <canvas
            aria-hidden="true"
            className="absolute inset-0 block h-full w-full"
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
        <div className="pointer-events-none absolute inset-0 z-10 grid">
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
