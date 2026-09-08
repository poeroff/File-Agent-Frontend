import { proxyPost } from "@/app/api/drive/_proxy";

// Every JSON POST under /api/drive/* is the same one-line forward to the
// backend's /files/* — one catch-all replaces a route file per endpoint.
// Static sibling routes (GET drive/trash/download, POST trash) take
// precedence over this handler.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyPost(
    `/files/${path.join("/")}`,
    await request.json().catch(() => undefined),
  );
}
