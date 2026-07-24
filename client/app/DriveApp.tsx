"use client";

import { useDriveStore } from "./_lib/useDriveStore";
import { Sidebar } from "./_components/Sidebar";
import { TopBar } from "./_components/TopBar";
import { FileExplorer } from "./_components/FileExplorer";
import { UploadTray } from "./_components/UploadTray";

export function DriveApp({ userEmail }: { userEmail: string }) {
  const store = useDriveStore();

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopBar store={store} userEmail={userEmail} />
      <div className="flex min-h-0 flex-1">
        <Sidebar store={store} />
        <FileExplorer store={store} />
      </div>
      <UploadTray store={store} />
    </div>
  );
}
