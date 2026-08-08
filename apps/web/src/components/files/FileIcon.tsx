import { Folder, FileText, FileJson, FileCode2, FileArchive, FileImage, File as FileGeneric } from "lucide-react";
import { cn } from "@/lib/utils";

const ARCHIVE_EXT = new Set(["zip", "tar", "gz", "tgz", "7z", "rar"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"]);
const CODE_EXT = new Set(["java", "js", "ts", "jsx", "tsx", "sh", "bash", "sql", "py"]);
const JSON_EXT = new Set(["json", "yml", "yaml", "toml"]);

export function FileIcon({ name, type, className }: { name: string; type: "file" | "directory"; className?: string }) {
  if (type === "directory") return <Folder className={cn("text-primary", className)} />;

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ARCHIVE_EXT.has(ext)) return <FileArchive className={cn("text-amber-500", className)} />;
  if (IMAGE_EXT.has(ext)) return <FileImage className={cn("text-violet-400", className)} />;
  if (JSON_EXT.has(ext)) return <FileJson className={cn("text-emerald-400", className)} />;
  if (CODE_EXT.has(ext)) return <FileCode2 className={cn("text-sky-400", className)} />;
  if (ext === "txt" || ext === "log" || ext === "md" || ext === "properties") {
    return <FileText className={cn("text-muted-foreground", className)} />;
  }
  return <FileGeneric className={cn("text-muted-foreground", className)} />;
}
