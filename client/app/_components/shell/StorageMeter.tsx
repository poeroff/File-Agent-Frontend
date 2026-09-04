"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/app/_lib/format";
import {
  CATEGORY_ORDER,
  CATEGORY_STYLES,
  categoryOf,
  type FileCategory,
} from "@/app/_lib/file-icon";
import type { DriveItem } from "@/app/_lib/types";

interface DiskUsage {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

/**
 * The rail's signature element: capacity read as a tape gauge. The scale is
 * the real NAS disk (no per-user quota): my files show as category slices,
 * the rest of the disk's used space as a neutral slice, so both "what is
 * eating my space?" and "how much disk is left?" are answered at a glance.
 */
export function StorageMeter({ items }: { items: DriveItem[] }) {
  const [usage, setUsage] = useState<DiskUsage | null>(null);

  // Re-fetched when the drive contents change, so the gauge tracks uploads.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/drive/storage-usage", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<DiskUsage>) : null))
      .then((data) => {
        if (!cancelled && data && data.totalBytes > 0) setUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  const { total: myTotal, slices } = useMemo(() => {
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

  // Without a usage response (old backend, request failed) fall back to just
  // my files, scaled to themselves.
  const scale = usage?.totalBytes ?? Math.max(myTotal, 1);
  const otherUsed = usage ? Math.max(0, usage.usedBytes - myTotal) : 0;
  const usedBytes = usage ? usage.usedBytes : myTotal;
  const usedRatio = Math.min(1, usedBytes / scale);
  const percentLabel =
    usedBytes === 0 ? "0%" : `${Math.max(1, Math.round(usedRatio * 100))}%`;

  return (
    <div className="rounded-xl border border-chrome-line bg-chrome-raised/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-chrome-text">
          NAS 저장 용량
        </span>
        <span className="text-[13px] tabular-nums text-chrome-muted">
          {percentLabel}
        </span>
      </div>

      {/* Gauge: my files by category, the disk's other data in neutral grey,
          then hairline ticks at each quarter. */}
      <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-chrome-fill">
        <div className="flex h-full">
          {slices.map(({ category, bytes }) => (
            <div
              key={category}
              className="h-full"
              style={{
                backgroundColor: CATEGORY_STYLES[category].color,
                width: `${(bytes / scale) * 100}%`,
                minWidth: bytes > 0 ? "3px" : undefined,
              }}
            />
          ))}
          {otherUsed > 0 && (
            <div
              className="h-full bg-accent/80"
              style={{ width: `${(otherUsed / scale) * 100}%` }}
            />
          )}
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
          {formatBytes(usedBytes)}
        </span>
        {usage && (
          <span className="text-[13px] tabular-nums text-chrome-muted">
            {" "}
            / {formatBytes(usage.totalBytes)} 사용
          </span>
        )}
      </p>

    </div>
  );
}
