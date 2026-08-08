const LANGUAGE_BY_EXT: Record<string, string> = {
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  java: "java",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  properties: "ini",
  toml: "ini",
  conf: "ini",
  cfg: "ini",
  xml: "xml",
  html: "html",
  css: "css",
  md: "markdown",
  sh: "shell",
  bash: "shell",
  sql: "sql",
  txt: "plaintext",
  log: "plaintext",
};

export function languageForFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

/** Extensions the file manager will offer to open in the text editor at all. */
const EDITABLE_EXTENSIONS = new Set([
  ...Object.keys(LANGUAGE_BY_EXT),
  "properties",
  "gitignore",
  "env",
  "ini",
  "csv",
]);

export function isLikelyEditable(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EDITABLE_EXTENSIONS.has(ext) || !filename.includes(".");
}
