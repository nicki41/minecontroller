/*
  Warnings:

  - You are about to drop the column `difficulty` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `gamemode` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `maxPlayers` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `motd` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `onlineMode` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `pvp` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `simulationDistance` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `viewDistance` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `whitelistEnabled` on the `Server` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "software" TEXT NOT NULL,
    "mcVersion" TEXT NOT NULL,
    "buildVersion" TEXT,
    "containerId" TEXT,
    "containerName" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "cpuCores" REAL NOT NULL,
    "diskLimitMb" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "statusDetail" TEXT,
    "dataDir" TEXT NOT NULL,
    "autoRestartEnabled" BOOLEAN NOT NULL DEFAULT false,
    "restartCron" TEXT,
    "eulaAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("autoRestartEnabled", "buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "diskLimitMb", "eulaAccepted", "id", "mcVersion", "memoryMb", "name", "port", "restartCron", "software", "status", "statusDetail", "updatedAt") SELECT "autoRestartEnabled", "buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "diskLimitMb", "eulaAccepted", "id", "mcVersion", "memoryMb", "name", "port", "restartCron", "software", "status", "statusDetail", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_containerId_key" ON "Server"("containerId");
CREATE UNIQUE INDEX "Server_containerName_key" ON "Server"("containerName");
CREATE UNIQUE INDEX "Server_port_key" ON "Server"("port");
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
