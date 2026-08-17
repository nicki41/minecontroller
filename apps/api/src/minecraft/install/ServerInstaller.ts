import fs from "node:fs/promises";
import path from "node:path";
import type { Server } from "@prisma/client";
import { env } from "../../config/env.js";
import { safeResolve } from "../../lib/safePath.js";
import { downloadAndVerify } from "../../lib/download.js";
import { BadRequestError } from "../../lib/errors.js";
import { resolveRuntimeImageTag } from "../runtime/runtimeImages.js";
import type { InstallPlan } from "../providers/types.js";

// Direct-download sources currently in use (Vanilla/Paper/Fabric) — verified
// live against the real APIs while designing this, not assumed: Mojang
// serves the server jar itself from piston-data (not piston-meta, which is
// only the metadata host), Paper serves it from fill-data (not fill, which
// is only the API host), and Fabric serves its self-contained launcher jar
// straight from meta.fabricmc.net (the same host as its metadata calls —
// no separate data host, unlike Mojang/Paper). Forge/NeoForge (milestone 5)
// use real installer *programs* instead of a direct download and will need
// a different mechanism, not just another host added here.
const ALLOWED_DOWNLOAD_HOSTS = new Set(["piston-data.mojang.com", "fill-data.papermc.io", "meta.fabricmc.net"]);

export interface InstallResult {
  buildVersion: string | null;
  javaImageTag: string;
  installManifest: string;
}

/**
 * Panel-owned install pipeline for PANEL_MANAGED servers — resolves what to
 * install (via the provider's resolveInstallPlan), fetches/verifies it
 * directly onto the bind-mounted data dir, and writes the two files the new
 * runtime image's thin entrypoint expects (eula.txt, .mcpanel-launch.sh).
 * Runs entirely before the long-lived server container is ever created —
 * see the plan doc for why (deterministic INSTALLING phase, network-
 * independent restarts, no outbound access needed from the long-lived
 * container at all).
 */
export class ServerInstaller {
  async install(server: Pick<Server, "dataDir" | "memoryMb">, plan: InstallPlan): Promise<InstallResult> {
    const root = path.join(env.DATA_PATH, server.dataDir);
    const javaImageTag = resolveRuntimeImageTag(plan.javaMajor);

    if (plan.kind !== "direct-download") {
      // Forge/NeoForge (milestone 5) — their providers already refuse
      // resolveInstallPlan() for now, so this is an extra guard against ever
      // reaching here with an install method not yet built.
      throw new BadRequestError("This server software isn't supported by the new install pipeline yet.");
    }

    await this.downloadServerJar(root, plan);
    await this.writeEula(root);
    await this.writeLaunchScript(root, plan.filename, server.memoryMb);

    return {
      buildVersion: plan.loaderVersion,
      javaImageTag,
      installManifest: JSON.stringify({ ...plan, resolvedAt: new Date().toISOString() }),
    };
  }

  /**
   * Regenerates .mcpanel-launch.sh from the currently-installed jar (read
   * back from installManifest) and the server's CURRENT memoryMb — called
   * on every Restart so a changed memory limit actually takes effect, the
   * same way the legacy path's MEMORY env var always has.
   */
  async refreshLaunchScript(server: Pick<Server, "dataDir" | "memoryMb" | "installManifest">): Promise<void> {
    if (!server.installManifest) throw new BadRequestError("Server has no install manifest to refresh a launch script from.");
    const manifest = JSON.parse(server.installManifest) as InstallPlan;
    if (manifest.kind !== "direct-download") {
      throw new BadRequestError("This server software isn't supported by the new install pipeline yet.");
    }
    const root = path.join(env.DATA_PATH, server.dataDir);
    await this.writeLaunchScript(root, manifest.filename, server.memoryMb);
  }

  private async downloadServerJar(root: string, plan: Extract<InstallPlan, { kind: "direct-download" }>): Promise<void> {
    const destPath = await safeResolve(root, plan.filename);
    const buffer = await downloadAndVerify(plan.url, ALLOWED_DOWNLOAD_HOSTS, { sha1: plan.sha1, sha256: plan.sha256 });
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, buffer);
  }

  private async writeEula(root: string): Promise<void> {
    const destPath = await safeResolve(root, "eula.txt");
    await fs.writeFile(destPath, "#Auto-accepted by minecraftpanel on server creation\neula=true\n");
  }

  private async writeLaunchScript(root: string, jarFilename: string, memoryMb: number): Promise<void> {
    const destPath = await safeResolve(root, ".mcpanel-launch.sh");
    // Xmx (heapMb) is deliberately BELOW memoryMb: the container's cgroup
    // memory limit (DockerMinecraftRuntime's Memory/MemorySwap) is set to
    // the full memoryMb, but the JVM also needs off-heap room beyond -Xmx —
    // metaspace, thread stacks, Netty direct buffers, GC native structures,
    // JIT code cache. Handing the whole budget to the heap leaves none of
    // that room, so the process's RSS eventually creeps past the container
    // limit and gets cgroup-OOM-killed out from under a perfectly healthy
    // JVM (seen in production: java killed by the kernel OOM killer hours
    // into uptime, heap pinned at the container's exact memory limit).
    // Resolved from the DB's current memoryMb at install/recreate time, not
    // parsed from an env var inside the container.
    const headroomMb = Math.min(1024, Math.max(256, Math.round(memoryMb * 0.1)));
    const heapMb = Math.max(256, memoryMb - headroomMb);
    // Xms starts low (not == Xmx) so a freshly created server doesn't commit
    // its whole heap budget before anyone's even joined — the JVM grows it
    // toward heapMb as actual usage demands. The memoryMb schema's 1024 MB
    // floor keeps heapMb comfortably above this constant.
    const xmsMb = 512;
    //
    // The three -D flags disable JLine, the interactive line-editing library
    // Vanilla/Paper/Forge/NeoForge/Fabric all bundle for their console
    // reader. With stdin genuinely open (needed for AttachConsoleSession),
    // JLine detects a "real" interactive terminal and actively manages it —
    // printing a "> " prompt, redrawing it after every log line, toggling
    // bracketed-paste/keypad modes — which is exactly right for a human at a
    // real terminal and pure garbage (raw cursor-movement escape codes) once
    // captured as a byte stream and rendered as discrete lines in a browser.
    // -Dterminal.jline=false/-Dterminal.ansi=true are Paper's own documented
    // flags for this exact scenario (external tools piping stdin/stdout);
    // -Djline.terminal=jline.UnsupportedTerminal is JLine's own older,
    // broader property, kept alongside for Vanilla/Forge/NeoForge/Fabric.
    // None of this affects the server's ability to *receive* commands via
    // stdin — only how it manages terminal display feedback.
    const jvmFlags = "-Djline.terminal=jline.UnsupportedTerminal -Dterminal.jline=false -Dterminal.ansi=true";
    const script = `#!/bin/sh\nexec java ${jvmFlags} -Xms${xmsMb}M -Xmx${heapMb}M -jar "${jarFilename}" nogui\n`;
    await fs.writeFile(destPath, script, { mode: 0o755 });
  }
}
