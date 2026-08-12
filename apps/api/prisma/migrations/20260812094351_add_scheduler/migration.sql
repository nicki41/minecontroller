/*
  Warnings:

  - You are about to drop the column `autoRestartEnabled` on the `Server` table. All the data in the column will be lost.
  - You are about to drop the column `restartCron` on the `Server` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "SchedulerWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    CONSTRAINT "SchedulerWorkflow_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchedulerWorkflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchedulerStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "delayAfterSec" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SchedulerStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "SchedulerWorkflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchedulerRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "log" TEXT,
    CONSTRAINT "SchedulerRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "SchedulerWorkflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "runtime" TEXT NOT NULL DEFAULT 'LEGACY',
    "javaImageTag" TEXT,
    "installManifest" TEXT,
    "containerId" TEXT,
    "containerName" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "cpuCores" REAL NOT NULL,
    "diskLimitMb" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "statusDetail" TEXT,
    "dataDir" TEXT NOT NULL,
    "eulaAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "diskLimitMb", "eulaAccepted", "id", "installManifest", "javaImageTag", "mcVersion", "memoryMb", "name", "port", "runtime", "software", "status", "statusDetail", "updatedAt") SELECT "buildVersion", "containerId", "containerName", "cpuCores", "createdAt", "dataDir", "description", "diskLimitMb", "eulaAccepted", "id", "installManifest", "javaImageTag", "mcVersion", "memoryMb", "name", "port", "runtime", "software", "status", "statusDetail", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_containerId_key" ON "Server"("containerId");
CREATE UNIQUE INDEX "Server_containerName_key" ON "Server"("containerName");
CREATE UNIQUE INDEX "Server_port_key" ON "Server"("port");
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SchedulerWorkflow_serverId_idx" ON "SchedulerWorkflow"("serverId");

-- CreateIndex
CREATE INDEX "SchedulerStep_workflowId_idx" ON "SchedulerStep"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerStep_workflowId_order_key" ON "SchedulerStep"("workflowId", "order");

-- CreateIndex
CREATE INDEX "SchedulerRun_workflowId_idx" ON "SchedulerRun"("workflowId");
