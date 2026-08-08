import fs from "node:fs/promises";
import path from "node:path";

/** Recursively sums file sizes under a directory. Returns 0 if the directory doesn't exist. */
export async function getDirectorySize(dirPath: string): Promise<number> {
  let total = 0;
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isSymbolicLink()) continue; // never follow symlinks when summing size
    if (entry.isDirectory()) {
      total += await getDirectorySize(full);
    } else if (entry.isFile()) {
      try {
        total += (await fs.stat(full)).size;
      } catch {
        // File disappeared mid-walk; ignore.
      }
    }
  }
  return total;
}
