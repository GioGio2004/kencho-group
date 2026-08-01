"use client";

import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import KenchoLineArt from "./KenchoLineArt";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, CustomEase);

const WORDMARK = "KENCHO".split("");

/*
 * Poster-scale letters: transparent fill with a gold hairline stroke;
 * the gold "pours" upward inside the letterforms as loading progresses
 * (background-clip: text + a bottom-anchored gradient sized by --kg-fill,
 * which the counter tween drives from 0% to 100%).
 */
const letterStyle: CSSProperties = {
  WebkitTextStroke: "1.5px rgba(201, 162, 75, 0.5)",
  color: "transparent",
  backgroundImage: "linear-gradient(0deg, #b8923e 0%, #e3c27e 100%)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 100%",
  backgroundSize: "100% var(--kg-fill, 0%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
};

/*
 * Plays only when the pre-paint script in layout.tsx has put `intro-pending`
 * on <html> (first visit this session, no reduced-motion). One GSAP
 * timeline, no React state. Beats: giant wordmark rises → gold pours into
 * the letters while the line art draws behind → double-layer blind lift
 * (coal panel, gold panel trailing) with the hero entering mid-wipe.
 */
export default function IntroSequence() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (!document.documentElement.classList.contains("intro-pending")) return;

      const kgEase = CustomEase.create("kgEase", "M0,0 C0.77,0 0.175,1 1,1");

      const counterEl = root.querySelector<HTMLElement>("[data-intro-count]");
      const logoEl = root.querySelector<HTMLElement>("[data-intro-logo]");
      const progress = { p: 0 };

      const markSeen = () => {
        try {
          sessionStorage.setItem("kg-intro-seen", "1");
        } catch {
          /* private mode — intro will just replay next visit */
        }
      };

      const finish = () => {
        markSeen();
        document.documentElement.classList.remove("intro-pending");
        gsap.set(root, { display: "none" });
        window.dispatchEvent(new Event("kg:intro-done"));
      };

      const tl = gsap.timeline({ onComplete: finish });

      tl.set("[data-intro-veil]", { opacity: 1 }, 0)

        // Beat 1 — the wordmark rises at poster scale.
        .from(
          "[data-intro-letter]",
          {
            yPercent: 118,
            duration: 1.05,
            ease: kgEase,
            stagger: 0.055,
            immediateRender: true,
          },
          0.15,
        )
        .from(
          "[data-intro-meta]",
          { y: 14, opacity: 0, duration: 0.8, ease: "power2.out", immediateRender: true },
          0.55,
        )
        .from(
          "[data-intro-sub]",
          { opacity: 0, y: 10, duration: 0.7, ease: "power2.out", immediateRender: true },
          0.9,
        )
        .from(
          "[data-intro-rule]",
          { scaleX: 0, duration: 0.9, ease: "power2.inOut", immediateRender: true },
          0.9,
        )

        // Beat 2 — gold pours into the letters; the counter is the clock.
        .to(
          progress,
          {
            p: 100,
            duration: 3.9,
            ease: "power1.inOut",
            onUpdate: () => {
              const v = Math.round(progress.p);
              if (counterEl)
                counterEl.textContent = String(v).padStart(3, "0");
              if (logoEl) logoEl.style.setProperty("--kg-fill", `${progress.p}%`);
            },
          },
          0.45,
        )

        // Beat 3 — the line art sketches itself behind the letters.
        .to("[data-intro-art-wrap]", { opacity: 0.2, duration: 0.5 }, 1.2)
        .from(
          ".kg-line-floor",
          { drawSVG: 0, duration: 0.9, ease: "power2.inOut", immediateRender: true },
          1.3,
        )
        .from(
          ".kg-line-arch",
          { drawSVG: 0, duration: 1.15, ease: "power2.inOut", immediateRender: true },
          1.4,
        )
        .from(
          ".kg-line-shelves",
          { drawSVG: 0, duration: 0.9, ease: "power2.inOut", immediateRender: true },
          1.7,
        )
        .from(
          ".kg-line-slats-a",
          { drawSVG: 0, duration: 1.1, ease: "power2.inOut", immediateRender: true },
          1.9,
        )
        .from(
          ".kg-line-slats-b",
          { drawSVG: 0, duration: 1.1, ease: "power2.inOut", immediateRender: true },
          2.1,
        )
        .from(
          ".kg-line-dim",
          { drawSVG: 0, duration: 0.8, ease: "power2.inOut", immediateRender: true },
          2.6,
        )
        .from(
          ".kg-fills",
          { autoAlpha: 0, duration: 1.2, ease: "sine.inOut", immediateRender: true },
          3.6,
        )

        // Beat 4 — blind lift: coal panel first, gold panel trailing.
        .addLabel("lift", 4.75)
        .call(markSeen, [], "lift")
        .call(() => window.dispatchEvent(new Event("kg:intro-lift")), [], "lift")
        .to(
          "[data-intro-count-wrap], [data-intro-meta], [data-intro-skip]",
          { opacity: 0, duration: 0.25 },
          "lift-=0.15",
        )
        .to(
          "[data-intro-panel]",
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: 1.2,
            ease: "expo.inOut",
          },
          "lift",
        )
        .to(
          "[data-intro-gold]",
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: 1.15,
            ease: "expo.inOut",
          },
          "lift+=0.09",
        );

      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__kgIntroTl = tl;
      }

      // Skip: first interaction fast-forwards, second jumps to the curtain.
      let sped = false;
      const skip = () => {
        const liftTime = tl.labels.lift ?? 0;
        if (tl.time() >= liftTime) return;
        if (!sped) {
          sped = true;
          tl.timeScale(3.5);
        } else {
          tl.seek(liftTime, false);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
      };
      root.addEventListener("pointerdown", skip);
      window.addEventListener("keydown", onKey);

      return () => {
        root.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", onKey);
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="intro-overlay fixed inset-0 z-50">
      <div
        data-intro-gold
        className="absolute inset-0 bg-gold"
        style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      />

      <div
        data-intro-panel
        className="absolute inset-0 overflow-hidden bg-coal"
        style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      >
        <div className="kg-noise" />

        <div
          aria-hidden="true"
          className="kg-anim pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(201,162,75,0.14), transparent 70%)",
            animation: "kg-breathe 3.2s ease-in-out infinite",
          }}
        />

        <div
          data-intro-art-wrap
          data-intro-veil
          className="intro-veil pointer-events-none absolute left-1/2 top-1/2 w-[min(120vw,1600px)] -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: 0 }}
        >
          <KenchoLineArt />
        </div>

        <div
          data-intro-meta
          data-intro-veil
          className="intro-veil absolute left-6 top-6 text-[0.65rem] uppercase tracking-[0.35em] text-gold/70 sm:left-10 sm:top-8 sm:text-xs"
        >
          კენჭო ჯგუფი — ავეჯი შეკვეთით
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            data-intro-logo
            data-intro-veil
            className="intro-veil relative z-10 flex w-full flex-col items-center"
            style={{ "--kg-fill": "0%" } as CSSProperties}
          >
            <div className="flex justify-center overflow-hidden font-display leading-[0.95] tracking-[0.02em] text-gold">
              {WORDMARK.map((ch, i) => (
                <span
                  key={`${ch}-${i}`}
                  data-intro-letter
                  className="inline-block text-[21vw]"
                  style={letterStyle}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div data-intro-sub className="mt-4 flex w-full items-center justify-center gap-5 px-[12vw] sm:mt-6">
              <span
                data-intro-rule
                className="h-px flex-1 origin-right bg-gold/40"
                aria-hidden="true"
              />
              <span className="text-[0.7rem] tracking-[0.6em] text-gold/80 [text-indent:0.6em] sm:text-sm">
                GROUP
              </span>
              <span
                data-intro-rule
                className="h-px flex-1 origin-left bg-gold/40"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div
          data-intro-count-wrap
          data-intro-veil
          className="intro-veil absolute bottom-5 left-6 z-10 flex items-end gap-2 sm:bottom-8 sm:left-10"
        >
          <span
            data-intro-count
            className="font-display text-[clamp(3rem,8vw,6.5rem)] leading-none tabular-nums text-gold"
          >
            000
          </span>
          <span className="mb-2 text-sm text-gold/60 sm:text-base">%</span>
        </div>

        <div
          data-intro-skip
          data-intro-veil
          className="intro-veil absolute bottom-6 right-6 z-10 flex flex-col items-end gap-3 sm:bottom-9 sm:right-10"
        >
          <span
            className="kg-anim text-[0.65rem] uppercase tracking-[0.3em] text-cream/45"
            style={{ animation: "kg-blink 2.2s ease-in-out infinite" }}
          >
            იტვირთება
          </span>
          <button
            type="button"
            className="cursor-pointer text-[0.7rem] uppercase tracking-[0.25em] text-cream/50 transition-colors hover:text-cream/90"
          >
            გამოტოვება →
          </button>
        </div>
      </div>
    </div>
  );
}
