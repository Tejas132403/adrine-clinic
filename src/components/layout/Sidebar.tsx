"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { navigationFor } from "./navigation";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/utils/cn";

/** Left navigation. Fixed on desktop, slide-over drawer on smaller screens. */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = navigationFor(user.role);

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[15.5rem] flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
              <Activity className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight text-ink">Adrine Clinic</span>
              <span className="block text-2xs uppercase tracking-wider text-ink-soft">Outpatient care</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-soft hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
            {user.role === "DOCTOR" ? "Clinical" : "Front desk"}
          </p>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-500")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-md bg-surface-subtle px-2.5 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
              <p className="truncate text-2xs text-ink-soft">
                {user.role === "DOCTOR" ? user.specialization ?? "Doctor" : "Reception"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded p-1.5 text-ink-soft transition hover:bg-white hover:text-rose-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
