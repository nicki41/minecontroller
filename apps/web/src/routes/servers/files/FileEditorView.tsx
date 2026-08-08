import { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFileContent, useSaveFileContent } from "@/lib/files";
import { languageForFile } from "@/lib/editorLanguage";
import { ApiError } from "@/lib/api";

const CodeEditor = lazy(() => import("@/components/files/CodeEditor"));

export function FileEditorView({ serverId, filePath, onClose }: { serverId: string; filePath: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useFileContent(serverId, filePath);
  const save = useSaveFileContent(serverId);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setContent(data.content);
      setDirty(false);
    }
  }, [data]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  async function handleSave() {
    try {
      await save.mutateAsync({ path: filePath, content });
      setDirty(false);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save file.");
    }
  }

  function handleClose() {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    onClose();
  }

  const filename = filePath.split("/").pop() ?? filePath;

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <span className="truncate font-mono text-sm">{filename}</span>
        {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
        <Button size="sm" className="ml-auto" onClick={handleSave} disabled={!dirty || save.isPending}>
          <Save className="h-3.5 w-3.5" /> {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex-1">
        {isLoading && <Skeleton className="h-full w-full rounded-none" />}
        {isError && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Failed to load file."}
          </div>
        )}
        {!isLoading && !isError && (
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
            <CodeEditor
              value={content}
              language={languageForFile(filename)}
              onChange={(v) => {
                setContent(v);
                setDirty(v !== data?.content);
              }}
              onSave={handleSave}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
