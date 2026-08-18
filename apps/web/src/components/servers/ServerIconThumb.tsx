import { useState } from "react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";

/** Same fallback pattern as ServerDetailLayout's header icon: try the upload, fall back to a generic box on 404/error. */
export function ServerIconThumb({ iconUrl, size = "h-10 w-10", className }: { iconUrl: string; size?: string; className?: string }) {
  const [hasIcon, setHasIcon] = useState<boolean | null>(null);

  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40", size, className)}>
      {hasIcon !== false && (
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full [image-rendering:pixelated]"
          onLoad={() => setHasIcon(true)}
          onError={() => setHasIcon(false)}
        />
      )}
      {hasIcon === false && <Box className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}
