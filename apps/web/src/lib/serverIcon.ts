import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

/** Builds the current icon URL for an <img> tag; bump `version` after upload/delete to force a refetch past browser caching. */
export function serverIconUrl(serverId: string, version: number): string {
  return `/api/servers/${serverId}/icon?v=${version}`;
}

function iconVersionKey(serverId: string) {
  return ["server-icon-version", serverId] as const;
}

export function bumpServerIconVersion(qc: QueryClient, serverId: string): void {
  qc.setQueryData<number>(iconVersionKey(serverId), (v) => (v ?? 0) + 1);
}

/**
 * Shared, per-server icon "cache epoch" — every consumer that renders the
 * server icon (settings editor, the detail-page header, the server-list
 * preview) calls this instead of keeping its own local version counter, so
 * an upload/delete in one place is reflected everywhere else on screen
 * immediately, without prop-drilling. Not persisted: a fresh page load
 * always gets the real current icon anyway, since the API responds with
 * Cache-Control: no-store.
 */
export function useServerIconVersion(serverId: string) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: iconVersionKey(serverId),
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });
  return { version: data, bump: () => bumpServerIconVersion(qc, serverId) };
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers", serverId] });
      bumpServerIconVersion(qc, serverId);
    },
  });
}

export function useDeleteServerIcon(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.raw(`/servers/${serverId}/icon`, { method: "DELETE" });
      await throwIfNotOk(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers", serverId] });
      bumpServerIconVersion(qc, serverId);
    },
  });
}

export interface IconCropRegion {
  /** Top-left of the square crop region, in the source image's own natural-pixel coordinates. */
  sx: number;
  sy: number;
  /** Side length of the square crop region, in source pixels. */
  size: number;
}

/** Renders the given square region of `image` down to 64x64 — the size Minecraft's client expects for server-icon.png. */
export async function exportServerIcon(image: CanvasImageSource, region: IconCropRegion): Promise<Blob> {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(image, region.sx, region.sy, region.size, region.size, 0, 0, size, size);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode the icon."))), "image/png");
  });
}
