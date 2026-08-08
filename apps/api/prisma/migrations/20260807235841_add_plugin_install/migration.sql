-- CreateTable
CREATE TABLE "PluginInstall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "activeFilename" TEXT NOT NULL,
    "modrinthProjectId" TEXT NOT NULL,
    "modrinthVersionId" TEXT NOT NULL,
    "versionNumber" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "iconUrl" TEXT,
    "slug" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginInstall_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PluginInstall_serverId_idx" ON "PluginInstall"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "PluginInstall_serverId_activeFilename_key" ON "PluginInstall"("serverId", "activeFilename");
