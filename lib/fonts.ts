import { Inter, Noto_Sans_Georgian } from "next/font/google";
import type { Locale } from "@/i18n/routing";

/*
 * MINIMALIST GEOMETRIC SANS-SERIF TYPOGRAPHY SYSTEM:
 * Zero decorative script or serif fonts. High-legibility geometric sans-serif
 * across Georgian (Noto Sans Georgian), Russian, and English (Inter).
 */

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-en",
});

export const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-ka",
});

/* Aliased exports so legacy imports remain type-safe without loading decorative fonts */
export const bodoniModa = inter;
export const cormorantGaramond = inter;
export const pinyonScript = inter;
export const plusJakartaSans = inter;

export const brandFontClass = `${inter.variable} ${notoSansGeorgian.variable}`;

export const LOCALE_FONTS: Record<Locale, { variables: string[] }> = {
  en: {
    variables: [inter.variable],
  },
  ru: {
    variables: [inter.variable],
  },
  ka: {
    variables: [notoSansGeorgian.variable, inter.variable],
  },
};

export function fontClassesFor(locale: Locale): string {
  return LOCALE_FONTS[locale].variables.join(" ");
}
