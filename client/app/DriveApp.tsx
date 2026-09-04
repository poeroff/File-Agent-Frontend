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
  // Two independent drives, each with its own store: the user's personal one
  // and the shared one every signed-in user sees. The sidebar switches which
  // one the explorer/topbar are bound to; the inactive store stays mounted so
  // its uploads keep running (both trays render below for the same reason).
  const myStore = useDriveStore(initialItems);
  const sharedStore = useDriveStore([], "shared");
  const [activeDrive, setActiveDrive] = useState<"my" | "shared">("my");
  const store = activeDrive === "shared" ? sharedStore : myStore;
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
        <Sidebar
          store={store}
          activeDrive={activeDrive}
          onSelectDrive={(drive) => {
            setActiveDrive(drive);
            (drive === "shared" ? sharedStore : myStore).setView("my-drive");
          }}
        />
        <FileExplorer store={store} />
        {aiOpen && <AiPanel onClose={() => setAiOpen(false)} />}
      </div>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
        <ActivityTray store={myStore} />
        <ActivityTray store={sharedStore} />
        <UploadTray store={myStore} />
        <UploadTray store={sharedStore} />
      </div>
    </div>
  );
}
