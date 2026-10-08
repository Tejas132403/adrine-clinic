"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** Application frame: sidebar, top bar and the scrollable content column. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavigationOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface-subtle">
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="lg:pl-[15.5rem]">
        <Topbar onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="mx-auto w-full max-w-[88rem] px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
