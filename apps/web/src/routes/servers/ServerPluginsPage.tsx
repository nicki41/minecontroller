import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Puzzle } from "lucide-react";
import { SOFTWARE_TO_MODRINTH_LOADER, pluginTerminologyFor } from "@minecraftpanel/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { ModrinthResultCard } from "@/components/modrinth/ModrinthResultCard";
import { ModrinthFilterBar } from "@/components/modrinth/ModrinthFilterBar";
import { InstalledPluginsList } from "@/components/modrinth/InstalledPluginsList";
import { Badge } from "@/components/ui/badge";
import { useInstalledPlugins, useModrinthSearch, useQuickInstallPlugin } from "@/lib/modrinth";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useServerOutletContext } from "./useServerOutletContext";

export default function ServerPluginsPage() {
  const { server } = useServerOutletContext();
  const { hasPermission } = useAuth();
  const kind = pluginTerminologyFor(server.software);
  const loader = SOFTWARE_TO_MODRINTH_LOADER[server.software];

  const [query, setQuery] = useState("");
  const [gameVersions, setGameVersions] = useState<string[]>([server.mcVersion]);
  const [installingProjectId, setInstallingProjectId] = useState<string | null>(null);

  const search = useModrinthSearch(
    { query, projectTypes: kind === "none" ? [] : [kind], loaders: loader ? [loader] : undefined, gameVersions, limit: 24 },
    kind !== "none",
  );
  const installed = useInstalledPlugins(server.id);
  const quickInstall = useQuickInstallPlugin(server.id);

  const installedProjectIds = useMemo(
    () => new Set((installed.data?.installed ?? []).map((p) => p.modrinthProjectId).filter((id): id is string => Boolean(id))),
    [installed.data],
  );

  if (kind === "none") {
    return (
      <EmptyState
        icon={Puzzle}
        title="Vanilla servers don't support plugins or mods"
        description="Change the server's software to Paper (plugins) or Fabric/Forge/NeoForge (mods) to use Modrinth installs."
      />
    );
  }

  async function handleInstall(projectId: string, title: string, slug: string, author: string) {
    setInstallingProjectId(projectId);
    try {
      const result = await quickInstall.mutateAsync({ slug, loader, gameVersion: server.mcVersion, author });
      toast.success(`Installed ${title} (${result.filename}). Restart the server to load it.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to install ${title}.`);
    } finally {
      setInstallingProjectId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Installed {kind === "plugin" ? "plugins" : "mods"}</CardTitle>
            <CardDescription>Manage what&apos;s loaded on this server.</CardDescription>
          </div>
          <Badge variant="secondary">{kind === "plugin" ? "Plugin loader" : "Mod loader"}: {loader}</Badge>
        </CardHeader>
        <CardContent>
          <InstalledPluginsList server={server} installed={installed.data?.installed ?? []} isLoading={installed.isLoading} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Browse Modrinth</h2>
          <p className="text-xs text-muted-foreground">
            Showing {kind}s for {SOFTWARE_TO_MODRINTH_LOADER[server.software] ?? server.software}. Install picks the newest version
            matching the selected game version — no version picker needed.
          </p>
        </div>

        <ModrinthFilterBar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={`Search ${kind}s...`}
          gameVersions={gameVersions}
          onGameVersionsChange={setGameVersions}
        />

        {search.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {!search.isLoading && (search.data?.hits.length ?? 0) === 0 && (
          <EmptyState icon={Puzzle} title="No results" description="Try a different search term or game version." />
        )}

        {!search.isLoading && (search.data?.hits.length ?? 0) > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {search.data!.hits.map((hit) => (
              <ModrinthResultCard
                key={hit.project_id}
                hit={hit}
                installed={installedProjectIds.has(hit.project_id)}
                compatibleWith={server.mcVersion}
                action={{
                  label: installedProjectIds.has(hit.project_id) ? "Reinstall" : "Install",
                  icon: Download,
                  variant: "default",
                  loading: installingProjectId === hit.project_id,
                  disabled: !hasPermission("plugins.install") || installingProjectId !== null,
                  onClick: () => handleInstall(hit.project_id, hit.title, hit.slug, hit.author),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
