"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { DriveItem } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";

/** Menu box: w-52 plus the breathing room kept from every viewport edge. */
const MENU_WIDTH = 208;
const EDGE_MARGIN = 8;
const TRIGGER_GAP = 6;

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The menu is wider than a grid card and the rows live in a scroll
  // container, so anchoring it inside the card made it spill out of the card
  // and get clipped at the list's bottom edge. It is now placed from the
  // trigger's position and kept inside the file area (the element marked
  // data-menu-boundary): right-aligned to the trigger, flipped above it when
  // there is no room below, and slid inwards at the edges. Positioning the
  // node directly rather than through state keeps this a single pre-paint
  // layout pass, so the menu is never seen in the wrong place.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const height = menu.offsetHeight;
    const bounds =
      trigger.closest("[data-menu-boundary]")?.getBoundingClientRect() ??
      new DOMRect(0, 0, window.innerWidth, window.innerHeight);

    const minTop = bounds.top + EDGE_MARGIN;
    let top = rect.bottom + TRIGGER_GAP;
    if (top + height > bounds.bottom - EDGE_MARGIN) {
      top = Math.max(minTop, rect.top - TRIGGER_GAP - height);
    }

    const minLeft = bounds.left + EDGE_MARGIN;
    const maxLeft = Math.max(minLeft, bounds.right - MENU_WIDTH - EDGE_MARGIN);
    const left = Math.min(Math.max(rect.right - MENU_WIDTH, minLeft), maxLeft);

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = "visible";
  }, [open]);

  // Dismiss on outside click, Escape, and anything that would leave the menu
  // pointing at the wrong row (scrolling the list, resizing the window).
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    const close = () => setOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", close);
    // Capture phase: catches scrolling of the explorer, not just the window.
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${item.name} 작업 메뉴`}
        aria-expanded={open}
        // Always visible, like the share/download buttons beside it.
        className={`rounded-lg p-1.5 text-muted transition hover:bg-canvas-sunken hover:text-ink ${
          open ? "bg-canvas-sunken text-ink" : ""
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          // Mounted hidden at the origin so it can be measured; the layout
          // effect above places it and reveals it before the browser paints.
          style={{ top: 0, left: 0, width: MENU_WIDTH, visibility: "hidden" }}
          className="anim-pop-in fixed z-50 origin-top-right overflow-hidden rounded-xl border border-line bg-card-raised p-1.5 text-sm shadow-pop"
        >
          {!item.trashed ? (
            <>
              <Action
                icon={Pencil}
                label="이름 변경"
                onClick={() => {
                  setOpen(false);
                  onRename();
                }}
              />
              <Action
                icon={Star}
                label={item.starred ? "중요 표시 해제" : "중요 표시"}
                onClick={() => {
                  setOpen(false);
                  store.toggleStar(item.id);
                }}
              />
              {/* Share and download live on the row itself (ItemActions), not
                  in here — this menu keeps the rarer, per-item operations. */}
              <div className="my-1.5 border-t border-line" />
              <Action
                icon={Trash2}
                label="휴지통으로 이동"
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
                label="복원"
                onClick={() => {
                  setOpen(false);
                  store.restoreFromTrash([item.id]);
                }}
              />
              <Action
                icon={XCircle}
                label="영구 삭제"
                destructive
                onClick={() => {
                  setOpen(false);
                  setConfirmingDelete(true);
                }}
              />
            </>
          )}
        </div>,
          document.body,
        )}

      {confirmingDelete && (
        <ConfirmDialog
          title="영구 삭제"
          message={
            item.type === "folder"
              ? "이 폴더와 폴더 안의 모든 항목을 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다."
              : "이 항목을 완전히 삭제합니다. 이 작업은 되돌릴 수 없습니다."
          }
          confirmLabel="영구 삭제"
          destructive
          onConfirm={() => store.deleteForever([item.id])}
          onClose={() => setConfirmingDelete(false)}
        />
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
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        destructive
          ? "text-danger-text hover:bg-danger-soft"
          : "text-ink/90 hover:bg-canvas-sunken"
      }`}
    >
      <Icon className={`h-4 w-4 ${destructive ? "" : "text-faint"}`} />
      {label}
    </button>
  );
}
