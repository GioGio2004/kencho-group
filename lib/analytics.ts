/*
 * Tiny analytics facade. Meta Pixel and GA4 scripts load only when their
 * env vars are set (see AnalyticsScripts.tsx); this helper no-ops safely
 * when they are absent, so components can call track() unconditionally.
 *
 * Standard events used:
 *   "Contact" — any WhatsApp click, tel: click, or lead-form submit.
 */

type Fbq = (command: "track", event: string, params?: object) => void;
type Gtag = (command: "event", event: string, params?: object) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

export function track(
  event: "Contact",
  params?: { method?: "whatsapp" | "phone" | "form" },
): void {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", event, params);
    window.gtag?.("event", event.toLowerCase(), params);
  } catch {
    /* analytics must never break the page */
  }
}
