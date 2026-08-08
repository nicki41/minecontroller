import type { AccessLevel } from "./enums.js";
import type { Permission } from "../permissions.js";

export interface RoleSummaryDto {
  id: string;
  name: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  isOwner: boolean;
  isDisabled: boolean;
  roles: RoleSummaryDto[];
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
}

export interface ServerAccessGrantDto {
  serverId: string;
  serverName: string;
  level: AccessLevel;
}
