import { proxyPost } from "@/app/api/drive/_proxy";

// The Google access token rides in the body: it never touches the URL (which
// would end up in logs) and it is not persisted anywhere on the way through.
export async function POST(request: Request) {
  return proxyPost("/files/import/gdrive", await request.json());
}
