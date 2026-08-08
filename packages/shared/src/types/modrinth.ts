export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  downloads: number;
  author: string;
  project_type: string;
  categories: string[];
  versions: string[];
  client_side: string;
  server_side: string;
}

export interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[];
  total_hits: number;
  offset: number;
  limit: number;
}

export interface ModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  hashes: { sha1?: string; sha512?: string };
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  version_type: string;
  files: ModrinthVersionFile[];
  date_published: string;
}

export interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  icon_url: string | null;
  downloads: number;
  followers: number;
  categories: string[];
  project_type: string;
  loaders?: string[];
  game_versions?: string[];
  source_url?: string | null;
  wiki_url?: string | null;
}

export interface ModrinthGameVersion {
  version: string;
  version_type: "release" | "snapshot" | "beta" | "alpha";
  date: string;
  major: boolean;
}

export type PluginInstallStatus = "ACTIVE" | "PAUSED";

export interface InstalledPluginDto {
  /** Current on-disk filename — carries a ".disabled" suffix while PAUSED. */
  filename: string;
  size: number;
  modifiedAt: string;
  status: PluginInstallStatus;
  /** Present only for content installed through this panel's Modrinth integration. */
  modrinthProjectId: string | null;
  modrinthVersionId: string | null;
  versionNumber: string | null;
  title: string | null;
  author: string | null;
  iconUrl: string | null;
  slug: string | null;
}
