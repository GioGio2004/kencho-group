"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { DUR, EASE, REVEAL_START, STAGGER, prefersReducedMotion } from "@/lib/motion";
import { Sheet } from "@/app/_components/LineWork";

/*
 * FAQ — four questions on a quiet sand ground, hairline-separated.
 *
 * The first item ships OPEN in the HTML (height:auto), so the section reads
 * immediately without JavaScript and search engines see a full answer. The
 * remaining panels start closed via inline height:0/overflow:hidden. Opening
 * and closing tweens run in the click handler (wrapped with contextSafe so
 * they are reverted with the component) — never in an effect reacting to
 * state. Scroll reveals live inside a reduced-motion matchMedia block.
 */

const ITEM_KEYS = ["pricing", "timeline", "materials", "commercial"] as const;

export default function FAQ() {
  const t = useTranslations("faq");

  const rootRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  /** Index of the single open item; null when everything is closed. */
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { contextSafe } = useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      if (!root) return;

      const heads = Array.from(
        root.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (heads.length) {
          gsap.from(heads, {
            y: 24,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.lines,
            scrollTrigger: { trigger: heads[0], start: REVEAL_START },
          });
        }

        if (rows.length) {
          gsap.from(rows, {
            y: 18,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.out,
            stagger: STAGGER.items,
            scrollTrigger: { trigger: rows[0], start: REVEAL_START },
          });
        }
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /**
   * Open/close tweens run in the click handler — contextSafe is invoked
   * INSIDE the handler (never during render, which the react-hooks refs
   * rule forbids) and ties the tweens to the component's gsap context so
   * they are cleaned up on unmount. Reduced motion collapses every
   * duration to zero (instant set).
   */
  const toggle = (index: number) => {
    contextSafe(() => {
      const opening = openIndex !== index;
      const instant = prefersReducedMotion();

    const animatePanel = (i: number, open: boolean) => {
      const panel = panelRefs.current[i];
      if (!panel) return;
      const answer = panel.querySelector<HTMLElement>("[data-answer]");

      gsap.to(panel, {
        height: open ? "auto" : 0,
        duration: instant ? 0 : 0.5,
        ease: "power3.inOut",
        overwrite: "auto",
      });

      if (answer) {
        if (open) {
          gsap.fromTo(
            answer,
            { opacity: 0 },
            {
              opacity: 1,
              duration: instant ? 0 : 0.45,
              delay: instant ? 0 : 0.1,
              ease: EASE.soft,
              overwrite: "auto",
            },
          );
        } else {
          gsap.to(answer, {
            opacity: 0,
            duration: instant ? 0 : 0.25,
            ease: EASE.soft,
            overwrite: "auto",
          });
        }
      }
    };

      if (opening && openIndex !== null) animatePanel(openIndex, false);
      animatePanel(index, opening);
      setOpenIndex(opening ? index : null);
    })();
  };

  return (
    <section
      id="faq"
      ref={rootRef}
      aria-labelledby="faq-title"
      className="u-band relative px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40"
    >
      {/* The page, set out the way the drawing is. */}
      <Sheet guides={2} inset="inset-x-5 inset-y-12 sm:inset-x-8 lg:inset-x-12" />

      <div className="mx-auto w-full max-w-4xl">
        <p data-reveal className="u-eyebrow">
          {t("eyebrow")}
        </p>
        <h2
          data-reveal
          id="faq-title"
          className="u-display mt-5 max-w-[16ch] text-[clamp(1.9rem,6vw,3.6rem)] text-ink"
        >
          {t("title")}
        </h2>

        <div className="mt-12 sm:mt-16">
          {ITEM_KEYS.map((key, index) => {
            const isOpen = openIndex === index;
            const isLast = index === ITEM_KEYS.length - 1;
            const buttonId = `faq-q-${key}`;
            const panelId = `faq-panel-${key}`;

            return (
              <div
                key={key}
                data-row
                className={`border-t border-line ${isLast ? "border-b" : ""}`}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className="u-press flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="font-display text-lg leading-snug text-ink sm:text-xl">
                      {t(`items.${key}.q`)}
                    </span>
                    {/* The single accent moment: the plus turns brass when open. */}
                    <span
                      aria-hidden="true"
                      className={`relative block size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 left-0 block h-px w-full -translate-y-1/2 transition-colors duration-300 ${
                          isOpen ? "bg-clay" : "bg-ink-40"
                        }`}
                      />
                      <span
                        className={`absolute top-0 left-1/2 block h-full w-px -translate-x-1/2 transition-colors duration-300 ${
                          isOpen ? "bg-clay" : "bg-ink-40"
                        }`}
                      />
                    </span>
                  </button>
                </h3>

                {/*
                  Item 0 renders open (height:auto) so no-JS visitors and
                  crawlers read an answer; the rest start collapsed inline.
                */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  ref={(el) => {
                    panelRefs.current[index] = el;
                  }}
                  style={
                    index === 0
                      ? { overflow: "hidden" }
                      : { height: 0, overflow: "hidden" }
                  }
                >
                  <p
                    data-answer
                    className="max-w-2xl pb-6 text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base"
                  >
                    {t(`items.${key}.a`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
