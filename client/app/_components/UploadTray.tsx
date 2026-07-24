"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { formatBytes } from "../_lib/format";
import type { DriveStore } from "../_lib/useDriveStore";

export function UploadTray({ store }: { store: DriveStore }) {
  if (store.uploads.length === 0) return null;

  const uploadingCount = store.uploads.filter((task) => task.status === "uploading").length;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      <button
        onClick={() => store.setUploadTrayCollapsed(!store.uploadTrayCollapsed)}
        className="flex w-full items-center justify-between bg-zinc-800 px-4 py-3 text-sm font-medium text-white dark:bg-zinc-950"
      >
        <span>
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} item${uploadingCount > 1 ? "s" : ""}`
            : "Uploads complete"}
        </span>
        {store.uploadTrayCollapsed ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {!store.uploadTrayCollapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {store.uploads.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                {task.status === "done" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{task.name}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      task.status === "done" ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{formatBytes(task.size)}</p>
              </div>
              <button
                onClick={() => store.dismissUpload(task.id)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
