"use client";

import { useMemo } from "react";
import { formatBytes } from "@/app/_lib/format";
import {
  CATEGORY_ORDER,
  CATEGORY_STYLES,
  categoryOf,
  type FileCategory,
} from "@/app/_lib/file-icon";
import { STORAGE_QUOTA_BYTES } from "@/app/_lib/storage";
import type { DriveItem } from "@/app/_lib/types";

/**
 * The rail's signature element: capacity read as a tape gauge. Instead of one
 * anonymous blue bar, the used portion is split by file category, so the
 * question people actually have — "what is eating my space?" — is answered
 * without opening anything.
 */
export function StorageMeter({ items }: { items: DriveItem[] }) {
  const { total, slices } = useMemo(() => {
    const sums = new Map<FileCategory, number>();
    let total = 0;
    for (const item of items) {
      if (item.type !== "file" || item.trashed) continue;
      const bytes = item.size ?? 0;
      const category = categoryOf(item.name);
      sums.set(category, (sums.get(category) ?? 0) + bytes);
      total += bytes;
    }
    const slices = CATEGORY_ORDER.filter((c) => (sums.get(c) ?? 0) > 0)
      .map((category) => ({ category, bytes: sums.get(category) ?? 0 }))
      .sort((a, b) => b.bytes - a.bytes);
    return { total, slices };
  }, [items]);

  const usedRatio = Math.min(1, total / STORAGE_QUOTA_BYTES);
  const percentLabel = total === 0 ? "0%" : `${Math.max(1, Math.round(usedRatio * 100))}%`;

  return (
    <div className="rounded-xl border border-chrome-line bg-chrome-raised/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-chrome-text">저장 용량</span>
        <span className="text-[13px] tabular-nums text-chrome-muted">{percentLabel}</span>
      </div>

      {/* Gauge: category slices, then hairline ticks at each quarter. */}
      <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-chrome-fill">
        <div className="flex h-full">
          {slices.map(({ category, bytes }) => (
            <div
              key={category}
              className="h-full"
              style={{
                backgroundColor: CATEGORY_STYLES[category].color,
                width: `${(bytes / STORAGE_QUOTA_BYTES) * 100}%`,
                minWidth: bytes > 0 ? "3px" : undefined,
              }}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex justify-around"
        >
          <span className="w-px bg-chrome/70" />
          <span className="w-px bg-chrome/70" />
          <span className="w-px bg-chrome/70" />
        </div>
      </div>

      <p className="mt-2">
        <span className="text-[15px] font-semibold tabular-nums text-chrome-text">
          {formatBytes(total)}
        </span>
        <span className="text-[13px] tabular-nums text-chrome-muted">
          {" "}
          / {formatBytes(STORAGE_QUOTA_BYTES)} 사용
        </span>
      </p>

      {slices.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-chrome-line pt-2.5">
          {slices.slice(0, 3).map(({ category, bytes }) => (
            <li
              key={category}
              className="flex items-center gap-2 text-xs text-chrome-muted"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_STYLES[category].color }}
              />
              <span className="flex-1 truncate">{CATEGORY_STYLES[category].label}</span>
              <span className="tabular-nums text-chrome-text/85">
                {formatBytes(bytes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
