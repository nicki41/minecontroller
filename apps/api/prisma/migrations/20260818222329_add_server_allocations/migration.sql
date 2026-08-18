-- CreateTable
CREATE TABLE "ServerAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerAllocation_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerAllocation_port_key" ON "ServerAllocation"("port");

-- CreateIndex
CREATE INDEX "ServerAllocation_serverId_idx" ON "ServerAllocation"("serverId");
