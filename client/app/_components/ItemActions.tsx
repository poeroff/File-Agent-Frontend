"use client";

import { Download, Link2, type LucideIcon } from "lucide-react";
import type { DriveItem } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";

/**
 * Share and download, out in the open next to the row instead of buried in the
 * overflow menu — they are the two things people came to do with a file. Only
 * files get them: folders can't be presigned or downloaded as one object, and
 * trashed items must be restored first.
 */
export function ItemActions({
  item,
  store,
  className = "",
}: {
  item: DriveItem;
  store: DriveStore;
  className?: string;
}) {
  if (item.type !== "file" || item.trashed) return null;

  return (
    <div className={`flex items-center ${className}`}>
      <ActionButton
        icon={Link2}
        label={`${item.name} 공유 링크 복사`}
        title="공유 링크 복사 (5분간 유효)"
        onClick={() => store.copyShareLink(item.id)}
      />
      <ActionButton
        icon={Download}
        label={`${item.name} 다운로드`}
        title="다운로드"
        onClick={() => store.downloadItem(item.id)}
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  title,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={title}
      className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-canvas-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
