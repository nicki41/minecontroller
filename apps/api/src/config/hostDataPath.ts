import os from "node:os";
import Docker from "dockerode";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

let cached: string | undefined;

/**
 * The host-side path to this project's ./data folder — needed because the
 * API creates sibling Minecraft containers via the host's Docker daemon,
 * which has no notion of this container's own /data view (see
 * DockerMinecraftRuntime.createContainer / docs/configuration.md). Rather
 * than requiring the operator to type that path into .env by hand, this
 * self-inspects: Docker sets a container's hostname to its own short ID
 * unless docker-compose.yml overrides it (ours doesn't), so the container
 * can ask the daemon for its own Mounts and read back the host path the
 * daemon already knows for DATA_PATH. HOST_DATA_PATH in .env still works as
 * an explicit override for setups where this detection doesn't apply
 * (rootless Docker, a renamed hostname, Podman, ...).
 */
export async function resolveHostDataPath(): Promise<string> {
  if (cached) return cached;
  if (env.HOST_DATA_PATH) {
    cached = env.HOST_DATA_PATH;
    return cached;
  }

  const docker = new Docker({ socketPath: env.DOCKER_SOCKET_PATH });
  const containerId = os.hostname();
  let mount: { Source: string } | undefined;
  try {
    const info = await docker.getContainer(containerId).inspect();
    mount = info.Mounts?.find((m) => m.Destination === env.DATA_PATH);
  } catch (err) {
    logger.warn({ err, containerId }, "Could not inspect own container to auto-detect HOST_DATA_PATH");
  }

  if (!mount?.Source) {
    throw new Error(
      "Could not auto-detect the host path for the data volume (self-inspection of this container's mounts failed " +
        "or found no /data bind mount). Set HOST_DATA_PATH explicitly in .env — see docs/configuration.md.",
    );
  }

  cached = mount.Source;
  logger.info({ hostDataPath: cached }, "Auto-detected HOST_DATA_PATH from this container's own mounts");
  return cached;
}
