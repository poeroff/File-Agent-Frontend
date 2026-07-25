"use client";

import { useMemo } from "react";
import { Clock, HardDrive, Star, Trash2, type LucideIcon } from "lucide-react";
import type { ActiveView } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { StorageMeter } from "@/app/_components/StorageMeter";
import { UploadActions } from "@/app/_components/UploadActions";

export function Sidebar({ store }: { store: DriveStore }) {
  const counts = useMemo(() => {
    let drive = 0;
    let starred = 0;
    let trash = 0;
    for (const item of store.items) {
      if (item.trashed) {
        trash += 1;
        continue;
      }
      drive += 1;
      if (item.starred) starred += 1;
    }
    return { drive, starred, trash };
  }, [store.items]);

  const recentCount = useMemo(
    () => store.items.filter((item) => item.type === "file" && !item.trashed).length,
    [store.items],
  );

  return (
    <aside className="flex w-[68px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-chrome-line bg-chrome p-2 text-chrome-text md:w-64 md:gap-5 md:p-3">
      <UploadActions store={store} />

      <nav className="flex flex-col gap-0.5">
        <NavItem
          icon={HardDrive}
          label="내 드라이브"
          count={counts.drive}
          view="my-drive"
          store={store}
        />
        <NavItem
          icon={Clock}
          label="최근 항목"
          count={recentCount}
          view="recent"
          store={store}
        />
        <NavItem
          icon={Star}
          label="중요"
          count={counts.starred}
          view="starred"
          store={store}
        />
        <NavItem
          icon={Trash2}
          label="휴지통"
          count={counts.trash}
          view="trash"
          store={store}
        />
      </nav>

      <div className="mt-auto hidden md:block">
        <StorageMeter items={store.items} />
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  count,
  view,
  store,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  view: ActiveView;
  store: DriveStore;
}) {
  const active = store.activeView === view;

  return (
    <button
      onClick={() => store.setView(view)}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`group relative flex items-center justify-center gap-3 rounded-lg py-2.5 text-left text-[15px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade md:justify-start md:py-2 md:pl-3 md:pr-2.5 ${
        active
          ? "bg-jade-soft font-medium text-jade-text"
          : "text-chrome-text/70 hover:bg-chrome-hover hover:text-chrome-text"
      }`}
    >
      {/* Active marker: a jade spine on the rail edge, not a filled pill. */}
      <span
        aria-hidden
        className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-jade transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-jade" : "text-chrome-muted"}`}
      />
      <span className="hidden flex-1 truncate md:block">{label}</span>
      {count > 0 && (
        <span className="hidden text-[13px] tabular-nums text-chrome-muted md:block">
          {count}
        </span>
      )}
    </button>
  );
}
