import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Shared plumbing for the /api/drive/* route handlers: they all read the
// backend token from the server-side session (so it never reaches the
// browser) and forward the call to the NestJS backend.

export async function backendToken(): Promise<string | undefined> {
  const session = await auth();
  return session?.backendAccessToken;
}

/** Forwards a JSON POST to the backend and relays its response verbatim. */
export async function proxyPost(path: string, body?: unknown) {
  const token = await backendToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
