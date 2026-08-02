"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import LineArt from "./LineArt";

/* =====================================================================
 * INTRO CONFIG — every timing, easing and stagger for the opening.
 * Tune the feel here; nothing below hard-codes a number.
 *
 * The sequence: line drawing sketches itself while the counter tracks
 * real asset progress → strokes wink to brass → the sand overlay splits
 * as two workshop doors → the hero pushes in (back photo settles from
 * 1.15, vignette from 1.06, copy rises) → ambient depth takes over.
 *
 * SLOWER / SOFTER  → raise curtain.duration toward 1.0 and
 *                    depth.back.duration toward 2.0; push
 *                    headline.stagger toward 0.12.
 * GENTLER PUSH     → lower depth.back.fromScale toward 1.08 (a shorter
 *                    journey reads calmer); raise toward 1.2 for drama.
 * SNAPPIER         → drop counter.minDuration to ~0.5, draw.main
 *                    duration to ~0.7 and curtain.duration to ~0.6.
 * ================================================================== */
const INTRO = {
  counter: {
    /** Hard cap on the ASSET wait, in seconds. Progress is real but bounded. */
    maxWait: 1.5,
    /** The counter never completes before this, so it reads deliberate. */
    minDuration: 0.85,
    /** Share of progress attributed to fonts vs the hero image. */
    fontsWeight: 35,
    imageWeight: 65,
    /** How hard the displayed number chases the true value (0–1). */
    chase: 0.11,
  },
  draw: {
    /** Main geometry strokes — the craftsman blocks in the carcass. */
    main: { duration: 0.9, stagger: 0.12, ease: "power2.inOut" },
    /** Detail strokes — handles, splits, the pendant. Overlaps main. */
    detail: { duration: 0.5, stagger: 0.06, overlap: 0.3, ease: "power2.inOut" },
  },
  release: {
    /**
     * The preloader releases when assets are done AND the drawing has
     * finished — but never later than this many seconds, total.
     */
    hardCap: 3.5,
  },
  wink: {
    /** Strokes flash from ink to brass — the maker's signature. */
    duration: 0.2,
    /** Beat held on the brass drawing before the content fades. */
    hold: 0.15,
  },
  curtain: {
    /** Lockup + drawing + counter fade fully BEFORE the panels move. */
    contentFade: 0.25,
    /** Each half-panel's travel — workshop doors opening. */
    duration: 0.8,
    /** The right door trails the left by this much. */
    rightDelay: 0.05,
    ease: "expo.inOut",
  },
  /* Pseudo-3D stage: three layers moving at different rates. */
  depth: {
    /** Photo layer: big → settled. The largest move sells the push-in. */
    back: { fromScale: 1.15, toScale: 1.02, duration: 1.6, ease: "expo.out" },
    /** Vignette layer: smaller move, so it slides against the photo. */
    mid: { fromScale: 1.06, duration: 1.6 },
    /** Copy block: rises the least — nearest to the viewer. */
    front: { fromY: 24, duration: 1.2 },
    /** Scrubbed drift while the hero scrolls away (yPercent). */
    scroll: { backYPercent: 4, midYPercent: 7 },
    /** Desktop pointer parallax: max travel in px, per-layer factors. */
    pointer: { range: 6, backFactor: 0.4, midFactor: 1, smooth: 0.6 },
    /** Mobile ambient drift: ±px, seconds per half-cycle. */
    drift: { amp: 3, duration: 7 },
  },
  headline: {
    /** Start relative to the curtains splitting (during the push). */
    offset: 0.25,
    duration: 1.1,
    stagger: 0.09,
    ease: "expo.out",
    fromYPercent: 110,
  },
  sub: {
    /** Start relative to the headline starting. */
    offset: 0.35,
    duration: 0.6,
    ease: "power3.out",
  },
  cue: {
    /** Start relative to the headline starting. */
    offset: 0.55,
    duration: 0.5,
    ease: "power2.out",
  },
  /** Return visits within the same session: no preloader, no curtain. */
  returnVisit: {
    fade: 0.5,
    headlineDuration: 0.9,
    headlineStagger: 0.07,
  },
} as const;

const SESSION_KEY = "alma:intro-seen";

/*
 * Mid layer: text-zone scrim (keeps the sand copy readable — same ramp
 * as the old flat scrim) + a soft edge vignette that slides against the
 * photo during the push-in and parallax, selling the depth.
 */
const MID_VIGNETTE = [
  "linear-gradient(to top, color-mix(in srgb, var(--ink) 66%, transparent) 0%, color-mix(in srgb, var(--ink) 30%, transparent) 34%, transparent 64%)",
  "radial-gradient(140% 110% at 50% 38%, transparent 58%, color-mix(in srgb, var(--ink) 26%, transparent) 100%)",
].join(", ");

export default function Hero() {
  const t = useTranslations("hero");
  const rootRef = useRef<HTMLElement>(null);

  /*
   * "hero.lines" is one localized string with \n separators — one block
   * span per line. Locale change remounts the page, so the split below
   * is always cut against the current language's lines.
   */
  const headlineLines = t("lines").split("\n");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const overlay = q("[data-intro-overlay]")[0];
      const panelLeft = q('[data-intro-panel="left"]')[0];
      const panelRight = q('[data-intro-panel="right"]')[0];
      const introContent = q("[data-intro-content]")[0];
      const artWrap = q("[data-intro-art]")[0];
      const counterEl = q("[data-intro-counter]")[0];
      const back = q('[data-hero-layer="back"]')[0];
      const mid = q('[data-hero-layer="mid"]')[0];
      const front = q("[data-hero-front]")[0];
      const heading = q("[data-hero-heading]")[0];
      const sub = q("[data-hero-sub]")[0];
      const cue = q("[data-hero-cue]")[0];
      if (!back || !mid || !front || !heading) return;

      /* "alma:reveal" fires once, when the curtains start moving —
       * and always before "alma:loaded". */
      let revealed = false;
      const reveal = () => {
        if (revealed) return;
        revealed = true;
        window.dispatchEvent(new Event("alma:reveal"));
      };

      const markSeen = () => {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* private mode — the intro simply plays again next visit */
        }
      };

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        reveal();
        markSeen();
        document.documentElement.classList.remove("is-loading");
        if (overlay) gsap.set(overlay, { display: "none" });
        window.dispatchEvent(new Event("alma:loaded"));
      };

      const mm = gsap.matchMedia();

      /* -----------------------------------------------------------------
       * REDUCED MOTION — land on the finished hero. A single opacity
       * fade only: no draw, no curtains, no push, no drift loops.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        finish();
        gsap.set(back, { scale: INTRO.depth.back.toScale });
        gsap.from(root, {
          autoAlpha: 0,
          duration: INTRO.returnVisit.fade,
          ease: "power2.out",
        });
      });

      /* -----------------------------------------------------------------
       * ALL MOTION lives inside this context.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];

        /*
         * The split is built fresh on every mount (never reused across
         * locales — a language switch remounts the page) and reverted in
         * teardown. Type "lines" only: safe for Georgian and Cyrillic.
         */
        let split: SplitText | null = null;
        const lines = () => {
          split ??= SplitText.create(heading, { type: "lines", mask: "lines" });
          return split.lines;
        };

        /* The scroll cue retreats as soon as the page moves. */
        const watchCue = () => {
          if (!cue) return;
          const st = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: "+=18%",
            onUpdate: (self) => gsap.set(cue, { opacity: 1 - self.progress }),
          });
          cleanups.push(() => st.kill());
        };

        const teardown = () => {
          cleanups.forEach((fn) => fn());
          if (split) gsap.killTweensOf(split.lines);
          split?.revert();
          split = null;
        };

        /* ---------------------------------------------------------------
         * AMBIENT DEPTH — armed once, after the entrance (or a skip).
         * (a) scroll: scrubbed differential drift on back/mid;
         * (b) fine pointers: quickTo parallax at two rates;
         * (c) coarse pointers: a very slow breathing drift instead.
         * ------------------------------------------------------------ */
        let ambientStarted = false;
        let disarmSkip: (() => void) | null = null;
        const startAmbient = () => {
          if (ambientStarted) return;
          ambientStarted = true;
          disarmSkip?.();

          const depthScrub = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
          depthScrub
            .to(back, { yPercent: INTRO.depth.scroll.backYPercent, ease: "none" }, 0)
            .to(mid, { yPercent: INTRO.depth.scroll.midYPercent, ease: "none" }, 0);
          cleanups.push(() => {
            depthScrub.scrollTrigger?.kill();
            depthScrub.kill();
          });

          if (window.matchMedia("(pointer: fine)").matches) {
            const { range, backFactor, midFactor, smooth } = INTRO.depth.pointer;
            const opts = { duration: smooth, ease: "power3.out" };
            const backX = gsap.quickTo(back, "x", opts);
            const backY = gsap.quickTo(back, "y", opts);
            const midX = gsap.quickTo(mid, "x", opts);
            const midY = gsap.quickTo(mid, "y", opts);
            const onMove = (e: PointerEvent) => {
              const nx = (e.clientX / window.innerWidth) * 2 - 1;
              const ny = (e.clientY / window.innerHeight) * 2 - 1;
              backX(nx * range * backFactor);
              backY(ny * range * backFactor);
              midX(nx * range * midFactor);
              midY(ny * range * midFactor);
            };
            window.addEventListener("pointermove", onMove, { passive: true });
            cleanups.push(() => {
              window.removeEventListener("pointermove", onMove);
              gsap.killTweensOf([back, mid], "x,y");
            });
          } else if (window.matchMedia("(pointer: coarse)").matches) {
            /* Opposite signs so the layers slide against each other. */
            const driftBack = gsap.to(back, {
              y: INTRO.depth.drift.amp,
              duration: INTRO.depth.drift.duration,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
            const driftMid = gsap.to(mid, {
              y: -INTRO.depth.drift.amp,
              duration: INTRO.depth.drift.duration,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
            cleanups.push(() => {
              driftBack.kill();
              driftMid.kill();
            });
          }
        };

        const seen = (() => {
          try {
            return sessionStorage.getItem(SESSION_KEY) === "1";
          } catch {
            return false;
          }
        })();

        const introReady =
          overlay && panelLeft && panelRight && introContent && artWrap;

        /* ---------------------------------------------------------------
         * RETURN VISIT — skip the preloader, quick fade + headline reveal,
         * landing directly on the settled stage.
         * ------------------------------------------------------------ */
        if (
          seen ||
          !introReady ||
          !document.documentElement.classList.contains("is-loading")
        ) {
          finish();
          gsap.set(back, { scale: INTRO.depth.back.toScale });
          gsap
            .timeline()
            .from(root, {
              autoAlpha: 0,
              duration: INTRO.returnVisit.fade,
              ease: "power2.out",
            })
            .from(
              lines(),
              {
                yPercent: INTRO.headline.fromYPercent,
                duration: INTRO.returnVisit.headlineDuration,
                ease: INTRO.headline.ease,
                stagger: INTRO.returnVisit.headlineStagger,
              },
              0.1,
            )
            .from(
              [sub, cue].filter(Boolean),
              {
                autoAlpha: 0,
                y: 14,
                duration: INTRO.sub.duration,
                ease: INTRO.sub.ease,
                stagger: 0.12,
              },
              0.35,
            );
          watchCue();
          startAmbient();
          return teardown;
        }

        /* ---------------------------------------------------------------
         * FIRST VISIT — the full sequence.
         *
         * Initial states are applied here rather than in CSS, so the
         * server-rendered HTML stays complete and correct without JS. The
         * opaque overlay is already covering this frame, so setting them
         * now cannot flash.
         * ------------------------------------------------------------ */
        const mainPaths = q('[data-la="main"] path');
        const detailPaths = q('[data-la="detail"] path');

        /* Brass for the wink — strokes are currentColor, so tweening the
         * wrapper's `color` recolors every path at once. The fallback
         * mirrors --clay in globals.css (never rendered as copy). */
        const clayColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--clay")
            .trim() || "#b08d57";

        gsap.set([...mainPaths, ...detailPaths], { drawSVG: "0%" });
        gsap.set(back, { scale: INTRO.depth.back.fromScale });
        gsap.set(mid, { scale: INTRO.depth.mid.fromScale });
        gsap.set(front, { y: INTRO.depth.front.fromY });
        gsap.set([sub, cue].filter(Boolean), { autoAlpha: 0 });

        /* ---------------------------------------------------------------
         * PRELOADER LINE-DRAW — starts immediately, never waits on assets.
         * A craftsman's sketch: carcass first, then handles and details.
         * ------------------------------------------------------------ */
        const drawTl = gsap
          .timeline({
            onComplete: () => {
              drawDone = true;
              release();
            },
          })
          .to(mainPaths, {
            drawSVG: "100%",
            duration: INTRO.draw.main.duration,
            stagger: INTRO.draw.main.stagger,
            ease: INTRO.draw.main.ease,
          })
          .to(
            detailPaths,
            {
              drawSVG: "100%",
              duration: INTRO.draw.detail.duration,
              stagger: INTRO.draw.detail.stagger,
              ease: INTRO.draw.detail.ease,
            },
            `-=${INTRO.draw.detail.overlap}`,
          );

        /* ---------------------------------------------------------------
         * MASTER — wink → content fade → doors split → push-in.
         * ------------------------------------------------------------ */
        const master = gsap.timeline({
          paused: true,
          onComplete: startAmbient,
        });

        if (artWrap) {
          master.to(artWrap, {
            color: clayColor,
            duration: INTRO.wink.duration,
            ease: "power2.inOut",
          });
        }

        /* Lockup, drawing and counter are gone before the doors move —
         * the drawing must never visibly jump with the panels. */
        master
          .to(
            introContent,
            {
              autoAlpha: 0,
              duration: INTRO.curtain.contentFade,
              ease: "power2.in",
            },
            `+=${INTRO.wink.hold}`,
          )
          .addLabel("split")
          .to(
            panelLeft,
            {
              xPercent: -100,
              duration: INTRO.curtain.duration,
              ease: INTRO.curtain.ease,
              onStart: reveal,
            },
            "split",
          )
          .to(
            panelRight,
            {
              xPercent: 100,
              duration: INTRO.curtain.duration,
              ease: INTRO.curtain.ease,
            },
            `split+=${INTRO.curtain.rightDelay}`,
          )
          /* Overlay is fully off-screen here — the page is live even
           * though the push-in is still settling. */
          .add(finish, `split+=${INTRO.curtain.duration + INTRO.curtain.rightDelay}`);

        /* The push-in overlaps the doors: three layers, three rates. */
        master
          .to(
            back,
            {
              scale: INTRO.depth.back.toScale,
              duration: INTRO.depth.back.duration,
              ease: INTRO.depth.back.ease,
            },
            "split",
          )
          .to(
            mid,
            {
              scale: 1,
              duration: INTRO.depth.mid.duration,
              ease: INTRO.depth.back.ease,
            },
            "split",
          )
          .to(
            front,
            {
              y: 0,
              duration: INTRO.depth.front.duration,
              ease: INTRO.depth.back.ease,
            },
            "split",
          )
          .add(() => {
            gsap.from(lines(), {
              yPercent: INTRO.headline.fromYPercent,
              duration: INTRO.headline.duration,
              ease: INTRO.headline.ease,
              stagger: INTRO.headline.stagger,
            });
          }, `split+=${INTRO.headline.offset}`);

        if (sub) {
          master.to(
            sub,
            {
              autoAlpha: 1,
              duration: INTRO.sub.duration,
              ease: INTRO.sub.ease,
            },
            `split+=${INTRO.headline.offset + INTRO.sub.offset}`,
          );
        }

        if (cue) {
          master.to(
            cue,
            {
              autoAlpha: 1,
              duration: INTRO.cue.duration,
              ease: INTRO.cue.ease,
            },
            `split+=${INTRO.headline.offset + INTRO.cue.offset}`,
          );
        }

        /* ---------------------------------------------------------------
         * RELEASE — assets done AND draw complete, total ≤ hardCap.
         * Both waits are explicit; either alone never releases.
         * ------------------------------------------------------------ */
        let fontsReady = false;
        let imageReady = false;
        let displayed = 0;
        let assetsDone = false;
        let drawDone = false;
        let released = false;
        const startedAt = performance.now();

        const release = (force = false) => {
          if (released) return;
          if (!force && !(assetsDone && drawDone)) return;
          released = true;
          gsap.ticker.remove(tick);
          if (counterEl) counterEl.textContent = "100";
          /* Forced release (hard cap / skip): complete the sketch
           * instantly so the wink recolors a finished drawing. */
          if (drawTl.progress() < 1) drawTl.progress(1);
          master.play();
        };

        const settleAssets = () => {
          if (assetsDone) return;
          assetsDone = true;
          gsap.ticker.remove(tick);
          if (counterEl) counterEl.textContent = "100";
          release();
        };

        /* Counter: real asset progress (fonts + hero image), bounded. */
        const tick = () => {
          const elapsed = (performance.now() - startedAt) / 1000;
          const assets =
            (fontsReady ? INTRO.counter.fontsWeight : 0) +
            (imageReady ? INTRO.counter.imageWeight : 0);
          // Never let the number stall while assets are in flight, and never
          // finish before minDuration so the count reads as deliberate.
          const creep = (elapsed / INTRO.counter.maxWait) * 92;
          const ceiling = elapsed < INTRO.counter.minDuration ? 92 : 100;
          const target = Math.min(ceiling, Math.max(assets, creep));

          displayed += Math.max(
            0.5,
            (target - displayed) * INTRO.counter.chase,
          );
          if (displayed > target) displayed = target;
          if (counterEl) {
            counterEl.textContent = String(Math.floor(displayed)).padStart(
              2,
              "0",
            );
          }
          if (displayed >= 99.5) settleAssets();
        };
        gsap.ticker.add(tick);
        cleanups.push(() => gsap.ticker.remove(tick));

        document.fonts.ready.then(() => {
          fontsReady = true;
        });

        const heroImg = root.querySelector("img");
        if (!heroImg || heroImg.complete) {
          imageReady = true;
        } else {
          const onSettled = () => {
            imageReady = true;
          };
          heroImg.addEventListener("load", onSettled, { once: true });
          heroImg.addEventListener("error", onSettled, { once: true });
          cleanups.push(() => {
            heroImg.removeEventListener("load", onSettled);
            heroImg.removeEventListener("error", onSettled);
          });
        }

        // Assets are never waited on past maxWait…
        const assetCap = gsap.delayedCall(INTRO.counter.maxWait, settleAssets);
        // …and the WHOLE preloader is never held past hardCap.
        const totalCap = gsap.delayedCall(INTRO.release.hardCap, () =>
          release(true),
        );
        cleanups.push(() => {
          assetCap.kill();
          totalCap.kill();
        });

        /* ---------------------------------------------------------------
         * SKIP — any scroll, tap or keypress jumps straight to the end.
         * ------------------------------------------------------------ */
        /*
         * progress(1) fires the timeline's callbacks in order — reveal,
         * finish, the headline `.add` (which would START a from-tween),
         * and onComplete/startAmbient (both guarded, run-once). So after
         * jumping, kill the freshly created headline tween and snap every
         * animated property to its resting value explicitly. Ambient
         * depth is deliberately left running; it is the resting state.
         */
        let skipped = false;
        const skip = () => {
          if (skipped) return;
          skipped = true;
          release(true);
          drawTl.kill();
          master.progress(1);
          const headingLines = lines();
          gsap.killTweensOf(headingLines);
          gsap.set(headingLines, { yPercent: 0 });
          gsap.set(back, { scale: INTRO.depth.back.toScale });
          gsap.set(mid, { scale: 1 });
          gsap.set(front, { y: 0 });
          gsap.set([sub, cue].filter(Boolean), { autoAlpha: 1 });
          finish();
          startAmbient();
        };
        const SKIP_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
        SKIP_EVENTS.forEach((type) =>
          window.addEventListener(type, skip, { once: true, passive: true }),
        );
        disarmSkip = () =>
          SKIP_EVENTS.forEach((type) =>
            window.removeEventListener(type, skip),
          );
        cleanups.push(disarmSkip);

        watchCue();

        if (process.env.NODE_ENV === "development") {
          (window as unknown as Record<string, unknown>).__almaIntro = master;
        }

        return teardown;
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-sand"
    >
      {/*
       * Pseudo-3D stage: back (photo) and mid (vignette) settle at
       * different rates while the front copy rises — the differential is
       * the push-in illusion. Transform-only, no layout work.
       */}
      <div
        data-hero-stage
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ perspective: "1200px" }}
      >
        {/* SWAP POINT: back layer → <HeroFrames /> canvas frame-sequence
            later. Contract: fills the layer div, exposes nothing,
            receives no props from the intro. TODO. */}
        <div
          data-hero-layer="back"
          className="absolute inset-0 will-change-transform"
        >
          <Image
            src={src(IMAGES.heroMain, 2400)}
            alt={t("imageAlt")}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover"
          />
        </div>

        {/* Vignette layer: edge shadows + the text-zone scrim. */}
        <div
          data-hero-layer="mid"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{ background: MID_VIGNETTE }}
        />
      </div>

      <div
        data-hero-front
        className="relative z-10 mx-auto w-full max-w-[88rem] px-5 pt-32 pb-28 sm:px-8 sm:pb-32 lg:px-12 lg:pb-36"
      >
        <h1
          id="hero-title"
          data-hero-heading
          className="u-display text-[clamp(2.75rem,11vw,7.5rem)] text-sand"
        >
          {headlineLines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p
          data-hero-sub
          className="mt-7 max-w-md text-sm tracking-[0.16em] text-sand/80 uppercase sm:text-base"
        >
          {t("sub")}
        </p>
      </div>

      <div
        data-hero-cue
        aria-hidden="true"
        className="absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[0.6rem] tracking-[0.3em] text-sand/70 uppercase">
          {t("scroll")}
        </span>
        <span className="relative block h-10 w-px overflow-hidden bg-sand/25">
          <span className="cue-travel absolute inset-x-0 top-0 block h-4 bg-sand/80" />
        </span>
      </div>

      {/*
       * Intro overlay, gated by the `is-loading` class from the pre-paint
       * script — a JS failure can never leave it covering the page.
       *
       * Two sand half-panels (50.1% each so no seam ever shows) split as
       * workshop doors; the content layer above them fades out first.
       * Wordmark lockup: type only. The tracking utility carries `!`
       * because `.u-display` is unlayered CSS and would otherwise win.
       */}
      <div
        data-intro-overlay
        aria-hidden="true"
        className="intro-overlay fixed inset-0 z-[100]"
      >
        <div
          data-intro-panel="left"
          className="absolute inset-y-0 left-0 w-[50.1%] bg-sand will-change-transform"
        />
        <div
          data-intro-panel="right"
          className="absolute inset-y-0 right-0 w-[50.1%] bg-sand will-change-transform"
        />

        <div data-intro-content className="absolute inset-0">
          <span className="absolute top-5 left-5 flex flex-col sm:top-8 sm:left-8">
            <span className="u-display text-sm tracking-[0.35em]! text-ink">
              {SITE.wordmark}
            </span>
            <span className="mt-1 text-[0.5rem] font-medium tracking-[0.52em] text-clay">
              {SITE.wordmarkSub}
            </span>
          </span>

          {/* The sketch — strokes are currentColor, so the wrapper's
              `color` is the single recolor handle for the brass wink. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              data-intro-art
              className="w-[72vw] max-w-[420px] text-ink sm:w-[min(60vw,420px)]"
            >
              <LineArt />
            </div>
          </div>

          <span
            data-intro-counter
            className="u-display absolute right-5 bottom-5 text-lg tabular-nums text-ink sm:right-8 sm:bottom-8"
          >
            00
          </span>
        </div>
      </div>
    </section>
  );
}
