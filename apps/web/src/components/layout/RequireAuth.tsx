import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function RequireAuth() {
  const { user, isLoading, setupRequired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="w-64 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}

/** Guards /login: bounce to /setup if no admin exists yet, or to / if already logged in. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setupRequired } = useAuth();
  if (isLoading) return null;
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Guards /setup: bounce to / only once a user is actually logged in (setup
 * already done). Deliberately does NOT check setupRequired — /setup IS the
 * page for when setup is required, so redirecting to /setup while already
 * on /setup would just render <Navigate> forever instead of the form.
 */
export function RedirectIfSetupDone({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
