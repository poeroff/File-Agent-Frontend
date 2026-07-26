"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, X } from "lucide-react";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { BrandMark, Wordmark } from "@/app/_components/shell/Brand";
import { ProfileMenu } from "@/app/_components/shell/ProfileMenu";

const ShortcutHint = dynamic(() => import("@/app/_components/shell/ShortcutHint"), {
  ssr: false,
});

export function TopBar({
  store,
  userEmail,
  aiOpen,
  onToggleAi,
}: {
  store: DriveStore;
  userEmail: string;
  aiOpen: boolean;
  onToggleAi: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘/Ctrl+K focuses search from anywhere in the app.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-chrome-line bg-chrome px-3 text-chrome-text sm:gap-4 sm:px-4">
      <div className="flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" />
        <Wordmark className="hidden text-chrome-text/90 sm:inline" />
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chrome-muted" />
        <input
          ref={inputRef}
          value={store.searchQuery}
          onChange={(event) => store.setSearchQuery(event.target.value)}
          placeholder="파일 및 폴더 검색"
          aria-label="파일 및 폴더 검색"
          className="h-9 w-full rounded-lg border border-chrome-line bg-chrome-raised pl-9 pr-16 text-sm text-chrome-text placeholder:text-chrome-muted/80 outline-none transition focus:border-accent-bright/60 focus:ring-2 focus:ring-accent-bright/25"
        />
        {store.searchQuery ? (
          <button
            onClick={() => {
              store.setSearchQuery("");
              inputRef.current?.focus();
            }}
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ShortcutHint />
        )}
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <button
          onClick={onToggleAi}
          aria-pressed={aiOpen}
          aria-label="AI 도우미 패널"
          title="AI 도우미 패널"
          className={`hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition xl:flex ${
            aiOpen
              ? "bg-chrome-fill text-chrome-text"
              : "text-chrome-muted hover:bg-chrome-hover hover:text-chrome-text"
          }`}
        >
          {/* The assistant wears the same label chip files do. */}
          <span
            className={`rounded-[5px] px-1.5 py-px font-mono text-[10px] font-bold tracking-[0.08em] ${
              aiOpen ? "bg-accent text-white" : "bg-chrome-fill text-chrome-muted"
            }`}
          >
            AI
          </span>
          도우미
        </button>
        <ProfileMenu userEmail={userEmail} />
      </div>
    </header>
  );
}
