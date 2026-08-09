import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient, Server } from "@prisma/client";
import { env } from "../../config/env.js";
import { safeResolve } from "../../lib/safePath.js";
import { BadRequestError } from "../../lib/errors.js";
import { resolveUuid } from "./playerData.service.js";

/**
 * Direct edits to ops.json/whitelist.json/banned-players.json/banned-ips.json
 * — the fallback path for op/whitelist/ban/tempban/ip-ban when the server
 * isn't RUNNING (no RCON connection to send the equivalent command to).
 * Minecraft owns these files and rewrites them whenever the matching RCON
 * command runs while the server IS running; while stopped, we're the only
 * writer, so we read-modify-write the same shape it would.
 */

interface OpsEntry {
  uuid: string;
  name: string;
  level?: number;
  bypassesPlayerLimit?: boolean;
}
interface WhitelistEntry {
  uuid: string;
  name: string;
}
interface BannedPlayerEntry {
  uuid: string;
  name: string;
  created?: string;
  source?: string;
  /** ISO-8601 timestamp, or "forever" — vanilla's own tempban mechanism, reused here for tempban-while-stopped instead of inventing a separate scheme. */
  expires?: string;
  reason?: string;
}
interface BannedIpEntry {
  ip: string;
  created?: string;
  source?: string;
  expires?: string;
  reason?: string;
}

async function readJsonFile<T>(root: string, filename: string): Promise<T[]> {
  try {
    const filePath = await safeResolve(root, filename);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(root: string, filename: string, data: T[]): Promise<void> {
  const filePath = await safeResolve(root, filename);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function dataRoot(server: Pick<Server, "dataDir">): string {
  return path.join(env.DATA_PATH, server.dataDir);
}

async function requireUuid(prisma: PrismaClient, server: Server, username: string): Promise<string> {
  const uuid = await resolveUuid(prisma, server, username);
  if (!uuid) {
    throw new BadRequestError(
      "This player's UUID isn't known yet — this only works once they've joined at least once, or while the server is running.",
    );
  }
  return uuid;
}

export async function addOpsEntry(prisma: PrismaClient, server: Server, username: string): Promise<void> {
  const uuid = await requireUuid(prisma, server, username);
  const root = dataRoot(server);
  const entries = await readJsonFile<OpsEntry>(root, "ops.json");
  const usernameLower = username.toLowerCase();
  const next = entries.filter((e) => e.name.toLowerCase() !== usernameLower);
  next.push({ uuid, name: username, level: 4, bypassesPlayerLimit: false });
  await writeJsonFile(root, "ops.json", next);
}

export async function removeOpsEntry(server: Server, username: string): Promise<void> {
  const root = dataRoot(server);
  const entries = await readJsonFile<OpsEntry>(root, "ops.json");
  const usernameLower = username.toLowerCase();
  await writeJsonFile(
    root,
    "ops.json",
    entries.filter((e) => e.name.toLowerCase() !== usernameLower),
  );
}

export async function addWhitelistEntry(prisma: PrismaClient, server: Server, username: string): Promise<void> {
  const uuid = await requireUuid(prisma, server, username);
  const root = dataRoot(server);
  const entries = await readJsonFile<WhitelistEntry>(root, "whitelist.json");
  const usernameLower = username.toLowerCase();
  const next = entries.filter((e) => e.name.toLowerCase() !== usernameLower);
  next.push({ uuid, name: username });
  await writeJsonFile(root, "whitelist.json", next);
}

export async function removeWhitelistEntry(server: Server, username: string): Promise<void> {
  const root = dataRoot(server);
  const entries = await readJsonFile<WhitelistEntry>(root, "whitelist.json");
  const usernameLower = username.toLowerCase();
  await writeJsonFile(
    root,
    "whitelist.json",
    entries.filter((e) => e.name.toLowerCase() !== usernameLower),
  );
}

export async function addBannedPlayerEntry(
  prisma: PrismaClient,
  server: Server,
  username: string,
  reason: string | undefined,
  expiresAt: Date | null,
): Promise<void> {
  const uuid = await requireUuid(prisma, server, username);
  const root = dataRoot(server);
  const entries = await readJsonFile<BannedPlayerEntry>(root, "banned-players.json");
  const usernameLower = username.toLowerCase();
  const next = entries.filter((e) => e.name.toLowerCase() !== usernameLower);
  next.push({
    uuid,
    name: username,
    created: new Date().toISOString(),
    source: "Server",
    expires: expiresAt ? expiresAt.toISOString() : "forever",
    reason: reason ?? "Banned by an operator.",
  });
  await writeJsonFile(root, "banned-players.json", next);
}

export async function removeBannedPlayerEntry(server: Server, username: string): Promise<void> {
  const root = dataRoot(server);
  const entries = await readJsonFile<BannedPlayerEntry>(root, "banned-players.json");
  const usernameLower = username.toLowerCase();
  await writeJsonFile(
    root,
    "banned-players.json",
    entries.filter((e) => e.name.toLowerCase() !== usernameLower),
  );
}

export async function addBannedIpEntry(server: Server, ip: string, reason: string | undefined): Promise<void> {
  const root = dataRoot(server);
  const entries = await readJsonFile<BannedIpEntry>(root, "banned-ips.json");
  const next = entries.filter((e) => e.ip !== ip);
  next.push({ ip, created: new Date().toISOString(), source: "Server", expires: "forever", reason: reason ?? "Banned by an operator." });
  await writeJsonFile(root, "banned-ips.json", next);
}

export async function removeBannedIpEntry(server: Server, ip: string): Promise<void> {
  const root = dataRoot(server);
  const entries = await readJsonFile<BannedIpEntry>(root, "banned-ips.json");
  await writeJsonFile(
    root,
    "banned-ips.json",
    entries.filter((e) => e.ip !== ip),
  );
}
