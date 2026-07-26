"use client";

import { useState } from "react";
import { useDriveStore } from "@/app/_lib/useDriveStore";
import { AiPanel } from "@/app/_components/ai/AiPanel";
import { Sidebar } from "@/app/_components/shell/Sidebar";
import { TopBar } from "@/app/_components/shell/TopBar";
import { FileExplorer } from "@/app/_components/explorer/FileExplorer";
import { UploadTray } from "@/app/_components/upload/UploadTray";
import { ActivityTray } from "@/app/_components/shell/ActivityTray";
import type { DriveItem } from "@/app/_lib/types";

export function DriveApp({
  userEmail,
  initialItems,
}: {
  userEmail: string;
  initialItems: DriveItem[];
}) {
  const store = useDriveStore(initialItems);
  // The AI column is open by default on wide screens and can be dismissed to
  // give the file list the full width back.
  const [aiOpen, setAiOpen] = useState(true);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-canvas text-ink">
      <TopBar
        store={store}
        userEmail={userEmail}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar store={store} />
        <FileExplorer store={store} />
        {aiOpen && <AiPanel store={store} onClose={() => setAiOpen(false)} />}
      </div>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
        <ActivityTray store={store} />
        <UploadTray store={store} />
      </div>
    </div>
  );
}
