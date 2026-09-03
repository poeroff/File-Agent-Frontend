import { NextResponse } from "next/server";
import { backendToken } from "@/app/api/drive/_proxy";

/** NAS disk capacity behind MinIO: { totalBytes, usedBytes, freeBytes }. */
export async function GET() {
  const token = await backendToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${process.env.BACKEND_URL}/storage/usage`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
