"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { HardDrive, WifiOff } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  // In this app, NextAuth collapses most sign-in failures (Google or our own
  // backend being briefly unreachable) into this generic code.
  Configuration: "네트워크 문제로 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
  AccessDenied: "구글 로그인 권한이 거부됐어요.",
};

function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  const message = ERROR_MESSAGES[error] ?? "로그인 중 문제가 발생했어요. 다시 시도해 주세요.";

  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.2-17.1 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.6 27 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.9 39.6 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.4 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // TODO: replace with a real call to the backend login endpoint.
    // For now this just drops a placeholder session cookie so proxy.ts has something to check.
    document.cookie = `session=${encodeURIComponent(email)}; path=/`;
    router.push("/");
  }

  function handleGoogleLogin() {
    signIn("google", { redirectTo: "/" });
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <HardDrive className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Sign in to Drive</h1>
          <p className="text-sm text-zinc-500">Manage your files in one place</p>
        </div>

        <Suspense fallback={null}>
          <LoginError />
        </Suspense>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <a href="#" className="font-medium text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
