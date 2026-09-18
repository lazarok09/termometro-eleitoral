import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { localeFromCountry, routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

/**
 * Prefer an explicit locale cookie / URL prefix.
 * On first visit (no NEXT_LOCALE cookie), pick pt for BR/PT/AO/MZ via
 * Vercel geo headers, otherwise en. Locally geo is empty → Accept-Language.
 */
export default function proxy(request: NextRequest) {
  const hasLocaleCookie = request.cookies.has("NEXT_LOCALE");
  if (!hasLocaleCookie) {
    const country =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;
    if (country) {
      const locale = localeFromCountry(country);
      const headers = new Headers(request.headers);
      headers.set("accept-language", locale);
      return handleI18n(new NextRequest(request.url, { headers }));
    }
  }
  return handleI18n(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
