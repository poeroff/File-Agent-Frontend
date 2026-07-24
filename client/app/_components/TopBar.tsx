"use client";

import { HardDrive, Search, X } from "lucide-react";
import type { DriveStore } from "@/app/_lib/useDriveStore";
import { ProfileMenu } from "@/app/_components/ProfileMenu";

export function TopBar({ store, userEmail }: { store: DriveStore; userEmail: string }) {
  return (
    <header className="grid h-16 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <HardDrive className="h-5 w-5" />
        </div>
        <span className="hidden text-lg text-zinc-700 sm:inline dark:text-zinc-200">Drive</span>
      </div>

      <div className="relative mx-auto w-full max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={store.searchQuery}
          onChange={(event) => store.setSearchQuery(event.target.value)}
          placeholder="Search in Drives"
          className="w-full rounded-full bg-zinc-100 py-2.5 pl-10 pr-9 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:focus:bg-zinc-900"
        />
        {store.searchQuery && (
          <button
            onClick={() => store.setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 justify-self-end">
        <ProfileMenu userEmail={userEmail} />
      </div>
    </header>
  );
}
