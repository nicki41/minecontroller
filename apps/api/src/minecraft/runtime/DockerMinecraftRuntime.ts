import type { Readable } from "node:stream";
import Docker from "dockerode";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export const CONTAINER_GAME_PORT = 25565;
export const CONTAINER_RCON_PORT = 25575;
const CONTAINER_PREFIX = "mcpanel-";

export interface CreateContainerOptions {
  serverId: string;
  containerName: string;
  /** From MinecraftServerProvider#resolveEnv() — TYPE plus any loader/build pin. */
  softwareEnv: Record<string, string>;
  mcVersion: string;
  hostPort: number;
  memoryMb: number;
  cpuCores: number;
  rconPassword: string;
  /** Must be true — the caller (MinecraftServerManager) is responsible for only ever passing the user's actual, explicit consent through here. */
  eulaAccepted: boolean;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  /** Cumulative bytes received/sent since the container started, summed across every network interface. */
  networkRxBytes: number;
  networkTxBytes: number;
  startedAt: string | null;
}

export class DockerMinecraftRuntime {
  private readonly docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: env.DOCKER_SOCKET_PATH });
  }

  static containerNameFor(serverId: string): string {
    return `${CONTAINER_PREFIX}${serverId}`;
  }

  async ensureNetwork(): Promise<void> {
    const networks = await this.docker.listNetworks({ filters: JSON.stringify({ name: [env.MINECRAFT_NETWORK] }) });
    if (networks.some((n) => n.Name === env.MINECRAFT_NETWORK)) return;
    await this.docker.createNetwork({ Name: env.MINECRAFT_NETWORK, Driver: "bridge", CheckDuplicate: true });
    logger.info({ network: env.MINECRAFT_NETWORK }, "Created Minecraft Docker network");
  }

  /**
   * createContainer's Docker API call fails outright with "No such image"
   * if it isn't already present locally — unlike the `docker` CLI, the API
   * never pulls implicitly. First server creation on a fresh host would
   * otherwise always fail; this makes that a one-time, automatic wait
   * instead of a manual `docker pull` the user has to know to run.
   */
  async ensureImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
      return;
    } catch (err) {
      if (!isDockerStatus(err, 404)) throw err;
    }

    logger.info({ image }, "Minecraft server image not present locally — pulling (first use only)...");
    const stream = await this.docker.pull(image);
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
    });
    logger.info({ image }, "Image pull complete.");
  }

  async createContainer(options: CreateContainerOptions): Promise<string> {
    await Promise.all([this.ensureNetwork(), this.ensureImage(env.MINECRAFT_IMAGE)]);

    // Always forward-slash: this string is interpreted by the Docker
    // daemon (always Linux, even under Docker Desktop), never by the API
    // process's own OS — see README "Docker socket & host paths".
    const hostDataDir = `${env.HOST_DATA_PATH.replace(/\/+$/, "")}/servers/${options.serverId}`;

    const envVars: Record<string, string> = {
      // Never default to accepted: absent explicit, validated consent this
      // must stay "FALSE" so the itzg image itself refuses to run the server.
      EULA: options.eulaAccepted ? "TRUE" : "FALSE",
      VERSION: options.mcVersion,
      MEMORY: `${options.memoryMb}M`,
      SERVER_PORT: String(CONTAINER_GAME_PORT),
      ENABLE_RCON: "true",
      RCON_PASSWORD: options.rconPassword,
      RCON_PORT: String(CONTAINER_RCON_PORT),
      UID: "1000",
      GID: "1000",
      // Deliberately no MOTD/MAX_PLAYERS/DIFFICULTY/MODE/ENABLE_WHITELIST/
      // ONLINE_MODE/PVP/VIEW_DISTANCE/SIMULATION_DISTANCE here: the itzg
      // image re-applies any of these that ARE set into server.properties
      // on *every* container start, which would silently stomp the panel's
      // own server.properties edits back to whatever these env vars were
      // frozen at when the container was created (env vars can't change
      // without recreating the container, but the file is meant to be
      // live-editable via Settings → Server Properties). The panel writes
      // server.properties directly instead — see
      // MinecraftServerManager.provisionInBackground() and
      // ServerConfigService.createWithDefaults().
      ...options.softwareEnv,
    };

    const container = await this.docker.createContainer({
      name: options.containerName,
      Image: env.MINECRAFT_IMAGE,
      Env: Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
      // Raw (non-multiplexed) log/attach output and the interactive-console
      // mode the image documents itself for — see README for why we still
      // don't set OpenStdin (commands go through RCON instead).
      Tty: true,
      ExposedPorts: { [`${CONTAINER_GAME_PORT}/tcp`]: {} },
      HostConfig: {
        Memory: options.memoryMb * 1024 * 1024,
        MemorySwap: options.memoryMb * 1024 * 1024, // no swap beyond the memory limit
        NanoCpus: Math.round(options.cpuCores * 1e9),
        PidsLimit: 2048,
        // No CapDrop here (unlike the panel's own API container): the
        // itzg/docker-minecraft-server entrypoint starts as root and does
        // its own privilege drop to a "minecraft" user — chown'ing /data
        // and calling setuid()/setgid() — before the actual game process
        // ever runs. That needs CAP_CHOWN/CAP_SETUID/CAP_SETGID at minimum;
        // chasing this image's exact undocumented bootstrap requirements
        // capability-by-capability (found two so far just by testing) is
        // fragile and liable to break again on any image update, so this
        // relies on Docker's already-curated default capability set (far
        // narrower than the host's) instead. The end state is the same
        // either way — the long-running Minecraft process itself is
        // non-root — just via the image's own mechanism rather than ours.
        SecurityOpt: ["no-new-privileges:true"],
        RestartPolicy: { Name: "unless-stopped" },
        PortBindings: { [`${CONTAINER_GAME_PORT}/tcp`]: [{ HostPort: String(options.hostPort) }] },
        Binds: [`${hostDataDir}:/data`],
        LogConfig: { Type: "json-file", Config: { "max-size": "10m", "max-file": "3" } },
      },
      NetworkingConfig: { EndpointsConfig: { [env.MINECRAFT_NETWORK]: {} } },
      Labels: { "minecraftpanel.serverId": options.serverId },
    });

    return container.id;
  }

  async start(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).start();
  }

  async stop(containerId: string, timeoutSeconds = 30): Promise<void> {
    try {
      await this.docker.getContainer(containerId).stop({ t: timeoutSeconds });
    } catch (err) {
      if (!isDockerStatus(err, 304)) throw err; // 304 = already stopped
    }
  }

  async restart(containerId: string, timeoutSeconds = 30): Promise<void> {
    await this.docker.getContainer(containerId).restart({ t: timeoutSeconds });
  }

  async remove(containerId: string, force = true): Promise<void> {
    try {
      await this.docker.getContainer(containerId).remove({ force, v: true });
    } catch (err) {
      if (!isDockerStatus(err, 404)) throw err;
    }
  }

  async inspect(containerId: string): Promise<Docker.ContainerInspectInfo | null> {
    try {
      return await this.docker.getContainer(containerId).inspect();
    } catch (err) {
      if (isDockerStatus(err, 404)) return null;
      throw err;
    }
  }

  async getStats(containerId: string): Promise<ContainerStats | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const [stats, info] = await Promise.all([container.stats({ stream: false }), container.inspect()]);
      return {
        ...computeStats(stats as unknown as DockerStatsPayload),
        startedAt: info.State.Running ? info.State.StartedAt : null,
      };
    } catch (err) {
      if (isDockerStatus(err, 404)) return null;
      throw err;
    }
  }

  /** Live-following log stream (raw text — container runs with Tty:true, so no demuxing needed). */
  getLogStream(containerId: string, options: { tail?: number; since?: number } = {}): Promise<Readable> {
    return this.docker.getContainer(containerId).logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: options.tail ?? 200,
      since: options.since,
      timestamps: false,
    }) as unknown as Promise<Readable>;
  }

  getContainer(containerId: string): Docker.Container {
    return this.docker.getContainer(containerId);
  }
}

interface DockerStatsPayload {
  cpu_stats: {
    cpu_usage: { total_usage: number; percpu_usage?: number[] };
    system_cpu_usage?: number;
    online_cpus?: number;
  };
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number };
  memory_stats: { usage?: number; limit?: number; stats?: { cache?: number; inactive_file?: number } };
  networks?: Record<string, { rx_bytes?: number; tx_bytes?: number }>;
}

function computeStats(stats: DockerStatsPayload): Omit<ContainerStats, "startedAt"> {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = (stats.cpu_stats.system_cpu_usage ?? 0) - (stats.precpu_stats.system_cpu_usage ?? 0);
  const onlineCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
  const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

  const memoryUsageBytes = stats.memory_stats.usage ?? 0;
  const memoryLimitBytes = stats.memory_stats.limit ?? 0;
  // Docker's raw "usage" includes reclaimable page cache; subtract it for a
  // number that more closely matches what a human expects "RAM used" to mean.
  const cacheBytes = stats.memory_stats.stats?.cache ?? stats.memory_stats.stats?.inactive_file ?? 0;

  let networkRxBytes = 0;
  let networkTxBytes = 0;
  for (const iface of Object.values(stats.networks ?? {})) {
    networkRxBytes += iface.rx_bytes ?? 0;
    networkTxBytes += iface.tx_bytes ?? 0;
  }

  return {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memoryUsageBytes: Math.max(0, memoryUsageBytes - cacheBytes),
    memoryLimitBytes,
    networkRxBytes,
    networkTxBytes,
  };
}

function isDockerStatus(err: unknown, statusCode: number): boolean {
  return typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: unknown }).statusCode === statusCode;
}
