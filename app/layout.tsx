import type { Metadata, Viewport } from "next";
import { cinzel, notoSansGeorgian, notoSerifGeorgian } from "./fonts";
import "./globals.css";

/*
 * Runs before first paint: decides whether the intro overlay plays this
 * session. Must stay inline and synchronous — see the bundled Next guide
 * on preventing flash before hydration.
 */
const introGuard = `try{if(!sessionStorage.getItem("kg-intro-seen")&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("intro-pending")}}catch(e){}`;

export const metadata: Metadata = {
  title: {
    default: "Kencho Group — კენჭო ჯგუფი",
    template: "%s | Kencho Group",
  },
  description:
    "ავეჯის ინდივიდუალური დამზადება — სამზარეულოები, გარდერობები, კომერციული და საცხოვრებელი ინტერიერები. ესკიზიდან რეალობამდე.",
};

export const viewport: Viewport = {
  themeColor: "#0f0e0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ka"
      suppressHydrationWarning
      className={`${cinzel.variable} ${notoSerifGeorgian.variable} ${notoSansGeorgian.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGuard }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
