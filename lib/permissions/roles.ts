export type WorkspaceRole = "owner" | "admin" | "member";

export type Permission =
  | "workspace:update"
  | "brand:update"
  | "company:update"
  | "team:manage"
  | "client:delete"
  | "document:create"
  | "document:delete";

const MATRIX: Record<WorkspaceRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    "workspace:update", "brand:update", "company:update", "team:manage",
    "client:delete", "document:create", "document:delete",
  ]),
  admin: new Set<Permission>([
    "workspace:update", "brand:update", "company:update", "team:manage",
    "client:delete", "document:create", "document:delete",
  ]),
  member: new Set<Permission>(["document:create"]),
};

/** Mirrors the RLS policies. RLS is the enforcement layer; this drives UI and early rejection. */
export function can(role: WorkspaceRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].has(permission);
}
