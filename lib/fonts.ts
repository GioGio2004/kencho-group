import { Inter, Inter_Tight, Noto_Sans_Georgian } from "next/font/google";
import type { Locale } from "@/i18n/routing";

/*
 * One grotesk voice, in the weights the design uses: regular for
 * everything LPAS-like (titles at 400–500), bold for the noho-style
 * headline. Inter Tight carries Latin and Cyrillic; Georgian has no
 * case and its own letterforms, so it gets Noto Sans Georgian for both
 * display and body. Only the active locale's variables are attached to
 * <html>; globals.css resolves the fonts through a var() fallback chain.
 */

const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display-en",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-body-en",
});

/** The Latin wordmark uses its original lettering in every language. */
export const brandFontClass = interTight.variable;

const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display-ka",
});

export const LOCALE_FONTS: Record<Locale, { variables: string[] }> = {
  en: { variables: [interTight.variable, inter.variable] },
  ru: { variables: [interTight.variable, inter.variable] },
  // Georgian: the same family for display and body.
  ka: { variables: [notoSansGeorgian.variable] },
};

export function fontClassesFor(locale: Locale): string {
  return LOCALE_FONTS[locale].variables.join(" ");
}
