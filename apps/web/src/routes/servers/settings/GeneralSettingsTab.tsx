import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateServerSettingsSchema, type ServerDto, type UpdateServerSettingsInput } from "@minecraftpanel/shared";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateServerSettings } from "@/lib/servers";
import { ApiError } from "@/lib/api";

type GeneralInput = Pick<UpdateServerSettingsInput, "name" | "description">;

const generalSchema = updateServerSettingsSchema.pick({ name: true, description: true });

/**
 * Panel-only metadata (not a Minecraft setting, so no restart is ever
 * needed) — MOTD/max players and every other gameplay setting live in the
 * "Server Properties" tab, backed directly by the real server.properties
 * file. See ServerTypeConfigTab / SERVER_PROPERTIES_FILE.
 */
export function GeneralSettingsTab({ server, canEdit }: { server: ServerDto; canEdit: boolean }) {
  const update = useUpdateServerSettings(server.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<GeneralInput>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: server.name,
      description: server.description ?? "",
    },
  });

  const onSubmit = async (data: GeneralInput) => {
    try {
      await update.mutateAsync(data);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Server name" htmlFor="name" error={errors.name}>
            <Input id="name" disabled={!canEdit} {...register("name")} />
          </FormField>
          <FormField label="Description (optional)" htmlFor="description" error={errors.description} className="sm:col-span-2">
            <Textarea id="description" rows={2} disabled={!canEdit} {...register("description")} />
          </FormField>
        </CardContent>
        {canEdit && (
          <CardFooter>
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
