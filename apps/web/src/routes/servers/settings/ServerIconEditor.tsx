import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageOff, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resizeToServerIcon, serverIconUrl, useDeleteServerIcon, useUploadServerIcon } from "@/lib/serverIcon";
import { ApiError } from "@/lib/api";

export function ServerIconEditor({ serverId, canEdit }: { serverId: string; canEdit: boolean }) {
  const [version, setVersion] = useState(0);
  const [hasIcon, setHasIcon] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const upload = useUploadServerIcon(serverId);
  const remove = useDeleteServerIcon(serverId);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const icon = await resizeToServerIcon(file);
      await upload.mutateAsync(icon);
      setVersion((v) => v + 1);
      setHasIcon(true);
      toast.success("Server icon updated. Restart the server to show it in the multiplayer list.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to upload the icon. Make sure it's an image file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    try {
      await remove.mutateAsync();
      setVersion((v) => v + 1);
      setHasIcon(false);
      toast.success("Server icon removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove the icon.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
        {hasIcon !== false && (
          <img
            key={version}
            src={serverIconUrl(serverId, version)}
            alt="Server icon"
            className="h-full w-full [image-rendering:pixelated]"
            onLoad={() => setHasIcon(true)}
            onError={() => setHasIcon(false)}
          />
        )}
        {hasIcon === false && <ImageOff className="h-6 w-6 text-muted-foreground" />}
      </div>

      <div className="space-y-1.5">
        <Label>Server icon</Label>
        <p className="text-xs text-muted-foreground">Shown next to the MOTD in the multiplayer server list. Any image works — it&apos;s auto-cropped and resized to 64×64.</p>
        {canEdit && (
          <div className="flex items-center gap-2 pt-0.5">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {hasIcon && (
              <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={handleRemove}>
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}
      </div>
    </div>
  );
}
