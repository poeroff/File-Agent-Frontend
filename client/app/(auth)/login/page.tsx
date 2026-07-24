import type { Metadata } from "next";
import { LoginForm } from "@/app/_components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — File Agent Drive",
};

export default function LoginPage() {
  return <LoginForm />;
}
