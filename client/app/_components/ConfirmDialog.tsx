"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "삭제",
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Rendered into <body>. A dialog opened from inside a grid card would
  // otherwise take that card as its containing block — cards carry a transform
  // while hovered — and `fixed inset-0` would shrink to the card's box.
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
      <div className="anim-pop-in w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card-raised shadow-pop">
        <div className="flex items-start gap-3.5 p-5">
          <div
            className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              destructive
                ? "bg-danger-soft text-danger-text"
                : "bg-jade-soft text-jade-text"
            }`}
          >
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <p className="mt-1.5 break-keep text-[13px] leading-relaxed text-muted">
              {message.split(/(?<=\.)\s+/).map((sentence, index) => (
                <span key={index} className="block">
                  {sentence}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-canvas-sunken hover:text-ink"
          >
            취소
          </button>
          <button
            autoFocus
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e] transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
              destructive
                ? "bg-danger outline-danger hover:brightness-110"
                : "bg-jade outline-jade hover:bg-jade-strong"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
