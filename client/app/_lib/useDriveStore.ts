"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialItems } from "@/app/_lib/mock-data";
import type { ActiveView, DriveItem, UploadTask, ViewMode } from "@/app/_lib/types";

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function useDriveStore() {
  const [items, setItems] = useState<DriveItem[]>(initialItems);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("my-drive");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [uploadTrayCollapsed, setUploadTrayCollapsed] = useState(false);
  const timers = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(clearInterval);
    };
  }, []);

  const navigateToFolder = useCallback((folderId: string | null) => {
    setActiveView("my-drive");
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
  }, []);

  const setView = useCallback((view: ActiveView) => {
    setActiveView(view);
    setSelectedIds(new Set());
    if (view !== "my-drive") setCurrentFolderId(null);
  }, []);

  const breadcrumbs = useMemo(() => {
    const trail: DriveItem[] = [];
    let cursor = currentFolderId;
    while (cursor) {
      const folder = items.find((item) => item.id === cursor);
      if (!folder) break;
      trail.unshift(folder);
      cursor = folder.parentId;
    }
    return trail;
  }, [items, currentFolderId]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let pool: DriveItem[];
    switch (activeView) {
      case "trash":
        pool = items.filter((item) => item.trashed);
        break;
      case "starred":
        pool = items.filter((item) => item.starred && !item.trashed);
        break;
      case "recent":
        pool = items
          .filter((item) => item.type === "file" && !item.trashed)
          .slice()
          .sort((a, b) => b.modifiedAt - a.modifiedAt);
        break;
      case "my-drive":
      default:
        pool = items.filter(
          (item) => !item.trashed && item.parentId === currentFolderId,
        );
        break;
    }

    if (query) {
      pool = pool.filter((item) => item.name.toLowerCase().includes(query));
    }

    return pool
      .slice()
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [items, activeView, currentFolderId, searchQuery]);

  const usedBytes = useMemo(
    () =>
      items
        .filter((item) => item.type === "file" && !item.trashed)
        .reduce((sum, item) => sum + (item.size ?? 0), 0),
    [items],
  );

  const folderNameExists = useCallback(
    (name: string, parentId: string | null) =>
      items.some(
        (item) =>
          !item.trashed &&
          item.parentId === parentId &&
          item.name.toLowerCase() === name.toLowerCase(),
      ),
    [items],
  );

  const createFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const parentId = activeView === "my-drive" ? currentFolderId : null;
      setItems((prev) => [
        ...prev,
        {
          id: makeId("folder"),
          name: trimmed,
          type: "folder",
          parentId,
          modifiedAt: Date.now(),
          starred: false,
          trashed: false,
        },
      ]);
    },
    [activeView, currentFolderId],
  );

  const uploadFiles = useCallback(
    (fileList: FileList | File[]) => {
      const parentId = activeView === "my-drive" ? currentFolderId : null;
      const files = Array.from(fileList);

      files.forEach((file) => {
        const taskId = makeId("upload");
        setUploads((prev) => [
          ...prev,
          { id: taskId, name: file.name, size: file.size, progress: 0, status: "uploading" },
        ]);
        setUploadTrayCollapsed(false);

        const interval = setInterval(
          () => {
            setUploads((prev) =>
              prev.map((task) => {
                if (task.id !== taskId || task.status !== "uploading") return task;
                const next = Math.min(100, task.progress + 8 + Math.random() * 20);
                return { ...task, progress: next };
              }),
            );
          },
          180,
        );
        timers.current.add(interval);

        const finishDelay = 900 + Math.random() * 1600;
        setTimeout(() => {
          clearInterval(interval);
          timers.current.delete(interval);
          setUploads((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, progress: 100, status: "done" } : task,
            ),
          );
          setItems((prev) => [
            ...prev,
            {
              id: makeId("file"),
              name: file.name,
              type: "file",
              parentId,
              size: file.size,
              mimeType: file.type || undefined,
              modifiedAt: Date.now(),
              starred: false,
              trashed: false,
            },
          ]);
          setTimeout(() => {
            setUploads((prev) => prev.filter((task) => task.id !== taskId));
          }, 4000);
        }, finishDelay);
      });
    },
    [activeView, currentFolderId],
  );

  const dismissUpload = useCallback((taskId: string) => {
    setUploads((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const renameItem = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: trimmed, modifiedAt: Date.now() } : item,
      ),
    );
  }, []);

  const toggleStar = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item)),
    );
  }, []);

  const moveToTrash = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, trashed: true } : item)),
    );
    setSelectedIds(new Set());
  }, []);

  const restoreFromTrash = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, trashed: false } : item)),
    );
    setSelectedIds(new Set());
  }, []);

  const deleteForever = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setItems((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSelectedIds(new Set());
  }, []);

  const emptyTrash = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.trashed));
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      if (prev.has(id) && additive) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    items,
    visibleItems,
    breadcrumbs,
    currentFolderId,
    activeView,
    viewMode,
    searchQuery,
    selectedIds,
    uploads,
    uploadTrayCollapsed,
    usedBytes,
    navigateToFolder,
    setView,
    setViewMode,
    setSearchQuery,
    createFolder,
    folderNameExists,
    uploadFiles,
    dismissUpload,
    renameItem,
    toggleStar,
    moveToTrash,
    restoreFromTrash,
    deleteForever,
    emptyTrash,
    toggleSelect,
    clearSelection,
    setUploadTrayCollapsed,
  };
}

export type DriveStore = ReturnType<typeof useDriveStore>;
