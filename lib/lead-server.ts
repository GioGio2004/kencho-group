import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { UUID } from "./project-request";
import { isAllowedOrigin } from "./request-origin";

export class RequestError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export const PRIVATE_HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const COOKIE = "kg-enquiry";
export function secret() {
  const value = process.env.LEAD_INGEST_SECRET;
  if (!value || value.length < 32) throw new RequestError("unavailable", 503);
  return value;
}
export function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new RequestError("unavailable", 503);
  return new ConvexHttpClient(url);
}
export const launchApi = anyApi.launch;
export function checkOrigin(request: Request) {
  if (!isAllowedOrigin(request)) throw new RequestError("forbidden", 403);
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export async function sessionId() {
  const value = (await cookies()).get(COOKIE)?.value;
  const [id, expires, signature] = value?.split(".") || [];
  if (!id || !UUID.test(id) || !/^\d+$/.test(expires || "") || Number(expires) < Date.now() || !/^[a-f0-9]{64}$/.test(signature || "")) throw new RequestError("session", 401);
  const expected = sign(`${id}.${expires}`);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new RequestError("session", 401);
  return id;
}
export async function createSession() {
  try { return await sessionId(); } catch (error) { if (!(error instanceof RequestError) || error.status !== 401) throw error; }
  const id = randomUUID();
  const value = `${id}.${Date.now() + 24 * 60 * 60 * 1000}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 86400 });
  return id;
}
export async function rateLimit(request: Request, bucket: "session" | "lead" | "upload" | "ai", session?: string) {
  // Only trust an IP header set/overwritten by the deployment's reverse proxy.
  const header = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.TRUSTED_IP_HEADER;
  const ip = header ? request.headers.get(header)?.split(",")[0].trim().slice(0,100) : undefined;
  const keys = [sign(`ip:${ip || "unknown"}`), ...(session ? [sign(`session:${session}`)] : [])];
  for (const key of keys) {
    const result = await client().mutation(launchApi.consumeRate, { secret: secret(), key, bucket });
    if (!result.ok) throw new RequestError("rate", 429);
  }
}
export async function readJson(request: Request, max = 16000) {
  const bytes = await readBoundedBody(request, max);
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new RequestError("invalid"); }
}
export async function readBoundedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max) throw new RequestError("tooLarge", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("invalid");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > max) { await reader.cancel(); throw new RequestError("tooLarge", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}
export function errorResponse(error: unknown) {
  const known = error instanceof RequestError;
  return Response.json({ error: known ? error.code : "unavailable" }, { status: known ? error.status : 503, headers: PRIVATE_HEADERS });
}
