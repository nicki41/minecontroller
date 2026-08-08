import { useState } from "react";
import { toast } from "sonner";
import { Archive, Download, RotateCcw, Trash2 } from "lucide-react";
import type { ServerDto } from "@minecraftpanel/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { useBackups, useCreateBackup, useDeleteBackup, useRestoreBackup, backupDownloadUrl } from "@/lib/backups";

export function BackupsCard({ server }: { server: ServerDto }) {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useBackups(server.id);
  const createBackup = useCreateBackup(server.id);
  const deleteBackup = useDeleteBackup(server.id);
  const restoreBackup = useRestoreBackup(server.id);
  const [restoring, setRestoring] = useState<string | null>(null);

  const canCreate = hasPermission("backups.create") && server.myAccessLevel === "FULL";
  const canDelete = hasPermission("backups.delete") && server.myAccessLevel === "FULL";
  const canRestore = hasPermission("backups.restore") && server.myAccessLevel === "FULL";
  const canStop = server.status === "STOPPED" || server.status === "ERROR";

  async function handleCreate() {
    try {
      await createBackup.mutateAsync({});
      toast.success("Backup created.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create backup.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBackup.mutateAsync(id);
      toast.success("Backup deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete backup.");
    }
  }

  async function handleRestore(id: string) {
    setRestoring(id);
    try {
      await restoreBackup.mutateAsync(id);
      toast.success("Backup restored.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to restore backup.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Backups</CardTitle>
          <CardDescription>Manual snapshots of this server&apos;s files.</CardDescription>
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleCreate} disabled={createBackup.isPending}>
            <Archive className="h-3.5 w-3.5" /> {createBackup.isPending ? "Creating..." : "Create Backup"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-16 w-full" />}
        {!isLoading && (data?.backups.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No backups yet.</p>}
        {!isLoading && (data?.backups.length ?? 0) > 0 && (
          <div className="divide-y divide-border">
            {data!.backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{b.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(Number(b.sizeBytes))} · {b.createdByUsername ?? "unknown"} · {new Date(b.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                    <a href={backupDownloadUrl(server.id, b.id)} download>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {canRestore && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canStop || restoring === b.id}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This replaces all current files for <strong>{server.name}</strong> with the contents of this backup. This cannot
                            be undone.
                            {!canStop && " The server must be stopped first."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" disabled={!canStop} onClick={() => handleRestore(b.id)}>
                            Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
