import fs from "node:fs/promises";
import path from "node:path";
import * as tar from "tar";
import type { PrismaClient, Server } from "@prisma/client";
import type { BackupDto } from "@minecraftpanel/shared";
import { env } from "../../config/env.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

function backupsDirFor(serverId: string): string {
  return path.join(env.DATA_PATH, "backups", serverId);
}

function serverDataDirFor(server: Pick<Server, "dataDir">): string {
  return path.join(env.DATA_PATH, server.dataDir);
}

function serialize(backup: {
  id: string;
  fileName: string;
  sizeBytes: bigint;
  note: string | null;
  createdAt: Date;
  createdBy: { username: string } | null;
}): BackupDto {
  return {
    id: backup.id,
    fileName: backup.fileName,
    sizeBytes: backup.sizeBytes.toString(),
    note: backup.note,
    createdByUsername: backup.createdBy?.username ?? null,
    createdAt: backup.createdAt.toISOString(),
  };
}

/**
 * Manual, on-demand backups: the whole server data directory tar.gz'd into
 * DATA_PATH/backups/<serverId>/ (kept outside the server's own directory so
 * a restore never overwrites the backups it could restore from). Restoring
 * replaces the server directory entirely rather than merging over it, so
 * the result matches the backup exactly — which is why it's only allowed
 * while the server is stopped.
 */
export class BackupService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(serverId: string): Promise<BackupDto[]> {
    const backups = await this.prisma.backup.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { username: true } } },
    });
    return backups.map(serialize);
  }

  async create(server: Server, note: string | undefined, createdById: string): Promise<BackupDto> {
    const dir = backupsDirFor(server.id);
    await fs.mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${timestamp}.tar.gz`;
    const backupPath = path.join(dir, fileName);
    const dataDir = serverDataDirFor(server);
    await fs.mkdir(dataDir, { recursive: true });

    await tar.create({ gzip: true, file: backupPath, cwd: dataDir }, ["."]);
    const stat = await fs.stat(backupPath);

    const backup = await this.prisma.backup.create({
      data: { serverId: server.id, fileName, sizeBytes: BigInt(stat.size), note: note ?? null, createdById },
      include: { createdBy: { select: { username: true } } },
    });
    return serialize(backup);
  }

  async getFilePath(serverId: string, backupId: string): Promise<{ path: string; fileName: string }> {
    const backup = await this.requireBackup(serverId, backupId);
    return { path: path.join(backupsDirFor(serverId), backup.fileName), fileName: backup.fileName };
  }

  async delete(serverId: string, backupId: string): Promise<void> {
    const backup = await this.requireBackup(serverId, backupId);
    await fs.rm(path.join(backupsDirFor(serverId), backup.fileName), { force: true });
    await this.prisma.backup.delete({ where: { id: backup.id } });
  }

  async restore(server: Server, backupId: string): Promise<void> {
    if (server.status === "RUNNING" || server.status === "STARTING" || server.status === "STOPPING") {
      throw new ConflictError("Stop the server before restoring a backup.");
    }
    const backup = await this.requireBackup(server.id, backupId);
    const backupPath = path.join(backupsDirFor(server.id), backup.fileName);
    const dataDir = serverDataDirFor(server);

    await fs.rm(dataDir, { recursive: true, force: true });
    await fs.mkdir(dataDir, { recursive: true });
    await tar.extract({ file: backupPath, cwd: dataDir });
  }

  /** Called from server deletion so backups don't become orphaned files with no owning server. */
  async deleteAllForServer(serverId: string): Promise<void> {
    await fs.rm(backupsDirFor(serverId), { recursive: true, force: true }).catch(() => {});
  }

  private async requireBackup(serverId: string, backupId: string) {
    const backup = await this.prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup || backup.serverId !== serverId) throw new NotFoundError("Backup not found.");
    return backup;
  }
}
