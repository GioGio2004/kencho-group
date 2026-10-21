export const GREETING_SESSION_KEY = "kencho:greeting:v1";
export const GREETING_REVEAL_EVENT = "kencho:greeting-reveal";
export const GREETING_END_EVENT = "kencho:greeting-end";

// Only runs when explicitly requested via ?intro=1 so the ERA-choreographed
// landing page renders immediately without a blocking overlay.
export const GREETING_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  const replay = new URLSearchParams(location.search).get("intro") === "1";
  if (!replay) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.dataset.greeting = "pending";
  window.__kenchoGreetingTimeout = setTimeout(() => {
    delete root.dataset.greeting;
    try { sessionStorage.setItem("${GREETING_SESSION_KEY}", "seen"); } catch {}
    window.dispatchEvent(new Event("${GREETING_REVEAL_EVENT}"));
    window.dispatchEvent(new Event("${GREETING_END_EVENT}"));
  }, 4000);
})();`;
