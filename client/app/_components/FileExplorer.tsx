"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CloudUpload,
  FolderOpen,
  LayoutGrid,
  List,
  Minus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { formatBytes, formatModifiedDate } from "@/app/_lib/format";
import { extensionOf } from "@/app/_lib/file-icon";
import type { DriveItem, SortKey } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { Breadcrumbs } from "@/app/_components/Breadcrumbs";
import { FileTile } from "@/app/_components/FileIcon";
import { ItemActions } from "@/app/_components/ItemActions";
import { ItemMenu } from "@/app/_components/ItemMenu";
import { PromptDialog } from "@/app/_components/PromptDialog";
import { readDroppedEntries, toUploadList } from "@/app/_lib/upload-entries";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { PreviewModal } from "@/app/_components/PreviewModal";
import { getPreviewUrl } from "@/app/_lib/drive-api";

type Confirm = { title: string; message: string; onConfirm: () => void };

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "avif",
]);

function isImage(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "이름",
  size: "크기",
  modified: "수정한 날짜",
};

/**
 * Row grid: checkbox · name · size · date · actions. Narrow screens drop the
 * date, then the size. Size and date are right-aligned with identical padding
 * (DATA_CELL), so headers and values share one edge.
 */
const ROW_COLUMNS =
  "grid-cols-[28px_1fr_100px] sm:grid-cols-[28px_1fr_96px_100px] md:grid-cols-[28px_1fr_104px_150px_100px]";

/**
 * Both the toolbar and the rows sit inside this, so the view toggle on the right
 * of the toolbar lines up exactly with the ⋮ column below it. Capping the block
 * also stops a very wide window from stretching one 500px-wide name column.
 */
const CONTENT_BLOCK = "mx-auto w-full max-w-[960px]";

/** Same horizontal padding on header cells and value cells keeps them aligned. */
const DATA_CELL = "px-2 text-right tabular-nums";

export function FileExplorer({ store }: { store: DriveStore }) {
  const [renamingItem, setRenamingItem] = useState<DriveItem | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const selectedIds = [...store.selectedIds];
  const selecting = selectedIds.length > 0;
  const allSelected =
    store.visibleItems.length > 0 &&
    selectedIds.length === store.visibleItems.length;
  const inTrash = store.activeView === "trash";
  const selectedFolder =
    selectedIds.length === 1
      ? store.visibleItems.find(
          (item) =>
            item.id === selectedIds[0] &&
            item.type === "folder" &&
            !item.trashed,
        )
      : undefined;

  // Stable identity: the keyboard effect below depends on it.
  const confirmDeleteForever = useCallback(
    (ids: string[]) => {
      setConfirm({
        title: "영구 삭제",
        message: `선택한 ${ids.length}개 항목을 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        onConfirm: () => store.deleteForever(ids),
      });
    },
    [store],
  );

  // Keyboard: the shortcuts people already know from a file manager.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (typing) return;

      if (event.key === "Escape") {
        store.clearSelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        store.selectAllVisible();
        return;
      }
      const ids = [...store.selectedIds];
      if (ids.length === 0) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (store.activeView === "trash") confirmDeleteForever(ids);
        else store.moveToTrash(ids);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [store, confirmDeleteForever]);

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

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    // Resolve dropped files AND folders (recursing into directory contents).
    const uploads = await readDroppedEntries(event.dataTransfer);
    if (uploads.length) store.uploadFiles(uploads);
  }

  function handleItemClick(item: DriveItem, event: React.MouseEvent) {
    event.stopPropagation();
    // Modifier clicks still (de)select for multi-select workflows...
    if (event.shiftKey) {
      store.selectRangeTo(item.id);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      store.toggleSelect(item.id, true);
      return;
    }
    // ...but a plain click opens the item (selection is done via checkboxes).
    handleItemOpen(item);
  }

  function handleItemOpen(item: DriveItem) {
    if (item.trashed) return;
    if (item.type === "folder") {
      store.navigateToFolder(item.id);
      return;
    }
    if (isImage(item.name)) {
      setPreviewItem(item);
      return;
    }
    // Other files: open a tab now (within the click gesture, so it isn't
    // popup-blocked) and point it at the inline URL once it's ready.
    const tab = window.open("", "_blank");
    getPreviewUrl(item.id)
      .then((url) => {
        if (tab) tab.location.href = url;
      })
      .catch(() => {
        tab?.close();
        store.downloadItem(item.id);
      });
  }

  const currentFolderName = store.breadcrumbs.at(-1)?.name ?? "내 드라이브";

  return (
    <div
      // Item menus position themselves inside this box (see ItemMenu) so they
      // never cover the rail or the toolbar.
      data-menu-boundary
      className="relative flex min-w-0 flex-1 flex-col bg-canvas"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b transition-colors ${
          selecting ? "border-jade/30 bg-jade-soft" : "border-line bg-canvas"
        }`}
      >
        {/* Same bounded block *and* the same inner padding as a row, so the
            controls on the right end on exactly the same line as the ⋮ column. */}
        <div
          className={`flex items-center justify-between gap-3 px-3 sm:px-5 ${CONTENT_BLOCK}`}
        >
          {selecting ? (
            <div className="flex min-w-0 items-center gap-1">
              <button
                onClick={store.clearSelection}
                aria-label="선택 해제"
                className="rounded-lg p-2 text-muted transition hover:bg-card hover:text-ink"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <span className="mr-2 shrink-0 text-sm font-semibold">
                {selectedIds.length}개 선택
              </span>
              {selectedFolder && (
                <ToolbarButton
                  icon={FolderOpen}
                  label="열기"
                  onClick={() => handleItemOpen(selectedFolder)}
                />
              )}
              {inTrash ? (
                <>
                  <ToolbarButton
                    icon={RotateCcw}
                    label="복원"
                    onClick={() => store.restoreFromTrash(selectedIds)}
                  />
                  <ToolbarButton
                    icon={XCircle}
                    label="영구 삭제"
                    destructive
                    onClick={() => confirmDeleteForever(selectedIds)}
                  />
                </>
              ) : (
                <ToolbarButton
                  icon={Trash2}
                  label="휴지통으로 이동"
                  destructive
                  onClick={() => store.moveToTrash(selectedIds)}
                />
              )}
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <Breadcrumbs store={store} />
              {store.visibleItems.length > 0 && (
                <span className="hidden shrink-0 text-[13px] text-muted sm:block">
                  {store.visibleItems.length}개
                </span>
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {inTrash && store.visibleItems.length > 0 && !selecting && (
              <button
                onClick={() =>
                  setConfirm({
                    title: "휴지통 비우기",
                    message:
                      "휴지통의 모든 항목을 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다.",
                    onConfirm: () => store.emptyTrash(),
                  })
                }
                className="rounded-lg border border-danger/30 px-3 py-1.5 text-[13px] font-medium text-danger-text transition hover:bg-danger-soft"
              >
                휴지통 비우기
              </button>
            )}

            {/* Sorting lives in the toolbar so it works in both views; the list's
              column headers drive the same state. */}
            {store.viewMode === "grid" && store.visibleItems.length > 0 && (
              <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-card p-0.5 sm:flex">
                {(["name", "size", "modified"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => store.setSort(key)}
                    aria-pressed={store.sort.key === key}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] transition ${
                      store.sort.key === key
                        ? "bg-jade-soft font-medium text-jade-text"
                        : "text-muted hover:bg-canvas-sunken hover:text-ink"
                    }`}
                  >
                    {key === "modified" ? "날짜" : SORT_LABELS[key]}
                    {store.sort.key === key &&
                      (store.sort.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-0.5 rounded-lg border border-line bg-card p-0.5">
              <ViewToggle
                icon={LayoutGrid}
                label="갤러리 보기"
                active={store.viewMode === "grid"}
                onClick={() => store.setViewMode("grid")}
              />
              <ViewToggle
                icon={List}
                label="목록 보기"
                active={store.viewMode === "list"}
                onClick={() => store.setViewMode("list")}
              />
            </div>
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
          <div
            className={`grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-3 p-3 sm:p-5 ${CONTENT_BLOCK}`}
          >
            {store.visibleItems.map((item) => (
              <GridCard
                key={item.id}
                item={item}
                selected={store.selectedIds.has(item.id)}
                store={store}
                onClick={(event) => handleItemClick(item, event)}
                onOpen={() => handleItemOpen(item)}
                onRename={() => setRenamingItem(item)}
              />
            ))}
          </div>
        ) : (
          <div className={`pb-6 ${CONTENT_BLOCK}`}>
            <div
              className={`sticky top-0 z-10 grid ${ROW_COLUMNS} items-center gap-3 border-b border-line bg-canvas/95 px-3 py-2 backdrop-blur sm:px-5`}
            >
              <CheckBox
                state={allSelected ? "on" : selecting ? "mixed" : "off"}
                label={allSelected ? "전체 선택 해제" : "전체 선택"}
                onToggle={() =>
                  allSelected
                    ? store.clearSelection()
                    : store.selectAllVisible()
                }
                className="opacity-100"
              />
              <SortHeader store={store} sortKey="name" />
              <SortHeader
                store={store}
                sortKey="size"
                className="hidden sm:flex"
              />
              <SortHeader
                store={store}
                sortKey="modified"
                className="hidden md:flex"
              />
              <span />
            </div>
            {store.visibleItems.map((item) => (
              <ListRow
                key={item.id}
                item={item}
                selected={store.selectedIds.has(item.id)}
                store={store}
                onClick={(event) => handleItemClick(item, event)}
                onOpen={() => handleItemOpen(item)}
                onRename={() => setRenamingItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {isDragging && (
        <div className="anim-fade-in pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-jade bg-jade-soft backdrop-blur-[3px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-8 py-6 text-center shadow-pop">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jade-soft">
              <CloudUpload className="h-7 w-7 text-jade-text" />
            </div>
            <div>
              <p className="text-[15px] font-semibold">여기에 놓아 업로드</p>
              <p className="mt-1 text-[13px] text-muted">
                {currentFolderName}에 저장돼요
              </p>
            </div>
          </div>
        </div>
      )}

      {renamingItem && (
        <PromptDialog
          title="이름 변경"
          label="새 이름"
          initialValue={renamingItem.name}
          confirmLabel="변경"
          onConfirm={(name) => store.renameItem(renamingItem.id, name)}
          onClose={() => setRenamingItem(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel="영구 삭제"
          destructive
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {previewItem && (
        // Keyed by item: opening a different image remounts the viewer, so it
        // starts from its loading state instead of showing the previous picture.
        <PreviewModal
          key={previewItem.id}
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onDownload={() => store.downloadItem(previewItem.id)}
        />
      )}
    </div>
  );
}

function SortHeader({
  store,
  sortKey,
  className = "",
}: {
  store: DriveStore;
  sortKey: SortKey;
  className?: string;
}) {
  const active = store.sort.key === sortKey;
  // The name column reads left; size and date are data columns and sit right,
  // sharing DATA_CELL's padding with the values below them.
  const isData = sortKey !== "name";
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        store.setSort(sortKey);
      }}
      aria-label={`${SORT_LABELS[sortKey]}순으로 정렬`}
      className={`flex items-center gap-1 rounded-md py-1 text-[13px] transition hover:bg-canvas-sunken ${
        isData ? "justify-end px-2" : "px-1.5"
      } ${active ? "font-semibold text-ink" : "font-medium text-muted"} ${className}`}
    >
      {SORT_LABELS[sortKey]}
      {active &&
        (store.sort.dir === "asc" ? (
          <ArrowUp className="h-3 w-3 shrink-0 text-jade-text" />
        ) : (
          <ArrowDown className="h-3 w-3 shrink-0 text-jade-text" />
        ))}
    </button>
  );
}

function CheckBox({
  state,
  label,
  onToggle,
  className = "",
}: {
  state: "on" | "off" | "mixed";
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : state === "on"}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`grid h-7 w-7 place-items-center rounded-md transition hover:bg-canvas-sunken focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jade ${className}`}
    >
      <span
        className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition ${
          state === "off"
            ? "border-line-strong bg-card"
            : "border-jade bg-jade text-white"
        }`}
      >
        {state === "on" && <Check className="h-3 w-3" strokeWidth={3} />}
        {state === "mixed" && <Minus className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition ${
        destructive
          ? "text-danger-text hover:bg-danger-soft"
          : "text-ink/85 hover:bg-card hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ViewToggle({
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
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-md p-1.5 transition ${
        active
          ? "bg-jade-soft text-jade-text"
          : "text-muted hover:bg-canvas-sunken hover:text-ink"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/** `PDF · 2.4 MB` — a file's kind and weight, in the card's second line. */
function metaLabel(item: DriveItem): string {
  if (item.type === "folder") return "폴더";
  const ext = extensionOf(item.name);
  return [ext ? ext.toUpperCase() : "파일", formatBytes(item.size)].join(" · ");
}

function GridCard({
  item,
  selected,
  store,
  onClick,
  onOpen,
  onRename,
}: {
  item: DriveItem;
  selected: boolean;
  store: DriveStore;
  onClick: (event: React.MouseEvent) => void;
  onOpen: () => void;
  onRename: () => void;
}) {
  const openable = item.type === "folder" && !item.trashed;
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      title={openable ? `${item.name} — 클릭해서 열기` : item.name}
      className={`group relative cursor-pointer rounded-xl border bg-card text-left transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade ${
        selected
          ? "border-jade ring-2 ring-jade/30"
          : "border-line hover:border-line-strong hover:shadow-lift"
      }`}
    >
      <div
        className={`relative grid h-16 place-items-center rounded-t-[11px] border-b transition-colors ${
          selected
            ? "border-jade/25 bg-jade-soft"
            : "border-line/70 bg-ink/[0.03]"
        }`}
      >
        <FileTile type={item.type} name={item.name} size="lg" />
        <CheckBox
          state={selected ? "on" : "off"}
          label={selected ? `${item.name} 선택 해제` : `${item.name} 선택`}
          onToggle={() => store.toggleSelect(item.id, true)}
          className={`absolute left-1 top-1 ${
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        />
        {/* Share/download/menu sit here, always visible — hover-only actions
            are invisible on touch and easy to miss with a pointer too. The star
            moved down to the meta line to make room. */}
        <div className="absolute right-1 top-1 flex items-center">
          <ItemActions item={item} store={store} />
          <ItemMenu item={item} store={store} onRename={onRename} />
        </div>
      </div>

      <div className="min-w-0 px-3 py-2.5">
        <p
          // Two lines are reserved whether the name needs them or not, so a
          // long filename doesn't make its row of cards taller than the rest.
          className={`line-clamp-2 min-h-[2.5rem] break-all text-sm font-medium leading-snug ${
            openable
              ? "group-hover:underline group-hover:decoration-line-strong"
              : ""
          }`}
        >
          {item.name}
        </p>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
          {item.starred && (
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-kraft text-kraft"
              aria-label="중요 표시됨"
            />
          )}
          <span className="truncate tabular-nums">
            {metaLabel(item)}
            <span className="text-faint">
              {" "}
              · {formatModifiedDate(item.modifiedAt)}
            </span>
          </span>
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
  onOpen,
  onRename,
}: {
  item: DriveItem;
  selected: boolean;
  store: DriveStore;
  onClick: (event: React.MouseEvent) => void;
  onOpen: () => void;
  onRename: () => void;
}) {
  const openable = item.type === "folder" && !item.trashed;
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      tabIndex={0}
      role="row"
      aria-selected={selected}
      className={`group relative grid ${ROW_COLUMNS} cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2 transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jade sm:px-5 ${
        selected ? "bg-jade-soft" : "hover:bg-card"
      }`}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px] bg-jade"
        />
      )}
      <CheckBox
        state={selected ? "on" : "off"}
        label={selected ? `${item.name} 선택 해제` : `${item.name} 선택`}
        onToggle={() => store.toggleSelect(item.id, true)}
        className={
          selected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 focus:opacity-100"
        }
      />
      <div className="flex min-w-0 items-center gap-3">
        <FileTile type={item.type} name={item.name} />
        <span
          className={`truncate text-sm ${openable ? "group-hover:underline group-hover:decoration-line-strong" : ""}`}
          title={openable ? `${item.name} — 클릭해서 열기` : item.name}
        >
          {item.name}
        </span>
        {item.starred && (
          <Star
            className="h-3.5 w-3.5 shrink-0 fill-kraft text-kraft"
            aria-label="중요 표시됨"
          />
        )}
      </div>
      <span className={`hidden text-xs text-muted sm:block ${DATA_CELL}`}>
        {item.type === "folder" ? "—" : formatBytes(item.size)}
      </span>
      <span className={`hidden text-xs text-muted md:block ${DATA_CELL}`}>
        {formatModifiedDate(item.modifiedAt)}
      </span>
      {/* Right after the date column, and always on screen. */}
      <div className="flex items-center justify-end">
        <ItemActions item={item} store={store} />
        <ItemMenu item={item} store={store} onRename={onRename} />
      </div>
    </div>
  );
}

function EmptyState({ store }: { store: DriveStore }) {
  const query = store.searchQuery.trim();
  if (query) {
    return (
      <Placeholder
        icon={Search}
        title={`'${query}' 검색 결과가 없어요`}
        subtitle="다른 이름이나 확장자로 찾아보세요"
      />
    );
  }

  switch (store.activeView) {
    case "trash":
      return (
        <Placeholder
          icon={Trash2}
          title="휴지통이 비어 있어요"
          subtitle="삭제한 파일은 여기로 먼저 옮겨져요"
        />
      );
    case "starred":
      return (
        <Placeholder
          icon={Star}
          title="중요 표시한 항목이 없어요"
          subtitle="자주 쓰는 파일에 별을 달면 여기에 모여요"
        />
      );
    case "recent":
      return (
        <Placeholder
          icon={FolderOpen}
          title="아직 올린 파일이 없어요"
          subtitle="업로드한 파일이 최신순으로 쌓여요"
        >
          <UploadCta store={store} />
        </Placeholder>
      );
    default:
      return (
        <Placeholder
          icon={CloudUpload}
          title="이 폴더는 비어 있어요"
          subtitle="파일을 끌어다 놓거나 아래에서 골라 주세요"
        >
          <UploadCta store={store} />
        </Placeholder>
      );
  }
}

function UploadCta({ store }: { store: DriveStore }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        className="mt-5 flex items-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_#ffffff33] transition hover:bg-jade-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade active:translate-y-px"
      >
        <CloudUpload className="h-4 w-4" />
        파일 업로드
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length)
            store.uploadFiles(toUploadList(event.target.files));
          event.target.value = "";
        }}
      />
    </>
  );
}

function Placeholder({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-line-strong bg-card/60">
        <Icon className="h-7 w-7 text-muted" strokeWidth={1.5} />
      </div>
      <p className="mt-4 break-keep text-[15px] font-semibold text-ink">
        {title}
      </p>
      <p className="mt-1.5 max-w-xs break-keep text-sm text-muted">
        {subtitle}
      </p>
      {children}
    </div>
  );
}
