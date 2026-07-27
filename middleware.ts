import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";

const intlMiddleware = createIntlMiddleware({
  locales: SUPPORTED_LOCALES as unknown as string[],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  try {
    // 1. Resolve locale first — may return a redirect for bare paths or
    //    unsupported locale segments.
    const intlResponse = intlMiddleware(request);
    if (intlResponse.headers.get("location")) {
      return intlResponse;
    }

    // 2. Refresh Supabase auth on the response from the i18n middleware so
    //    cookies and rewrites set by next-intl are preserved.
    let response = intlResponse;

    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          const refreshed = NextResponse.next({ request });
          // Carry over cookies set by intl middleware.
          for (const c of intlResponse.cookies.getAll()) {
            refreshed.cookies.set(c.name, c.value);
          }
          for (const { name, value, options } of toSet) {
            refreshed.cookies.set(name, value, options);
          }
          response = refreshed;
        },
      },
    });

    // Touch the session so it refreshes if needed.
    try {
      await supabase.auth.getUser();
    } catch {
      // Auth refresh can fail (e.g. Supabase down, network issue) — don't let
      // that crash every page render.
    }
    return response;
  } catch {
    // Middleware itself should never crash; if it does, let the request pass
    // through so the page can still render.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth|flags|venues|messages|.*\\.).*)"],
};
