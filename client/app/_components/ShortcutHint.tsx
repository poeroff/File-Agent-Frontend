"use client";

/**
 * The modifier label depends on the OS, which the server can't know — rendering
 * it there would either mismatch on hydration or need a post-mount state
 * update. TopBar loads this client-only (`ssr: false`) instead, so the label is
 * simply read from the browser during render.
 */
export default function ShortcutHint() {
  const modKey = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

  return (
    <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-chrome-line bg-chrome-fill px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-chrome-muted sm:block">
      {modKey} K
    </kbd>
  );
}
