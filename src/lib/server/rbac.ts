/**
 * RateUrProfs Server-Side Role-Based Access Control (RBAC)
 *
 * Defines explicit administrative roles, permissions matrix, and
 * authorization enforcement guards.
 */

export type AdminRole = "super_admin" | "admin" | "moderator" | "support" | "security" | "student";

export type AdminPermission =
  | "admin:access"
  | "users:read"
  | "users:manage"
  | "users:roles"
  | "users:suspend"
  | "users:delete"
  | "lecturers:read"
  | "lecturers:manage"
  | "lecturers:merge"
  | "universities:read"
  | "universities:manage"
  | "universities:merge"
  | "faculties:read"
  | "faculties:manage"
  | "data_quality:read"
  | "data_quality:audit"
  | "data_quality:merge"
  | "crawler:read"
  | "crawler:control"
  | "reviews:read"
  | "reviews:moderate"
  | "audit_logs:read"
  | "health:read"
  | "settings:read"
  | "settings:manage"
  | "inbox:admin"
  | "inbox:support"
  | "inbox:security";

export const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  super_admin: new Set<AdminPermission>([
    "admin:access",
    "users:read",
    "users:manage",
    "users:roles",
    "users:suspend",
    "users:delete",
    "lecturers:read",
    "lecturers:manage",
    "lecturers:merge",
    "universities:read",
    "universities:manage",
    "universities:merge",
    "faculties:read",
    "faculties:manage",
    "data_quality:read",
    "data_quality:audit",
    "data_quality:merge",
    "crawler:read",
    "crawler:control",
    "reviews:read",
    "reviews:moderate",
    "audit_logs:read",
    "health:read",
    "settings:read",
    "settings:manage",
    "inbox:admin",
    "inbox:support",
    "inbox:security",
  ]),
  admin: new Set<AdminPermission>([
    "admin:access",
    "users:read",
    "users:manage",
    "users:suspend",
    "lecturers:read",
    "lecturers:manage",
    "lecturers:merge",
    "universities:read",
    "universities:manage",
    "universities:merge",
    "faculties:read",
    "faculties:manage",
    "data_quality:read",
    "data_quality:audit",
    "data_quality:merge",
    "crawler:read",
    "crawler:control",
    "reviews:read",
    "reviews:moderate",
    "audit_logs:read",
    "health:read",
    "settings:read",
    "inbox:admin",
    "inbox:support",
    "inbox:security",
  ]),
  moderator: new Set<AdminPermission>([
    "admin:access",
    "users:read",
    "lecturers:read",
    "universities:read",
    "faculties:read",
    "data_quality:read",
    "reviews:read",
    "reviews:moderate",
    "crawler:read",
    "health:read",
  ]),
  support: new Set<AdminPermission>([
    "admin:access",
    "inbox:support",
  ]),
  security: new Set<AdminPermission>([
    "admin:access",
    "inbox:security",
  ]),
  student: new Set<AdminPermission>([]),
};

export const SUPER_ADMIN_CANONICAL_EMAIL = "dungpubgame@gmail.com";

/**
 * Checks whether a role possesses a specific permission.
 */
export function hasPermission(role: AdminRole | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.has(permission));
}

/**
 * Validates whether an actor role can modify the role of a target user.
 * - Only super_admin can assign or demote admin or super_admin.
 * - Nobody can demote the canonical super_admin email.
 */
export function canChangeUserRole(
  actorRole: AdminRole,
  actorEmail: string | null | undefined,
  targetEmail: string | null | undefined,
  newRole: AdminRole
): { allowed: boolean; reason?: string } {
  if (targetEmail && targetEmail.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL) {
    if (newRole !== "super_admin") {
      return {
        allowed: false,
        reason: `Không thể hạ cấp tài khoản Quản trị viên Tối cao (${SUPER_ADMIN_CANONICAL_EMAIL}).`,
      };
    }
  }

  if (actorRole !== "super_admin") {
    if (newRole === "super_admin" || newRole === "admin") {
      return {
        allowed: false,
        reason: "Chỉ Quản trị viên Tối cao (Super Admin) mới có quyền phân công quyền Admin.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Validates whether an account can be suspended or deleted.
 * - Temporary delete / suspend requires 'users:suspend' (admin, super_admin)
 * - Permanent delete requires 'users:delete' (super_admin)
 * - Canonical super admin email can never be suspended or deleted.
 */
export function canSuspendOrDeleteUser(
  actorRole: AdminRole,
  targetEmail: string | null | undefined,
  isPermanent: boolean = false
): { allowed: boolean; reason?: string } {
  if (targetEmail && targetEmail.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL) {
    return {
      allowed: false,
      reason: `Không thể khóa hoặc xóa tài khoản Quản trị viên Tối cao (${SUPER_ADMIN_CANONICAL_EMAIL}).`,
    };
  }

  const requiredPerm: AdminPermission = isPermanent ? "users:delete" : "users:suspend";
  if (!hasPermission(actorRole, requiredPerm)) {
    return {
      allowed: false,
      reason: isPermanent
        ? "Chỉ Quản trị viên Tối cao (Super Admin) mới có quyền xóa vĩnh viễn tài khoản người dùng."
        : "Bạn không có quyền khóa hoặc mở khóa tài khoản người dùng.",
    };
  }

  return { allowed: true };
}
