"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function PromptDialog({
  title,
  label,
  initialValue = "",
  confirmLabel = "만들기",
  onConfirm,
  onClose,
}: {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
    onClose();
  }

  // Rendered into <body> so an ancestor transform can never become this
  // dialog's containing block (see ConfirmDialog).
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        onSubmit={handleSubmit}
        className="anim-pop-in w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-card-raised shadow-pop"
      >
        <div className="p-5">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          <label
            htmlFor="prompt-dialog-input"
            className="mt-4 block text-[13px] font-medium text-muted"
          >
            {label}
          </label>
          <input
            id="prompt-dialog-input"
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition focus:border-jade/60 focus:ring-2 focus:ring-jade/25"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-canvas-sunken hover:text-ink"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-lg bg-jade px-3.5 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] transition hover:bg-jade-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade disabled:cursor-not-allowed disabled:opacity-45"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
