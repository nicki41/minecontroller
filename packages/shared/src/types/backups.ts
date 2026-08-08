export interface BackupDto {
  id: string;
  fileName: string;
  sizeBytes: string;
  note: string | null;
  createdByUsername: string | null;
  createdAt: string;
}
