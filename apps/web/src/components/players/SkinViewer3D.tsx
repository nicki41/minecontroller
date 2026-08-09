import { useEffect, useRef, useState } from "react";
import { SkinViewer, WalkingAnimation } from "skinview3d";
import { RotateCw, User, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * Full 3D player model with drag-to-rotate (NameMC-style), rendered via
 * skinview3d against the skin/cape bytes our API proxies from Mojang.
 * Offline-mode/cracked UUIDs won't resolve a skin — falls back to a plain
 * placeholder instead of an invisible model.
 */
export function SkinViewer3D({ uuid, width = 260, height = 300, className }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const [meta, setMeta] = useState<SkinMeta | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [walking, setWalking] = useState(true);
  const [dragging, setDragging] = useState(false);

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
      animation: new WalkingAnimation(),
    });
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
    if (viewerRef.current) viewerRef.current.autoRotate = autoRotate;
  }, [autoRotate, meta]);

  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.animation = walking ? new WalkingAnimation() : null;
  }, [walking, meta]);

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

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className={className}
        style={{ width, height, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={autoRotate ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => setAutoRotate((v) => !v)}
          title="Auto-spin"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={walking ? "default" : "outline"}
          className="h-7 px-2 text-xs"
          onClick={() => setWalking((v) => !v)}
          title="Walk animation"
        >
          <Footprints className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
