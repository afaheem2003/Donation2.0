import { NextRequest, NextResponse } from "next/server";

// After NextAuth completes OAuth it redirects here.
// We read the session cookie it just set and forward it in the
// query string so the Expo app can persist it in SecureStore.
export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get("redirect");

  // Only allow the exact registered production deep link scheme.
  // exp:// is the Expo Go dev scheme — only permitted outside production.
  const isValidRedirect =
    redirect &&
    (redirect.startsWith("givestream://auth/callback") ||
      (process.env.NODE_ENV !== "production" && redirect.startsWith("exp://")));

  if (isValidRedirect) {
    const sessionCookie =
      req.cookies.get("__Secure-authjs.session-token") ??
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-next-auth.session-token") ??
      req.cookies.get("next-auth.session-token");

    let target = redirect;
    if (sessionCookie?.value) {
      // Use a URL fragment (#) instead of a query param so the token is never
      // sent to any server, never stored in HTTP access logs, and not forwarded
      // by OS redirect handling. The Expo app reads it from the deep link hash.
      target += `#token=${encodeURIComponent(sessionCookie.value)}`;
    }

    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL("/", req.url));
}
