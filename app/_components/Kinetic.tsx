"use client";

import { useTranslations } from "next-intl";
import RevealText from "@/app/_components/RevealText";
import ScrambleText from "@/app/_components/ScrambleText";
import WordMorph from "@/app/_components/WordMorph";

/*
 * KINETIC — the poster band.
 *
 * The four things this company does, first as a list and then as a
 * composition, with the scroll as the thing that takes them apart and
 * puts them back. It is the one section on the page carrying no photo, no
 * price and no call to action, and that is deliberate: it sits between
 * the manifesto and the first hard evidence, and its whole job is to make
 * the visitor slow down before the proof arrives.
 *
 * The section is 240svh of scroll wrapped around one sticky viewport, so
 * the morph gets its runway without a ScrollTrigger pin. The closing line
 * sits below the sticky panel, in ordinary flow, where its own departure
 * can be measured honestly.
 */

/*
 * The scattered layout, written against a 12-column, 6-row grid. Hand-set
 * rather than generated: the asymmetry is the composition, and a formula
 * that spread four words evenly would produce a table.
 *
 * Every slot spans generously and hugs one edge. The span is what gives a
 * long word somewhere to go — Russian "ПРОИЗВОДСТВО" is twice the width
 * of English "BUILD", and a slot sized for the English would push it off
 * the screen.
 */
const SLOTS = [
  "col-start-1 col-end-9 row-start-1 justify-self-start self-start",
  "col-start-4 col-end-13 row-start-2 justify-self-end self-center",
  "col-start-1 col-end-10 row-start-4 justify-self-start self-center",
  "col-start-3 col-end-13 row-start-6 justify-self-end self-end",
];

/** One measure for the poster type, shared by both layouts. */
const WORD_CLASS =
  "u-display block whitespace-nowrap text-[clamp(1.6rem,6.4vw,4.75rem)] uppercase leading-[0.9]";

export default function Kinetic() {
  const t = useTranslations("kinetic");
  const words = t("words").split("\n").filter(Boolean);

  return (
    <section
      id="kinetic"
      aria-labelledby="kinetic-title"
      className="relative bg-charcoal text-sand"
    >
      {/* The runway. WordMorph measures its scrub against this. */}
      <div data-morph-section className="relative h-[240svh]">
        <div className="sticky top-0 flex h-svh flex-col overflow-hidden px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
          {/* .u-eyebrow is unlayered CSS, so its ink colour outranks a
              plain utility on this dark band — `!` puts brass back on top. */}
          {/* The eyebrow IS the heading. A visually-hidden <h2> repeating
              it would announce the same three words twice in a row, which
              is worse for a screen reader than the small type is for
              everyone else. */}
          <ScrambleText
            as="h2"
            id="kinetic-title"
            text={t("eyebrow")}
            className="u-eyebrow text-clay!"
          />

          <div className="relative mt-10 flex-1">
            <WordMorph
              words={words}
              slots={SLOTS}
              wordClassName={WORD_CLASS}
              stackClassName="absolute inset-0 flex flex-col justify-center gap-[0.15em]"
              scatterClassName="absolute inset-0 grid grid-cols-12 grid-rows-6"
            />
          </div>
        </div>
      </div>

      {/*
        The closing line, and the page's one `scatter`. It comes apart as
        the section leaves and reassembles on the way back — an echo of
        the poster, on copy the Process section restates in full a screen
        later, so nothing load-bearing is riding on the effect.
      */}
      <div className="px-6 pb-28 sm:px-10 sm:pb-40 lg:px-16">
        <RevealText
          variant="scatter"
          className="u-display max-w-3xl text-[clamp(1.25rem,3.4vw,2.4rem)] leading-[1.25]! text-sand/80"
        >
          {t("note")}
        </RevealText>
      </div>
    </section>
  );
}
