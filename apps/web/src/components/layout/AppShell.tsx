import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />
        {/*
          scrollbar-gutter:stable reserves the scrollbar's space permanently,
          whether or not it's actually showing. Without it, the centered
          max-w-[1400px] child below shifts a few px left/right depending on
          whether THIS page's content is tall enough to trigger main's own
          scrollbar — a short page (e.g. Backups, or Console, which scrolls
          internally instead) renders visibly further right than a tall one
          (e.g. Overview's charts), even though nothing about their own
          layout differs.
        */}
        <main className="flex-1 overflow-y-auto scrollbar-thin [scrollbar-gutter:stable]">
          <div className="mx-auto w-full max-w-[1400px] p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
