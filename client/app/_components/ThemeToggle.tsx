"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_EVENT = "themechange";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function readTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  // Reads from the DOM (set before paint by the inline script in layout.tsx);
  // the server snapshot is a stable "light" so hydration doesn't mismatch.
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => "light",
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore (private mode, etc.)
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={theme === "dark" ? "라이트 모드" : "다크 모드"}
      className="grid h-8 w-8 place-items-center rounded-lg text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-text"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
