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
