import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/*
 * Next 16 renamed `middleware` to `proxy` — next-intl's handler has the
 * same (request) => response shape, so it plugs straight in. Redirects
 * `/` to `/ka` and negotiates the locale segment for every page route.
 */
const handleI18nRouting = createIntlMiddleware(routing);

export default function proxy(request: Parameters<typeof handleI18nRouting>[0]) {
  return handleI18nRouting(request);
}

export const config = {
  // Skip static assets, API routes, and metadata files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
