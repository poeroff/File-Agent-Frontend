"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, Loader2, X } from "lucide-react";
import type { DriveItem } from "@/app/_lib/types";
import { getPreviewUrl } from "@/app/_lib/drive-api";

export function PreviewModal({
  item,
  onClose,
  onDownload,
}: {
  item: DriveItem;
  onClose: () => void;
  onDownload: () => void;
}) {
  // One piece of state, written only from the fetch's callbacks. The caller
  // remounts this component per item (key={item.id}), so there is nothing to
  // reset up front.
  const [result, setResult] = useState<{ url?: string; failed?: boolean }>({});

  useEffect(() => {
    let active = true;
    getPreviewUrl(item.id)
      .then((url) => {
        if (active) setResult({ url });
      })
      .catch(() => {
        if (active) setResult({ failed: true });
      });
    return () => {
      active = false;
    };
  }, [item.id]);

  // A full-bleed lightbox rather than the card dialog, so it uses the Radix
  // primitive directly (portal + focus trap + Escape/scroll-lock) with its own
  // black chrome. Clicking the letterboxing around the image still closes it.
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-fade-in fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {item.name}
          </DialogPrimitive.Title>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <span className="min-w-0 truncate text-sm">{item.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={onDownload}
                title="다운로드"
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <Download className="h-5 w-5" />
              </button>
              <DialogPrimitive.Close
                title="닫기"
                className="rounded-lg p-2 outline-none hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            {result.failed ? (
              <p className="text-sm text-white/70">
                미리보기를 불러오지 못했어요.
              </p>
            ) : !result.url ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/70" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a static asset
              <img
                src={result.url}
                alt={item.name}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
