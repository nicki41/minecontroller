import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setCsrfToken } from "./api";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isOwner: boolean;
  totpEnabled: boolean;
  roles: { id: string; name: string }[];
  /** Instance-wide (non server-scoped) effective permissions. */
  permissions: string[];
}

interface MeResponse {
  user: AuthUser | null;
  setupRequired: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  setupRequired: boolean;
  isLoading: boolean;
  /** Checks a global permission. Server-scoped permissions must be checked per-server via useServerAccess. */
  hasPermission: (permission: string) => boolean;
  refetch: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [csrfReady, setCsrfReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    api
      .get<{ csrfToken: string }>("/auth/csrf")
      .then((res) => setCsrfToken(res.csrfToken))
      .catch(() => {
        // Panel is unusable without a CSRF token; /auth/me below will still
        // resolve so the UI can show a clear error instead of hanging.
      })
      .finally(() => setCsrfReady(true));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<MeResponse>("/auth/me"),
    enabled: csrfReady,
    staleTime: 60_000,
  });

  const value: AuthContextValue = {
    user: data?.user ?? null,
    setupRequired: data?.setupRequired ?? false,
    isLoading: !csrfReady || isLoading,
    hasPermission: (permission) =>
      Boolean(data?.user?.isOwner) || Boolean(data?.user?.permissions.includes(permission)),
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    logout: async () => {
      await api.post("/auth/logout");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
