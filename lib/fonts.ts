import { Fraunces, Instrument_Sans } from "next/font/google";

/** Editorial display serif — headlines only. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

/** Clean grotesque — body, UI, labels. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});
