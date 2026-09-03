import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DriveApp } from "@/app/DriveApp";
import { s3ObjectsToItems, type S3Object } from "@/app/_lib/s3-to-items";
import type { DriveItem } from "@/app/_lib/types";

// Fetches the user's live S3 contents from the backend. Runs on the server, so
// the backend access token stays out of the browser. Trash is deliberately left
// out — it's loaded lazily on the client the first time the Trash view is
// opened, so the home screen isn't slowed down fetching data nobody's looking
// at yet.
async function loadItems(token: string | undefined): Promise<DriveItem[]> {
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/files`, {
      headers,
      cache: "no-store",
    });
    return res.ok
      ? s3ObjectsToItems((await res.json()) as S3Object[], Date.now())
      : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const session = await auth();
  // No usable session (expired, or a stale `session` cookie the proxy waved
  // through) — send them to sign in instead of rendering an empty drive whose
  // every action would fail with a 401.
  if (!session?.user) redirect("/login");

  const items = await loadItems(session.backendAccessToken);

  return (
    <DriveApp userEmail={session.user.email ?? ""} initialItems={items} />
  );
}
