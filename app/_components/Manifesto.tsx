"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useTranslations } from "next-intl";
import { DUR, EASE, REVEAL_START, STAGGER } from "@/lib/motion";

/*
 * MANIFESTO — the calm after the hero. One statement, two footnotes, and a
 * great deal of air. The statement reveals word by word out of masked lines;
 * the notes drift up on their own trigger. Everything is a `from` tween, so
 * the section renders complete and readable with JavaScript disabled.
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const eyebrow = eyebrowRef.current;
      const rule = ruleRef.current;
      const heading = headingRef.current;
      const notesWrap = notesRef.current;
      if (!eyebrow || !rule || !heading || !notesWrap) return;

      const notes = gsap.utils.toArray<HTMLElement>(
        notesWrap.querySelectorAll("[data-note]"),
      );

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        let split: SplitText | null = null;
        let cancelled = false;

        // Split only once the display face has loaded, so the lines the mask
        // is cut against are the final ones.
        document.fonts.ready.then(() => {
          if (cancelled) return;
          ctx.add(() => {
            const instance = SplitText.create(heading, {
              type: "words,lines",
              mask: "lines",
            });
            split = instance;

            gsap.from(instance.words, {
              yPercent: 60,
              opacity: 0,
              duration: DUR.base,
              ease: EASE.out,
              stagger: 0.018,
              scrollTrigger: { trigger: heading, start: REVEAL_START },
            });
          });
        });

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

        return () => {
          cancelled = true;
          split?.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      id="manifesto"
      ref={rootRef}
      aria-labelledby="manifesto-title"
      className="bg-sand px-6 py-28 sm:px-10 sm:py-40 lg:py-56"
    >
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
        <h2
          id="manifesto-title"
          ref={headingRef}
          className="u-display mt-8 text-[clamp(1.6rem,4.6vw,3.4rem)] leading-[1.15]! text-ink sm:mt-10"
        >
          {t("statement")}
        </h2>

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
