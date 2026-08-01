import type { Metadata, Viewport } from "next";
import { fraunces, instrumentSans } from "@/lib/fonts";
import { IMAGES, src } from "@/lib/images";
import { SITE } from "@/lib/site";
import "./globals.css";

/*
 * Runs before first paint. The intro overlay is only ever shown when JS
 * is alive to remove it, never to reduced-motion visitors, and only on
 * the first visit of a session — so the sand panel never flashes on a
 * return visit before JS could hide it.
 */
const loaderGuard = `try{var m=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=sessionStorage.getItem("alma:intro-seen");if(!m&&!s){document.documentElement.classList.add("is-loading")}}catch(e){}`;

/* Structured data — helps the listing surface as a real development. */
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ApartmentComplex",
  name: SITE.fullName,
  description: SITE.description,
  url: SITE.url,
  image: src(IMAGES.heroMain, 1200),
  address: { "@type": "PostalAddress", addressLocality: SITE.location },
  telephone: SITE.phone,
  email: SITE.email,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.fullName} — ${SITE.tagline}`,
    template: `%s | ${SITE.fullName}`,
  },
  description: SITE.description,
  keywords: [
    "residences",
    "property",
    "apartments for sale",
    "architecture",
    SITE.location,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.fullName,
    title: `${SITE.fullName} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
    images: [
      {
        url: src(IMAGES.heroMain, 1200),
        width: 1200,
        height: 630,
        alt: IMAGES.heroMain.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.fullName} — ${SITE.tagline}`,
    description: SITE.description,
    images: [src(IMAGES.heroMain, 1200)],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#efe7dd",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${instrumentSans.variable} antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <script dangerouslySetInnerHTML={{ __html: loaderGuard }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
