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
  event: "Contact" | "OpenCatalogue" | "ViewPage" | "FormStarted" | "UploadCompleted" | "SubmissionSucceeded" | "SubmissionFailed",
  params: Params = {},
): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem("kg:analytics-consent:v1") === "no") return;
  } catch {
    /* ignore */
  }
  const clean: Record<string, string> = {};
  if (["ka", "en", "ru"].includes(params.locale || "")) clean.locale = params.locale!;
  if (["phone", "whatsapp"].includes(params.method || "")) clean.method = params.method!;
  try {
    window.fbq?.(event === "Contact" ? "track" : "trackCustom", event, clean);
    window.gtag?.("event", event.replace(/[A-Z]/g, (c, i) => (i ? "_" : "") + c.toLowerCase()), clean);
    vercelTrack(event, clean);
  } catch {
    /* analytics must never break the page */
  }
}
