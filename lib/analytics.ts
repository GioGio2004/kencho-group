/*
 * Tiny analytics facade. Meta Pixel and GA4 scripts load only when their
 * env vars are set (see AnalyticsScripts.tsx); this helper no-ops safely
 * when they are absent, so components can call track() unconditionally.
 *
 * Vercel Web Analytics is the third sink (its <Analytics /> mounts in
 * the locale layout). Its track() is a no-op until the script is live,
 * and custom events need the project's Analytics plan to allow them —
 * on the free tier they are dropped silently, page views still count.
 *
 * Standard events used:
 *   "Contact" — any WhatsApp click, tel: click, or lead-form submit.
 */

import { track as vercelTrack } from "@vercel/analytics";

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
    vercelTrack(event, params?.method ? { method: params.method } : undefined);
  } catch {
    /* analytics must never break the page */
  }
}
