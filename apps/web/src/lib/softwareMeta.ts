import type { ServerSoftware } from "@minecraftpanel/shared";

export const SOFTWARE_META: Record<ServerSoftware, { label: string; description: string }> = {
  VANILLA: { label: "Vanilla", description: "Official Mojang server. No plugin or mod support." },
  PAPER: { label: "Paper", description: "High-performance server with plugin support (Bukkit/Spigot compatible)." },
  FABRIC: { label: "Fabric", description: "Lightweight, performance-focused modding platform." },
  FORGE: { label: "Forge", description: "The original modding platform with the largest mod ecosystem." },
  NEOFORGE: { label: "NeoForge", description: "Actively maintained modern fork of Forge." },
};

export const SOFTWARE_ORDER: ServerSoftware[] = ["VANILLA", "PAPER", "FABRIC", "FORGE", "NEOFORGE"];
