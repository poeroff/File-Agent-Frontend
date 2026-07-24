"use client";

import { useRef, useState } from "react";
import { FolderPlus, Plus, Upload, type LucideIcon } from "lucide-react";
import { useClickOutside } from "../_lib/useClickOutside";
import type { DriveStore } from "../_lib/useDriveStore";
import { PromptDialog } from "./PromptDialog";

export function NewMenu({ store }: { store: DriveStore }) {
  const [open, setOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      >
        <Plus className="h-5 w-5 text-blue-600" />
        New
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <MenuAction
            icon={FolderPlus}
            label="New folder"
            onClick={() => {
              setOpen(false);
              setFolderModalOpen(true);
            }}
          />
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <MenuAction
            icon={Upload}
            label="File upload"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
          />
          <MenuAction
            icon={Upload}
            label="Folder upload"
            onClick={() => {
              setOpen(false);
              folderInputRef.current?.click();
            }}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) store.uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(event) => {
          if (event.target.files?.length) store.uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {folderModalOpen && (
        <PromptDialog
          title="New folder"
          label="Folder name"
          initialValue="Untitled folder"
          confirmLabel="Create"
          onConfirm={(name) => store.createFolder(name)}
          onClose={() => setFolderModalOpen(false)}
        />
      )}
    </div>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      {label}
    </button>
  );
}
