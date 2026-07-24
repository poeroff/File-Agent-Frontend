"use client";

import { Clock, HardDrive, Star, Trash2, type LucideIcon } from "lucide-react";
import { formatBytes } from "@/app/_lib/format";
import { STORAGE_QUOTA_BYTES } from "@/app/_lib/mock-data";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { NewMenu } from "@/app/_components/NewMenu";

export function Sidebar({ store }: { store: DriveStore }) {
  const usedPct = Math.min(100, (store.usedBytes / STORAGE_QUOTA_BYTES) * 100);

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <NewMenu store={store} />

      <nav className="flex flex-col gap-0.5">
        <NavItem
          icon={HardDrive}
          label="My Drive"
          active={store.activeView === "my-drive"}
          onClick={() => store.setView("my-drive")}
        />
        <NavItem
          icon={Clock}
          label="Recent"
          active={store.activeView === "recent"}
          onClick={() => store.setView("recent")}
        />
        <NavItem
          icon={Star}
          label="Starred"
          active={store.activeView === "starred"}
          onClick={() => store.setView("starred")}
        />
        <NavItem
          icon={Trash2}
          label="Trash"
          active={store.activeView === "trash"}
          onClick={() => store.setView("trash")}
        />
      </nav>

      <div className="mt-auto space-y-2 px-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {formatBytes(store.usedBytes)} of {formatBytes(STORAGE_QUOTA_BYTES)} used
        </p>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-full px-4 py-2 text-left text-sm transition ${
        active
          ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
          : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
