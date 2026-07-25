"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Activity,
  ActiveView,
  DriveItem,
  Sort,
  SortKey,
  UploadTask,
  ViewMode,
} from "@/app/_lib/types";
import {
  createFolderApi,
  deleteTrashApi,
  emptyTrashApi,
  getDownloadUrl,
  getPreviewUrl,
  listItems,
  listTrashApi,
  moveToTrashApi,
  restoreApi,
  uploadFileApi,
} from "@/app/_lib/drive-api";
import type { UploadInput } from "@/app/_lib/upload-entries";

let idCounter = 0;
function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// Maps a thrown upload error to a short reason the user can act on.
function uploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("exceeds the maximum upload size")) {
    return "파일이 너무 커서 업로드할 수 없어요";
  }
  const statusMatch = message.match(/status (\d+)/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status === 413) return "파일이 너무 커서 업로드할 수 없어요";
    if (status === 401)
      return "로그인이 만료됐어요. 새로고침 후 다시 시도해 주세요";
    return `서버 오류로 실패했어요 (${status})`;
  }
  // fetch() itself rejecting (after retries) is a network/connection problem.
  return "네트워크 문제로 실패했어요. 잠시 후 다시 시도해 주세요";
}

// Returns `name` if it's free, otherwise appends " (1)", " (2)", … until it's
// unique among `taken`. For files the counter goes before the extension
// (e.g. "report (1).pdf"); folders keep the whole name ("Photos (1)").
function nextAvailableName(
  name: string,
  taken: Set<string>,
  isFolder: boolean,
): string {
  if (!taken.has(name)) return name;
  let base = name;
  let ext = "";
  if (!isFolder) {
    const dot = name.lastIndexOf(".");
    if (dot > 0) {
      base = name.slice(0, dot);
      ext = name.slice(dot);
    }
  }
  let i = 1;
  let candidate = `${base} (${i})${ext}`;
  while (taken.has(candidate)) {
    i += 1;
    candidate = `${base} (${i})${ext}`;
  }
  return candidate;
}

export function useDriveStore(initialItems: DriveItem[] = []) {
  const [items, setItems] = useState<DriveItem[]>(initialItems);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("my-drive");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSortState] = useState<Sort>({ key: "name", dir: "asc" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Anchor for shift-click range selection: the row a range extends from.
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [uploadTrayCollapsed, setUploadTrayCollapsed] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Shows a labelled task in the bottom-right tray while `fn` runs (spinner),
  // then a checkmark on success (auto-dismissed) or a red mark on failure.
  const runActivity = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      const id = makeId("activity");
      setActivities((prev) => [...prev, { id, label, status: "running" }]);
      try {
        await fn();
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "done" } : a)),
        );
        setTimeout(() => {
          setActivities((prev) => prev.filter((a) => a.id !== id));
        }, 3000);
      } catch (error) {
        console.error(label, error);
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "error" } : a)),
        );
      }
    },
    [],
  );

  const dismissActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // A one-off info toast in the activity tray (auto-dismisses).
  const notify = useCallback((label: string) => {
    const id = makeId("activity");
    setActivities((prev) => [...prev, { id, label, status: "done" }]);
    setTimeout(() => {
      setActivities((prev) => prev.filter((a) => a.id !== id));
    }, 4000);
  }, []);

  // Latest currentFolderId, readable inside async callbacks without adding it
  // to their dependency lists.
  const currentFolderIdRef = useRef(currentFolderId);
  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  // S3 prefix of the folder we're currently viewing. A folder's id is its
  // relative key path (e.g. "Photos/trip"), so the prefix is that + "/".
  const currentPrefix = useMemo(
    () =>
      activeView === "my-drive" && currentFolderId ? `${currentFolderId}/` : "",
    [activeView, currentFolderId],
  );

  // Replace items with a fresh server listing (live + trashed). Trash state
  // now comes from the server; only the star mark is client-only, so preserve
  // it for items that still exist.
  const applyServerItems = useCallback((serverItems: DriveItem[]) => {
    setItems((prev) => {
      const starred = new Set(prev.filter((i) => i.starred).map((i) => i.id));
      return serverItems.map((i) =>
        starred.has(i.id) ? { ...i, starred: true } : i,
      );
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [live, trash] = await Promise.all([listItems(), listTrashApi()]);
      const combined = [...live, ...trash];
      applyServerItems(combined);
      // If the folder we're viewing no longer exists as a live folder (e.g. we
      // just moved it to trash), drop back to the root and tell the user why,
      // instead of leaving them on an empty/ghost folder.
      const cur = currentFolderIdRef.current;
      if (
        cur &&
        !combined.some((i) => i.id === cur && i.type === "folder" && !i.trashed)
      ) {
        setCurrentFolderId(null);
        notify("폴더가 삭제되어 최상위로 이동했어요");
      }
    } catch (error) {
      console.error("Failed to refresh drive contents", error);
    }
  }, [applyServerItems, notify]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    setActiveView("my-drive");
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
  }, []);

  const setView = useCallback((view: ActiveView) => {
    setActiveView(view);
    setSelectedIds(new Set());
    // Always reset to the root — clicking a nav item (incl. My Drive while
    // inside a subfolder) should take you back to the top of that view.
    setCurrentFolderId(null);
    // Each view opens on the order that makes sense for it: "recent" is about
    // what changed last, everything else reads alphabetically.
    setSortState(
      view === "recent"
        ? { key: "modified", dir: "desc" }
        : { key: "name", dir: "asc" },
    );
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
        pool = items.filter((item) => item.type === "file" && !item.trashed);
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

    // Folders always lead, whatever the sort — mixing them into a size or date
    // order makes a folder list impossible to scan.
    const direction = sort.dir === "asc" ? 1 : -1;
    return pool.slice().sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      switch (sort.key) {
        case "size":
          return ((a.size ?? 0) - (b.size ?? 0)) * direction;
        case "modified":
          return (a.modifiedAt - b.modifiedAt) * direction;
        case "name":
        default:
          return a.name.localeCompare(b.name, "ko") * direction;
      }
    });
  }, [items, activeView, currentFolderId, searchQuery, sort]);

  // Clicking the current sort column flips its direction; a new column starts
  // in the direction people expect for that kind of value (A→Z, newest first,
  // largest first).
  const setSort = useCallback((key: SortKey) => {
    setSortState((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  }, []);

  const usedBytes = useMemo(
    () =>
      items
        .filter((item) => item.type === "file" && !item.trashed)
        .reduce((sum, item) => sum + (item.size ?? 0), 0),
    [items],
  );

  // Names already used in the folder currently being viewed.
  const currentSiblingNames = useCallback(
    () =>
      new Set(
        items
          .filter((item) => item.parentId === currentFolderId && !item.trashed)
          .map((item) => item.name),
      ),
    [items, currentFolderId],
  );

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const finalName = nextAvailableName(trimmed, currentSiblingNames(), true);
      try {
        await createFolderApi(currentPrefix, finalName);
        await refresh();
      } catch (error) {
        console.error("Failed to create folder", error);
      }
    },
    [currentPrefix, currentSiblingNames, refresh],
  );

  const uploadFiles = useCallback(
    async (uploads: UploadInput[]) => {
      if (uploads.length === 0) return;
      setUploadTrayCollapsed(false);

      // De-duplicate top-level names against existing siblings so uploading a
      // file/folder whose name already exists lands as "name (1)" instead of
      // overwriting/merging. A dropped folder's whole root is renamed once
      // (its inner files keep their names inside the fresh folder).
      const taken = currentSiblingNames();
      const rootRenames = new Map<string, string>();
      const resolved = uploads.map(({ file, relativeDir }) => {
        if (relativeDir) {
          const parts = relativeDir.split("/");
          const root = parts[0];
          if (!rootRenames.has(root)) {
            const unique = nextAvailableName(root, taken, true);
            taken.add(unique);
            rootRenames.set(root, unique);
          }
          parts[0] = rootRenames.get(root) as string;
          return { file, relativeDir: parts.join("/"), name: file.name };
        }
        const unique = nextAvailableName(file.name, taken, false);
        taken.add(unique);
        return { file, relativeDir: "", name: unique };
      });

      const uploadOne = async (input: (typeof resolved)[number]) => {
        const { file, relativeDir, name } = input;
        const taskId = makeId("upload");
        setUploads((prev) => [
          ...prev,
          {
            id: taskId,
            name,
            size: file.size,
            progress: 0,
            status: "uploading",
          },
        ]);

        try {
          // relativeDir preserves any dropped/selected folder structure.
          // The progress callback drives the tray's bar (real % for large,
          // chunked uploads).
          await uploadFileApi(
            `${currentPrefix}${relativeDir}`,
            name,
            file,
            (percent) =>
              setUploads((prev) =>
                prev.map((task) =>
                  task.id === taskId ? { ...task, progress: percent } : task,
                ),
              ),
          );
          setUploads((prev) =>
            prev.map((task) =>
              task.id === taskId
                ? { ...task, progress: 100, status: "done" }
                : task,
            ),
          );
          setTimeout(() => {
            setUploads((prev) => prev.filter((task) => task.id !== taskId));
          }, 4000);
        } catch (error) {
          console.error("Upload failed", error);
          const reason = uploadErrorMessage(error);
          setUploads((prev) =>
            prev.map((task) =>
              task.id === taskId
                ? { ...task, status: "error", error: reason }
                : task,
            ),
          );
        }
      };

      // Small and large files are limited by different things, so they get
      // separate queues that run side by side.
      //
      // A small file is two round trips (sign, then PUT) and almost no
      // transfer, so its cost is latency and the fix is parallelism: measured
      // on 120×64KB, going from 3 at a time to 8 was ~3× faster. A large file
      // already runs its own parts in parallel, so stacking several of them up
      // just queues requests behind each other — S3 speaks HTTP/1.1 and the
      // browser only opens ~6 connections per host.
      const SMALL_FILE_BYTES = 10 * 1024 * 1024; // the single-PUT threshold
      const SMALL_CONCURRENCY = 6;
      const LARGE_CONCURRENCY = 2;

      const runPool = (queue: typeof resolved, size: number) =>
        Promise.all(
          Array.from({ length: Math.min(size, queue.length) }, async () => {
            while (queue.length > 0) {
              const next = queue.shift();
              if (next) await uploadOne(next);
            }
          }),
        );

      await Promise.all([
        runPool(
          resolved.filter((input) => input.file.size <= SMALL_FILE_BYTES),
          SMALL_CONCURRENCY,
        ),
        runPool(
          resolved.filter((input) => input.file.size > SMALL_FILE_BYTES),
          LARGE_CONCURRENCY,
        ),
      ]);

      await refresh();
    },
    [currentPrefix, currentSiblingNames, refresh],
  );

  const dismissUpload = useCallback((taskId: string) => {
    setUploads((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  // Fetches a presigned URL and triggers a browser download from S3 directly.
  const downloadItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.type !== "file" || item.trashed) return;
      try {
        const url = await getDownloadUrl(item.id);
        const link = document.createElement("a");
        link.href = url;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error("Download failed", error);
        notify("다운로드에 실패했어요. 잠시 후 다시 시도해 주세요");
      }
    },
    [items, notify],
  );

  // Sharing = handing someone a presigned S3 link. The backend signs these for
  // 5 minutes (StorageService.getDownloadUrl), so the copy notice says so
  // rather than implying a permanent share.
  const copyShareLink = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.type !== "file" || item.trashed) return;
      try {
        const url = await getPreviewUrl(item.id);
        await navigator.clipboard.writeText(url);
        notify("공유 링크를 복사했어요 (5분간 유효)");
      } catch (error) {
        console.error("Share link failed", error);
        notify("링크를 복사하지 못했어요. 다시 시도해 주세요");
      }
    },
    [items, notify],
  );

  const renameItem = useCallback((id: string, name: string) => {
    // Local-only for now (not yet wired to S3). Reverts on the next refresh.
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: trimmed } : item)),
    );
  }, []);

  const toggleStar = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, starred: !item.starred } : item,
      ),
    );
  }, []);

  // Real S3-backed trash: move objects into users/{id}/.trash/, keyed per
  // trashed unit so folders vs. files stay distinct and restore is exact.
  const moveToTrash = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      const paths = items
        .filter((item) => idSet.has(item.id) && !item.trashed)
        .map((item) => (item.type === "folder" ? `${item.id}/` : item.id));
      if (paths.length === 0) return;
      await runActivity(
        `${paths.length}개 항목을 휴지통으로 이동`,
        async () => {
          await moveToTrashApi(paths);
          setSelectedIds(new Set());
          await refresh();
        },
      );
    },
    [items, refresh, runActivity],
  );

  // Trash items carry an id of `trash:{entryId}`.
  const entryIdsOf = (ids: string[]) =>
    ids
      .filter((id) => id.startsWith("trash:"))
      .map((id) => id.slice("trash:".length));

  const restoreFromTrash = useCallback(
    async (ids: string[]) => {
      const entryIds = entryIdsOf(ids);
      if (entryIds.length === 0) return;
      await runActivity(`${entryIds.length}개 항목 복원`, async () => {
        await restoreApi(entryIds);
        setSelectedIds(new Set());
        await refresh();
      });
    },
    [refresh, runActivity],
  );

  const deleteForever = useCallback(
    async (ids: string[]) => {
      const entryIds = entryIdsOf(ids);
      if (entryIds.length === 0) return;
      await runActivity(`${entryIds.length}개 항목 영구 삭제`, async () => {
        await deleteTrashApi(entryIds);
        setSelectedIds(new Set());
        await refresh();
      });
    },
    [refresh, runActivity],
  );

  const emptyTrash = useCallback(async () => {
    await runActivity("휴지통 비우기", async () => {
      await emptyTrashApi();
      setSelectedIds(new Set());
      await refresh();
    });
  }, [refresh, runActivity]);

  const toggleSelect = useCallback((id: string, additive: boolean) => {
    setSelectionAnchor(id);
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

  // Shift-click: select everything between the anchor and `id` in the order the
  // rows are currently shown, keeping what was already selected.
  const selectRangeTo = useCallback(
    (id: string) => {
      const order = visibleItems.map((item) => item.id);
      const end = order.indexOf(id);
      const start = selectionAnchor ? order.indexOf(selectionAnchor) : -1;
      if (end === -1 || start === -1) {
        toggleSelect(id, false);
        return;
      }
      const [from, to] = start <= end ? [start, end] : [end, start];
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const rowId of order.slice(from, to + 1)) next.add(rowId);
        return next;
      });
    },
    [visibleItems, selectionAnchor, toggleSelect],
  );

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(visibleItems.map((item) => item.id)));
    setSelectionAnchor(visibleItems[0]?.id ?? null);
  }, [visibleItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionAnchor(null);
  }, []);

  return {
    items,
    visibleItems,
    breadcrumbs,
    currentFolderId,
    activeView,
    viewMode,
    searchQuery,
    sort,
    selectedIds,
    uploads,
    uploadTrayCollapsed,
    activities,
    usedBytes,
    navigateToFolder,
    setView,
    setViewMode,
    setSearchQuery,
    setSort,
    createFolder,
    uploadFiles,
    dismissUpload,
    downloadItem,
    copyShareLink,
    renameItem,
    toggleStar,
    moveToTrash,
    restoreFromTrash,
    deleteForever,
    emptyTrash,
    toggleSelect,
    selectRangeTo,
    selectAllVisible,
    clearSelection,
    setUploadTrayCollapsed,
    dismissActivity,
  };
}

export type DriveStore = ReturnType<typeof useDriveStore>;
