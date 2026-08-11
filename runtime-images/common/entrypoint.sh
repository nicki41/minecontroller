#!/bin/sh
set -e

# No auto-install of any kind happens here. The panel resolves the chosen
# version/software, downloads (or runs an installer for) it, and writes
# eula.txt + .mcpanel-launch.sh onto the bind-mounted /data BEFORE this
# container is ever created (see ServerInstaller). This script only verifies
# that actually happened and execs the result — it never fetches anything
# itself, so the long-lived, internet-exposed server container never needs
# outbound network access.

if [ ! -f /data/eula.txt ] || ! grep -q '^eula=true' /data/eula.txt; then
  echo "[entrypoint] /data/eula.txt missing or EULA not accepted — refusing to start." >&2
  exit 1
fi

if [ ! -f /data/.mcpanel-launch.sh ]; then
  echo "[entrypoint] /data/.mcpanel-launch.sh missing — install did not complete, refusing to start." >&2
  exit 1
fi

# exec, not sh -c/backgrounded: java must become PID 1 so Docker's SIGTERM
# (container stop) and stdin (console attach) reach it directly, with
# nothing sitting between the container and the actual server process.
exec sh /data/.mcpanel-launch.sh
