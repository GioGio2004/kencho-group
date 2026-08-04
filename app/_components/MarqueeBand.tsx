"use client";

import { useTranslations } from "next-intl";
import Marquee from "@/app/_components/Marquee";

/*
 * MARQUEEBAND — the seam between the showcase and the process.
 *
 * One line, repeated, crossing the page at the speed the visitor is
 * scrolling. It carries the only claim on the site that is worth
 * repeating without qualification, and it is the page's single band of
 * brass — the palette notes say clay is used sparingly, and one moving
 * line between two dark sections is what that budget buys.
 */
export default function MarqueeBand() {
  const t = useTranslations("kinetic");

  return (
    <div className="border-y border-bone/10 bg-charcoal py-6 sm:py-8">
      <Marquee
        className="u-display text-[clamp(1.5rem,4.4vw,3rem)] text-clay uppercase"
        direction={-1}
      >
        {t("marquee")}
        {/* The separator belongs to the decoration, not the sentence. */}
        <span aria-hidden="true" className="px-[0.6em] text-bone/25">
          ·
        </span>
      </Marquee>
    </div>
  );
}
