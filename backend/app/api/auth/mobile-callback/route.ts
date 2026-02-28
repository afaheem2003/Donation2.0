import { NextRequest, NextResponse } from "next/server";

// After NextAuth completes OAuth it redirects here.
// We read the session cookie it just set and forward it in the
// query string so the Expo app can persist it in SecureStore.
export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get("redirect");

  if (
    redirect &&
    (redirect.startsWith("exp://") || redirect.startsWith("givestream://"))
  ) {
    const sessionCookie =
      req.cookies.get("__Secure-authjs.session-token") ??
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-next-auth.session-token") ??
      req.cookies.get("next-auth.session-token");

    let target = redirect;
    if (sessionCookie?.value) {
      target += `?token=${encodeURIComponent(sessionCookie.value)}`;
    }

    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL("/", req.url));
}
