import { SERVER_PROPERTIES_FILE, type ServerDto } from "@minecraftpanel/shared";
import { ConfigFileCard } from "./ServerTypeConfigTab";

/** server.properties applies to every server software, so this tab is always shown (unlike ServerTypeConfigTab, which is per-software). */
export function ServerPropertiesTab({ server, canEdit }: { server: ServerDto; canEdit: boolean }) {
  return <ConfigFileCard server={server} fileDef={SERVER_PROPERTIES_FILE} canEdit={canEdit} />;
}
