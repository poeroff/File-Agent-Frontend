import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";

// Docker Desktop's network path to Google occasionally hangs on connect
// (UND_ERR_CONNECT_TIMEOUT) even though the endpoint is fine — retry a
// couple of times before giving up instead of failing the whole sign-in.
async function fetchWithRetry(
  ...args: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(...args);
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`[auth] Google request failed (attempt ${attempt}/${attempts}), retrying...`, error);
    }
  }
  throw new Error("unreachable");
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
        console.log("[auth] Google sign-in tokens:", account);
        console.log("[auth] Google profile:", profile);

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
      return token;
    },
    async session({ session, token }) {
      session.backendAccessToken = token.backendAccessToken as string | undefined;
      return session;
    },
  },
});
