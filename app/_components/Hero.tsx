"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useTranslations } from "next-intl";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";

/* =====================================================================
 * INTRO CONFIG — every timing, easing and stagger for the opening.
 * Tune the feel here; nothing below hard-codes a number.
 *
 * The sequence: kinetic verbs hard-cut in the centre (solid / outlined /
 * solid / outlined) while the counter tracks real asset progress → the
 * KENCHO / GROUP lockup cuts in and holds a beat → the lockup blows past
 * the camera while the sand sheet lifts upward with rounded bottom
 * corners → the hero pushes in (back photo settles from 1.15, vignette
 * from 1.06, copy rises) → ambient depth takes over.
 *
 * The background NEVER changes colour — the sheet stays constant sand
 * and only the type cuts (photosensitivity rule).
 *
 * SLOWER / SOFTER  → raise words.perWord toward 0.45 and
 *                    curtain.duration toward 1.1; push headline.stagger
 *                    toward 0.12.
 * PUNCHIER CUTS    → drop words.scalePunch.from toward 0.88 and its
 *                    duration toward 0.12.
 * GENTLER PUSH     → lower depth.back.fromScale toward 1.08 (a shorter
 *                    journey reads calmer); raise toward 1.2 for drama.
 * SNAPPIER         → drop counter.minDuration to ~0.5, words.perWord to
 *                    ~0.28, lockup.holdBeat to ~0.25, fly.duration to
 *                    ~0.55 and curtain.duration to ~0.7.
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
  words: {
    /** Seconds each verb owns the screen before the next hard cut. */
    perWord: 0.35,
    /** Punch on every cut: the word lands slightly small, snaps to 1. */
    scalePunch: { from: 0.92, duration: 0.18, ease: "power3.out" },
    /**
     * Tracking tightens toward this while a word holds — a 2–3% visual
     * squeeze from the .u-display base (-0.03em; ka loosens to -0.01em,
     * which is why the base is read from computed style, never assumed).
     */
    tightenTo: "-0.045em",
    /** Ease of the tracking squeeze — a slow settle, no bounce. */
    tightenEase: "power1.out",
  },
  lockup: {
    /** Beat held on the KENCHO / GROUP lockup before the fly-through. */
    holdBeat: 0.4,
  },
  fly: {
    /** How far past the camera the lockup blows (scale multiplier). */
    scaleTo: 14,
    duration: 0.7,
    ease: "expo.in",
    /** Opacity holds until this share of the fly, then drops fast. */
    fadeStartProgress: 0.6,
    /** Ease of that fast tail fade. */
    fadeEase: "power2.in",
    /**
     * Zoom origin — aims roughly at the counter of the E in KENCHO. The
     * lockup element is viewport-sized, so these are viewport
     * percentages; nudge ±2% if the display font or clamp changes.
     */
    origin: "38% 42%",
  },
  curtain: {
    /** The single sand sheet lifts upward, unveiling the stage below. */
    duration: 0.9,
    ease: "expo.inOut",
    /** Bottom corners round off as the sheet lifts — a soft page-peel. */
    radius: "20px",
  },
  release: {
    /**
     * The preloader releases when assets are done AND the word+lockup
     * sequence has reached its hold — but never later than this many
     * seconds, total.
     */
    hardCap: 3.5,
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
    /** Start relative to the sheet lifting (during the push). */
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
  /** Return visits within the same session: no words, no counter. */
  returnVisit: {
    fade: 0.5,
    /** Fast upward lift, used only if the sheet is somehow still live. */
    lift: 0.6,
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
  const tIntro = useTranslations("intro");
  const rootRef = useRef<HTMLElement>(null);

  /*
   * "hero.lines" is one localized string with \n separators — one block
   * span per line. Locale change remounts the page, so the split below
   * is always cut against the current language's lines.
   */
  const headlineLines = t("lines").split("\n");

  /* "intro.words" — four verbs per locale, \n-separated. Rendered from
   * JS via textContent swaps; the overlay is aria-hidden, so the copy is
   * SEO-invisible by design (the real h1 lives in the hero). */
  const introWords = tIntro("words").split("\n");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const overlay = q("[data-intro-overlay]")[0];
      const wordEl = q("[data-intro-word]")[0];
      const lockupEl = q("[data-intro-lockup]")[0];
      const counterEl = q("[data-intro-counter]")[0];
      const back = q('[data-hero-layer="back"]')[0];
      const mid = q('[data-hero-layer="mid"]')[0];
      const front = q("[data-hero-front]")[0];
      const heading = q("[data-hero-heading]")[0];
      const sub = q("[data-hero-sub]")[0];
      const cue = q("[data-hero-cue]")[0];
      if (!back || !mid || !front || !heading) return;

      /* "alma:reveal" fires once, when the sheet starts lifting —
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
        /* will-change was applied from JS at intro start — release the
         * compositor hint now that the intro is over. */
        const hinted = [overlay, wordEl, lockupEl].filter(Boolean);
        if (hinted.length) gsap.set(hinted, { clearProps: "willChange" });
        window.dispatchEvent(new Event("alma:loaded"));
      };

      const mm = gsap.matchMedia();

      /* -----------------------------------------------------------------
       * REDUCED MOTION — land directly on the finished hero. No cuts, no
       * fly-through, no push, no drift loops, and deliberately no fade
       * either: a page-wide 500ms opacity animation is exactly the kind
       * of motion this preference asks us not to run.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        finish();
        gsap.set(back, { scale: INTRO.depth.back.toScale });
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

        const introReady = overlay && wordEl && lockupEl;

        /* ---------------------------------------------------------------
         * RETURN VISIT — no words, no counter. The layout script only
         * sets `is-loading` on first visits, so normally nothing covers
         * the frame and a quick fade + headline reveal is enough. If the
         * sheet IS live (the inline script and this code disagree about
         * the session), lift it fast instead of blinking it away.
         * ------------------------------------------------------------ */
        if (
          seen ||
          !introReady ||
          !document.documentElement.classList.contains("is-loading")
        ) {
          const overlayLive =
            !!overlay &&
            document.documentElement.classList.contains("is-loading");

          gsap.set(back, { scale: INTRO.depth.back.toScale });

          const tl = gsap.timeline();
          if (overlayLive) {
            gsap.set(overlay, { willChange: "transform" });
            tl.set(overlay, {
              borderBottomLeftRadius: INTRO.curtain.radius,
              borderBottomRightRadius: INTRO.curtain.radius,
            }).to(overlay, {
              yPercent: -100,
              duration: INTRO.returnVisit.lift,
              ease: INTRO.curtain.ease,
              onStart: reveal,
              /* finish() hides the sheet and fires "alma:loaded" — it
               * must run exactly once on this path too. */
              onComplete: finish,
            });
          } else {
            finish();
            tl.from(root, {
              autoAlpha: 0,
              duration: INTRO.returnVisit.fade,
              ease: "power2.out",
            });
          }
          tl.from(
            lines(),
            {
              yPercent: INTRO.headline.fromYPercent,
              duration: INTRO.returnVisit.headlineDuration,
              ease: INTRO.headline.ease,
              stagger: INTRO.returnVisit.headlineStagger,
            },
            overlayLive ? 0.2 : 0.1,
          ).from(
            [sub, cue].filter(Boolean),
            {
              autoAlpha: 0,
              y: 14,
              duration: INTRO.sub.duration,
              ease: INTRO.sub.ease,
              stagger: 0.12,
            },
            overlayLive ? 0.45 : 0.35,
          );
          watchCue();
          startAmbient();
          return teardown;
        }

        /* ---------------------------------------------------------------
         * FIRST VISIT — the full kinetic type sequence.
         *
         * Initial states are applied here rather than in CSS, so the
         * server-rendered HTML stays complete and correct without JS. The
         * opaque sheet is already covering this frame, so setting them
         * now cannot flash.
         * ------------------------------------------------------------ */

        /* Compositor hints for the intro's lifetime only — cleared with
         * clearProps in finish() (which every path funnels through). */
        gsap.set([overlay, wordEl, lockupEl], { willChange: "transform" });

        gsap.set(back, { scale: INTRO.depth.back.fromScale });
        gsap.set(mid, { scale: INTRO.depth.mid.fromScale });
        gsap.set(front, { y: INTRO.depth.front.fromY });
        gsap.set([sub, cue].filter(Boolean), { autoAlpha: 0 });

        /* Each locale's .u-display resting tracking (ka loosens it), in
         * computed px — every cut tightens from this same base. */
        const rawTracking = getComputedStyle(wordEl).letterSpacing;
        const baseTracking = rawTracking === "normal" ? "0px" : rawTracking;

        /* ---------------------------------------------------------------
         * WORD SEQUENCE — starts immediately, never waits on assets.
         * One element, hard cuts: textContent swaps via .call(). Even
         * verbs are solid ink, odd verbs outlined (.u-outline strokes
         * with --ink). No fade-outs — the next .call IS the cut. The
         * sheet behind stays constant sand throughout.
         * ------------------------------------------------------------ */
        const seqTl = gsap.timeline({
          onComplete: () => {
            sequenceDone = true;
            release();
          },
        });

        introWords.forEach((word, i) => {
          const at = i * INTRO.words.perWord;
          seqTl.call(
            () => {
              wordEl.textContent = word;
              wordEl.classList.toggle("u-outline", i % 2 === 1);
            },
            undefined,
            at,
          );
          /* Punch: lands slightly small, snaps up. immediateRender off —
           * these all share one element, so none may render early. */
          seqTl.fromTo(
            wordEl,
            { scale: INTRO.words.scalePunch.from },
            {
              scale: 1,
              duration: INTRO.words.scalePunch.duration,
              ease: INTRO.words.scalePunch.ease,
              immediateRender: false,
            },
            at,
          );
          /* Tracking squeeze across the word's whole hold. */
          seqTl.fromTo(
            wordEl,
            { letterSpacing: baseTracking },
            {
              letterSpacing: INTRO.words.tightenTo,
              duration: INTRO.words.perWord,
              ease: INTRO.words.tightenEase,
              immediateRender: false,
            },
            at,
          );
        });

        /* Lockup cut — same rhythm as the verbs: hard cut in, punch, then
         * hold. The timeline completes at the end of the hold, which is
         * what arms the release. */
        const lockupAt = introWords.length * INTRO.words.perWord;
        seqTl.call(
          () => {
            gsap.set(wordEl, { autoAlpha: 0 });
            gsap.set(lockupEl, { autoAlpha: 1 });
          },
          undefined,
          lockupAt,
        );
        seqTl.fromTo(
          lockupEl,
          { scale: INTRO.words.scalePunch.from },
          {
            scale: 1,
            duration: INTRO.words.scalePunch.duration,
            ease: INTRO.words.scalePunch.ease,
            immediateRender: false,
          },
          lockupAt,
        );
        seqTl.to({}, { duration: INTRO.lockup.holdBeat }, lockupAt);

        /* ---------------------------------------------------------------
         * EXIT MASTER — fly-through + sheet lift + push-in. Paused until
         * release() plays it (assets AND sequence complete, or hard cap).
         * ------------------------------------------------------------ */
        const master = gsap.timeline({
          paused: true,
          onComplete: startAmbient,
        });

        master.addLabel("lift");

        /* (a) The lockup blows past the camera. Origin targets the E's
         * counter, so the zoom reads as flying "through" the wordmark. */
        master.to(
          lockupEl,
          {
            scale: INTRO.fly.scaleTo,
            transformOrigin: INTRO.fly.origin,
            duration: INTRO.fly.duration,
            ease: INTRO.fly.ease,
          },
          "lift",
        );
        /* Opacity holds until fadeStartProgress of the fly, then drops
         * fast — a separate tween positioned inside the fly's window. */
        master.to(
          lockupEl,
          {
            autoAlpha: 0,
            duration: INTRO.fly.duration * (1 - INTRO.fly.fadeStartProgress),
            ease: INTRO.fly.fadeEase,
          },
          `lift+=${INTRO.fly.duration * INTRO.fly.fadeStartProgress}`,
        );

        /* (b) The sheet lifts upward; bottom corners round off as it
         * goes. A .set is fine — the radius only reads once it moves. */
        master.set(
          overlay,
          {
            borderBottomLeftRadius: INTRO.curtain.radius,
            borderBottomRightRadius: INTRO.curtain.radius,
          },
          "lift",
        );
        master.to(
          overlay,
          {
            yPercent: -100,
            duration: INTRO.curtain.duration,
            ease: INTRO.curtain.ease,
            /* (c) "alma:reveal" fires the moment the lift starts. */
            onStart: reveal,
          },
          "lift",
        );
        /* Sheet fully off-screen here — the page is live even though the
         * push-in is still settling. */
        master.add(finish, `lift+=${INTRO.curtain.duration}`);

        /* (d) The push-in overlaps the lift: three layers, three rates,
         * and the masked headline lands DURING the reveal. */
        master
          .to(
            back,
            {
              scale: INTRO.depth.back.toScale,
              duration: INTRO.depth.back.duration,
              ease: INTRO.depth.back.ease,
            },
            "lift",
          )
          .to(
            mid,
            {
              scale: 1,
              duration: INTRO.depth.mid.duration,
              ease: INTRO.depth.back.ease,
            },
            "lift",
          )
          .to(
            front,
            {
              y: 0,
              duration: INTRO.depth.front.duration,
              ease: INTRO.depth.back.ease,
            },
            "lift",
          )
          .add(() => {
            gsap.from(lines(), {
              yPercent: INTRO.headline.fromYPercent,
              duration: INTRO.headline.duration,
              ease: INTRO.headline.ease,
              stagger: INTRO.headline.stagger,
            });
          }, `lift+=${INTRO.headline.offset}`);

        if (sub) {
          master.to(
            sub,
            {
              autoAlpha: 1,
              duration: INTRO.sub.duration,
              ease: INTRO.sub.ease,
            },
            `lift+=${INTRO.headline.offset + INTRO.sub.offset}`,
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
            `lift+=${INTRO.headline.offset + INTRO.cue.offset}`,
          );
        }

        /* ---------------------------------------------------------------
         * RELEASE — assets done AND sequence at its hold, total ≤ hardCap.
         * Both waits are explicit; either alone never releases.
         * ------------------------------------------------------------ */
        let fontsReady = false;
        let imageReady = false;
        let displayed = 0;
        let assetsDone = false;
        let sequenceDone = false;
        let released = false;
        const startedAt = performance.now();

        const release = (force = false) => {
          if (released) return;
          if (!force && !(assetsDone && sequenceDone)) return;
          released = true;
          gsap.ticker.remove(tick);
          if (counterEl) counterEl.textContent = "100";
          /* Forced release (hard cap / skip): jump the word sequence to
           * its end state first — the .call()s fire in order, landing on
           * the lockup — so the fly always exits from the lockup, never
           * from a half-held verb. */
          if (seqTl.progress() < 1) seqTl.progress(1);
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
         * release(true) jumps the word sequence to its end (its .call()s
         * fire in order — all synchronous, so nothing paints mid-jump)
         * and starts the master. master.progress(1) then fires the
         * master's callbacks in order — reveal (the lift's onStart),
         * finish, the headline `.add` (which would START a from-tween),
         * and onComplete/startAmbient (all guarded, run-once). So after
         * jumping, kill the freshly created headline tween and snap every
         * animated property to its resting value explicitly. The sequence
         * timeline is killed so no late tick can ever re-show a word.
         * Ambient depth is deliberately left running; it is the resting
         * state.
         */
        let skipped = false;
        const skip = () => {
          if (skipped) return;
          skipped = true;
          release(true);
          seqTl.kill();
          master.progress(1);
          gsap.killTweensOf([wordEl, lockupEl]);
          if (overlay) gsap.set(overlay, { display: "none" });
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
          const w = window as unknown as Record<string, unknown>;
          /* master = exit (fly-through + curtain); seq = the word cuts. */
          w.__almaIntro = master;
          w.__almaIntroSeq = seqTl;
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
      /* No `isolate` here: it would make the section a stacking context and
         trap the intro overlay's z-[100] inside it, letting the fixed
         header (z-50, a sibling of <main>) paint over the sand sheet. */
      className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-sand"
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
       * Kinetic type intro overlay, gated by the `is-loading` class from
       * the pre-paint script — a JS failure can never leave it covering
       * the page.
       *
       * ONE constant sand sheet (the background never changes colour —
       * photosensitivity rule): verbs hard-cut in the centre, the brand
       * lockup cuts in, then the whole sheet lifts upward while the
       * lockup flies past the camera. will-change is applied from JS for
       * the intro only. The wordmark tracking utility carries `!`
       * because `.u-display` is unlayered CSS and would otherwise win.
       */}
      <div
        data-intro-overlay
        aria-hidden="true"
        className="intro-overlay fixed inset-0 z-[100] bg-sand"
      >
        <span className="absolute top-5 left-5 flex flex-col sm:top-8 sm:left-8">
          <span className="u-display text-sm tracking-[0.35em]! text-ink">
            {SITE.wordmark}
          </span>
          <span className="mt-1 text-[0.5rem] font-medium tracking-[0.52em] text-clay">
            {SITE.wordmarkSub}
          </span>
        </span>

        {/* Centre stage: one element, re-used for every verb cut via
            textContent swaps from JS.
            The ka/ru verbs are single words with no break opportunity, so
            a fixed-width box cannot wrap them — it would only push an
            over-wide word off-centre to the right. Full width plus
            symmetric padding keeps any overflow even, and the smaller
            preferred size keeps the longest verb ("ПРОЕКТИРУЕМ") inside
            the frame on a 320px phone. Inline font metrics win over the
            unlayered .u-display line-height. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            data-intro-word
            className="u-display w-full px-5 text-center text-ink uppercase"
            style={{ fontSize: "clamp(2.2rem, 11vw, 9rem)", lineHeight: 1.02 }}
          />
        </div>

        {/* Brand lockup — hidden until its beat. The fly-through scales
            this viewport-sized wrapper, so fly.origin percentages are
            viewport coordinates aimed at the E in KENCHO. */}
        <div
          data-intro-lockup
          className="absolute inset-0 flex flex-col items-center justify-center opacity-0"
        >
          <span
            className="u-display text-clay"
            style={{ fontSize: "clamp(3rem, 15vw, 10rem)" }}
          >
            {SITE.wordmark}
          </span>
          <span className="mt-3 text-xs font-medium tracking-[0.52em] text-ink">
            {SITE.wordmarkSub}
          </span>
        </div>

        {/* Bottom anchor bar — rule + counter. Outside the cut zone, so
            the verbs never disturb it; it simply rides the sheet up. */}
        <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-4 sm:bottom-8">
          <span className="h-px w-24 bg-line-strong" />
          <span
            data-intro-counter
            className="u-display text-lg tabular-nums text-ink"
          >
            00
          </span>
        </div>
      </div>
    </section>
  );
}
