import { NextResponse } from "next/server";
import { backendToken } from "@/app/api/drive/_proxy";

// Streams a folder from the backend as a zip, straight through to the browser.
// Unlike single files (presigned, downloaded direct from S3) a zip has no
// object to presign, so this route relays the stream instead of returning a URL.
export async function GET(request: Request) {
  const token = await backendToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const res = await fetch(
    `${process.env.BACKEND_URL}/files/download-zip?key=${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? "attachment",
    },
  });
}
