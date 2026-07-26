"use client";

import { signOut } from "next-auth/react";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";

export function ProfileMenu({ userEmail }: { userEmail: string }) {
  const initial = (userEmail.charAt(0) || "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={userEmail}
        aria-label="계정 메뉴"
        className="grid h-8 w-8 place-items-center rounded-full bg-accent font-mono text-[13px] font-bold text-white outline-none ring-2 ring-transparent ring-offset-2 ring-offset-chrome transition hover:ring-accent-bright/40 data-[state=open]:ring-accent-bright"
      >
        {initial}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-0">
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs text-muted">로그인 계정</p>
          <p className="mt-1 truncate text-sm font-medium text-ink">
            {userEmail || "게스트"}
          </p>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem>
            <User />
            마이페이지
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            설정
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1.5">
          <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/login" })}>
            <LogOut />
            로그아웃
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
