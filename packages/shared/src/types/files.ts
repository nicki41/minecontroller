export interface FileEntryDto {
  name: string;
  /** Forward-slash relative path from the server's data root, regardless of host OS. */
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string;
}

export interface FileContentDto {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}
