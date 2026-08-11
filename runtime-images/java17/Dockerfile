# syntax=docker/dockerfile:1

# Minimal Java-only runtime for panel-managed Minecraft servers (Server.runtime
# = "PANEL_MANAGED") — no auto-install magic of any kind, unlike
# itzg/docker-minecraft-server. The panel resolves/downloads/installs
# everything onto the bind-mounted /data before this container is ever
# created; entrypoint.sh only verifies the result and execs it. Used for
# Minecraft versions whose required Java major is 17 (roughly 1.18-1.20.4) —
# see apps/api/src/minecraft/runtime/runtimeImages.ts for the version→tag mapping.
FROM eclipse-temurin:17-jre-jammy

# Fixed uid/gid 1000, not eclipse-temurin's default (root). The panel creates
# the bind-mounted host data dir itself (see MinecraftServerManager), so it
# can chown it to this fixed uid up front instead of needing the root-at-boot
# chown/setuid dance itzg's image relies on.
RUN groupadd -g 1000 mcserver \
  && useradd -u 1000 -g 1000 -M -d /data mcserver

COPY --chmod=755 common/entrypoint.sh /entrypoint.sh

USER mcserver
WORKDIR /data
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
