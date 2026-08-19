import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { IosInstallBanner } from "./IosInstallBanner";

export function AppShell() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes (link tapped, back
  // button, etc.) — otherwise it stays open over the newly navigated page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile drawer's backdrop is up so the page
  // behind it can't scroll along with a touch drag on the drawer itself.
  useEffect(() => {
    if (!isDesktop && mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isDesktop, mobileOpen]);

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setDesktopCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={isDesktop && desktopCollapsed}
        mobileOpen={!isDesktop && mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={handleToggleSidebar} />
        <IosInstallBanner />
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
          <div
            className="mx-auto w-full max-w-[1400px] p-3 sm:p-4 md:p-6"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
