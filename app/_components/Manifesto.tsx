"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";
import { Sheet } from "@/app/_components/LineWork";
import RevealText from "@/app/_components/RevealText";

/*
 * MANIFESTO — the calm after the hero. One statement, two footnotes, and a
 * great deal of air. The statement is a scroll-scrubbed word sweep — every
 * word waits dimmed on the page and takes its full ink as the reader
 * reaches it, so reading pace and scroll pace become the same thing (the
 * `scrub` variant of RevealText, which owns the split). The notes drift up
 * on their own trigger. Everything animates off the rendered state, so the
 * section reads complete with JavaScript disabled.
 */

const NOTES = [
  { id: "one", titleKey: "noteOneTitle", textKey: "noteOne" },
  { id: "two", titleKey: "noteTwoTitle", textKey: "noteTwo" },
] as const;

export default function Manifesto() {
  const t = useTranslations("manifesto");

  const rootRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      const eyebrow = eyebrowRef.current;
      const rule = ruleRef.current;
      const notesWrap = notesRef.current;
      if (!eyebrow || !rule || !notesWrap) return;

      const notes = gsap.utils.toArray<HTMLElement>(
        notesWrap.querySelectorAll("[data-note]"),
      );

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(eyebrow, {
          y: 14,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.soft,
          scrollTrigger: { trigger: eyebrow, start: REVEAL_START },
        });

        gsap.from(rule, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: DUR.slow,
          ease: EASE.out,
          scrollTrigger: { trigger: eyebrow, start: REVEAL_START },
        });

        gsap.from(notes, {
          y: 26,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.soft,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: notesWrap, start: REVEAL_START },
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      id="manifesto"
      ref={rootRef}
      data-thread-anchor=""
      aria-labelledby="manifesto-title"
      className="relative bg-sand px-6 py-36 sm:px-10 sm:py-52 lg:py-72"
    >
      {/* The page, set out the way the drawing is. */}
      <Sheet guides={2} inset="inset-x-6 inset-y-16 sm:inset-x-10" />

      <div className="mx-auto max-w-4xl">
        <p ref={eyebrowRef} className="u-eyebrow flex items-center gap-4">
          <span
            ref={ruleRef}
            aria-hidden="true"
            className="block h-px w-8 shrink-0 bg-clay"
          />
          {t("eyebrow")}
        </p>

        {/*
          `.u-display` is unlayered CSS, so it outranks the layered
          `leading-*` utility — the important modifier is what lets this
          statement breathe at 1.15 instead of the display default of 0.95.
        */}
        <RevealText
          as="h2"
          id="manifesto-title"
          variant="scrub"
          className="u-display mt-8 text-[clamp(1.6rem,4.6vw,3.4rem)] leading-[1.15]! text-ink sm:mt-10"
        >
          {t("statement")}
        </RevealText>

        <div
          ref={notesRef}
          className="mt-16 grid gap-10 sm:mt-24 sm:grid-cols-2 sm:gap-12"
        >
          {NOTES.map((note) => (
            <div key={note.id} data-note className="border-t border-line pt-6">
              <h3 className="text-[0.9375rem] leading-[1.5] font-medium text-ink sm:text-base">
                {t(note.titleKey)}
              </h3>
              <p className="mt-3 max-w-[38ch] text-[0.9375rem] leading-[1.7] text-ink-70 sm:text-base">
                {t(note.textKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
