/*
 * LEAD ATTRIBUTION — proof that a customer came through the website.
 *
 * Every visitor gets a short reference code (KG-4821) the first time
 * they land. It rides along on every way of getting in touch:
 *
 *   WhatsApp   appended to the prefilled message — "(code KG-4821)"
 *   Form       sent with the lead
 *   Phone      shown next to the number: "mention code KG-4821"
 *
 * The first `?ref=` or `?utm_source=` the visitor arrived with is kept
 * too, so a link an employee shares (kenchogroup.ge/ka?ref=nika) or an
 * ad campaign's tag still identifies the lead days later.
 *
 * localStorage can throw (private mode, blocked storage) — every access
 * is guarded and the site works without it; the code then lives for the
 * page view only.
 */

const CODE_KEY = "kg:ref-code";
const SOURCE_KEY = "kg:ref-source";
const ATTRIBUTION_KEY = "kg:attribution:v1";

type FirstTouch = {
  landing: string;
  source: string;
  utm_source: string;
  campaign: string;
  referrer: string;
};

let memoryTouch: FirstTouch | null = null;

/** Strip query strings/fragments from referring URLs; campaign tags have
 * their own fields and arbitrary URL parameters do not belong in an enquiry. */
function referrerPath(value: string): string {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? `${url.origin}${url.pathname}`.slice(0, 512) : "";
  } catch {
    return "";
  }
}

function firstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  if (memoryTouch) return memoryTouch;
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (["landing", "source", "utm_source", "campaign", "referrer"].every((key) => typeof stored?.[key] === "string")) {
        memoryTouch = stored as FirstTouch;
        return memoryTouch;
      }
    }
  } catch { /* Use the in-memory fallback. */ }
  const params = new URLSearchParams(window.location.search);
  const referrer = referrerPath(document.referrer);
  let legacySource = "";
  try { legacySource = localStorage.getItem(SOURCE_KEY) || ""; } catch { /* Storage may be blocked. */ }
  memoryTouch = {
    landing: window.location.pathname,
    source: (params.get("ref") || params.get("utm_source") || legacySource || referrer || "").slice(0, 512),
    utm_source: (params.get("utm_source") || "").slice(0, 80),
    campaign: (params.get("utm_campaign") || "").slice(0, 80),
    referrer,
  };
  try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(memoryTouch)); } catch { /* Storage may be blocked. */ }
  return memoryTouch;
}

/** Current enquiry context plus the original landing source. Phone clicks
 * carry this in analytics; WhatsApp also carries it in the prepared message. */
export function getEnquiryAttribution(locale: string) {
  const first = firstTouch();
  const params = new URLSearchParams(window.location.search);
  return {
    locale,
    page: window.location.pathname,
    utm_source: (params.get("utm_source") || first?.utm_source || "").slice(0, 80),
    source: (params.get("ref") || params.get("utm_source") || first?.source || "").slice(0, 512),
    referrer: referrerPath(document.referrer) || first?.referrer || "",
    landing: first?.landing || window.location.pathname,
    campaign: (params.get("utm_campaign") || first?.campaign || "").slice(0, 80),
    first_source: first?.source || "",
  };
}

let memoryCode: string | null = null;

function makeCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `KG-${n}`;
}

export function getRefCode(): string {
  try {
    const stored = localStorage.getItem(CODE_KEY);
    if (stored) return stored;
    const code = makeCode();
    localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    memoryCode ??= makeCode();
    return memoryCode;
  }
}

/** Record the campaign/referrer tag from the landing URL, first touch wins. */
export function captureSource(): void {
  firstTouch();
  try {
    if (localStorage.getItem(SOURCE_KEY)) return;
    const params = new URLSearchParams(location.search);
    const tag = params.get("ref") ?? params.get("utm_source");
    if (!tag) return;
    const campaign = params.get("utm_campaign");
    localStorage.setItem(
      SOURCE_KEY,
      (campaign ? `${tag}/${campaign}` : tag).slice(0, 80),
    );
  } catch {
    /* attribution must never break the page */
  }
}

export function getSource(): string {
  try {
    return localStorage.getItem(SOURCE_KEY) ?? firstTouch()?.source ?? "";
  } catch {
    return firstTouch()?.source ?? "";
  }
}
