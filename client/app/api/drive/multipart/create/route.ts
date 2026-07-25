import { proxyPost } from "@/app/api/drive/_proxy";

export async function POST(request: Request) {
  return proxyPost("/files/multipart/create", await request.json());
}
