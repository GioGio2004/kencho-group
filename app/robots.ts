import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/*
 * Everything is open, and the AI crawlers are named explicitly.
 *
 * The wildcard rule already allows them — naming them is a statement,
 * not a mechanism: it survives a future tightening of the wildcard, and
 * it reads as an invitation to the answer engines (ChatGPT, Claude,
 * Perplexity, Google AI) that increasingly are how a "custom furniture
 * tbilisi" question gets answered.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Bingbot",
  "Googlebot",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
