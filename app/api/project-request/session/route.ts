import { checkOrigin, createSession, errorResponse, PRIVATE_HEADERS, rateLimit } from "@/lib/lead-server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit(request, "session");
    await createSession();
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) { return errorResponse(error); }
}
