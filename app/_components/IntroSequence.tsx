"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { SITE } from "@/lib/site";

/* =====================================================================
 * INTRO CONFIG — every timing and easing for the opening.
 * Tune the feel here; nothing below hard-codes a number.
 *
 * The sequence: kinetic verbs hard-cut in the centre (solid / outlined /
 * solid / outlined) while the counter tracks real asset progress → the
 * KENCHO / GROUP lockup cuts in and holds a beat → the lockup blows past
 * the camera while the sand sheet lifts upward with rounded bottom
 * corners, unveiling the scroll-scrubbed walkthrough beneath.
 *
 * The background NEVER changes colour — the sheet stays constant sand
 * and only the type cuts (photosensitivity rule).
 *
 * SLOWER / SOFTER  → raise words.perWord toward 0.45, lockup.holdBeat
 *                    toward 0.7 and curtain.duration toward 1.6.
 * PUNCHIER CUTS    → drop words.scalePunch.from toward 0.88 and its
 *                    duration toward 0.12.
 * GENTLER EXIT     → lower fly.scaleTo toward 9 (a shorter journey past
 *                    the camera reads calmer); raise toward 18 for drama.
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
    /** Share of progress attributed to fonts vs the walkthrough poster. */
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
    holdBeat: 0.55,
  },
  fly: {
    /** How far past the camera the lockup blows (scale multiplier). */
    scaleTo: 14,
    duration: 0.85,
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
    /**
     * The single sand sheet lifts upward, unveiling the stage below.
     * Deliberately unhurried — this is the reveal the whole intro has
     * been building to, and a fast lift throws it away.
     */
    duration: 1.35,
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
    /** Return visits within the same session: a fast lift, no words. */
    returnLift: 0.6,
  },
} as const;

const SESSION_KEY = "alma:intro-seen";

/*
 * INTRO SEQUENCE — the kinetic type opening, and nothing else.
 *
 * This component owns ONLY the sand sheet that covers the first frame:
 * four verbs hard-cutting in the centre, a real asset counter, the brand
 * lockup, the fly-through and the upward curtain. What the curtain
 * reveals (the scroll-scrubbed walkthrough) is Hero's business — the two
 * share no state, only two window events.
 *
 * CONTRACT — "alma:reveal" fires once, when the sheet starts lifting;
 * "alma:loaded" fires EXACTLY ONCE on every path (first visit, skip,
 * hard cap, return visit, reduced motion). SmoothScroll starts Lenis on
 * it and the floating UI arms on it, so a path that never fires would
 * leave the page scroll-locked forever.
 */
export default function IntroSequence() {
  const t = useTranslations("intro");
  const rootRef = useRef<HTMLDivElement>(null);

  /* "intro.words" — four verbs per locale, \n-separated. Rendered from
   * JS via textContent swaps; the overlay is aria-hidden, so the copy is
   * SEO-invisible by design (the real h1 lives in the hero). */
  const introWords = t("words").split("\n");

  useGSAP(
    () => {
      /* The component's root IS the sheet. */
      const overlay = rootRef.current;
      if (!overlay) return;

      const q = gsap.utils.selector(overlay);
      const wordEl = q("[data-intro-word]")[0];
      const lockupEl = q("[data-intro-lockup]")[0];
      const counterEl = q("[data-intro-counter]")[0];

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
        gsap.set(overlay, { display: "none" });
        /* will-change was applied from JS at intro start — release the
         * compositor hint now that the intro is over. */
        const hinted = [overlay, wordEl, lockupEl].filter(Boolean);
        gsap.set(hinted, { clearProps: "willChange" });
        window.dispatchEvent(new Event("alma:loaded"));
      };

      const mm = gsap.matchMedia();

      /* -----------------------------------------------------------------
       * REDUCED MOTION — the pre-paint guard never adds `is-loading` for
       * these visitors, so the sheet was never displayed. Release the
       * page immediately: no cuts, no fly-through, and deliberately no
       * fade either — a page-wide opacity animation is exactly the kind
       * of motion this preference asks us not to run.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        finish();
      });

      /* -----------------------------------------------------------------
       * ALL MOTION lives inside this context.
       * -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];
        const teardown = () => cleanups.forEach((fn) => fn());

        const seen = (() => {
          try {
            return sessionStorage.getItem(SESSION_KEY) === "1";
          } catch {
            return false;
          }
        })();

        const introReady = !!wordEl && !!lockupEl;
        /* The sheet only paints while `is-loading` is on <html>. */
        const loaderUp =
          document.documentElement.classList.contains("is-loading");

        /* ---------------------------------------------------------------
         * RETURN VISIT — no words, no counter. The layout script only
         * sets `is-loading` on first visits, so normally nothing covers
         * the frame and there is simply nothing to play. If the sheet IS
         * live (the inline script and this code disagree about the
         * session), lift it fast instead of blinking it away.
         * ------------------------------------------------------------ */
        if (seen || !introReady || !loaderUp) {
          if (loaderUp) {
            gsap.set(overlay, { willChange: "transform" });
            const tl = gsap.timeline();
            tl.set(overlay, {
              borderBottomLeftRadius: INTRO.curtain.radius,
              borderBottomRightRadius: INTRO.curtain.radius,
            }).to(overlay, {
              yPercent: -100,
              duration: INTRO.release.returnLift,
              ease: INTRO.curtain.ease,
              onStart: reveal,
              /* finish() hides the sheet and fires "alma:loaded" — it
               * must run exactly once on this path too. */
              onComplete: finish,
            });
          } else {
            finish();
          }
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
         * EXIT MASTER — fly-through + sheet lift. Paused until release()
         * plays it (assets AND sequence complete, or hard cap).
         * ------------------------------------------------------------ */
        let disarmSkip: (() => void) | null = null;
        const master = gsap.timeline({
          paused: true,
          /* The intro is over — stop listening for a skip. Seeking to the
           * end (skip, hard cap) also fires this. */
          onComplete: () => disarmSkip?.(),
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
        /* Sheet fully off-screen here — the page goes live. */
        master.add(finish, `lift+=${INTRO.curtain.duration}`);

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

        /* Counter: real asset progress (fonts + the walkthrough poster),
         * bounded. */
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

        /*
         * The tracked image is the walkthrough POSTER — the hero's LCP
         * element, a sibling section rather than a child of this overlay.
         * If it is ever absent (markup changed, fallback path), the image
         * weight counts as already satisfied so the counter can never
         * stall on something that will never load.
         */
        const posterImg = document.querySelector<HTMLImageElement>(
          "[data-hero-poster] img",
        );
        if (!posterImg || posterImg.complete) {
          imageReady = true;
        } else {
          const onSettled = () => {
            imageReady = true;
          };
          posterImg.addEventListener("load", onSettled, { once: true });
          posterImg.addEventListener("error", onSettled, { once: true });
          cleanups.push(() => {
            posterImg.removeEventListener("load", onSettled);
            posterImg.removeEventListener("error", onSettled);
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
         *
         * release(true) jumps the word sequence to its end (its .call()s
         * fire in order — all synchronous, so nothing paints mid-jump)
         * and starts the master. master.progress(1) then fires the
         * master's callbacks in order — reveal (the lift's onStart),
         * finish, and onComplete (all guarded, run-once). After the jump,
         * kill anything still tweening the type and hide the sheet
         * explicitly. The sequence timeline is killed so no late tick can
         * ever re-show a word.
         * ------------------------------------------------------------ */
        let skipped = false;
        const skip = () => {
          if (skipped) return;
          skipped = true;
          release(true);
          seqTl.kill();
          master.progress(1);
          gsap.killTweensOf([wordEl, lockupEl]);
          gsap.set(overlay, { display: "none" });
          finish();
        };
        const SKIP_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
        SKIP_EVENTS.forEach((type) =>
          window.addEventListener(type, skip, { once: true, passive: true }),
        );
        disarmSkip = () =>
          SKIP_EVENTS.forEach((type) =>
            window.removeEventListener(type, skip),
          );
        cleanups.push(() => disarmSkip?.());

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

  /*
   * Kinetic type intro overlay, gated by the `is-loading` class from the
   * pre-paint script — a JS failure can never leave it covering the page.
   *
   * ONE constant sand sheet (the background never changes colour —
   * photosensitivity rule): verbs hard-cut in the centre, the brand
   * lockup cuts in, then the whole sheet lifts upward while the lockup
   * flies past the camera. will-change is applied from JS for the intro
   * only. The wordmark tracking utility carries `!` because `.u-display`
   * is unlayered CSS and would otherwise win.
   */
  return (
    <div
      ref={rootRef}
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
  );
}
