import { useEffect, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportServerIcon, type IconCropRegion } from "@/lib/serverIcon";

const VIEWPORT = 240; // px — square crop window shown to the user
const PREVIEW = 72; // px — live preview of the exported 64x64 icon, upscaled for visibility

interface Crop {
  zoom: number; // >= 1, multiplier on top of the "cover" baseline scale
  offsetX: number; // px, image's left edge relative to the viewport's left edge (always <= 0)
  offsetY: number;
}

function clampOffset(offset: number, viewport: number, displayed: number): number {
  const min = Math.min(0, viewport - displayed);
  return Math.min(0, Math.max(min, offset));
}

export function ServerIconCropDialog({
  file,
  uploading,
  onCancel,
  onConfirm,
}: {
  file: File | null;
  uploading: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load the picked file into an <img>, recentering the crop once its natural size is known.
  useEffect(() => {
    if (!file) {
      setImage(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = image ? VIEWPORT / Math.min(image.naturalWidth, image.naturalHeight) : 1;
  const scale = baseScale * crop.zoom;
  const displayedWidth = image ? image.naturalWidth * scale : 0;
  const displayedHeight = image ? image.naturalHeight * scale : 0;

  useEffect(() => {
    if (!image) return;
    const w = image.naturalWidth * baseScale;
    const h = image.naturalHeight * baseScale;
    setCrop({ zoom: 1, offsetX: clampOffset((VIEWPORT - w) / 2, VIEWPORT, w), offsetY: clampOffset((VIEWPORT - h) / 2, VIEWPORT, h) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  function region(): IconCropRegion | null {
    if (!image) return null;
    return { sx: -crop.offsetX / scale, sy: -crop.offsetY / scale, size: VIEWPORT / scale };
  }

  // Redraw the live preview canvas on every pan/zoom change.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const r = region();
    if (!canvas || !image || !r) return;
    canvas.width = PREVIEW;
    canvas.height = PREVIEW;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    ctx.drawImage(image, r.sx, r.sy, r.size, r.size, 0, 0, PREVIEW, PREVIEW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, crop]);

  function onPointerDown(e: React.PointerEvent) {
    if (!image) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: crop.offsetX, startOffsetY: crop.offsetY };
  }
  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    // Resolve the next offsets from `drag` right now rather than re-reading
    // dragRef.current inside the setCrop updater: React 18 can defer running
    // that updater until after a same-tick pointerup has already nulled the
    // ref, which crashed with "Cannot read properties of null" on a quick
    // drag-then-release.
    const nextOffsetX = clampOffset(drag.startOffsetX + (e.clientX - drag.startX), VIEWPORT, displayedWidth);
    const nextOffsetY = clampOffset(drag.startOffsetY + (e.clientY - drag.startY), VIEWPORT, displayedHeight);
    setCrop((c) => ({ ...c, offsetX: nextOffsetX, offsetY: nextOffsetY }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function onZoomChange(nextZoom: number) {
    if (!image) return;
    // Anchor the zoom around the viewport's center instead of the top-left corner.
    const sx = (VIEWPORT / 2 - crop.offsetX) / scale;
    const sy = (VIEWPORT / 2 - crop.offsetY) / scale;
    const newScale = baseScale * nextZoom;
    const newW = image.naturalWidth * newScale;
    const newH = image.naturalHeight * newScale;
    setCrop({
      zoom: nextZoom,
      offsetX: clampOffset(VIEWPORT / 2 - sx * newScale, VIEWPORT, newW),
      offsetY: clampOffset(VIEWPORT / 2 - sy * newScale, VIEWPORT, newH),
    });
  }

  async function handleConfirm() {
    const r = region();
    if (!image || !r) return;
    const blob = await exportServerIcon(image, r);
    onConfirm(blob);
  }

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop server icon</DialogTitle>
          <DialogDescription>Drag to reposition, zoom to fit. Auto-resized to 64×64 on save.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-md border border-border bg-muted/40 touch-none select-none"
            style={{ width: VIEWPORT, height: VIEWPORT, cursor: image ? "move" : "default" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {image && (
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="absolute left-0 top-0 max-w-none"
                style={{ width: displayedWidth, height: displayedHeight, transform: `translate(${crop.offsetX}px, ${crop.offsetY}px)` }}
              />
            )}
          </div>

          <div className="flex w-full items-center gap-2">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={crop.zoom}
              disabled={!image}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="flex items-center gap-3 self-start">
            <canvas
              ref={previewCanvasRef}
              width={PREVIEW}
              height={PREVIEW}
              className="rounded-md border border-border [image-rendering:pixelated]"
            />
            <div className="text-xs text-muted-foreground">
              Preview
              <br />
              64×64
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!image || uploading}>
            {uploading ? "Saving..." : "Save icon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
