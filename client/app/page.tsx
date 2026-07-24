import { auth } from "@/auth";
import { DriveApp } from "@/app/DriveApp";

export default async function Home() {
  const session = await auth();

  return <DriveApp userEmail={session?.user?.email ?? ""} />;
}
