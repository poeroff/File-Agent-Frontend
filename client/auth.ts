import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";

// Docker Desktop's network path to Google occasionally hangs on connect
// (~10s) even though Google itself answers in <250ms. Cap each attempt at a
// few seconds so a stalled connect fails fast and we retry, instead of the
// default connect timeout (~10s) blowing up the whole sign-in to 10-20s.
const PER_ATTEMPT_TIMEOUT_MS = 5000;

async function fetchWithRetry(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const timeout = AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    try {
      return await fetch(input, { ...init, signal });
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(
        `[auth] Google request failed (attempt ${attempt}/${attempts}), retrying...`,
        error,
      );
    }
  }
  throw new Error("unreachable");
}

// The backend mints its own JWT with its own lifetime (7d), independent of
// this session cookie. Without this check the cookie outlives that token: the
// user still looks signed in while every backend call 401s. Reading the
// token's own `exp` keeps the two in sync, with no second copy to drift.
function backendTokenExpired(jwt: string): boolean {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp !== "number" || exp * 1000 <= Date.now();
  } catch {
    return true; // an unreadable token is as dead as an expired one
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // Google's OIDC endpoints are stable, so hardcoding them skips the
      // live `.well-known/openid-configuration` discovery fetch on every
      // sign-in — one less network call that can time out from inside Docker.
      authorization: "https://accounts.google.com/o/oauth2/v2/auth",
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      jwks_endpoint: "https://www.googleapis.com/oauth2/v3/certs",
      [customFetch]: fetchWithRetry,
    }),
  ],
  trustHost: true,
  // Send NextAuth's own error redirects (failed OAuth/network issues) to
  // our login page instead of the default NextAuth error page.
  pages: {
    error: "/login",
  },
  // NextAuth itself owns no user data — it only brokers the Google OAuth
  // handshake. NestJS is the source of truth for users, so on every
  // successful sign-in we hand the verified profile off to it and store
  // the token *it* issues, instead of persisting anything here.
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      // Keep the cookie name aligned with what proxy.ts already checks.
      name: "session",
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // `account`/`profile` are only populated right after a successful
      // sign-in (not on later requests that just reuse the session).
      if (account && profile) {
        try {
          const response = await fetch(`${process.env.BACKEND_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              providerAccountId: profile.sub,
              email: profile.email,
              name: profile.name,
              image: profile.picture,
            }),
          });

          if (!response.ok) {
            console.error("[auth] Backend rejected the sign-in:", await response.text());
            // Throwing (instead of returning null) routes this through the
            // same NextAuth error redirect as a failed Google request, so
            // the login page can show one consistent error message.
            throw new Error("Backend rejected the sign-in");
          }

          const { accessToken } = (await response.json()) as { accessToken: string };
          token.backendAccessToken = accessToken;
        } catch (error) {
          console.error("[auth] Failed to reach backend:", error);
          throw error instanceof Error ? error : new Error("Failed to reach backend");
        }
      }
      // Returning null invalidates the session, so the next request is sent to
      // /login and signs in again — the only way to get a fresh backend token,
      // since the block above only runs on a real sign-in.
      const backendToken = token.backendAccessToken as string | undefined;
      if (!backendToken || backendTokenExpired(backendToken)) return null;
      return token;
    },
    async session({ session, token }) {
      session.backendAccessToken = token.backendAccessToken as string | undefined;
      return session;
    },
  },
});
