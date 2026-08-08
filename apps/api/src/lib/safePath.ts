import path from "node:path";
import fs from "node:fs/promises";
import { BadRequestError, ForbiddenError } from "./errors.js";

/**
 * Resolves a user-supplied relative path against `root` and guarantees the
 * result cannot escape it — via "../" segments, an absolute-path override,
 * or a null byte. Purely syntactic; does not touch the filesystem (use
 * safeResolve for that, which also checks for symlink escapes).
 */
export function resolveSafePath(root: string, userPath: string): string {
  if (userPath.includes("\0")) throw new BadRequestError("Invalid path.");

  const normalizedRoot = path.resolve(root);
  // The leading "." + sep neutralizes a userPath that starts with "/" or a
  // drive letter — path.resolve would otherwise treat it as absolute and
  // ignore normalizedRoot entirely.
  const candidate = path.resolve(normalizedRoot, `.${path.sep}${userPath}`);

  const relative = path.relative(normalizedRoot, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new ForbiddenError("Path is outside the server's directory.");
  }
  return candidate;
}

/**
 * Walks up from `targetPath` to the deepest ancestor that actually exists
 * on disk, realpath's it (resolving every symlink in the chain), and
 * verifies that still lands inside `root`. Catches a symlink planted
 * inside the server directory that points outside it — resolveSafePath
 * alone can't, since it never touches the filesystem.
 */
export async function assertNoSymlinkEscape(root: string, targetPath: string): Promise<void> {
  const normalizedRoot = path.resolve(root);
  let current = targetPath;

  for (;;) {
    try {
      const real = await fs.realpath(current);
      const relative = path.relative(normalizedRoot, real);
      if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new ForbiddenError("Path resolves outside the server's directory.");
      }
      return;
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    const parent = path.dirname(current);
    if (parent === current) return; // walked all the way up without finding anything that exists
    current = parent;
  }
}

/** Combines resolveSafePath + assertNoSymlinkEscape — the one function route handlers should actually call. */
export async function safeResolve(root: string, userPath: string): Promise<string> {
  const resolved = resolveSafePath(root, userPath);
  await assertNoSymlinkEscape(root, resolved);
  return resolved;
}

/** True if relPath refers to the root itself ("", ".", "/") — used to block destructive operations on the server's whole data directory. */
export function isRootPath(relPath: string): boolean {
  const normalized = relPath.replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized === "" || normalized === ".";
}
