import { PERMISSIONS, type Permission } from "@minecraftpanel/shared";

export function groupPermissions(): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const p of PERMISSIONS) {
    const key = p.split(".")[0] ?? "other";
    (groups[key] ??= []).push(p);
  }
  return groups;
}
