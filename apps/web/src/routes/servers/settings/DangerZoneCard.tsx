import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { ServerDto } from "@minecraftpanel/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDeleteServer } from "@/lib/servers";
import { ApiError } from "@/lib/api";

export function DangerZoneCard({ server }: { server: ServerDto }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const del = useDeleteServer();
  const canDelete = server.myAccessLevel === "FULL" && hasPermission("servers.delete");

  if (!canDelete) return null;

  async function handleDelete(keepFiles: boolean) {
    try {
      await del.mutateAsync({ id: server.id, keepFiles });
      toast.success("Server deleted.");
      navigate("/servers");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete server.");
    }
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>Permanently delete this server and its Docker container.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={del.isPending}>
              <Trash2 /> Delete server
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete server?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the Docker container, server files, configuration and installed
                plugins/mods for <strong>{server.name}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="outline" onClick={() => handleDelete(true)}>
                Delete, keep files
              </Button>
              <AlertDialogAction variant="destructive" onClick={() => handleDelete(false)}>
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
