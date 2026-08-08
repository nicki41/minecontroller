import { getServerConfigSchema } from "@minecraftpanel/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackupsCard } from "@/components/servers/BackupsCard";
import { useAuth } from "@/lib/auth";
import { useServerOutletContext } from "./useServerOutletContext";
import { GeneralSettingsTab } from "./settings/GeneralSettingsTab";
import { ServerPropertiesTab } from "./settings/ServerPropertiesTab";
import { ResourcesSettingsTab } from "./settings/ResourcesSettingsTab";
import { ServerTypeConfigTab } from "./settings/ServerTypeConfigTab";

export default function ServerSettingsPage() {
  const { server } = useServerOutletContext();
  const { hasPermission } = useAuth();
  const canEdit = server.myAccessLevel === "FULL" && hasPermission("servers.settings.edit");
  const typeConfigSchema = getServerConfigSchema(server.software);

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="properties">Server Properties</TabsTrigger>
        {typeConfigSchema && <TabsTrigger value="type-config">{typeConfigSchema.tabLabel}</TabsTrigger>}
        <TabsTrigger value="resources">Resources</TabsTrigger>
        <TabsTrigger value="backups">Backups</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralSettingsTab server={server} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="properties">
        <ServerPropertiesTab server={server} canEdit={canEdit} />
      </TabsContent>
      {typeConfigSchema && (
        <TabsContent value="type-config">
          <ServerTypeConfigTab server={server} canEdit={canEdit} />
        </TabsContent>
      )}
      <TabsContent value="resources">
        <ResourcesSettingsTab server={server} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="backups">
        <BackupsCard server={server} />
      </TabsContent>
    </Tabs>
  );
}
