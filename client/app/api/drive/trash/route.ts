import { NextResponse } from "next/server";
import { backendToken, proxyPost } from "@/app/api/drive/_proxy";
import { trashEntriesToItems, type TrashEntry } from "@/app/_lib/s3-to-items";

// List trash entries (as trashed DriveItems).
export async function GET() {
  const token = await backendToken();
  if (!token) return NextResponse.json([], { status: 401 });

  const res = await fetch(`${process.env.BACKEND_URL}/files/trash`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json([], { status: res.status });

  const entries = (await res.json()) as TrashEntry[];
  return NextResponse.json(trashEntriesToItems(entries));
}

// Move the given paths into the trash.
export async function POST(request: Request) {
  return proxyPost("/files/trash", await request.json());
}
