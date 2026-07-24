"use client";

import { ChevronRight } from "lucide-react";
import type { DriveStore } from "../_lib/useDriveStore";

const VIEW_LABELS: Record<string, string> = {
  recent: "Recent",
  starred: "Starred",
  trash: "Trash",
};

export function Breadcrumbs({ store }: { store: DriveStore }) {
  if (store.activeView !== "my-drive") {
    return (
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {VIEW_LABELS[store.activeView]}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-sm text-zinc-500">
      <button
        onClick={() => store.navigateToFolder(null)}
        className={`shrink-0 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          store.currentFolderId === null ? "font-medium text-zinc-900 dark:text-zinc-100" : ""
        }`}
      >
        My Drive
      </button>
      {store.breadcrumbs.map((folder, index) => (
        <span key={folder.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-4 w-4 shrink-0" />
          <button
            onClick={() => store.navigateToFolder(folder.id)}
            className={`truncate rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              index === store.breadcrumbs.length - 1
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : ""
            }`}
          >
            {folder.name}
          </button>
        </span>
      ))}
    </div>
  );
}
