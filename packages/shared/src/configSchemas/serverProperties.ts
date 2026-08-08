import type { ServerConfigFileDef } from "../types/serverConfig.js";

/**
 * server.properties, applicable to every server software (Vanilla, Paper,
 * Fabric, Forge, NeoForge all read the same file). Verified against the
 * current (1.21.x-era) Minecraft Wiki server.properties reference — keys,
 * types, and defaults are real, not guessed.
 *
 * Deliberately excludes a few real keys that either the panel manages
 * itself and would break if hand-edited here (server-port/server-ip —
 * the panel controls the published port via Docker; enable-rcon/rcon.port/
 * rcon.password/broadcast-rcon-to-ops — the panel's own RCON client
 * depends on these), or that only matter at world-generation time and
 * would be confusing to expose as an editable "setting" after the world
 * already exists (level-name/level-seed/level-type/generate-structures/
 * generator-settings/initial-enabled-packs/initial-disabled-packs), or
 * that are too niche/experimental to be worth panel UI yet
 * (management-server-*, text-filtering-*, enable-jmx-monitoring,
 * enable-code-of-conduct, region-file-compression, accepts-transfers,
 * status-heartbeat-interval, bug-report-link, query.port/enable-query).
 * All of those remain fully editable via the Filemanager's text editor —
 * saving here only ever touches the specific keys below.
 */
export const SERVER_PROPERTIES_FILE: ServerConfigFileDef = {
  id: "server-properties",
  label: "Server Properties",
  relativePath: "server.properties",
  format: "properties",
  description: "The Minecraft server's own server.properties file — created and owned by the panel, so changes here always take effect on the next restart.",
  sections: [
    {
      id: "general",
      label: "General",
      fields: [
        { key: "motd", label: "MOTD", description: "Message shown for this server in the multiplayer server list.", type: "string", default: "A Minecraft Server" },
        { key: "max-players", label: "Max players", description: "Maximum number of players who can be connected at once.", type: "number", min: 1, max: 100000, step: 1, default: 20 },
        { key: "pvp", label: "PvP", description: "Allow player-versus-player combat.", type: "boolean", default: true },
        { key: "hardcore", label: "Hardcore mode", description: "Players are permanently banned instead of respawning on death.", type: "boolean", default: false },
        { key: "force-gamemode", label: "Force gamemode on join", description: "Forces players into the default gamemode every time they join, overriding their last gamemode.", type: "boolean", default: false },
      ],
    },
    {
      id: "difficulty",
      label: "Difficulty & Mode",
      fields: [
        {
          key: "difficulty",
          label: "Difficulty",
          type: "enum",
          options: [
            { value: "peaceful", label: "Peaceful" },
            { value: "easy", label: "Easy" },
            { value: "normal", label: "Normal" },
            { value: "hard", label: "Hard" },
          ],
          default: "easy",
        },
        {
          key: "gamemode",
          label: "Default gamemode",
          description: "Gamemode assigned to players the first time they join.",
          type: "enum",
          options: [
            { value: "survival", label: "Survival" },
            { value: "creative", label: "Creative" },
            { value: "adventure", label: "Adventure" },
            { value: "spectator", label: "Spectator" },
          ],
          default: "survival",
        },
      ],
    },
    {
      id: "access",
      label: "Access & Security",
      fields: [
        { key: "white-list", label: "Whitelist", description: "Only whitelisted players can join.", type: "boolean", default: false },
        { key: "enforce-whitelist", label: "Enforce whitelist on reload", description: "Kicks already-connected players who aren't whitelisted when the whitelist is reloaded.", type: "boolean", default: false },
        { key: "online-mode", label: "Online mode", description: "Verify players against Mojang/Microsoft accounts. Turning this off allows unauthenticated connections.", type: "boolean", default: true },
        { key: "enforce-secure-profile", label: "Enforce secure profiles", description: "Requires players to have a Mojang-signed public key (blocks some illegitimate clients).", type: "boolean", default: true },
        { key: "prevent-proxy-connections", label: "Prevent proxy connections", description: "Rejects players whose reported IP doesn't match Mojang's session server lookup — helps block VPN/proxy ban evasion.", type: "boolean", default: false },
        { key: "op-permission-level", label: "Operator permission level", description: "Permission level granted to operators (1–4).", type: "number", min: 0, max: 4, step: 1, default: 4 },
        { key: "function-permission-level", label: "Function permission level", description: "Permission level required to run datapack functions.", type: "number", min: 1, max: 4, step: 1, default: 2 },
      ],
    },
    {
      id: "performance",
      label: "Performance",
      fields: [
        { key: "view-distance", label: "View distance", description: "Chunks sent to clients around each player, in chunks (3–32).", type: "number", min: 3, max: 32, step: 1, default: 10 },
        { key: "simulation-distance", label: "Simulation distance", description: "Chunks around each player kept fully ticking, in chunks (3–32).", type: "number", min: 3, max: 32, step: 1, default: 10 },
        { key: "entity-broadcast-range-percentage", label: "Entity broadcast range", description: "Scales how far away entities become visible to players, as a percentage of the default range.", type: "number", min: 10, max: 1000, step: 10, default: 100 },
        { key: "max-tick-time", label: "Max tick time (ms)", description: "Milliseconds a single tick may take before the watchdog force-kills the server. -1 disables the watchdog.", type: "number", min: -1, max: 600000, step: 1000, default: 60000 },
        { key: "sync-chunk-writes", label: "Synchronous chunk writes", description: "Writes chunk data to disk synchronously — safer against data loss, small performance cost.", type: "boolean", default: true },
        { key: "use-native-transport", label: "Use native transport", description: "Uses Linux's optimized native network transport when available.", type: "boolean", default: true },
        { key: "network-compression-threshold", label: "Network compression threshold", description: "Packets larger than this many bytes are compressed. -1 disables compression.", type: "number", min: -1, max: 65536, step: 1, default: 256 },
        { key: "max-chained-neighbor-updates", label: "Max chained neighbor updates", description: "Caps how many consecutive block updates (e.g. large redstone/piston contraptions) can chain before being cut off.", type: "number", min: 0, max: 1000000000, step: 1, default: 1000000 },
      ],
    },
    {
      id: "players",
      label: "Players",
      fields: [
        { key: "player-idle-timeout", label: "Player idle timeout (minutes)", description: "Kicks players idle for this many minutes. 0 disables idle kicking.", type: "number", min: 0, max: 1440, step: 1, default: 0 },
        { key: "pause-when-empty-seconds", label: "Pause when empty (seconds)", description: "Seconds with no players online before the server pauses ticking to save resources.", type: "number", min: 0, max: 86400, step: 1, default: 60 },
        { key: "spawn-protection", label: "Spawn protection radius", description: "Non-operators can't build within this many blocks of spawn. 0 disables spawn protection.", type: "number", min: 0, max: 1000, step: 1, default: 16 },
      ],
    },
    {
      id: "network",
      label: "Network & Visibility",
      fields: [
        { key: "enable-status", label: "Show in server list", description: "Whether this server responds to server-list pings at all.", type: "boolean", default: true },
        { key: "hide-online-players", label: "Hide online players", description: "Omits the player list/sample from the server-list ping response.", type: "boolean", default: false },
        { key: "rate-limit", label: "Packet rate limit", description: "Maximum packets per second from a single connection before it's kicked. 0 disables the limit.", type: "number", min: 0, max: 10000, step: 1, default: 0 },
        { key: "log-ips", label: "Log player IP addresses", type: "boolean", default: true },
      ],
    },
    {
      id: "resource-pack",
      label: "Resource Pack",
      fields: [
        { key: "resource-pack", label: "Resource pack URL", description: "Direct download URL for a server-provided resource pack.", type: "string", default: "" },
        { key: "resource-pack-sha1", label: "Resource pack SHA-1", description: "SHA-1 hash of the resource pack, used to verify the download and skip re-downloading if unchanged.", type: "string", default: "" },
        { key: "resource-pack-prompt", label: "Resource pack prompt message", description: "Custom message shown to players when they're asked to accept the resource pack.", type: "string", default: "" },
        { key: "require-resource-pack", label: "Require resource pack", description: "Disconnects players who decline the resource pack instead of letting them continue without it.", type: "boolean", default: false },
      ],
    },
    {
      id: "console",
      label: "Console & Chat",
      fields: [
        { key: "broadcast-console-to-ops", label: "Broadcast console to ops", description: "Sends console command output to online operators.", type: "boolean", default: true },
        { key: "command-spam-threshold-seconds", label: "Command spam threshold (s)", description: "Auto-kick threshold for players issuing commands too rapidly.", type: "number", min: 0, max: 3600, step: 1, default: 10 },
        { key: "chat-spam-threshold-seconds", label: "Chat spam threshold (s)", description: "Auto-kick threshold for players chatting too rapidly.", type: "number", min: 0, max: 3600, step: 1, default: 10 },
      ],
    },
  ],
};
