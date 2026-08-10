import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LoadingLogo } from "./LoadingLogo";
import { useTrickleProgress } from "./useTrickleProgress";

/**
 * Full-screen branded loader shown while switching pages, so navigations
 * that have to wait on data resolve behind the loading animation instead of
 * a blank/half-rendered page. Only engages once a navigation has actually
 * been waiting past GRACE_MS — cached/instant route changes never show it.
 */
const GRACE_MS = 80;

export function AppLoadingOverlay() {
  const location = useLocation();
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const pendingRef = useRef(fetching + mutating > 0);
  pendingRef.current = fetching + mutating > 0;

  const [navActive, setNavActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingRef.current) setNavActive(true);
    }, GRACE_MS);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (navActive && !pendingRef.current) setNavActive(false);
  }, [fetching, mutating, navActive]);

  const { progress, visible } = useTrickleProgress(navActive);
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background",
        navActive ? "animate-fade-in" : "transition-opacity duration-300 opacity-0",
      )}
    >
      <LoadingLogo progress={progress} />
    </div>
  );
}
