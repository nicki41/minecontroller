import type { ServerSoftware } from "./enums.js";

/**
 * Schema-driven description of a config file backing structured settings UI
 * (Paper's config/paper-global.yml, or server.properties) — shared between
 * web (renders the form) and api (validates + reads/writes the actual
 * file). Adding a new server type or file means adding a new definition
 * here, not touching the settings page's rendering logic.
 *
 * `key` is a path into the document: dot-separated for YAML (e.g.
 * "chunk-loading-basic.player-max-chunk-load-rate"), or the literal
 * server.properties key for "properties"-format files (e.g. "max-players")
 * — matching the file's real structure, see ServerConfigFileDef.relativePath.
 */
export type ConfigFieldType = "boolean" | "number" | "string" | "enum";
export type ConfigFileFormat = "yaml" | "properties";

export interface ConfigFieldOption {
  value: string;
  label: string;
}

export interface ConfigFieldDef {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
  options?: ConfigFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  /** Seed value written when the API first creates this file (e.g. at server provisioning) — vanilla/Paper's own documented default. */
  default: string | number | boolean;
}

export interface ConfigSectionDef {
  id: string;
  label: string;
  fields: ConfigFieldDef[];
}

export interface ServerConfigFileDef {
  id: string;
  label: string;
  /** Path relative to the server's data directory, e.g. "config/paper-global.yml" or "server.properties". */
  relativePath: string;
  format: ConfigFileFormat;
  description?: string;
  sections: ConfigSectionDef[];
}

export interface ServerTypeConfigDef {
  software: ServerSoftware;
  /** Label for the settings tab this whole definition renders under, e.g. "Paper Settings". */
  tabLabel: string;
  files: ServerConfigFileDef[];
}

/** What the API returns for one config file: current values keyed by field `key`, and whether the file exists on disk yet. */
export interface ServerConfigFileValuesDto {
  exists: boolean;
  values: Record<string, string | number | boolean | null>;
}
