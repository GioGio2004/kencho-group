"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";
import { SITE } from "@/lib/site";

/*
 * SOCIAL PROOF — two large counting figures and three quiet review quotes.
 *
 * Everything renders complete without JavaScript: the figures are already
 * printed at their final value in the SSR HTML and no element carries a
 * hidden initial state in CSS. All motion lives inside a
 * `(prefers-reduced-motion: no-preference)` matchMedia block; the count-up
 * zeroes the figure only when its trigger fires, then snaps to integers.
 */

const QUOTE_KEYS = ["q1", "q2", "q3"] as const;

export default function SocialProof() {
  const rootRef = useRef<HTMLElement>(null);
  const t = useTranslations("social");

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const heads = Array.from(
        root.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      const stats = Array.from(
        root.querySelectorAll<HTMLElement>("[data-stat]"),
      );
      const quotes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-quote]"),
      );
      const counters = Array.from(
        root.querySelectorAll<HTMLElement>("[data-count-to]"),
      );

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: Array<() => void> = [];

        /* ---- Heading: one-shot entrance ------------------------------ */
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

        /* ---- Figures and the link beneath them ----------------------- */
        if (stats.length) {
          gsap.from(stats, {
            y: 22,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.lines,
            scrollTrigger: { trigger: stats[0], start: REVEAL_START },
          });
        }

        /* ---- Quotes: staggered fade-up ------------------------------- */
        if (quotes.length) {
          gsap.from(quotes, {
            y: 18,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: { trigger: quotes[0], start: REVEAL_START },
          });
        }

        /* ---- Count-up: HTML already holds the final value ------------ */
        counters.forEach((el) => {
          const target = Number(el.dataset.countTo);
          if (!Number.isFinite(target)) return;

          const final = el.textContent ?? String(target);
          const state = { v: 0 };

          const trigger = ScrollTrigger.create({
            trigger: el,
            start: REVEAL_START,
            once: true,
            onEnter: () => {
              el.textContent = "0";
              gsap.to(state, {
                v: target,
                duration: 1.6,
                ease: EASE.out,
                snap: { v: 1 },
                onUpdate: () => {
                  el.textContent = String(Math.round(state.v));
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

        return () => cleanups.forEach((fn) => fn());
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="trust"
      aria-labelledby="trust-title"
      className="bg-sand-deep py-24 sm:py-32 lg:py-40"
    >
      <div className="px-5 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <p data-reveal className="u-eyebrow">
            {t("eyebrow")}
          </p>
          <h2
            data-reveal
            id="trust-title"
            className="u-display mt-5 max-w-[16ch] text-[clamp(1.9rem,6vw,4rem)] text-ink"
          >
            {t("title")}
          </h2>

          {/* Figures — SSR ships the final value; JS counts up to it. */}
          <ul
            role="list"
            className="mt-14 grid grid-cols-1 gap-y-12 sm:mt-20 sm:grid-cols-2 sm:gap-x-8 lg:gap-x-16"
          >
            <li data-stat>
              <p className="u-display flex items-baseline text-[clamp(3rem,10vw,5.5rem)] text-ink">
                <span data-count-to={t("statFollowersValue")}>
                  {t("statFollowersValue")}
                </span>
                <span className="text-clay">{t("statFollowersSuffix")}</span>
              </p>
              <p className="u-eyebrow mt-6 border-t border-line pt-4">
                {t("statFollowersLabel")}
              </p>
            </li>
            <li data-stat>
              <p className="u-display flex items-baseline text-[clamp(3rem,10vw,5.5rem)] text-ink">
                <span data-count-to={t("statRecommendValue")}>
                  {t("statRecommendValue")}
                </span>
                <span className="text-clay">{t("statRecommendSuffix")}</span>
              </p>
              <p className="u-eyebrow mt-6 border-t border-line pt-4">
                {t("statRecommendLabel")}
              </p>
            </li>
          </ul>

          <p data-stat className="mt-10 sm:mt-12">
            <a
              href={SITE.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="u-link text-sm text-ink-70"
            >
              {t("statFollowersLabel")}
            </a>
          </p>

          {/* Review quotes — hairline separated, quiet serif moment. */}
          <div className="mt-20 grid grid-cols-1 gap-y-10 sm:mt-24 lg:grid-cols-3 lg:gap-x-12">
            {QUOTE_KEYS.map((key) => (
              <figure
                key={key}
                data-quote
                className="border-t border-line pt-6"
              >
                <blockquote>
                  <p className="font-display text-[1.05rem] leading-relaxed text-ink">
                    {t(`quotes.${key}.text`)}
                  </p>
                </blockquote>
                <figcaption className="u-eyebrow mt-5">
                  {t(`quotes.${key}.author`)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
