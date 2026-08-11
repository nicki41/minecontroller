import crypto from "node:crypto";
import { BadRequestError } from "./errors.js";

export interface DownloadHashes {
  sha1?: string;
  sha256?: string;
  sha512?: string;
}

/**
 * SSRF hardening: callers pass an explicit allowlist of trusted hostnames —
 * there is no default. A URL that's technically attacker-influenced (e.g.
 * relayed through a third-party API response) must still never let this
 * process fetch something outside the one CDN/registry it's meant to.
 */
export function assertTrustedDownloadUrl(rawUrl: string, allowedHosts: ReadonlySet<string>): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestError("Invalid download URL.");
  }
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new BadRequestError("Refusing to download from an untrusted host.");
  }
  return parsed;
}

/** Downloads a file and verifies it against the strongest provided hash (sha512 > sha256 > sha1), if any were given. */
export async function downloadAndVerify(
  url: string,
  allowedHosts: ReadonlySet<string>,
  hashes: DownloadHashes = {},
  timeoutMs = 120_000,
): Promise<Buffer> {
  assertTrustedDownloadUrl(url, allowedHosts);
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new BadRequestError(`Failed to download file: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (hashes.sha512) {
    verifyHash(buffer, "sha512", hashes.sha512);
  } else if (hashes.sha256) {
    verifyHash(buffer, "sha256", hashes.sha256);
  } else if (hashes.sha1) {
    verifyHash(buffer, "sha1", hashes.sha1);
  }

  return buffer;
}

function verifyHash(buffer: Buffer, algorithm: "sha1" | "sha256" | "sha512", expected: string): void {
  const actual = crypto.createHash(algorithm).update(buffer).digest("hex");
  if (actual !== expected) throw new BadRequestError(`Downloaded file failed ${algorithm.toUpperCase()} integrity check.`);
}
