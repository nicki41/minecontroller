import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerFaceIconProps {
  uuid: string | null;
  size?: number;
  className?: string;
}

/**
 * Crops the 8x8 base face + 8x8 hat-overlay layer out of the player's skin
 * texture (standard Minecraft skin layout: base face at (8,8), hat overlay
 * at (40,8)) and scales it up with pixelated rendering — the classic
 * "avatar face" look, sourced from the same skin.png we already proxy for
 * the 3D viewer instead of depending on a third-party avatar API.
 */
export function PlayerFaceIcon({ uuid, size = 48, className }: PlayerFaceIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const canvas = canvasRef.current;
    if (!canvas || !uuid) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = `/api/players/${uuid}/skin.png`;
    return () => {
      cancelled = true;
    };
  }, [uuid, size]);

  if (!uuid || failed) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-[inherit] bg-muted text-muted-foreground", className)}
        style={{ width: size, height: size }}
      >
        <User className="h-1/2 w-1/2" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated", width: size, height: size }}
    />
  );
}
