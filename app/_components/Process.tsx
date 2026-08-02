"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/*
 * PROCESS — five calm steps from measurement to installation.
 *
 * The section exists to lower anxiety, so it stays quiet: a hairline list
 * on sand, one brass moment on the production-weeks figure, and plenty of
 * air. Everything is complete in the SSR HTML — the numerals are printed
 * at their final value (01–05) and no element ships a hidden state; JS
 * only ever adds motion inside a reduced-motion matchMedia guard.
 */

const STEP_KEYS = ["s1", "s2", "s3", "s4", "s5"] as const;

export default function Process() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("process");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const heads = Array.from(
        root.querySelectorAll<HTMLElement>("[data-head]"),
      );
      const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
      const counters = Array.from(
        root.querySelectorAll<HTMLElement>("[data-count-to]"),
      );
      const stat = root.querySelector<HTMLElement>("[data-stat]");

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: Array<() => void> = [];

        /* ---- Eyebrow + title: one-shot entrance ----------------------- */
        if (heads.length) {
          gsap.from(heads, {
            y: 26,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.lines,
            scrollTrigger: { trigger: heads[0], start: REVEAL_START },
          });
        }

        /* ---- Rows: each triggers itself; neighbours arrive staggered -- */
        if (rows.length) {
          gsap.set(rows, { y: 28, opacity: 0 });
          const rowTriggers = ScrollTrigger.batch(rows, {
            start: REVEAL_START,
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                y: 0,
                opacity: 1,
                duration: DUR.base,
                ease: EASE.soft,
                stagger: STAGGER.items,
                overwrite: true,
              });
            },
          });

          cleanups.push(() => {
            rowTriggers.forEach((st) => st.kill());
            gsap.killTweensOf(rows);
            gsap.set(rows, { clearProps: "transform,opacity" });
          });
        }

        /* ---- Numerals: SSR holds 01–05; JS rewinds and counts up ------ */
        counters.forEach((el) => {
          const target = Number(el.dataset.countTo);
          if (!Number.isFinite(target)) return;

          const final = String(target).padStart(2, "0");
          const state = { v: 0 };

          const trigger = ScrollTrigger.create({
            trigger: el,
            start: REVEAL_START,
            once: true,
            onEnter: () => {
              el.textContent = "00";
              gsap.to(state, {
                v: target,
                duration: DUR.base,
                ease: EASE.out,
                snap: { v: 1 },
                onUpdate: () => {
                  el.textContent = String(Math.round(state.v)).padStart(2, "0");
                },
                onComplete: () => {
                  el.textContent = final;
                },
              });
            },
          });

          cleanups.push(() => {
            trigger.kill();
            gsap.killTweensOf(state);
            el.textContent = final;
          });
        });

        /* ---- Closing stat: a single quiet rise ------------------------ */
        if (stat) {
          gsap.from(stat, {
            y: 24,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.soft,
            scrollTrigger: { trigger: stat, start: REVEAL_START },
          });
        }

        return () => cleanups.forEach((fn) => fn());
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="process"
      aria-labelledby="process-title"
      className="bg-sand py-24 sm:py-32 lg:py-40"
    >
      <div className="px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <p data-head className="u-eyebrow">
            {t("eyebrow")}
          </p>
          <h2
            data-head
            id="process-title"
            className="u-display mt-5 max-w-[16ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
          >
            {t("title")}
          </h2>

          {/* Five steps — a hairline list, no cards. The <ol> carries the
              real numbering; the big numerals are visual echoes. */}
          <ol role="list" className="mt-14 sm:mt-20 lg:mt-24">
            {STEP_KEYS.map((key, index) => (
              <li
                key={key}
                data-row
                className="border-t border-line py-8 sm:py-10 lg:grid lg:grid-cols-12 lg:items-baseline lg:gap-x-8 lg:py-12"
              >
                <span
                  aria-hidden="true"
                  data-count-to={index + 1}
                  className="u-display block text-[clamp(2rem,7vw,3.5rem)] text-ink-40 lg:col-span-3"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="mt-4 lg:col-span-8 lg:col-start-4 lg:mt-0">
                  <h3 className="text-lg font-medium text-ink sm:text-xl">
                    {t(`steps.${key}.title`)}
                  </h3>
                  <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-ink-70">
                    {t(`steps.${key}.line`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Closing figure — the section's single brass moment. The value
              holds an en-dash, so it is typeset, never counted. */}
          <div
            data-stat
            className="mt-16 border-t border-line pt-10 sm:mt-20 sm:pt-12 lg:mt-24 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-8 lg:pt-14"
          >
            <div className="lg:col-span-3">
              <p className="u-display text-[clamp(2.75rem,10vw,5rem)] text-clay">
                {t("weeksValue")}
              </p>
              <p className="u-eyebrow mt-4">{t("weeksLabel")}</p>
            </div>
            <p className="mt-8 max-w-md text-sm leading-relaxed text-ink-55 lg:col-span-6 lg:col-start-4 lg:mt-0">
              {t("note")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
