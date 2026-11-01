let pending: Promise<void> | null = null;
let readyAt = 0;
export async function ensureEnquirySession(signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (Date.now() - readyAt < 20 * 60 * 60 * 1000) return;
  pending ??= (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch("/api/project-request/session", { method: "POST", signal: controller.signal });
    } finally { clearTimeout(timeout); }
  })().then(async response => {
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || "unavailable"); }
    readyAt = Date.now();
  }).finally(() => { pending = null; });
  if (!signal) return pending;
  // Cancelling one chat request must not cancel a session shared with the form.
  return new Promise<void>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    pending!.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
export function resetEnquirySession() { readyAt = 0; }

/** Renew a missing/expired cookie once, before retrying an unauthenticated request. */
export async function fetchWithEnquirySession(url: string, options: RequestInit) {
  const signal = options.signal ?? undefined;
  await ensureEnquirySession(signal);
  let response = await fetch(url, options);
  if (response.status === 401) {
    await response.body?.cancel();
    resetEnquirySession();
    await ensureEnquirySession(signal);
    response = await fetch(url, options);
  }
  return response;
}
