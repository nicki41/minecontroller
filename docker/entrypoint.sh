#!/bin/sh
set -e

# Runs as root so it CAN do the one privileged thing it needs to (grant the
# "node" user access to the host's bind-mounted Docker socket) before
# dropping down to it for everything else — including migrations, so the
# actual app process never runs a single line as root.
#
# /var/run/docker.sock is owned by whatever gid the "docker" group has ON
# THE HOST, which varies per machine and isn't known at image build time.
# The node user (fixed uid/gid 1000:1000, see Dockerfile) won't match that
# gid by default, so without this step every Docker API call from the app
# fails with EACCES the moment it tries to actually create a container —
# distinct from "socket not found", and only reproducible against a real
# Docker daemon, which is exactly why this was missed until now.
if [ -S /var/run/docker.sock ]; then
  DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
  if ! getent group "$DOCKER_GID" > /dev/null 2>&1; then
    groupadd -g "$DOCKER_GID" dockerhost
  fi
  DOCKER_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1)
  usermod -aG "$DOCKER_GROUP" node
fi

echo "[entrypoint] Applying database migrations..."
gosu node node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma
echo "[entrypoint] Migrations applied."

exec gosu node "$@"
