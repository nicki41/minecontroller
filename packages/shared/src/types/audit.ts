export interface AuditLogDto {
  id: string;
  action: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; username: string } | null;
  server: { id: string; name: string } | null;
}
