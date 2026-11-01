const PENDING = "kg:chat-origin";
const ACTIVE = "kg:chat-return";
const RESTORE = "kg:chat-scroll";
const STATE = "kgChatOrigin";
type Origin = { url: string; x: number; y: number };
let pendingOrigin: Origin | null = null;
let activeOrigin: Origin | null = null;

function origin(value: unknown): Origin | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Origin;
  if (typeof item.url !== "string" || !/^\/(ka|en|ru)(\/|\?|#|$)/.test(item.url) || /^\/(ka|en|ru)\/chat(?:[/?#]|$)/.test(item.url)) return null;
  if (![item.x, item.y].every(Number.isFinite)) return null;
  return item;
}

export function rememberChatOrigin() {
  const item: Origin = { url: location.pathname + location.search + location.hash, x: scrollX, y: scrollY };
  pendingOrigin = item;
  try { sessionStorage.setItem(PENDING, JSON.stringify(item)); } catch { /* Browser Back still works without storage. */ }
}

/** Keep the return destination on this history entry, including across reloads. */
export function markChatEntry() {
  let item = pendingOrigin;
  try {
    item ??= origin(JSON.parse(sessionStorage.getItem(PENDING) || "null"));
    sessionStorage.removeItem(PENDING);
  } catch { /* In-memory navigation still works without browser storage. */ }
  pendingOrigin = null;
  if (item) {
    activeOrigin = item;
    try { sessionStorage.setItem(ACTIVE, JSON.stringify(item)); } catch { /* Keep the in-memory destination. */ }
    history.replaceState({ ...history.state, [STATE]: item }, "");
  }
}

export function chatReturnOrigin() {
  // Next can replace its history entry after navigation. Keep an independent
  // destination so an immediate exit never falls back to the home page.
  let item = origin(history.state?.[STATE]) ?? activeOrigin;
  if (!item) {
    try { item = origin(JSON.parse(sessionStorage.getItem(ACTIVE) || "null")); } catch { /* Storage is optional. */ }
  }
  const destination = origin({ url: new URLSearchParams(location.search).get("returnTo"), x: 0, y: 0 });
  if (destination && (!item || new URL(item.url, location.origin).pathname !== new URL(destination.url, location.origin).pathname)) item = destination;
  if (item) {
    try { sessionStorage.setItem(RESTORE, JSON.stringify(item)); } catch { /* Native history restores scroll too. */ }
  }
  return item;
}

export function restoreChatScroll() {
  try {
    const item = origin(JSON.parse(sessionStorage.getItem(RESTORE) || "null"));
    if (!item || item.url !== location.pathname + location.search + location.hash) return;
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => {
        window.scrollTo({ left: item.x, top: item.y, behavior: "instant" });
        sessionStorage.removeItem(RESTORE);
      });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  } catch { /* The destination remains usable when browser storage is unavailable. */ }
}
