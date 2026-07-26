"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Info, WifiOff } from "lucide-react";
import { BrandMark, Wordmark } from "@/app/_components/shell/Brand";
import { FileTile } from "@/app/_components/ui/FileIcon";

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
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-kraft/30 bg-kraft-soft px-3.5 py-3 text-[13px] text-kraft-text">
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

/**
 * The showcase half of the sign-in screen. It shows the product's own object —
 * a file list, exactly as it looks inside — rather than an abstract graphic, so
 * the first screen already explains what the app is. Nothing here animates.
 */
function ShowcasePanel() {
  return (
    <div className="relative hidden overflow-hidden bg-chrome p-12 text-chrome-text lg:flex lg:flex-col">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-transparent"
      />

      <div className="relative flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" />
        <Wordmark />
      </div>

      <div className="relative my-auto w-full max-w-[26rem]">
        <h1 className="break-keep text-[30px] font-semibold leading-[1.3] tracking-tight">
          올려둔 파일이
          <br />
          <span className="text-accent-bright">항상 제자리에</span> 있도록.
        </h1>
        <p className="mt-3.5 break-keep text-[15px] leading-relaxed text-chrome-muted">
          끌어다 놓아 업로드하고, 폴더로 정리하고, 이름으로 바로 찾으세요. 지운
          파일은 휴지통에서 되돌릴 수 있어요.
        </p>

        {/* A real slice of the app: the same rows, the same type, no mockup. */}
        <div className="mt-9 overflow-hidden rounded-xl border border-line bg-card shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px] text-muted">
            <span className="font-medium text-ink">내 드라이브</span>
            <span>3개</span>
          </div>
          <PreviewRow name="디자인 자료" meta="폴더" folder />
          <PreviewRow name="2026-예산안.pdf" meta="PDF · 2.4 MB" />
          <PreviewRow name="촬영-원본.mp4" meta="MP4 · 148 MB" last />
        </div>
      </div>

      <ul className="relative flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-chrome-muted">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          끌어다 놓기 업로드
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          폴더 통째로 업로드
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          휴지통에서 복원
        </li>
      </ul>
    </div>
  );
}

function PreviewRow({
  name,
  meta,
  folder,
  last,
}: {
  name: string;
  meta: string;
  folder?: boolean;
  last?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`flex items-center gap-3 px-4 py-2.5 ${last ? "" : "border-b border-line/60"}`}
    >
      <FileTile type={folder ? "folder" : "file"} name={name} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{name}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted">{meta}</span>
    </div>
  );
}

export function LoginForm() {
  function handleGoogleLogin() {
    signIn("google", { redirectTo: "/" });
  }

  return (
    <div className="grid min-h-dvh w-full bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <ShowcasePanel />

      <div className="flex items-center justify-center p-5 sm:p-8">
        {/* The form sits on a card so it reads as one focused task on the
            canvas, instead of floating text on an empty field. */}
        <div className="w-full max-w-[23rem] rounded-2xl border border-line bg-card p-6 shadow-card sm:p-7">
          <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
            <div className="flex items-center gap-2.5 lg:hidden">
              <BrandMark className="h-9 w-9" />
              <Wordmark className="text-ink" />
            </div>
            <div className="text-center lg:text-left">
              <h2 className="text-[22px] font-semibold tracking-tight">시작하기</h2>
              <p className="mt-1.5 break-keep text-sm text-muted">
                Google 계정으로 내 드라이브에 로그인하세요.
              </p>
            </div>
          </div>

          <Suspense fallback={null}>
            <LoginError />
          </Suspense>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-card text-sm font-medium transition hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <GoogleIcon />
            Google 계정으로 계속하기
          </button>

          {/* Signing in with Google *is* signing up: the backend creates the
              account and provisions its storage on the first sign-in. */}
          <p className="mt-4 break-keep text-[13px] leading-relaxed text-muted">
            처음이신가요? Google 계정으로 로그인하면 계정과 저장 공간이 자동으로
            만들어져요.
          </p>

          <p className="mt-6 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-3 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
            <span className="break-keep">
              이메일·비밀번호 로그인은 아직 준비 중이에요. 지금은 Google 로그인만
              사용할 수 있어요.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
