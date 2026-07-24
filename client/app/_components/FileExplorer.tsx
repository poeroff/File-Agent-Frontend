"use client";

import { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  LayoutGrid,
  List,
  RotateCcw,
  Star,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { formatBytes, formatModifiedDate } from "../_lib/format";
import type { DriveItem } from "../_lib/types";
import type { DriveStore } from "../_lib/useDriveStore";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileIcon } from "./FileIcon";
import { ItemMenu } from "./ItemMenu";
import { PromptDialog } from "./PromptDialog";

export function FileExplorer({ store }: { store: DriveStore }) {
  const [renamingItem, setRenamingItem] = useState<DriveItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") store.clearSelection();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [store]);

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer.types.includes("Files")) return;
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (event.dataTransfer.files.length) store.uploadFiles(event.dataTransfer.files);
  }

  function handleItemClick(item: DriveItem, event: React.MouseEvent) {
    event.stopPropagation();
    store.toggleSelect(item.id, event.metaKey || event.ctrlKey || event.shiftKey);
  }

  function handleItemOpen(item: DriveItem) {
    if (item.type === "folder" && !item.trashed) {
      store.navigateToFolder(item.id);
    }
  }

  const selectedIds = [...store.selectedIds];

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-100 px-6 dark:border-zinc-800">
        {store.selectedIds.size > 0 ? (
          <div className="flex items-center gap-1">
            <button
              onClick={store.clearSelection}
              className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="mr-2 text-sm font-medium">{store.selectedIds.size} selected</span>
            {store.activeView === "trash" ? (
              <>
                <ToolbarButton
                  icon={RotateCcw}
                  label="Restore"
                  onClick={() => store.restoreFromTrash(selectedIds)}
                />
                <ToolbarButton
                  icon={XCircle}
                  label="Delete forever"
                  destructive
                  onClick={() => store.deleteForever(selectedIds)}
                />
              </>
            ) : (
              <ToolbarButton
                icon={Trash2}
                label="Move to trash"
                destructive
                onClick={() => store.moveToTrash(selectedIds)}
              />
            )}
          </div>
        ) : (
          <Breadcrumbs store={store} />
        )}

        <div className="flex shrink-0 items-center gap-2">
          {store.activeView === "trash" && store.visibleItems.length > 0 && (
            <button
              onClick={store.emptyTrash}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Empty trash
            </button>
          )}
          <div className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => store.setViewMode("grid")}
              className={`p-2 ${
                store.viewMode === "grid"
                  ? "bg-zinc-200 dark:bg-zinc-700"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => store.setViewMode("list")}
              className={`p-2 ${
                store.viewMode === "list"
                  ? "bg-zinc-200 dark:bg-zinc-700"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onClick={() => store.clearSelection()}
      >
        {store.visibleItems.length === 0 ? (
          <EmptyState store={store} />
        ) : store.viewMode === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 p-6">
            {store.visibleItems.map((item) => (
              <GridCard
                key={item.id}
                item={item}
                selected={store.selectedIds.has(item.id)}
                store={store}
                onClick={(event) => handleItemClick(item, event)}
                onDoubleClick={() => handleItemOpen(item)}
                onRename={() => setRenamingItem(item)}
              />
            ))}
          </div>
        ) : (
          <div>
            <div className="sticky top-0 grid grid-cols-[1fr_110px_160px_40px] items-center gap-4 border-b border-zinc-100 bg-white px-6 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <span>Name</span>
              <span>Size</span>
              <span>Modified</span>
              <span />
            </div>
            {store.visibleItems.map((item) => (
              <ListRow
                key={item.id}
                item={item}
                selected={store.selectedIds.has(item.id)}
                store={store}
                onClick={(event) => handleItemClick(item, event)}
                onDoubleClick={() => handleItemOpen(item)}
                onRename={() => setRenamingItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50/80 dark:bg-blue-950/40">
          <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-blue-300">
            <UploadCloud className="h-10 w-10" />
            <p className="text-sm font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {renamingItem && (
        <PromptDialog
          title="Rename"
          label="Name"
          initialValue={renamingItem.name}
          confirmLabel="Rename"
          onConfirm={(name) => store.renameItem(renamingItem.id, name)}
          onClose={() => setRenamingItem(null)}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`rounded-full p-2 ${
        destructive
          ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function GridCard({
  item,
  selected,
  store,
  onClick,
  onDoubleClick,
  onRename,
}: {
  item: DriveItem;
  selected: boolean;
  store: DriveStore;
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onRename: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group flex cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <FileIcon type={item.type} name={item.name} className="h-9 w-9" />
        <div className="flex items-center gap-1">
          {item.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          <ItemMenu item={item} store={store} onRename={onRename} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {item.type === "folder"
            ? formatModifiedDate(item.modifiedAt)
            : `${formatBytes(item.size)} · ${formatModifiedDate(item.modifiedAt)}`}
        </p>
      </div>
    </div>
  );
}

function ListRow({
  item,
  selected,
  store,
  onClick,
  onDoubleClick,
  onRename,
}: {
  item: DriveItem;
  selected: boolean;
  store: DriveStore;
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onRename: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group grid cursor-pointer grid-cols-[1fr_110px_160px_40px] items-center gap-4 border-b border-zinc-50 px-6 py-2.5 text-sm dark:border-zinc-900 ${
        selected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileIcon type={item.type} name={item.name} className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.name}</span>
        {item.starred && (
          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>
      <span className="text-xs text-zinc-500">{formatBytes(item.size)}</span>
      <span className="text-xs text-zinc-500">{formatModifiedDate(item.modifiedAt)}</span>
      <ItemMenu item={item} store={store} onRename={onRename} />
    </div>
  );
}

function EmptyState({ store }: { store: DriveStore }) {
  const query = store.searchQuery.trim();
  if (query) {
    return (
      <Placeholder
        icon={FolderOpen}
        title={`No results for "${query}"`}
        subtitle="Try a different search"
      />
    );
  }

  switch (store.activeView) {
    case "trash":
      return <Placeholder icon={Trash2} title="Trash is empty" subtitle="Deleted items will appear here" />;
    case "starred":
      return (
        <Placeholder
          icon={Star}
          title="No starred items"
          subtitle="Star files and folders to find them quickly"
        />
      );
    case "recent":
      return (
        <Placeholder icon={FolderOpen} title="No files yet" subtitle="Files you upload will show up here" />
      );
    default:
      return (
        <Placeholder
          icon={UploadCloud}
          title="This folder is empty"
          subtitle="Drag files here or use New to upload"
        />
      );
  }
}

function Placeholder({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Trash2;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-zinc-400">
      <Icon className="h-12 w-12" />
      <div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
        <p className="text-xs">{subtitle}</p>
      </div>
    </div>
  );
}
