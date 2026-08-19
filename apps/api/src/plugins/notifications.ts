import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { ServerStatus } from "@minecraftpanel/shared";
import { NotificationDispatcherService } from "../modules/notifications/notificationDispatcher.service.js";
import { PerformanceChecker } from "../modules/notifications/performanceChecker.js";
import { UpdateChecker } from "../modules/notifications/updateChecker.js";
import { resolveVapidKeys } from "../modules/notifications/vapidKeys.js";
import { configureWebPush } from "../modules/notifications/webPushSender.js";
import { logger } from "../lib/logger.js";

declare module "fastify" {
  interface FastifyInstance {
    notificationDispatcher: NotificationDispatcherService;
  }
}

/**
 * Wires the notification dispatcher to every event source: server status
 * transitions (MinecraftServerManager), player join/leave
 * (PlayerActivityTracker), and the two self-contained pollers below. Must
 * be registered after the minecraft/metricsHistory/playerActivity plugins
 * (app.ts does this by registration order, same convention as every other
 * plugin dependency in this app — none of them declare fastify-plugin's
 * `dependencies` option). The backup category is dispatched directly from
 * backups.routes.ts instead (it's a request-triggered action, not a
 * background event source).
 */
export default fp(async (fastify: FastifyInstance) => {
  const vapidKeys = await resolveVapidKeys(fastify.prisma);
  configureWebPush(vapidKeys);

  const dispatcher = new NotificationDispatcherService(fastify.prisma);
  fastify.decorate("notificationDispatcher", dispatcher);

  fastify.serverManager.on("status", (serverId: string, status: ServerStatus) => {
    void handleStatusChange(fastify, dispatcher, serverId, status).catch((err) =>
      logger.debug({ err, serverId, status }, "Failed to dispatch server-status notification"),
    );
  });

  fastify.playerActivityTracker.on("playerJoin", (serverId: string, username: string) => {
    void dispatcher
      .dispatch({ serverId, category: "playerActivity", title: `${username} joined`, body: `${username} joined the server.` })
      .catch((err) => logger.debug({ err, serverId }, "Failed to dispatch playerJoin notification"));
  });
  fastify.playerActivityTracker.on("playerLeave", (serverId: string, username: string) => {
    void dispatcher
      .dispatch({ serverId, category: "playerActivity", title: `${username} left`, body: `${username} left the server.` })
      .catch((err) => logger.debug({ err, serverId }, "Failed to dispatch playerLeave notification"));
  });

  const performanceChecker = new PerformanceChecker(fastify.prisma, fastify.metricsHistory, dispatcher);
  performanceChecker.start();

  const updateChecker = new UpdateChecker(fastify.prisma, dispatcher);
  updateChecker.start();

  fastify.addHook("onClose", async () => {
    performanceChecker.stop();
    updateChecker.stop();
  });
});

async function handleStatusChange(
  fastify: FastifyInstance,
  dispatcher: NotificationDispatcherService,
  serverId: string,
  status: ServerStatus,
): Promise<void> {
  if (status !== "RUNNING" && status !== "STOPPED" && status !== "ERROR") return;

  const server = await fastify.prisma.server.findUnique({ where: { id: serverId }, select: { name: true } });
  if (!server) return;

  if (status === "RUNNING") {
    await dispatcher.dispatch({
      serverId,
      category: "serverStatus",
      title: `${server.name} is online`,
      body: `${server.name} is now running.`,
    });
  } else if (status === "STOPPED") {
    await dispatcher.dispatch({
      serverId,
      category: "serverStatus",
      title: `${server.name} is offline`,
      body: `${server.name} has stopped.`,
    });
  } else {
    await dispatcher.dispatch({
      serverId,
      category: "crash",
      title: `${server.name}: error`,
      body: `${server.name} entered an error state — check its console/logs.`,
    });
  }
}
