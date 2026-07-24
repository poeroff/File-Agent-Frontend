import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require a session at all, including NextAuth's own
// OAuth handshake endpoints (blocking these would make it impossible to log in).
const AUTH_FREE_PATHS = ["/login", "/api/auth"];
// Of those, the ones an already-signed-in user should be bounced away from.
const REDIRECT_IF_AUTHED_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthFree = AUTH_FREE_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = Boolean(request.cookies.get("session")?.value);

  if (!hasSession && !isAuthFree) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && REDIRECT_IF_AUTHED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
