"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Settings, User, type LucideIcon } from "lucide-react";
import { useClickOutside } from "@/app/_lib/useClickOutside";

export function ProfileMenu({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={userEmail}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="px-4 py-3">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {userEmail}
            </p>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-700" />
          <MenuAction icon={User} label="마이페이지" onClick={() => setOpen(false)} />
          <MenuAction icon={Settings} label="설정" onClick={() => setOpen(false)} />
          <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
          <MenuAction
            icon={LogOut}
            label="로그아웃"
            onClick={() => {
              setOpen(false);
              signOut({ redirectTo: "/login" });
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
    >
      <Icon className="h-4 w-4 text-zinc-500" />
      {label}
    </button>
  );
}
