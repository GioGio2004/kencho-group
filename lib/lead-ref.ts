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
    return localStorage.getItem(SOURCE_KEY) ?? "";
  } catch {
    return "";
  }
}
