import { NextResponse } from "next/server";
import { backendToken } from "@/app/api/drive/_proxy";

// Returns a short-lived presigned S3 URL for the requested file. The browser
// then downloads straight from S3 (nothing large passes through our servers).
export async function GET(request: Request) {
  const token = await backendToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const key = params.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  const inline = params.get("inline") === "1" ? "&inline=1" : "";

  const res = await fetch(
    `${process.env.BACKEND_URL}/files/download?key=${encodeURIComponent(key)}${inline}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
