import { useState } from "react";
import { FileBrowserView } from "./files/FileBrowserView";
import { FileEditorView } from "./files/FileEditorView";
import { useServerOutletContext } from "./useServerOutletContext";

export default function ServerFilesPage() {
  const { server } = useServerOutletContext();
  const [currentPath, setCurrentPath] = useState("");
  const [editingFile, setEditingFile] = useState<string | null>(null);

  if (editingFile) {
    return <FileEditorView serverId={server.id} filePath={editingFile} onClose={() => setEditingFile(null)} />;
  }

  return (
    <FileBrowserView
      serverId={server.id}
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      onOpenFile={setEditingFile}
    />
  );
}
