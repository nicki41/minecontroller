-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "configEncrypted" TEXT NOT NULL,
    "serverStatus" BOOLEAN NOT NULL DEFAULT true,
    "playerActivity" BOOLEAN NOT NULL DEFAULT false,
    "crash" BOOLEAN NOT NULL DEFAULT true,
    "backup" BOOLEAN NOT NULL DEFAULT false,
    "performance" BOOLEAN NOT NULL DEFAULT false,
    "updateAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationChannel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationChannel_serverId_idx" ON "NotificationChannel"("serverId");
