import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

// This file is only ever loaded via React.lazy() (see FileEditorView), so
// monaco-editor's ~5MB never touches the main bundle. Configured to load
// from the bundled npm package instead of @monaco-editor/react's default
// (fetching from a public CDN at runtime) — the panel is meant to run
// fully self-hosted, including offline/airgapped.
//
// Deliberately NOT wiring up MonacoEnvironment.getWorker with the
// json/css/html/typescript language-service web workers: this editor's job
// is config-file editing (server.properties, YAML, JSON, etc.) with
// highlighting/search/save, not full IDE IntelliSense, and monaco-editor's
// packaged worker files hit real Vite/Rollup resolver inconsistencies for
// multi-segment subpaths in this monaco-editor version. Without a worker,
// Monaco runs its language services on the main thread and simply skips
// the advanced (schema validation, autocomplete) features for those
// languages — it degrades, it doesn't break.
loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export default function CodeEditor({ value, language, onChange, onSave }: CodeEditorProps) {
  // onMount fires exactly once per editor instance, so the Ctrl+S command
  // registered inside it would otherwise close over whatever `onSave` was
  // on the very first render. Route it through a ref that's always current
  // instead of re-registering the command on every keystroke.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleMount: OnMount = (editor, monacoInstance) => {
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => onSaveRef.current());
  };

  return (
    <Editor
      value={value}
      language={language}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 13,
        minimap: { enabled: true },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
      }}
    />
  );
}
