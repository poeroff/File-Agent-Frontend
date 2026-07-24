"use client";

import { useState } from "react";
import {
  Download,
  MoreVertical,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useClickOutside } from "../_lib/useClickOutside";
import type { DriveItem } from "../_lib/types";
import type { DriveStore } from "../_lib/useDriveStore";

export function ItemMenu({
  item,
  store,
  onRename,
}: {
  item: DriveItem;
  store: DriveStore;
  onRename: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 ${
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {!item.trashed ? (
            <>
              <Action
                icon={Pencil}
                label="Rename"
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
              />
              <Action
                icon={Star}
                label={item.starred ? "Remove star" : "Add star"}
                onClick={() => {
                  setOpen(false);
                  store.toggleStar(item.id);
                }}
              />
              {item.type === "file" && (
                <Action
                  icon={Download}
                  label="Download"
                  disabled
                  title="No storage backend connected yet"
                  onClick={() => setOpen(false)}
                />
              )}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
              <Action
                icon={Trash2}
                label="Move to trash"
                destructive
                onClick={() => {
                  setOpen(false);
                  store.moveToTrash([item.id]);
                }}
              />
            </>
          ) : (
            <>
              <Action
                icon={RotateCcw}
                label="Restore"
                onClick={() => {
                  setOpen(false);
                  store.restoreFromTrash([item.id]);
                }}
              />
              <Action
                icon={XCircle}
                label="Delete forever"
                destructive
                onClick={() => {
                  setOpen(false);
                  store.deleteForever([item.id]);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
