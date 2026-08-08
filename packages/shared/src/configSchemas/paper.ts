import type { ServerTypeConfigDef } from "../types/serverConfig.js";

/**
 * Curated subset of Paper's real config/paper-global.yml and
 * config/paper-world-defaults.yml keys (Paper 1.19+ "new config system" —
 * see docs.papermc.io/paper/reference/{paper-global-configuration,world-configuration}).
 * Not exhaustive — limited to settings admins commonly want to change from
 * a panel, verified against PaperMC's own documentation rather than
 * guessed. Anything not listed here remains fully editable via the
 * Filemanager's text editor; saving here only ever touches the specific
 * keys below, leaving the rest of the file (including comments) intact.
 * Paper itself generates and owns these files (unlike server.properties,
 * which the panel now owns — see serverProperties.ts), so there are no
 * `default` values to seed here beyond what's shown when the file doesn't
 * exist yet.
 */
export const PAPER_CONFIG: ServerTypeConfigDef = {
  software: "PAPER",
  tabLabel: "Paper Settings",
  files: [
    {
      id: "paper-global",
      label: "Global Settings",
      relativePath: "config/paper-global.yml",
      format: "yaml",
      description: "Server-wide Paper settings (config/paper-global.yml) — shared by every world on this server.",
      sections: [
        {
          id: "chunks",
          label: "Chunk Loading",
          fields: [
            {
              key: "chunk-loading-basic.player-max-chunk-load-rate",
              label: "Max chunk load rate per player",
              description: "Chunks per second the server will send to a single player. -1 disables the limit.",
              type: "number",
              min: -1,
              max: 2000,
              step: 1,
              default: 100,
            },
            {
              key: "chunk-loading-basic.player-max-chunk-send-rate",
              label: "Max chunk send rate per player",
              description: "Chunks per second the server will actually transmit to a single player. -1 disables the limit.",
              type: "number",
              min: -1,
              max: 2000,
              step: 1,
              default: 75,
            },
          ],
        },
        {
          id: "proxies",
          label: "Proxy Support",
          fields: [
            {
              key: "proxies.velocity.enabled",
              label: "Enable Velocity support",
              description: "Turn on when this server sits behind a Velocity proxy. Requires velocity-support's forwarding secret to match.",
              type: "boolean",
              default: false,
            },
            {
              key: "proxies.bungee-cord.online-mode",
              label: "BungeeCord online-mode passthrough",
              description: "Trust player UUIDs/names forwarded by BungeeCord instead of authenticating with Mojang directly.",
              type: "boolean",
              default: true,
            },
          ],
        },
        {
          id: "misc",
          label: "Misc",
          fields: [
            {
              key: "misc.max-joins-per-tick",
              label: "Max joins per tick",
              description: "Caps how many players can complete login in a single server tick — protects against join-flood lag spikes.",
              type: "number",
              min: 0,
              max: 100,
              step: 1,
              default: 5,
            },
          ],
        },
        {
          id: "spark",
          label: "Spark Profiler",
          fields: [
            {
              key: "spark.enabled",
              label: "Enable bundled Spark profiler",
              description: "Spark is Paper's built-in performance profiler, reachable with /spark once enabled.",
              type: "boolean",
              default: true,
            },
          ],
        },
      ],
    },
    {
      id: "paper-world-defaults",
      label: "World Defaults",
      relativePath: "config/paper-world-defaults.yml",
      format: "yaml",
      description: "Default settings for every world (config/paper-world-defaults.yml) — a world can still override these in its own paper-world.yml.",
      sections: [
        {
          id: "anti-xray",
          label: "Anti-Xray",
          fields: [
            {
              key: "anticheat.anti-xray.enabled",
              label: "Enable Anti-Xray",
              description: "Hides ores from players who haven't legitimately seen them, defeating x-ray texture packs.",
              type: "boolean",
              default: false,
            },
            {
              key: "anticheat.anti-xray.engine-mode",
              label: "Anti-Xray engine mode",
              description: "1 = replace hidden blocks with stone/netherrack/end stone. 2 = randomize per block. 3 = one random block per chunk layer.",
              type: "enum",
              options: [
                { value: "1", label: "1 — Simple replacement" },
                { value: "2", label: "2 — Randomized per block" },
                { value: "3", label: "3 — Randomized per layer" },
              ],
              default: "1",
            },
            {
              key: "anticheat.anti-xray.max-block-height",
              label: "Anti-Xray max block height",
              description: "Only obfuscates ores at or below this Y level.",
              type: "number",
              min: -64,
              max: 320,
              step: 1,
              default: 64,
            },
          ],
        },
        {
          id: "collisions",
          label: "Collisions",
          fields: [
            {
              key: "collisions.max-entity-collisions",
              label: "Max entity collisions",
              description: "Stops processing collisions for an entity once this many other entities are colliding with it — protects against lag from entity pile-ups.",
              type: "number",
              min: 0,
              max: 64,
              step: 1,
              default: 8,
            },
            {
              key: "collisions.only-players-collide",
              label: "Only players collide",
              description: "Skip collision physics entirely except between players.",
              type: "boolean",
              default: false,
            },
          ],
        },
        {
          id: "spawning",
          label: "Mob Spawning",
          fields: [
            {
              key: "entities.spawning.per-player-mob-spawns",
              label: "Per-player mob spawn caps",
              description: "Distributes each world's mob cap per player instead of globally — more consistent spawns with multiple players spread out.",
              type: "boolean",
              default: true,
            },
          ],
        },
        {
          id: "environment",
          label: "Environment",
          fields: [
            {
              key: "environment.disable-explosion-knockback",
              label: "Disable explosion knockback",
              type: "boolean",
              default: false,
            },
            {
              key: "environment.disable-thunder",
              label: "Disable thunderstorms",
              type: "boolean",
              default: false,
            },
            {
              key: "environment.disable-ice-and-snow",
              label: "Disable ice and snow formation",
              type: "boolean",
              default: false,
            },
          ],
        },
        {
          id: "hopper",
          label: "Hoppers",
          fields: [
            {
              key: "hopper.cooldown-when-full",
              label: "Cooldown hoppers when full",
              description: "Reduces how often a full hopper retries pulling items — a safe performance win.",
              type: "boolean",
              default: true,
            },
            {
              key: "hopper.disable-move-event",
              label: "Disable InventoryMoveItemEvent",
              description: "Large hopper performance boost, but breaks plugins that hook item-move events (e.g. some protection/anti-dupe plugins). Only enable if you know your plugins don't need it.",
              type: "boolean",
              default: false,
            },
          ],
        },
        {
          id: "redstone",
          label: "Redstone",
          fields: [
            {
              key: "misc.redstone-implementation",
              label: "Redstone engine",
              description: "Alternate engines can be faster but may behave subtly differently from vanilla in edge cases.",
              type: "enum",
              options: [
                { value: "VANILLA", label: "Vanilla" },
                { value: "EIGENCRAFT", label: "Eigencraft (classic alternate)" },
                { value: "ALTERNATE_CURRENT", label: "Alternate Current" },
              ],
              default: "VANILLA",
            },
          ],
        },
      ],
    },
  ],
};
