import { proxyPost } from "@/app/api/drive/_proxy";

// Returns a presigned S3 PUT URL for the browser to upload a file directly.
export async function POST(request: Request) {
  return proxyPost("/files/upload-url", await request.json());
}
