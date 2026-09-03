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
import { FileTile } from "@/app/_components/ui/FileIcon";
import { Progress } from "@/app/_components/ui/progress";
import { cn } from "@/lib/utils";

// Shown while an upload is still being set up — presigned PUT/multipart can't
// report progress mid-request, so a large file sits at 0% until its first chunk
// lands. A sweeping segment makes that wait read as "working", not frozen.
function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-chrome-fill",
        className,
      )}
    >
      <span className="anim-indeterminate absolute inset-y-0 left-0 w-1/4 rounded-full bg-accent-bright" />
    </div>
  );
}

export function UploadTray({ store }: { store: DriveStore }) {
  if (store.uploads.length === 0) return null;

  const uploading = store.uploads.filter((task) => task.status === "uploading");
  const failedCount = store.uploads.filter((task) => task.status === "error").length;
  // Weight each file's progress by its size so the overall bar reflects real
  // bytes transferred — a tiny file finishing shouldn't jump the whole batch.
  const totalBytes = store.uploads.reduce((sum, task) => sum + task.size, 0);
  const overall =
    totalBytes === 0
      ? Math.round(
          store.uploads.reduce((sum, task) => sum + task.progress, 0) /
            store.uploads.length,
        )
      : Math.round(
          store.uploads.reduce(
            (sum, task) => sum + task.size * task.progress,
            0,
          ) / totalBytes,
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
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-bright" />
        ) : failedCount > 0 ? (
          <XCircle className="h-4 w-4 shrink-0 text-danger" />
        ) : (
          <Check className="h-4 w-4 shrink-0 text-accent-bright" />
        )}
        <span className="flex-1 truncate text-sm font-medium">{header}</span>
        <span className="text-[13px] font-semibold tabular-nums text-chrome-text">
          {uploading.length > 0 && overall === 0 ? "준비 중" : `${overall}%`}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[13px] text-chrome-muted">
          {store.uploadTrayCollapsed ? "자세히 보기" : "접기"}
          {store.uploadTrayCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Aggregate progress: one hairline so the tray reads at a glance while
          collapsed. Sweeps until the first bytes land, so it never looks stuck. */}
      {uploading.length > 0 && overall === 0 ? (
        <IndeterminateBar className="h-0.5 rounded-none" />
      ) : (
        <Progress
          value={overall}
          className="h-0.5 rounded-none"
          indicatorClassName="rounded-none"
        />
      )}

      {/* Cancel the whole batch while anything is still transferring. */}
      {uploading.length > 0 && (
        <button
          onClick={store.cancelUploads}
          className="flex w-full items-center justify-center gap-1.5 border-b border-chrome-line/70 py-2 text-[13px] font-medium text-danger-text transition hover:bg-danger-soft"
        >
          <X className="h-3.5 w-3.5" />
          전체 업로드 취소
        </button>
      )}

      {!store.uploadTrayCollapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {store.uploads.map((task) => {
            const isError = task.status === "error";
            const isDone = task.status === "done";
            // No measurable progress yet (setup / first chunk in flight).
            const preparing = task.status === "uploading" && task.progress === 0;
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
                        {isDone
                          ? formatBytes(task.size)
                          : preparing
                            ? "준비 중"
                            : `${task.progress}%`}
                      </span>
                    )}
                  </div>
                  {isError ? (
                    <p className="mt-0.5 text-xs text-danger-text">
                      {task.error ?? "업로드에 실패했어요"}
                    </p>
                  ) : preparing ? (
                    <IndeterminateBar className="mt-1.5 h-1" />
                  ) : (
                    <Progress
                      value={task.progress}
                      className="mt-1.5 h-1"
                      indicatorClassName={isDone ? "bg-accent-bright/70" : "bg-accent-bright"}
                    >
                      {!isDone && (
                        <span
                          aria-hidden
                          className="anim-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                        />
                      )}
                    </Progress>
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
