export interface PlayerDto {
  username: string;
  uuid: string | null;
  online: boolean;
  op: boolean;
  whitelisted: boolean;
  banned: boolean;
  /** ISO timestamp of this player's first tracked join, or null if never tracked (e.g. joined before activity tracking shipped, or hasn't joined since). */
  firstSeenAt: string | null;
  /** ISO timestamp of the last tracked join/leave, or null if never tracked. */
  lastSeenAt: string | null;
  /** Cumulative tracked playtime in seconds, including the current session if online. 0 if never tracked. */
  playtimeSeconds: number;
  /** Last IP address seen connecting, or null if never tracked. */
  lastIp: string | null;
}

export type PlayerGamemode = "SURVIVAL" | "CREATIVE" | "ADVENTURE" | "SPECTATOR";

export interface PlayerGamemodeDto {
  /** Read from the player's playerdata NBT file. Null if the file doesn't exist yet (never spawned, or wiped). */
  gamemode: PlayerGamemode | null;
}

export interface PlayerStatsDistanceDto {
  walkingMeters: number;
  sprintingMeters: number;
  swimmingMeters: number;
  flyingMeters: number;
  boatMeters: number;
  minecartMeters: number;
  /** Horse + pig + strider combined. */
  mountedMeters: number;
  climbingMeters: number;
  fallingMeters: number;
  totalMeters: number;
}

export interface PlayerStatsDto {
  /** From the server's own stats file (minecraft:play_time), in seconds. Null if the stats file doesn't exist. This is the authoritative source when available — see PlayerDto.playtimeSeconds for the tracker-derived fallback. */
  playtimeSeconds: number | null;
  distance: PlayerStatsDistanceDto;
  playerKills: number;
  deaths: number;
  /** Deaths caused by another player (killed_by minecraft:player). Null when the stats file has no such entry (i.e. never happened, or unknown on very old stats). */
  deathsToPlayers: number | null;
  /** playerKills / deathsToPlayers. Null when deathsToPlayers is null or 0 (undefined ratio). */
  playerKdRatio: number | null;
  mobKills: number;
  /** Sum of killed_by entries excluding minecraft:player. */
  deathsToMobs: number;
  /** mobKills / deathsToMobs. Null when deathsToMobs is 0. */
  mobKdRatio: number | null;
}

export type PlayerBanType = "NAME" | "IP";

export interface PlayerBanDto {
  id: string;
  type: PlayerBanType;
  /** The username (NAME) or IP address (IP) actually passed to the ban command. */
  target: string;
  reason: string | null;
  createdByUsername: string | null;
  createdAt: string;
  /** Non-null for a tempban. */
  expiresAt: string | null;
  revokedAt: string | null;
  /** Null if revoked automatically by the tempban-expiry check rather than an admin. */
  revokedByUsername: string | null;
  revokedReason: string | null;
}

export interface PlayerNameHistoryEntryDto {
  username: string;
  changedAt: string;
}

export interface PlayerIpHistoryEntryDto {
  ip: string;
  seenAt: string;
}

export type PlayerSessionsRange = "today" | "7d" | "30d" | "all";

export interface PlayerSessionBucketDto {
  /** ISO date ("YYYY-MM-DD") for 7d/30d/all, ISO hour ("YYYY-MM-DDTHH:00") for today. */
  bucket: string;
  seconds: number;
}

export interface PlayerSessionSummaryDto {
  range: PlayerSessionsRange;
  buckets: PlayerSessionBucketDto[];
  sessionCount: number;
  averageSessionSeconds: number;
  longestSessionSeconds: number;
  totalSeconds: number;
}
