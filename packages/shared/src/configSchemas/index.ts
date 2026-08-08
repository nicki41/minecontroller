import type { ServerSoftware } from "../types/enums.js";
import type { ServerTypeConfigDef } from "../types/serverConfig.js";
import { PAPER_CONFIG } from "./paper.js";
import { SERVER_PROPERTIES_FILE } from "./serverProperties.js";

/**
 * Registry of server-*type*-specific config schemas — additional files
 * beyond the universal server.properties (see SERVER_PROPERTIES_FILE),
 * rendered as their own settings tab (e.g. "Paper Settings"). Unlisted
 * software (Vanilla, Fabric, Forge, NeoForge for now) simply has no extra
 * schema-driven tab — their non-properties config files remain editable
 * through the Filemanager only, until a definition is added here.
 */
const REGISTRY: Partial<Record<ServerSoftware, ServerTypeConfigDef>> = {
  PAPER: PAPER_CONFIG,
};

export function getServerConfigSchema(software: ServerSoftware): ServerTypeConfigDef | null {
  return REGISTRY[software] ?? null;
}

export { PAPER_CONFIG, SERVER_PROPERTIES_FILE };
