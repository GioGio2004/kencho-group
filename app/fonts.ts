import { Cinzel, Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";

export const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
});

export const notoSerifGeorgian = Noto_Serif_Georgian({
  subsets: ["georgian", "latin"],
  display: "swap",
  variable: "--font-noto-serif-georgian",
});

export const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  display: "swap",
  variable: "--font-noto-sans-georgian",
});
