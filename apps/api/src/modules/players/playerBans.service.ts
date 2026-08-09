import type { PrismaClient, Server } from "@prisma/client";
import type { PlayerBanDto } from "@minecraftpanel/shared";
import { ConflictError } from "../../lib/errors.js";
import type { MinecraftServerManager } from "../../minecraft/MinecraftServerManager.js";
import { assertValidUsername, sanitizeReason } from "./players.service.js";
import { logger } from "../../lib/logger.js";

async function requireRunning(server: Pick<Server, "status">): Promise<void> {
  if (server.status !== "RUNNING") {
    throw new ConflictError("The server must be running to manage bans.");
  }
}

function toBanDto(
  row: {
    id: string;
    type: string;
    target: string;
    reason: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    revokedReason: string | null;
    createdBy: { username: string } | null;
    revokedBy: { username: string } | null;
  },
): PlayerBanDto {
  return {
    id: row.id,
    type: row.type as PlayerBanDto["type"],
    target: row.target,
    reason: row.reason,
    createdByUsername: row.createdBy?.username ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedByUsername: row.revokedBy?.username ?? null,
    revokedReason: row.revokedReason,
  };
}

/**
 * Ban-history bookkeeping layered on top of PlayerService's existing RCON
 * kick/ban/unban — tempban and IP-ban aren't in vanilla's `/ban` at all (no
 * duration support), and ban-ip/pardon-ip exist but nothing anywhere
 * persisted *why* a ban happened or when it should lapse. Every mutating
 * method here follows the same assertValidUsername -> requireRunning ->
 * sendCommand shape as PlayerService, then records/updates a PlayerBan row.
 */
export class PlayerBanService {
  constructor(
    private readonly manager: MinecraftServerManager,
    private readonly prisma: PrismaClient,
  ) {}

  async tempBan(server: Server, username: string, durationMinutes: number, actorUserId: string, reason?: string): Promise<void> {
    assertValidUsername(username);
    await requireRunning(server);
    const cleanReason = sanitizeReason(reason);
    await this.manager.sendCommand(server.id, cleanReason ? `ban ${username} ${cleanReason}` : `ban ${username}`);

    const expiresAt = new Date(Date.now() + durationMinutes * 60_000);
    await this.prisma.playerBan.create({
      data: {
        serverId: server.id,
        usernameLower: username.toLowerCase(),
        username,
        type: "NAME",
        target: username,
        reason: cleanReason ?? null,
        createdById: actorUserId,
        expiresAt,
      },
    });
  }

  async banIp(server: Server, contextUsername: string, ip: string, actorUserId: string, reason?: string): Promise<void> {
    assertValidUsername(contextUsername);
    await requireRunning(server);
    const cleanReason = sanitizeReason(reason);
    await this.manager.sendCommand(server.id, cleanReason ? `ban-ip ${ip} ${cleanReason}` : `ban-ip ${ip}`);

    await this.prisma.playerBan.create({
      data: {
        serverId: server.id,
        usernameLower: contextUsername.toLowerCase(),
        username: contextUsername,
        type: "IP",
        target: ip,
        reason: cleanReason ?? null,
        createdById: actorUserId,
      },
    });
  }

  async unbanIp(server: Server, ip: string, actorUserId: string): Promise<void> {
    await requireRunning(server);
    await this.manager.sendCommand(server.id, `pardon-ip ${ip}`);

    await this.prisma.playerBan.updateMany({
      where: { serverId: server.id, type: "IP", target: ip, revokedAt: null },
      data: { revokedAt: new Date(), revokedById: actorUserId },
    });
  }

  /** Revokes any open NAME-type ban rows for a player — called by PlayerService.unban() alongside the RCON pardon. */
  async revokeNameBans(serverId: string, username: string, actorUserId: string): Promise<void> {
    await this.prisma.playerBan.updateMany({
      where: { serverId, type: "NAME", usernameLower: username.toLowerCase(), revokedAt: null },
      data: { revokedAt: new Date(), revokedById: actorUserId },
    });
  }

  async listBans(serverId: string, username: string): Promise<PlayerBanDto[]> {
    const rows = await this.prisma.playerBan.findMany({
      where: { serverId, usernameLower: username.toLowerCase() },
      include: { createdBy: { select: { username: true } }, revokedBy: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toBanDto);
  }
}

/** The subset of MinecraftServerManager expireDueBans needs — lets PlayerActivityTracker call it with its own narrower PlayerActivityManager interface instead of the concrete class. */
interface CommandSender {
  sendCommand(serverId: string, command: string): Promise<string>;
}

/**
 * Auto-pardons and revokes any tempban whose expiresAt has passed. Called
 * from PlayerActivityTracker's existing per-server reconcile tick (already
 * runs every 60s for every RUNNING server) rather than a separate scheduler.
 */
export async function expireDueBans(prisma: PrismaClient, manager: CommandSender, serverId: string): Promise<void> {
  const due = await prisma.playerBan.findMany({
    where: { serverId, type: "NAME", revokedAt: null, expiresAt: { lte: new Date() } },
  });
  for (const ban of due) {
    try {
      await manager.sendCommand(serverId, `pardon ${ban.username}`);
      await prisma.playerBan.update({ where: { id: ban.id }, data: { revokedAt: new Date(), revokedById: null } });
    } catch (err) {
      logger.debug({ err, serverId, banId: ban.id }, "Failed to auto-expire tempban");
    }
  }
}
