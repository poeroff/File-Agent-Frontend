import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require a session at all, including NextAuth's own
// OAuth handshake endpoints (blocking these would make it impossible to log in).
const AUTH_FREE_PATHS = ["/login", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthFree = AUTH_FREE_PATHS.some((path) => pathname.startsWith(path));
  // Cookie *presence* only. The proxy can't tell a valid NextAuth JWT from a
  // stale or malformed one, so it never sends a cookie-holder away from
  // /login — otherwise a bad cookie locks the user out of both pages (/ can't
  // authenticate them, /login bounces them back to /). The login page itself
  // does the real check via auth() and redirects when the session is valid.
  const hasSessionCookie = Boolean(request.cookies.get("session")?.value);

  if (!hasSessionCookie && !isAuthFree) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Uploads now go straight from the browser to S3 via a presigned PUT URL, so
  // no large request body passes through here anymore.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
