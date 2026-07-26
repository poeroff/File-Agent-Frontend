"use client";

import { useState } from "react";
import {
  MoreVertical,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import type { DriveItem } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { ConfirmDialog } from "@/app/_components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";

export function ItemMenu({
  item,
  store,
  onRename,
}: {
  item: DriveItem;
  store: DriveStore;
  onRename: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    // Stop clicks bubbling to the card's open handler.
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${item.name} 작업 메뉴`}
          className="rounded-lg p-1.5 text-muted outline-none transition hover:bg-canvas-sunken hover:text-ink data-[state=open]:bg-canvas-sunken data-[state=open]:text-ink"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>

        {/* Radix keeps the menu inside the viewport (flip/slide) and dismisses
            it on outside-click, Escape, scroll and resize on its own. */}
        <DropdownMenuContent collisionPadding={8}>
          {!item.trashed ? (
            <>
              <DropdownMenuItem onSelect={onRename}>
                <Pencil />
                이름 변경
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => store.toggleStar(item.id)}>
                <Star />
                {item.starred ? "중요 표시 해제" : "중요 표시"}
              </DropdownMenuItem>
              {/* Share and download live on the row itself (ItemActions), not
                  in here — this menu keeps the rarer, per-item operations. */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onSelect={() => store.moveToTrash([item.id])}
              >
                <Trash2 />
                휴지통으로 이동
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onSelect={() => store.restoreFromTrash([item.id])}
              >
                <RotateCcw />
                복원
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => setConfirmingDelete(true)}
              >
                <XCircle />
                영구 삭제
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
