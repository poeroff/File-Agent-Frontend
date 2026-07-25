"use client";

import { ArrowUp, PanelRightClose, Sparkles } from "lucide-react";
import type { ActiveView } from "@/app/_lib/types";
import type { DriveStore } from "@/app/_lib/useDriveStore";

const VIEW_LABELS: Record<ActiveView, string> = {
  "my-drive": "내 드라이브",
  recent: "최근 항목",
  starred: "중요",
  trash: "휴지통",
};

/** Shown as a preview of what the assistant will be able to answer. */
const SUGGESTIONS = [
  "이 폴더 정리하는 방법 알려줘",
  "용량을 많이 쓰는 파일은?",
  "이름이 비슷하거나 중복 같은 파일 찾아줘",
];

/**
 * The drive's right-hand column — UI only, not wired to a model.
 *
 * Everything here is presentational and disabled: the composer, the suggested
 * questions, the send button. The header shows a "준비 중" badge so it is clear
 * this is a placeholder rather than something that failed.
 *
 * To hook up an LLM later, the pieces to add are:
 *   1. message state (user/assistant turns) rendered in the scroll area below,
 *   2. a POST handler under app/api/… that takes the question plus whatever
 *      context you want to send, and streams text back,
 *   3. enable the composer and send the draft on Enter.
 * The context line under the header already reads the store, so the current
 * view, folder and selection are available here without extra plumbing.
 */
export function AiPanel({
  store,
  onClose,
}: {
  store: DriveStore;
  onClose: () => void;
}) {
  const contextLabel = [
    VIEW_LABELS[store.activeView],
    store.breadcrumbs.at(-1)?.name,
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <aside className="hidden w-[400px] shrink-0 flex-col border-l border-chrome-line bg-chrome text-chrome-text xl:flex 2xl:w-[440px]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-chrome-line px-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-jade-soft">
          <Sparkles className="h-4 w-4 text-jade-text" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="text-sm font-semibold">AI 도우미</p>
          <span className="shrink-0 rounded-full bg-kraft-soft px-2 py-0.5 text-[11px] font-medium text-kraft-text">
            준비 중
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="AI 패널 닫기"
          title="AI 패널 닫기"
          className="rounded-lg p-1.5 text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-text"
        >
          <PanelRightClose className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div className="shrink-0 border-b border-chrome-line px-3 py-2">
        <p className="truncate text-xs text-chrome-muted">
          보고 있는 위치: <span className="text-chrome-text">{contextLabel}</span> ·{" "}
          {store.visibleItems.length}개
          {store.selectedIds.size > 0 && ` · ${store.selectedIds.size}개 선택`}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-xl border border-kraft/30 bg-kraft-soft p-3">
          <p className="break-keep text-[13px] font-medium text-kraft-text">
            아직 서비스 준비 중이에요
          </p>
          <p className="mt-1.5 break-keep text-[13px] leading-relaxed text-chrome-muted">
            준비가 끝나면 지금 보고 있는 폴더를 바탕으로 이런 걸 물어볼 수 있어요.
          </p>
        </div>

        <div className="rounded-xl bg-chrome-hover/60 p-3">
          <div className="flex flex-col gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg border border-chrome-line bg-chrome px-2.5 py-2 text-left text-[13px] text-chrome-muted"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-chrome-line p-3">
        <div className="rounded-xl border border-chrome-line bg-chrome-raised/60 p-2">
          <textarea
            rows={2}
            disabled
            placeholder="서비스 준비 중이라 아직 사용할 수 없어요"
            aria-label="AI 도우미에게 물어보기"
            className="w-full cursor-not-allowed resize-none bg-transparent px-1 text-sm text-chrome-text outline-none placeholder:text-chrome-muted"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-chrome-muted">공개 준비 중</span>
            <button
              type="button"
              disabled
              aria-label="보내기"
              className="grid h-8 w-8 cursor-not-allowed place-items-center rounded-lg bg-jade text-white opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
