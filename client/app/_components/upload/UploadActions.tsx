"use client";

import { useRef, useState, type ComponentType } from "react";
import { CloudUpload, FolderPlus, FolderUp } from "lucide-react";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { PromptDialog } from "@/app/_components/ui/PromptDialog";
import { toUploadList } from "@/app/_lib/upload-entries";

/**
 * Uploading is the whole point of the app, so it is a single visible button
 * rather than an item inside a "New" menu. Folder upload and folder creation
 * sit beneath it as quieter siblings.
 */
export function UploadActions({ store }: { store: DriveStore }) {
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => fileInputRef.current?.click()}
        title="파일 업로드"
        className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg bg-accent text-sm font-semibold text-white shadow-[inset_0_1px_0_#ffffff2e,0_1px_2px_#00000059] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright active:translate-y-px"
      >
        <CloudUpload className="h-[18px] w-[18px]" />
        <span className="hidden md:inline">파일 업로드</span>
      </button>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <GhostAction
          icon={FolderUp}
          label="폴더 업로드"
          onClick={() => folderInputRef.current?.click()}
        />
        <GhostAction
          icon={FolderPlus}
          label="새 폴더"
          onClick={() => setFolderModalOpen(true)}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length)
            store.uploadFiles(toUploadList(event.target.files));
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
          if (event.target.files?.length)
            store.uploadFiles(toUploadList(event.target.files));
          event.target.value = "";
        }}
      />

      {folderModalOpen && (
        <PromptDialog
          title="새 폴더"
          label="폴더 이름"
          initialValue="제목 없는 폴더"
          confirmLabel="만들기"
          onConfirm={(name) => store.createFolder(name)}
          onClose={() => setFolderModalOpen(false)}
        />
      )}
    </div>
  );
}

function GhostAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-chrome-line bg-chrome-hover/60 text-xs font-medium text-chrome-text/85 transition hover:bg-chrome-fill hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
    >
      <Icon className="h-4 w-4 text-chrome-muted md:h-3.5 md:w-3.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
