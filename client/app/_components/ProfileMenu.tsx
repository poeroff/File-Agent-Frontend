"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Settings, User, type LucideIcon } from "lucide-react";
import { useClickOutside } from "@/app/_lib/useClickOutside";

export function ProfileMenu({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const initial = (userEmail.charAt(0) || "?").toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={userEmail}
        aria-label="계정 메뉴"
        aria-expanded={open}
        className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold text-white ring-2 ring-offset-2 ring-offset-chrome transition ${
          open ? "ring-jade" : "ring-transparent hover:ring-jade/35"
        }`}
        style={{ background: "linear-gradient(145deg, var(--jade) 0%, #0b6f7d 100%)" }}
      >
        {initial}
      </button>

      {open && (
        <div className="anim-pop-in absolute right-0 top-full z-40 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-line bg-card-raised text-ink shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs text-muted">로그인 계정</p>
            <p className="mt-1 truncate text-sm font-medium">{userEmail || "게스트"}</p>
          </div>
          <div className="p-1.5">
            <MenuAction icon={User} label="마이페이지" onClick={() => setOpen(false)} />
            <MenuAction icon={Settings} label="설정" onClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-line p-1.5">
            <MenuAction
              icon={LogOut}
              label="로그아웃"
              onClick={() => {
                setOpen(false);
                signOut({ redirectTo: "/login" });
              }}
            />
          </div>
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
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-ink/90 transition hover:bg-canvas-sunken"
    >
      <Icon className="h-4 w-4 text-faint" />
      {label}
    </button>
  );
}
