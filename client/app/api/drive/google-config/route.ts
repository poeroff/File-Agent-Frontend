import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Values the Google picker needs in the browser.
 *
 * Served from the server so the client id isn't duplicated into a second env
 * var (a NEXT_PUBLIC_ copy is where people paste the OAuth *secret* by
 * mistake), and so adding the API key doesn't require a rebuild. Both values
 * are public by design in this flow — the picker sends them from the browser —
 * but the route still requires a session so the project's config isn't handed
 * to anonymous callers.
 */
export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const clientId = process.env.AUTH_GOOGLE_ID ?? "";
  // Google client ids are "<projectNumber>-<random>.apps.googleusercontent.com",
  // and the picker needs that project number as its app id — without it Google
  // doesn't attach the picked-file grant to this app, and every later Drive call
  // for those files comes back 404.
  const projectNumber = /^(\d+)-/.exec(clientId)?.[1] ?? "";

  return NextResponse.json({
    clientId,
    apiKey: process.env.GOOGLE_API_KEY ?? "",
    appId: projectNumber,
  });
}
