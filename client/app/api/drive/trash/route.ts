import { NextResponse } from "next/server";
import { backendToken, proxyPost } from "@/app/api/drive/_proxy";
import { trashEntriesToItems, type TrashEntry } from "@/app/_lib/s3-to-items";

// List trash entries (as trashed DriveItems).
export async function GET(request: Request) {
  const token = await backendToken();
  if (!token) return NextResponse.json([], { status: 401 });

  const drive = new URL(request.url).searchParams.get("drive");
  const res = await fetch(
    `${process.env.BACKEND_URL}/files/trash${drive === "shared" ? "?drive=shared" : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) return NextResponse.json([], { status: res.status });

  const entries = (await res.json()) as TrashEntry[];
  return NextResponse.json(trashEntriesToItems(entries));
}

// Move the given paths into the trash.
export async function POST(request: Request) {
  return proxyPost("/files/trash", await request.json());
}
