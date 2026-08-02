import {
  Fraunces,
  Instrument_Sans,
  Inter,
  Noto_Sans_Georgian,
  Noto_Serif_Georgian,
  Playfair_Display,
} from "next/font/google";
import type { Locale } from "@/i18n/routing";

/*
 * Per-script typography. Fraunces has no Georgian and no Cyrillic;
 * Instrument Sans has no Cyrillic or Georgian — so each locale gets its
 * own display + body pair, and only the active locale's variables are
 * attached to <html>. globals.css resolves the fonts through a var()
 * fallback chain, so whichever pair is present wins.
 *
 *   en: Fraunces + Instrument Sans (latin)
 *   ka: Noto Serif Georgian + Noto Sans Georgian (georgian + latin,
 *       latin needed for the wordmark, numerals, and brand names)
 *   ru: Playfair Display + Inter (cyrillic + latin)
 */

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-en",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-en",
});

const notoSerifGeorgian = Noto_Serif_Georgian({
  subsets: ["georgian", "latin"],
  display: "swap",
  variable: "--font-display-ka",
});

const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  display: "swap",
  variable: "--font-body-ka",
});

const playfair = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-display-ru",
});

const inter = Inter({
  subsets: ["cyrillic", "latin"],
  display: "swap",
  variable: "--font-body-ru",
});

export const LOCALE_FONTS: Record<
  Locale,
  { display: { variable: string }; body: { variable: string } }
> = {
  en: { display: fraunces, body: instrumentSans },
  ka: { display: notoSerifGeorgian, body: notoSansGeorgian },
  ru: { display: playfair, body: inter },
};

export function fontClassesFor(locale: Locale): string {
  const pair = LOCALE_FONTS[locale];
  return `${pair.display.variable} ${pair.body.variable}`;
}
