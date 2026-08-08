import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

/** Builds the current icon URL for an <img> tag; bump `version` after upload/delete to force a refetch past browser caching. */
export function serverIconUrl(serverId: string, version: number): string {
  return `/api/servers/${serverId}/icon?v=${version}`;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new ApiError(res.status, body ?? { error: { code: "INTERNAL_ERROR", message: res.statusText || "Request failed" } });
}

export function useUploadServerIcon(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (icon: Blob) => {
      const formData = new FormData();
      formData.append("file", icon, "server-icon.png");
      const res = await api.raw(`/servers/${serverId}/icon`, { method: "PUT", body: formData });
      await throwIfNotOk(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers", serverId] }),
  });
}

export function useDeleteServerIcon(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.raw(`/servers/${serverId}/icon`, { method: "DELETE" });
      await throwIfNotOk(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers", serverId] }),
  });
}

/** Crops to a centered square then downsamples to 64x64 — the real size Minecraft's client expects for server-icon.png. */
export async function resizeToServerIcon(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = 64;
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode the icon."))), "image/png");
  });
}
