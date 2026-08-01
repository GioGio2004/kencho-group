"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";

/* =====================================================================
 * INTRO CONFIG — every timing, easing and stagger for the opening.
 * Tune the feel here; nothing below hard-codes a number.
 *
 * SLOWER / SOFTER  → raise curtain.duration and expand.duration, push
 *                    headline.stagger toward 0.12, and increase
 *                    headline.offset so the text follows the image
 *                    instead of racing it.
 * GENTLER IMAGE    → raise expand.fromScale toward 0.72 (a smaller
 *                    journey reads calmer); lower it toward 0.45 for
 *                    more drama.
 * SNAPPIER         → drop counter.minDuration to ~0.5 and
 *                    curtain.duration to ~0.7.
 * ================================================================== */
const INTRO = {
  counter: {
    /** Hard cap on the wait, in seconds. Progress is real but bounded. */
    maxWait: 1.5,
    /** The counter never completes before this, so it reads deliberate. */
    minDuration: 0.85,
    /** Share of progress attributed to fonts vs the hero image. */
    fontsWeight: 35,
    imageWeight: 65,
    /** How hard the displayed number chases the true value (0–1). */
    chase: 0.11,
    fadeDuration: 0.3,
  },
  curtain: {
    /** Begins while the counter is still fading, so the two overlap. */
    start: 0.15,
    duration: 0.9,
    ease: "expo.inOut",
  },
  expand: {
    /** Card size as a fraction of the viewport before it expands. */
    fromScale: 0.58,
    fromRadius: "2.25rem",
    duration: 1.2,
    ease: "expo.out",
    /** Start relative to the curtain finishing (negative = overlap). */
    offset: -0.1,
  },
  kenBurns: {
    from: 1,
    to: 1.08,
    duration: 20,
  },
  headline: {
    /** Start relative to the expansion starting (positive = later). */
    offset: 0.4,
    duration: 1.1,
    stagger: 0.09,
    ease: "expo.out",
    fromYPercent: 110,
  },
  sub: {
    /** Start relative to the headline starting. */
    offset: 0.45,
    duration: 0.6,
    ease: "power3.out",
  },
  cue: {
    /** Start relative to the headline starting. */
    offset: 0.7,
    duration: 0.5,
    ease: "power2.out",
  },
  /** Return visits within the same session: no curtain, no expansion. */
  returnVisit: {
    fade: 0.5,
    headlineDuration: 0.9,
    headlineStagger: 0.07,
  },
} as const;

const SESSION_KEY = "alma:intro-seen";

const HEADLINE_LINES = ["Shaped by", "the light", "it lives in."] as const;

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const root = rootRef.current;
      if (!root) return;

      const q = gsap.utils.selector(root);
      const overlay = q("[data-intro-overlay]")[0];
      const frame = q("[data-hero-frame]")[0];
      const kenBurnsEl = q("[data-hero-kb]")[0];
      const heading = q("[data-hero-heading]")[0];
      const counterEl = q("[data-intro-counter]")[0];
      const sub = q("[data-hero-sub]")[0];
      const cue = q("[data-hero-cue]")[0];
      if (!frame || !kenBurnsEl || !heading) return;

      const cleanups: (() => void)[] = [];
      let split: SplitText | null = null;
      const lines = () => {
        split ??= SplitText.create(heading, { type: "lines", mask: "lines" });
        return split.lines;
      };

      const markSeen = () => {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* private mode — the intro simply plays again next visit */
        }
      };

      const finish = () => {
        markSeen();
        document.documentElement.classList.remove("is-loading");
        if (overlay) gsap.set(overlay, { display: "none" });
        window.dispatchEvent(new Event("alma:loaded"));
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
        split?.revert();
      };

      /* -----------------------------------------------------------------
       * REDUCED MOTION — land on the finished hero, no motion at all.
       * -------------------------------------------------------------- */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return teardown;
      }

      /* The ambient drift runs for the life of the page. */
      const startKenBurns = () =>
        gsap.fromTo(
          kenBurnsEl,
          { scale: INTRO.kenBurns.from },
          {
            scale: INTRO.kenBurns.to,
            duration: INTRO.kenBurns.duration,
            ease: "none",
          },
        );

      const seen = (() => {
        try {
          return sessionStorage.getItem(SESSION_KEY) === "1";
        } catch {
          return false;
        }
      })();

      /* -----------------------------------------------------------------
       * RETURN VISIT — skip the preloader, quick fade + headline reveal.
       * -------------------------------------------------------------- */
      if (seen || !document.documentElement.classList.contains("is-loading")) {
        finish();
        startKenBurns();
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
        return teardown;
      }

      /* -----------------------------------------------------------------
       * FIRST VISIT — the full sequence.
       *
       * Initial states are applied here rather than in CSS, so the
       * server-rendered HTML stays complete and correct without JS. The
       * opaque overlay is already covering this frame, so setting them
       * now cannot flash.
       * -------------------------------------------------------------- */
      gsap.set(frame, {
        scale: INTRO.expand.fromScale,
        borderRadius: INTRO.expand.fromRadius,
      });
      gsap.set([sub, cue].filter(Boolean), { autoAlpha: 0 });

      const master = gsap.timeline({ paused: true, onComplete: finish });

      if (counterEl) {
        master.to(counterEl, {
          autoAlpha: 0,
          duration: INTRO.counter.fadeDuration,
          ease: "power2.in",
        });
      }

      if (overlay) {
        master.to(
          overlay,
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: INTRO.curtain.duration,
            ease: INTRO.curtain.ease,
          },
          INTRO.curtain.start,
        );
      }

      master
        .addLabel("expand", `>${INTRO.expand.offset}`)
        .to(
          frame,
          {
            scale: 1,
            borderRadius: "0rem",
            duration: INTRO.expand.duration,
            ease: INTRO.expand.ease,
          },
          "expand",
        )
        .add(startKenBurns, "expand")
        .add(() => {
          gsap.from(lines(), {
            yPercent: INTRO.headline.fromYPercent,
            duration: INTRO.headline.duration,
            ease: INTRO.headline.ease,
            stagger: INTRO.headline.stagger,
          });
        }, `expand+=${INTRO.headline.offset}`);

      if (sub) {
        master.to(
          sub,
          {
            autoAlpha: 1,
            duration: INTRO.sub.duration,
            ease: INTRO.sub.ease,
          },
          `expand+=${INTRO.headline.offset + INTRO.sub.offset}`,
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
          `expand+=${INTRO.headline.offset + INTRO.cue.offset}`,
        );
      }

      /* -----------------------------------------------------------------
       * COUNTER — real asset progress (fonts + hero image), bounded.
       * -------------------------------------------------------------- */
      let fontsReady = false;
      let imageReady = false;
      let displayed = 0;
      let released = false;
      const startedAt = performance.now();

      const release = () => {
        if (released) return;
        released = true;
        gsap.ticker.remove(tick);
        if (counterEl) counterEl.textContent = "100";
        master.play();
      };

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

        displayed += Math.max(0.5, (target - displayed) * INTRO.counter.chase);
        if (displayed > target) displayed = target;
        if (counterEl) {
          counterEl.textContent = String(Math.floor(displayed)).padStart(2, "0");
        }
        if (displayed >= 99.5) release();
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

      // Absolute backstop — the page is never held past maxWait.
      const hardCap = gsap.delayedCall(INTRO.counter.maxWait, release);
      cleanups.push(() => hardCap.kill());

      /* -----------------------------------------------------------------
       * SKIP — any scroll, tap or keypress jumps straight to the end.
       * -------------------------------------------------------------- */
      /*
       * progress(1) fires the timeline's callbacks, which would *start*
       * the headline tween rather than finish it — so snap every animated
       * property to its resting value explicitly. The Ken Burns drift is
       * deliberately left running; it is ambient, not part of the intro.
       */
      const skip = () => {
        release();
        master.progress(1);
        const headingLines = lines();
        gsap.killTweensOf(headingLines);
        gsap.set(headingLines, { yPercent: 0 });
        gsap.set(frame, { scale: 1, borderRadius: "0rem" });
        gsap.set([sub, cue].filter(Boolean), { autoAlpha: 1 });
      };
      const SKIP_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
      SKIP_EVENTS.forEach((type) =>
        window.addEventListener(type, skip, { once: true, passive: true }),
      );
      cleanups.push(() =>
        SKIP_EVENTS.forEach((type) => window.removeEventListener(type, skip)),
      );

      watchCue();

      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__almaIntro = master;
      }

      return teardown;
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
       * Final state is full-bleed. The intro scales this frame down to a
       * centred card and grows it back — transform only, no layout work.
       */}
      <div
        data-hero-frame
        className="absolute inset-0 z-0 overflow-hidden will-change-transform"
      >
        <div data-hero-kb className="absolute inset-0 will-change-transform">
          <Image
            src={src(IMAGES.heroMain, 2400)}
            alt={IMAGES.heroMain.alt}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover"
          />
        </div>

        {/* Warm scrim behind the text zone only, so the copy always reads. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--ink) 66%, transparent) 0%, color-mix(in srgb, var(--ink) 30%, transparent) 34%, transparent 64%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[88rem] px-5 pt-32 pb-28 sm:px-8 sm:pb-32 lg:px-12 lg:pb-36">
        <h1
          id="hero-title"
          data-hero-heading
          className="u-display text-[clamp(2.75rem,11vw,7.5rem)] text-sand"
        >
          {HEADLINE_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p
          data-hero-sub
          className="mt-7 max-w-md text-sm tracking-[0.16em] text-sand/80 uppercase sm:text-base"
        >
          {SITE.location} — twenty-four residences, ready {SITE.year + 1}
        </p>
      </div>

      <div
        data-hero-cue
        aria-hidden="true"
        className="absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[0.6rem] tracking-[0.3em] text-sand/70 uppercase">
          Scroll
        </span>
        <span className="relative block h-10 w-px overflow-hidden bg-sand/25">
          <span className="cue-travel absolute inset-x-0 top-0 block h-4 bg-sand/80" />
        </span>
      </div>

      {/*
       * Intro overlay, gated by the `is-loading` class from the pre-paint
       * script — a JS failure can never leave it covering the page.
       */}
      <div
        data-intro-overlay
        aria-hidden="true"
        className="intro-overlay fixed inset-0 z-[100] bg-sand"
        style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      >
        <span className="u-display absolute top-5 left-5 text-sm tracking-[0.42em] text-ink sm:top-8 sm:left-8">
          {SITE.wordmark}
        </span>
        <span
          data-intro-counter
          className="u-display absolute right-5 bottom-5 text-[clamp(3.5rem,16vw,7rem)] leading-none tabular-nums text-ink sm:right-8 sm:bottom-8"
        >
          00
        </span>
      </div>
    </section>
  );
}
