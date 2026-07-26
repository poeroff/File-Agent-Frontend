"use client";

import { Check, Loader2, X, XCircle } from "lucide-react";
import type { DriveStore } from "@/app/_lib/useDriveStore";

export function ActivityTray({ store }: { store: DriveStore }) {
  if (store.activities.length === 0) return null;

  const running = store.activities.filter((a) => a.status === "running").length;

  return (
    <div className="anim-fade-up w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-chrome-line bg-chrome text-chrome-text shadow-pop">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[13px] font-medium text-chrome-text">작업</span>
        {running > 0 && (
          <span className="text-xs tabular-nums text-accent-bright">{running}개 진행 중</span>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto border-t border-chrome-line/70">
        {store.activities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-center gap-2.5 border-b border-chrome-line/70 px-4 py-2.5 last:border-0"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center">
              {activity.status === "done" ? (
                <Check className="h-4 w-4 text-accent-bright" />
              ) : activity.status === "error" ? (
                <XCircle className="h-4 w-4 text-danger" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-accent-bright" />
              )}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm">{activity.label}</p>
            {activity.status !== "running" && (
              <button
                onClick={() => store.dismissActivity(activity.id)}
                aria-label="알림 닫기"
                className="rounded-md p-1 text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
