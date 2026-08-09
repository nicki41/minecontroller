import { useEffect, useRef, useState } from "react";
import { SkinViewer } from "skinview3d";
import { User } from "lucide-react";

interface SkinMeta {
  slim: boolean;
  hasSkin: boolean;
  hasCape: boolean;
}

interface SkinViewer3DProps {
  uuid: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Full 3D player model with drag-to-rotate + auto-spin (NameMC-style),
 * rendered via skinview3d against the skin/cape bytes our API proxies from
 * Mojang. Offline-mode/cracked UUIDs won't resolve a skin — falls back to a
 * plain placeholder instead of an invisible model.
 */
export function SkinViewer3D({ uuid, width = 220, height = 260, className }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const [meta, setMeta] = useState<SkinMeta | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setLoadFailed(false);
    fetch(`/api/players/${uuid}/meta`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<SkinMeta>) : null))
      .then((data) => {
        if (!cancelled) setMeta(data ?? { slim: false, hasSkin: false, hasCape: false });
      })
      .catch(() => {
        if (!cancelled) setMeta({ slim: false, hasSkin: false, hasCape: false });
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  useEffect(() => {
    if (!canvasRef.current || !meta?.hasSkin) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: `/api/players/${uuid}/skin.png`,
      model: meta.slim ? "slim" : "default",
      cape: meta.hasCape ? `/api/players/${uuid}/cape.png` : undefined,
      fov: 40,
      zoom: 0.85,
    });
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.8;
    viewer.controls.enableZoom = false;
    viewer.globalLight.intensity = 2.5;
    viewer.cameraLight.intensity = 1.1;
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [uuid, meta, width, height]);

  useEffect(() => {
    if (!meta || meta.hasSkin) return;
    setLoadFailed(true);
  }, [meta]);

  if (loadFailed) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 text-muted-foreground"
        style={{ width, height }}
      >
        <User className="h-10 w-10" />
        <span className="text-xs">No skin available</span>
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} style={{ width, height, touchAction: "none" }} />;
}
