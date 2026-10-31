import { checkOrigin, client, errorResponse, launchApi, PRIVATE_HEADERS, rateLimit, readJson, RequestError, secret, sessionId } from "@/lib/lead-server";
import { cleanAttribution, MAX_FILES, UUID, validateBrief } from "@/lib/project-request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const session = await sessionId();
    const body = await readJson(request);
    if (!body || typeof body !== "object" || body.website || !UUID.test(body.requestId || "")) throw new RequestError("invalid");
    const { brief, errors } = validateBrief(body.brief);
    if (errors.length) return Response.json({ error: "validation", fields: errors }, { status: 400, headers: PRIVATE_HEADERS });
    if (!["ka","en","ru"].includes(body.locale) || !Array.isArray(body.attachmentIds) || body.attachmentIds.length > MAX_FILES || body.attachmentIds.some((id: unknown) => typeof id !== "string" || !UUID.test(id))) throw new RequestError("invalid");
    await rateLimit(request, "lead", session);
    const saved = await client().mutation(launchApi.submit, {
      secret: secret(), sessionId: session, requestId: body.requestId,
      lead: { ...brief, locale: body.locale, firstAttribution: cleanAttribution(body.firstAttribution), latestAttribution: cleanAttribution(body.latestAttribution) },
      attachmentIds: body.attachmentIds,
    });
    return Response.json(saved, { headers: PRIVATE_HEADERS });
  } catch (error) { return errorResponse(error); }
}
