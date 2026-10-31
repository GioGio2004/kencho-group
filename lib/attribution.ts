import { cleanAttribution, type Attribution } from "./project-request";
const KEY = "kg:enquiry-attribution:v2";
type Touches = { first: Attribution; latest: Attribution; expires: number };
let memory: Touches | null = null;
export function captureAttribution(): Touches {
  if (typeof window === "undefined") return { first: cleanAttribution(null), latest: cleanAttribution(null), expires: 0 };
  if (!memory) {
    try { const stored = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (stored?.expires > Date.now()) memory = { first: cleanAttribution(stored.first), latest: cleanAttribution(stored.latest), expires: stored.expires }; } catch { /* Private browsers may block storage. */ }
  }
  const params = new URLSearchParams(location.search);
  const current = cleanAttribution({
    utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"), utm_content: params.get("utm_content"),
    landing: location.pathname, referrer: document.referrer,
  });
  const campaign = !!(current.utm_source || current.utm_medium || current.utm_campaign || current.utm_content);
  if (!memory || memory.expires <= Date.now()) memory = { first: current, latest: cleanAttribution(null), expires: Date.now() + 86400000 };
  if (campaign) memory.latest = current;
  // Session-only context accompanies an enquiry; it is never sent to trackers.
  try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Keep in memory. */ }
  return memory;
}
