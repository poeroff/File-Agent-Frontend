import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DriveApp } from "@/app/DriveApp";
import {
  s3ObjectsToItems,
  trashEntriesToItems,
  type S3Object,
  type TrashEntry,
} from "@/app/_lib/s3-to-items";
import type { DriveItem } from "@/app/_lib/types";

// Fetches the user's real S3 contents (live + trashed) from the backend. Runs
// on the server, so the backend access token stays out of the browser.
async function loadItems(token: string | undefined): Promise<DriveItem[]> {
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [liveRes, trashRes] = await Promise.all([
      fetch(`${process.env.BACKEND_URL}/files`, { headers, cache: "no-store" }),
      fetch(`${process.env.BACKEND_URL}/files/trash`, {
        headers,
        cache: "no-store",
      }),
    ]);
    const live = liveRes.ok
      ? s3ObjectsToItems((await liveRes.json()) as S3Object[], Date.now())
      : [];
    const trash = trashRes.ok
      ? trashEntriesToItems((await trashRes.json()) as TrashEntry[])
      : [];
    return [...live, ...trash];
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
