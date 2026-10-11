export const GREETING_SESSION_KEY = "kencho:greeting:v1";
export const GREETING_REVEAL_EVENT = "kencho:greeting-reveal";
export const GREETING_END_EVENT = "kencho:greeting-end";

// Runs while the head is parsed, before the site can flash behind the greeting.
// Without JavaScript the attribute is never set and the ordinary page is visible.
export const GREETING_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  const replay = new URLSearchParams(location.search).get("intro") === "1";
  try { if (!replay && sessionStorage.getItem("${GREETING_SESSION_KEY}") === "seen") return; } catch {}
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.dataset.greeting = "pending";
  window.__kenchoGreetingTimeout = setTimeout(() => {
    delete root.dataset.greeting;
    try { sessionStorage.setItem("${GREETING_SESSION_KEY}", "seen"); } catch {}
    window.dispatchEvent(new Event("${GREETING_REVEAL_EVENT}"));
    window.dispatchEvent(new Event("${GREETING_END_EVENT}"));
  }, 4000);
})();`;
