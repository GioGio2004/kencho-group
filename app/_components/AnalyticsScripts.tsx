import Script from "next/script";

/*
 * Meta Pixel + GA4, each loaded ONLY when its env var is set:
 *   NEXT_PUBLIC_META_PIXEL_ID — Meta Pixel ID
 *   NEXT_PUBLIC_GA_ID         — GA4 measurement ID (G-XXXXXXX)
 * Without the vars this renders nothing and costs nothing.
 *
 * Ahrefs Web Analytics differs on both counts:
 *   - its data-key is public (it ships in every page's HTML anyway),
 *     so it lives here as a constant — nothing to configure on Vercel;
 *   - it must be a plain <script async>, not <Script>: Ahrefs'
 *     "Verify installation" fetches the raw HTML and looks for the
 *     tag, which an afterInteractive client-side injection would
 *     never show it. React 19 hoists async src scripts into <head>,
 *     where the install guide asks for it.
 *   - production-gated so dev-server visits don't count as traffic.
 */
const AHREFS_KEY = "xjMYdF12eSLB+I0veTN9yg";

export default function AnalyticsScripts() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      {process.env.NODE_ENV === "production" ? (
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key={AHREFS_KEY}
          async
        />
      ) : null}

      {pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
