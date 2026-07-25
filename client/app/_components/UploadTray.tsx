"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { formatBytes } from "@/app/_lib/format";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { FileTile } from "@/app/_components/FileIcon";

export function UploadTray({ store }: { store: DriveStore }) {
  if (store.uploads.length === 0) return null;

  const uploading = store.uploads.filter((task) => task.status === "uploading");
  const failedCount = store.uploads.filter((task) => task.status === "error").length;
  const overall = Math.round(
    store.uploads.reduce((sum, task) => sum + task.progress, 0) /
      store.uploads.length,
  );

  const header =
    uploading.length > 0
      ? `${uploading.length}개 업로드 중`
      : failedCount > 0
        ? `${failedCount}개 업로드 실패`
        : "업로드 완료";

  return (
    <div className="anim-fade-up w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-chrome-line bg-chrome text-chrome-text shadow-pop">
      <button
        onClick={() => store.setUploadTrayCollapsed(!store.uploadTrayCollapsed)}
        aria-expanded={!store.uploadTrayCollapsed}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-chrome-hover"
      >
        {uploading.length > 0 ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-jade" />
        ) : failedCount > 0 ? (
          <XCircle className="h-4 w-4 shrink-0 text-danger" />
        ) : (
          <Check className="h-4 w-4 shrink-0 text-jade" />
        )}
        <span className="flex-1 truncate text-sm font-medium">{header}</span>
        <span className="text-[13px] tabular-nums text-chrome-muted">
          {overall}%
        </span>
        {store.uploadTrayCollapsed ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-chrome-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-chrome-muted" />
        )}
      </button>

      {/* Aggregate progress: one hairline so the tray reads at a glance while collapsed. */}
      <div className="h-0.5 bg-chrome-fill">
        <div
          className="h-full bg-jade transition-[width] duration-300"
          style={{ width: `${overall}%` }}
        />
      </div>

      {!store.uploadTrayCollapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {store.uploads.map((task) => {
            const isError = task.status === "error";
            const isDone = task.status === "done";
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 border-b border-chrome-line/70 px-3 py-2.5 last:border-0"
              >
                <FileTile type="file" name={task.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm">{task.name}</p>
                    {!isError && (
                      <span className="shrink-0 text-xs tabular-nums text-chrome-muted">
                        {isDone ? formatBytes(task.size) : `${task.progress}%`}
                      </span>
                    )}
                  </div>
                  {isError ? (
                    <p className="mt-0.5 text-xs text-danger-text">
                      {task.error ?? "업로드에 실패했어요"}
                    </p>
                  ) : (
                    <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-chrome-fill">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${
                          isDone ? "bg-jade/70" : "bg-jade"
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                      {!isDone && (
                        <span
                          aria-hidden
                          className="anim-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                        />
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => store.dismissUpload(task.id)}
                  aria-label={`${task.name} 목록에서 지우기`}
                  className="rounded-md p-1 text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
