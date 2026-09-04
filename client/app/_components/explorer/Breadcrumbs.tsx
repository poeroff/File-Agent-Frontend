"use client";

import { ChevronRight } from "lucide-react";

import type { ActiveView } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";

const VIEW_LABELS: Record<Exclude<ActiveView, "my-drive">, string> = {
  recent: "최근 항목",
  starred: "중요",
  trash: "휴지통",
};

/** Plain breadcrumb trail — chevrons, because that is what people read as "inside". */
export function Breadcrumbs({ store }: { store: DriveStore }) {
  if (store.activeView !== "my-drive") {
    return (
      <h1 className="truncate text-[17px] font-semibold tracking-tight">
        {VIEW_LABELS[store.activeView]}
      </h1>
    );
  }

  const atRoot = store.currentFolderId === null;

  return (
    <nav aria-label="위치" className="flex min-w-0 items-center text-[15px]">
      <Crumb
        label={store.driveLabel}
        current={atRoot}
        onClick={() => store.navigateToFolder(null)}
      />
      {store.breadcrumbs.map((folder, index) => (
        <span key={folder.id} className="flex min-w-0 items-center">
          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-faint" />
          <Crumb
            label={folder.name}
            current={index === store.breadcrumbs.length - 1}
            onClick={() => store.navigateToFolder(folder.id)}
          />
        </span>
      ))}
    </nav>
  );
}

function Crumb({
  label,
  current,
  onClick,
}: {
  label: string;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`max-w-[13rem] shrink-0 truncate rounded-md px-1.5 py-1 transition hover:bg-canvas-sunken focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        current ? "font-semibold tracking-tight text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
