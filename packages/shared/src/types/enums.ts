export const SERVER_SOFTWARE = ["VANILLA", "PAPER", "FABRIC", "FORGE", "NEOFORGE"] as const;
export type ServerSoftware = (typeof SERVER_SOFTWARE)[number];

/** Software families that support installing plugins/mods at all. Vanilla does not. */
export const MODDABLE_SOFTWARE: readonly ServerSoftware[] = ["PAPER", "FABRIC", "FORGE", "NEOFORGE"];

/** Maps server software to the Modrinth loader facet used when searching/filtering. */
export const SOFTWARE_TO_MODRINTH_LOADER: Partial<Record<ServerSoftware, string>> = {
  PAPER: "paper",
  FABRIC: "fabric",
  FORGE: "forge",
  NEOFORGE: "neoforge",
};

/** Whether a software family installs "plugins" (Bukkit-style) or "mods". */
export function pluginTerminologyFor(software: ServerSoftware): "plugin" | "mod" | "none" {
  if (software === "PAPER") return "plugin";
  if (software === "FABRIC" || software === "FORGE" || software === "NEOFORGE") return "mod";
  return "none";
}

export const SERVER_STATUS = [
  "CREATING",
  "INSTALLING",
  "STOPPED",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "ERROR",
  "DELETING",
] as const;
export type ServerStatus = (typeof SERVER_STATUS)[number];

/** Statuses during which the underlying container is expected to be absent or transient. */
export const TRANSIENT_STATUSES: readonly ServerStatus[] = ["CREATING", "INSTALLING", "STARTING", "STOPPING", "DELETING"];

export const ACCESS_LEVEL = ["FULL", "VIEW_ONLY"] as const;
export type AccessLevel = (typeof ACCESS_LEVEL)[number];

// Modrinth's actual project_type values (verified against the live API) —
// note there is no separate "plugin" type: a Bukkit/Paper plugin like
// LuckPerms is project_type "mod" too, distinguished only by its `loaders`
// array containing "paper"/"spigot"/"bukkit" instead of "fabric"/"forge".
// The plugin-vs-mod wording shown to users is purely ours, computed by
// pluginTerminologyFor() based on the target server's software.
export const MODRINTH_PROJECT_TYPE = ["mod", "modpack", "resourcepack", "shader"] as const;
export type ModrinthProjectType = (typeof MODRINTH_PROJECT_TYPE)[number];
