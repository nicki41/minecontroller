-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "usernameLower" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "uuid" TEXT,
    "firstSeenAt" DATETIME,
    "lastSeenAt" DATETIME,
    "lastIp" TEXT,
    "totalPlaytimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "currentSessionStartedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerProfile_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerProfile_serverId_idx" ON "PlayerProfile"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_serverId_usernameLower_key" ON "PlayerProfile"("serverId", "usernameLower");
