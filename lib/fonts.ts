import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Inter_Tight,
  Noto_Sans_Georgian,
  Noto_Serif_Georgian,
  Pinyon_Script,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { Locale } from "@/i18n/routing";

/*
 * ERA-RESIDENCE 1:1 TYPOGRAPHY SYSTEM:
 * - --font-bodoni: Bodoni_Moda (High-contrast Didone serif, vertically elongated
 *   with transform: scaleY(1.35) via .font-era-display)
 * - --font-script: Pinyon_Script (weight 400) for oversized calligraphic accents
 * - --font-sans: Plus_Jakarta_Sans (weights 400, 500, 600) for micro-copy & HUD
 */

export const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-bodoni",
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display-en",
});

export const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-script",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body-en",
});

const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-brand-en",
});

/** The Latin wordmark uses its high-contrast editorial lettering in every language. */
export const brandFontClass = `${bodoniModa.variable} ${cormorantGaramond.variable} ${pinyonScript.variable} ${plusJakartaSans.variable} ${interTight.variable}`;

const notoSerifGeorgian = Noto_Serif_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display-ka",
});

const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-ka",
});

export const LOCALE_FONTS: Record<Locale, { variables: string[] }> = {
  en: {
    variables: [
      bodoniModa.variable,
      cormorantGaramond.variable,
      pinyonScript.variable,
      plusJakartaSans.variable,
      interTight.variable,
    ],
  },
  ru: {
    variables: [
      bodoniModa.variable,
      cormorantGaramond.variable,
      pinyonScript.variable,
      plusJakartaSans.variable,
      interTight.variable,
    ],
  },
  ka: {
    variables: [
      bodoniModa.variable,
      notoSerifGeorgian.variable,
      notoSansGeorgian.variable,
      cormorantGaramond.variable,
      pinyonScript.variable,
      plusJakartaSans.variable,
      interTight.variable,
    ],
  },
};

export function fontClassesFor(locale: Locale): string {
  return LOCALE_FONTS[locale].variables.join(" ");
}
