import fs from "node:fs/promises";
import path from "node:path";
import type { Server } from "@prisma/client";
import type { PlayerDto } from "@minecraftpanel/shared";
import { env } from "../../config/env.js";
import { safeResolve } from "../../lib/safePath.js";
import { BadRequestError, ConflictError } from "../../lib/errors.js";
import { MinecraftServerManager } from "../../minecraft/MinecraftServerManager.js";

const VALID_USERNAME = /^[A-Za-z0-9_]{1,16}$/;

/**
 * Usernames and kick/ban reasons get interpolated into RCON command
 * strings. RCON isn't a shell, so classic shell-injection doesn't apply,
 * but nothing stops a malformed value from breaking the intended command
 * or smuggling an extra one — validated the same way any user input feeding
 * a command interpreter should be, per spec's command-injection guidance.
 */
function assertValidUsername(username: string): void {
  if (!VALID_USERNAME.test(username)) {
    throw new BadRequestError("Invalid Minecraft username.");
  }
}

function sanitizeReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  const cleaned = reason.replace(/[\r\n]+/g, " ").trim();
  return cleaned || undefined;
}

interface OpsEntry {
  uuid: string;
  name: string;
}
interface WhitelistEntry {
  uuid: string;
  name: string;
}
interface BannedPlayerEntry {
  uuid: string;
  name: string;
}
interface UserCacheEntry {
  name: string;
  uuid: string;
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

/**
 * Every mutating action here requires the server to be RUNNING and goes
 * through RCON commands — Minecraft updates ops.json/whitelist.json/
 * banned-players.json itself when a command runs, so there's no separate
 * file-write path to keep in sync. Managing players while the server is
 * stopped (editing those JSON files directly) is a reasonable future
 * addition but out of scope here; the UI disables the actions with an
 * explanation instead of silently no-op'ing.
 */
export class PlayerService {
  constructor(private readonly manager: MinecraftServerManager) {}

  async list(server: Server): Promise<PlayerDto[]> {
    const root = path.join(env.DATA_PATH, server.dataDir);
    const [ops, whitelist, banned, cache, online] = await Promise.all([
      readJsonFile<OpsEntry>(root, "ops.json"),
      readJsonFile<WhitelistEntry>(root, "whitelist.json"),
      readJsonFile<BannedPlayerEntry>(root, "banned-players.json"),
      readJsonFile<UserCacheEntry>(root, "usercache.json"),
      this.getOnlinePlayerNames(server),
    ]);

    const byName = new Map<string, PlayerDto>();
    const ensure = (name: string, uuid: string | null): PlayerDto => {
      const key = name.toLowerCase();
      let entry = byName.get(key);
      if (!entry) {
        entry = { username: name, uuid, online: false, op: false, whitelisted: false, banned: false };
        byName.set(key, entry);
      } else if (!entry.uuid && uuid) {
        entry.uuid = uuid;
      }
      return entry;
    };

    for (const e of cache) ensure(e.name, e.uuid);
    for (const e of ops) ensure(e.name, e.uuid).op = true;
    for (const e of whitelist) ensure(e.name, e.uuid).whitelisted = true;
    for (const e of banned) ensure(e.name, e.uuid).banned = true;
    for (const name of online) ensure(name, null).online = true;

    return [...byName.values()].sort((a, b) => a.username.localeCompare(b.username));
  }

  private async getOnlinePlayerNames(server: Server): Promise<string[]> {
    if (server.status !== "RUNNING") return [];
    try {
      const response = await this.manager.sendCommand(server.id, "list");
      // "There are 2 of a max of 20 players online: Alice, Bob"
      const match = /:\s*(.+)$/.exec(response.trim());
      if (!match?.[1]) return [];
      return match[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private async requireRunning(server: Server): Promise<void> {
    if (server.status !== "RUNNING") {
      throw new ConflictError("The server must be running to manage players.");
    }
  }

  async op(server: Server, username: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    await this.manager.sendCommand(server.id, `op ${username}`);
  }

  async deop(server: Server, username: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    await this.manager.sendCommand(server.id, `deop ${username}`);
  }

  async whitelistAdd(server: Server, username: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    await this.manager.sendCommand(server.id, `whitelist add ${username}`);
  }

  async whitelistRemove(server: Server, username: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    await this.manager.sendCommand(server.id, `whitelist remove ${username}`);
  }

  async kick(server: Server, username: string, reason?: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    const cleanReason = sanitizeReason(reason);
    await this.manager.sendCommand(server.id, cleanReason ? `kick ${username} ${cleanReason}` : `kick ${username}`);
  }

  async ban(server: Server, username: string, reason?: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    const cleanReason = sanitizeReason(reason);
    await this.manager.sendCommand(server.id, cleanReason ? `ban ${username} ${cleanReason}` : `ban ${username}`);
  }

  async unban(server: Server, username: string): Promise<void> {
    assertValidUsername(username);
    await this.requireRunning(server);
    await this.manager.sendCommand(server.id, `pardon ${username}`);
  }
}
