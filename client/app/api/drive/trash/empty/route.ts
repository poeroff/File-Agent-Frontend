import { proxyPost } from "@/app/api/drive/_proxy";

export async function POST() {
  return proxyPost("/files/trash/empty");
}
