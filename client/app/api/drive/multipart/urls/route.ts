import { proxyPost } from "@/app/api/drive/_proxy";

export async function POST(request: Request) {
  return proxyPost("/files/multipart/urls", await request.json());
}
