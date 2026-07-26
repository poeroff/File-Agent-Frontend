import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/_components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — File Agent Drive",
};

export default async function LoginPage() {
  // The real session check lives here, not in the proxy, which can only see
  // that *some* session cookie exists. A signed-in visitor goes straight to the
  // drive; anyone holding a stale cookie still gets a usable sign-in screen.
  const session = await auth();
  if (session?.user) redirect("/");

  return <LoginForm />;
}
