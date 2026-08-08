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
    "motd" TEXT NOT NULL DEFAULT 'A Minecraft Server',
    "maxPlayers" INTEGER NOT NULL DEFAULT 20,
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "gamemode" TEXT NOT NULL DEFAULT 'survival',
    "whitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onlineMode" BOOLEAN NOT NULL DEFAULT true,
    "pvp" BOOLEAN NOT NULL DEFAULT true,
    "viewDistance" INTEGER NOT NULL DEFAULT 10,
    "simulationDistance" INTEGER NOT NULL DEFAULT 10,
    "autoRestartEnabled" BOOLEAN NOT NULL DEFAULT false,
    "restartCron" TEXT,
    "eulaAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("autoRestartEnabled", "buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "difficulty", "diskLimitMb", "gamemode", "id", "maxPlayers", "mcVersion", "memoryMb", "motd", "name", "onlineMode", "port", "pvp", "restartCron", "simulationDistance", "software", "status", "statusDetail", "updatedAt", "viewDistance", "whitelistEnabled") SELECT "autoRestartEnabled", "buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "difficulty", "diskLimitMb", "gamemode", "id", "maxPlayers", "mcVersion", "memoryMb", "motd", "name", "onlineMode", "port", "pvp", "restartCron", "simulationDistance", "software", "status", "statusDetail", "updatedAt", "viewDistance", "whitelistEnabled" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_containerId_key" ON "Server"("containerId");
CREATE UNIQUE INDEX "Server_containerName_key" ON "Server"("containerName");
CREATE UNIQUE INDEX "Server_port_key" ON "Server"("port");
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
