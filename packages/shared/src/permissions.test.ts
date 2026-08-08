import { describe, expect, it } from "vitest";
import {
  effectiveServerPermissions,
  isServerScopedPermission,
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  type Permission,
} from "./permissions.js";

describe("isServerScopedPermission", () => {
  it("treats servers/console/files/players/plugins/backups permissions as server-scoped", () => {
    expect(isServerScopedPermission("servers.start")).toBe(true);
    expect(isServerScopedPermission("console.execute")).toBe(true);
    expect(isServerScopedPermission("files.delete")).toBe(true);
    expect(isServerScopedPermission("players.ban")).toBe(true);
    expect(isServerScopedPermission("plugins.install")).toBe(true);
    expect(isServerScopedPermission("backups.restore")).toBe(true);
  });

  it("treats users/roles/audit/settings permissions as instance-wide, not server-scoped", () => {
    expect(isServerScopedPermission("users.create")).toBe(false);
    expect(isServerScopedPermission("roles.manage")).toBe(false);
    expect(isServerScopedPermission("audit.view")).toBe(false);
    expect(isServerScopedPermission("settings.manage")).toBe(false);
  });
});

describe("effectiveServerPermissions", () => {
  const rolePermissions: Permission[] = [
    "servers.view",
    "servers.start",
    "servers.delete",
    "console.view",
    "console.execute",
    "files.edit",
    "users.create", // instance-wide, should be unaffected by server access
    "audit.view", // instance-wide
  ];

  it("passes every server-scoped permission through unchanged with FULL access", () => {
    const result = effectiveServerPermissions(rolePermissions, "FULL");
    for (const p of rolePermissions) expect(result.has(p)).toBe(true);
  });

  it("keeps only *.view server-scoped permissions with VIEW_ONLY access", () => {
    const result = effectiveServerPermissions(rolePermissions, "VIEW_ONLY");
    expect(result.has("servers.view")).toBe(true);
    expect(result.has("console.view")).toBe(true);
    expect(result.has("servers.start")).toBe(false);
    expect(result.has("servers.delete")).toBe(false);
    expect(result.has("console.execute")).toBe(false);
    expect(result.has("files.edit")).toBe(false);
  });

  it("strips every server-scoped permission when the user has no access record at all", () => {
    const result = effectiveServerPermissions(rolePermissions, null);
    expect(result.has("servers.view")).toBe(false);
    expect(result.has("servers.start")).toBe(false);
    expect(result.has("console.view")).toBe(false);
    expect(result.has("files.edit")).toBe(false);
  });

  it("never lets server access level affect instance-wide permissions", () => {
    for (const level of [null, "VIEW_ONLY", "FULL"] as const) {
      const result = effectiveServerPermissions(rolePermissions, level);
      expect(result.has("users.create")).toBe(true);
      expect(result.has("audit.view")).toBe(true);
    }
  });

  it("never grants a permission the role did not have in the first place", () => {
    const result = effectiveServerPermissions(["servers.view"], "FULL");
    expect(result.has("servers.delete")).toBe(false);
    expect([...result]).toEqual(["servers.view"]);
  });
});

describe("SYSTEM_ROLE_PERMISSIONS", () => {
  it("keeps Viewer strictly read-only (no create/delete/execute/install/restore permissions)", () => {
    const mutating = SYSTEM_ROLE_PERMISSIONS.Viewer.filter((p) =>
      /\.(create|delete|start|stop|restart|execute|edit|upload|install|remove|kick|ban|op|whitelist|restore)$|settings\.edit$/.test(
        p,
      ),
    );
    expect(mutating).toEqual([]);
  });

  it("never grants Manager user/role administration permissions", () => {
    const adminPerms = SYSTEM_ROLE_PERMISSIONS.Manager.filter((p) => p.startsWith("users.") || p.startsWith("roles."));
    expect(adminPerms).toEqual([]);
  });

  it("keeps every built-in role's permissions a subset of the known permission list", () => {
    for (const [, perms] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
      for (const p of perms) expect(PERMISSIONS as readonly string[]).toContain(p);
    }
  });
});
