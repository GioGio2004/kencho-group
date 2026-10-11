/*
 * Tiny analytics facade. Meta Pixel and GA4 scripts load only when their
 * env vars are set (see AnalyticsScripts.tsx); this helper no-ops safely
 * when they are absent, so components can call track() unconditionally.
 *
 * Vercel Web Analytics is the third sink (its <Analytics /> mounts in
 * the locale layout). Custom events need the project's Analytics plan to
 * allow them — on the free tier they are dropped silently, page views
 * still count.
 *
 * Events:
 *   "Contact"       a WhatsApp click, tel: click, or lead-form submit
 *   "OpenCatalogue" the hero button — the one step between ad and photos
 *   "ViewPage"      a catalogue page opened (which photos sell)
 */

import { track as vercelTrack } from "@vercel/analytics";

type Fbq = (command: "track" | "trackCustom", event: string, params?: object) => void;
type Gtag = (command: "event", event: string, params?: object) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    gtag?: Gtag;
  }
}

type Params = Record<string, string | undefined>;

export function track(
  event: "Contact" | "OpenCatalogue" | "ViewPage",
  params: Params = {},
): void {
  if (typeof window === "undefined") return;
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
  try {
    // "Contact" is a Meta standard event; the others are custom.
    window.fbq?.(event === "Contact" ? "track" : "trackCustom", event, clean);
    window.gtag?.("event", event.replace(/[A-Z]/g, (c, i) => (i ? "_" : "") + c.toLowerCase()), clean);
    vercelTrack(event, clean);
  } catch {
    /* analytics must never break the page */
  }
}
