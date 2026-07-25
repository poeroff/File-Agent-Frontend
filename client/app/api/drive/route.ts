import { NextResponse } from "next/server";
import { backendToken } from "@/app/api/drive/_proxy";
import { s3ObjectsToItems, type S3Object } from "@/app/_lib/s3-to-items";

// Lists the signed-in user's drive contents. Reads the backend token from the
// server-side session so it never reaches the browser.
export async function GET() {
  const token = await backendToken();
  if (!token) return NextResponse.json([], { status: 401 });

  const res = await fetch(`${process.env.BACKEND_URL}/files`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json([], { status: res.status });

  const objects = (await res.json()) as S3Object[];
  return NextResponse.json(s3ObjectsToItems(objects, Date.now()));
}
