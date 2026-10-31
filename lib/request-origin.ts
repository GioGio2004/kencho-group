const TUNNEL_HOST = /^[a-z0-9-]+\.(?:ngrok-free\.app|ngrok-free\.dev|ngrok\.app|ngrok\.dev|ngrok\.io)$/i;

/** Keep production pinned to the configured origin; permit same-host dev tunnels. */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) return false;
  const expected = process.env.SITE_ORIGIN?.replace(/\/$/, "") || new URL(request.url).origin;
  if (origin === expected) return true;
  if (process.env.NODE_ENV !== "development") return false;
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (!isLocal && !(parsed.protocol === "https:" && TUNNEL_HOST.test(parsed.hostname))) return false;
  // ngrok terminates TLS upstream, so request.url may still say http/localhost.
  // Never trust a forwarded host unless it matches this allowed dev origin.
  const forwardedHeader = request.headers.get("x-forwarded-host") || "";
  const forwardedHosts = forwardedHeader.split(",").map(h => h.trim());
  const hostHeader = request.headers.get("host") || "";
  const allowedCandidates = [
    hostHeader,
    hostHeader.split(":")[0],
    ...forwardedHosts,
    ...forwardedHosts.map(h => h.split(":")[0]),
  ];
  return allowedCandidates.includes(parsed.host) || allowedCandidates.includes(parsed.hostname);
}
