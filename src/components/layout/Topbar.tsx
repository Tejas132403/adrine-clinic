"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { sectionLabelFor } from "./navigation";

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const pathname = usePathname();
  const { user, isDoctor, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenNavigation}
        className="-ml-1 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-sm font-semibold text-ink">{sectionLabelFor(pathname, user.role)}</h1>
        <span className="hidden items-center gap-1.5 text-xs text-ink-soft sm:flex">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {today}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/appointments?new=1"
          className="hidden h-8 items-center rounded-md bg-brand-600 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 sm:inline-flex"
        >
          {isDoctor ? "View schedule" : "New appointment"}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-md border border-slate-200 px-1.5 py-1 transition-colors hover:bg-slate-50"
          >
            <Avatar name={user.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-medium leading-tight text-ink">{user.name}</span>
              <span className="block text-2xs leading-tight text-ink-soft">
                {isDoctor ? "Doctor" : "Receptionist"}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 origin-top-right rounded-card border border-slate-200 bg-white p-1.5 shadow-pop"
            >
              <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
                <Avatar name={user.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                  <p className="truncate text-2xs text-ink-soft">{user.email}</p>
                </div>
              </div>
              <div className="px-2.5 pb-2">
                <Badge tone={isDoctor ? "brand" : "info"} dot>
                  {isDoctor ? "Doctor access" : "Reception access"}
                </Badge>
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <p className="flex items-start gap-2 px-2.5 py-2 text-2xs leading-relaxed text-ink-soft">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
                {isDoctor
                  ? "You can view your own appointments, your patients and clinical notes."
                  : "You can manage patients and the clinic schedule."}
              </p>
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
