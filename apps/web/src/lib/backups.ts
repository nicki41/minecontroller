import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BackupDto, CreateBackupInput } from "@minecraftpanel/shared";
import { api } from "./api";

export function useBackups(serverId: string) {
  return useQuery({
    queryKey: ["servers", serverId, "backups"],
    queryFn: () => api.get<{ backups: BackupDto[] }>(`/servers/${serverId}/backups`),
  });
}

export function useCreateBackup(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBackupInput) => api.post<{ backup: BackupDto }>(`/servers/${serverId}/backups`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers", serverId, "backups"] }),
  });
}

export function useDeleteBackup(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backupId: string) => api.delete(`/servers/${serverId}/backups/${backupId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers", serverId, "backups"] }),
  });
}

export function useRestoreBackup(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backupId: string) => api.post(`/servers/${serverId}/backups/${backupId}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers", serverId] }),
  });
}

export function backupDownloadUrl(serverId: string, backupId: string): string {
  return `/api/servers/${serverId}/backups/${backupId}/download`;
}
