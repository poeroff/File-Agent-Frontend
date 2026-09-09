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
  renameApi,
  restoreApi,
  uploadFileApi,
  BASE_PART_SIZE,
} from "@/app/_lib/drive-api";
import { readEntries, type UploadInput } from "@/app/_lib/upload-entries";

// Not crypto.randomUUID: that needs a secure context, and this app may be
// served over plain http on a LAN/VPN address.
const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

export function useDriveStore(
  initialItems: DriveItem[] = [],
  drive: "my" | "shared" = "my",
) {
  // Passed straight through to drive-api: undefined = personal drive.
  const scope = drive === "shared" ? ("shared" as const) : undefined;
  const driveLabel = drive === "shared" ? "공용 드라이브" : "내 드라이브";
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
  // Start collapsed: the tray shows just the overall progress, and the user
  // expands it ("자세히 보기") to see the per-file breakdown.
  const [uploadTrayCollapsed, setUploadTrayCollapsed] = useState(true);
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

  // Trash is fetched lazily — only once the user opens the Trash view — so the
  // home screen's first load doesn't pull data they won't look at yet. This
  // flag flips true after that first fetch, and keeps later refreshes in sync.
  const trashLoadedRef = useRef(false);

  // One AbortController per upload batch, so "전체 취소" can abort every
  // in-flight transfer at once regardless of which batch it belongs to.
  const uploadControllersRef = useRef<Set<AbortController>>(new Set());

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
    // An item's id is its path, so renaming, moving or deleting one retires that
    // id. Selections holding a retired id would keep inflating the "n selected"
    // count with rows that are no longer on screen.
    const live = new Set(serverItems.map((i) => i.id));
    setSelectedIds((prev) => {
      const kept = new Set([...prev].filter((id) => live.has(id)));
      return kept.size === prev.size ? prev : kept;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      // Trash is lazy (loaded on the first Trash-view open), so a routine
      // refresh only re-fetches it once it's already in play.
      const [live, trash] = await Promise.all([
        listItems(scope),
        trashLoadedRef.current
          ? listTrashApi(scope)
          : Promise.resolve<DriveItem[]>([]),
      ]);
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
  }, [applyServerItems, notify, scope]);

  // The server-rendered initial list can be silently empty — page.tsx swallows
  // backend fetch failures (e.g. a Vercel → backend timeout) and renders an
  // empty drive. Re-fetching once on mount self-heals that case.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Loads the Trash view's contents the first time it's opened, merging them
  // into the live items already on screen (which stay put). Later refreshes
  // keep it current on their own once trashLoadedRef is set.
  const loadTrash = useCallback(async () => {
    try {
      const trash = await listTrashApi(scope);
      trashLoadedRef.current = true;
      setItems((prev) => {
        const starred = new Set(prev.filter((i) => i.starred).map((i) => i.id));
        const live = prev.filter((i) => !i.trashed);
        return [...live, ...trash].map((i) =>
          starred.has(i.id) ? { ...i, starred: true } : i,
        );
      });
    } catch (error) {
      console.error("Failed to load trash", error);
    }
  }, [scope]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    setActiveView("my-drive");
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
  }, []);

  const setView = useCallback(
    (view: ActiveView) => {
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
      // Fetch the trash contents the first time it's actually needed.
      if (view === "trash" && !trashLoadedRef.current) void loadTrash();
    },
    [loadTrash],
  );

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
        await createFolderApi(currentPrefix, finalName, scope);
        await refresh();
      } catch (error) {
        console.error("Failed to create folder", error);
      }
    },
    [currentPrefix, currentSiblingNames, refresh, scope],
  );

  const uploadFiles = useCallback(
    async (uploads: UploadInput[]) => {
      if (uploads.length === 0) return;
      // Keep the tray collapsed: it leads with the overall percentage, and the
      // per-file breakdown is behind "자세히 보기".
      setUploadTrayCollapsed(true);

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

      // Every file gets its row up front (progress 0), so the tray's overall
      // percentage has a stable set to average over for the whole batch.
      // Adding rows as each file *starts* made a new 0% file drag the average
      // down; removing each finished file made it drop again — so the number
      // lurched instead of climbing. Now nothing is added or removed mid-batch.
      const tasks = resolved.map((input) => ({
        input,
        task: {
          id: makeId("upload"),
          name: input.name,
          size: input.file.size,
          progress: 0,
          status: "uploading" as const,
        } satisfies UploadTask,
      }));
      setUploads((prev) => [...prev, ...tasks.map((t) => t.task)]);

      // One controller for the whole batch: cancelUploads aborts it and every
      // in-flight fetch (including the direct-to-S3 transfers) stops at once.
      const controller = new AbortController();
      const { signal } = controller;
      uploadControllersRef.current.add(controller);

      const uploadOne = async ({ input, task }: (typeof tasks)[number]) => {
        const { file, relativeDir, name } = input;
        const taskId = task.id;
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
                prev.map((t) =>
                  t.id === taskId ? { ...t, progress: percent } : t,
                ),
              ),
            signal,
            scope,
          );
          setUploads((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, progress: 100, status: "done" } : t,
            ),
          );
        } catch (error) {
          // Cancelled by the user — cancelUploads already drops the row, so
          // don't mark it as a failure.
          if (signal.aborted) return;
          console.error("Upload failed", error);
          const reason = uploadErrorMessage(error);
          setUploads((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, status: "error", error: reason } : t,
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
      // Must match the single-PUT threshold in drive-api, or files in the gap
      // get multipart parts *and* small-queue parallelism at the same time.
      const SMALL_FILE_BYTES = BASE_PART_SIZE;
      const SMALL_CONCURRENCY = 6;
      // One large file at a time: Cloudflare shares one HTTP/2 connection
      // unevenly between streams, so two files' gauges take turns "freezing"
      // even though the line is saturated. One file × 12 parts fills the
      // line and its gauge moves continuously.
      const LARGE_CONCURRENCY = 1;

      const runPool = (queue: typeof tasks, size: number) =>
        Promise.all(
          Array.from({ length: Math.min(size, queue.length) }, async () => {
            // Stop pulling new files the moment the batch is cancelled.
            while (queue.length > 0 && !signal.aborted) {
              const next = queue.shift();
              if (next) await uploadOne(next);
            }
          }),
        );

      await Promise.all([
        runPool(
          tasks.filter((t) => t.input.file.size <= SMALL_FILE_BYTES),
          SMALL_CONCURRENCY,
        ),
        runPool(
          tasks.filter((t) => t.input.file.size > SMALL_FILE_BYTES),
          LARGE_CONCURRENCY,
        ),
      ]);

      uploadControllersRef.current.delete(controller);
      await refresh();

      // The batch has settled — clear its finished rows a moment later so the
      // tray doesn't linger, but keep any failures visible for the user.
      const batchIds = new Set(tasks.map((t) => t.task.id));
      setTimeout(() => {
        setUploads((prev) =>
          prev.filter((t) => !batchIds.has(t.id) || t.status === "error"),
        );
      }, 4000);
    },
    [currentPrefix, currentSiblingNames, refresh, scope],
  );

  const dismissUpload = useCallback((taskId: string) => {
    setUploads((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  // Aborts every in-flight upload at once and drops the unfinished rows.
  // Already-finished uploads stay — their bytes are safely stored — and the
  // per-file cleanup (backend row + S3 parts) is handled by drive-api on abort.
  const cancelUploads = useCallback(() => {
    for (const controller of uploadControllersRef.current) controller.abort();
    uploadControllersRef.current.clear();
    setUploads((prev) => prev.filter((task) => task.status !== "uploading"));
  }, []);

  // Handles a drag-and-drop. Enumerating a dropped folder tree takes a moment,
  // and until it finishes there are no upload rows to show — which read as "the
  // drop did nothing". So it puts a "reading" spinner in the activity tray right
  // away, then hands the resolved files to uploadFiles.
  const uploadDropped = useCallback(
    async (roots: FileSystemEntry[]) => {
      if (roots.length === 0) return;
      const id = makeId("activity");
      setActivities((prev) => [
        ...prev,
        { id, label: "파일 목록을 읽는 중…", status: "running" },
      ]);
      let inputs: UploadInput[] = [];
      try {
        const read = await readEntries(roots);
        inputs = read.inputs;
        if (read.unreadable > 0) {
          notify(
            `${read.unreadable}개 파일을 읽을 수 없어 건너뛰었어요 (클라우드 전용 파일은 먼저 이 PC에 내려받아 주세요)`,
          );
        }
      } catch (error) {
        console.error("Failed to read dropped items", error);
        notify("놓은 항목을 읽지 못했어요. 다시 시도해 주세요");
      } finally {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }
      if (inputs.length > 0) await uploadFiles(inputs);
    },
    [notify, uploadFiles],
  );

  // Files: presigned URL, downloaded from S3 directly. Folders: streamed as a
  // zip through our API (there's no single S3 object to presign for a folder).
  const downloadItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.trashed) return;
      try {
        const url =
          item.type === "folder"
            ? `/api/drive/download-zip?key=${encodeURIComponent(item.id)}${scope ? "&drive=shared" : ""}`
            : await getDownloadUrl(item.id, scope);
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
    [items, notify, scope],
  );

  // Sharing = handing someone a presigned S3 link. The backend signs these for
  // 5 minutes (StorageService.getDownloadUrl), so the copy notice says so
  // rather than implying a permanent share.
  const copyShareLink = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.type !== "file" || item.trashed) return;
      try {
        const url = await getPreviewUrl(item.id, scope);
        await navigator.clipboard.writeText(url);
        notify("공유 링크를 복사했어요 (5분간 유효)");
      } catch (error) {
        console.error("Share link failed", error);
        notify("링크를 복사하지 못했어요. 다시 시도해 주세요");
      }
    },
    [items, notify, scope],
  );

  // A real rename: the server changes one row, so it costs the same whether
  // the item is a 3KB note or a 20GB video (and a folder keeps its contents).
  // Shown immediately, then confirmed by the refresh — an item's id is its
  // path, so the id changes too and only the server can hand out the new one.
  const renameItem = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      const item = items.find((entry) => entry.id === id);
      if (!trimmed || !item || trimmed === item.name) return;
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, name: trimmed } : entry,
        ),
      );
      await runActivity(`${item.name} 이름 변경`, async () => {
        try {
          await renameApi(id, trimmed, scope);
        } finally {
          // Also on failure: the refresh is what puts the old name back after
          // the optimistic update above.
          await refresh();
        }
      });
    },
    [items, refresh, runActivity, scope],
  );

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
          await moveToTrashApi(paths, scope);
          setSelectedIds(new Set());
          await refresh();
        },
      );
    },
    [items, refresh, runActivity, scope],
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
        await restoreApi(entryIds, scope);
        setSelectedIds(new Set());
        await refresh();
      });
    },
    [refresh, runActivity, scope],
  );

  const deleteForever = useCallback(
    async (ids: string[]) => {
      const entryIds = entryIdsOf(ids);
      if (entryIds.length === 0) return;
      await runActivity(`${entryIds.length}개 항목 영구 삭제`, async () => {
        await deleteTrashApi(entryIds, scope);
        setSelectedIds(new Set());
        await refresh();
      });
    },
    [refresh, runActivity, scope],
  );

  const emptyTrash = useCallback(async () => {
    await runActivity("휴지통 비우기", async () => {
      await emptyTrashApi(scope);
      setSelectedIds(new Set());
      await refresh();
    });
  }, [refresh, runActivity, scope]);

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
    drive,
    driveLabel,
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
    navigateToFolder,
    setView,
    setViewMode,
    setSearchQuery,
    setSort,
    createFolder,
    uploadFiles,
    uploadDropped,
    dismissUpload,
    cancelUploads,
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
