import test from "node:test";
import assert from "node:assert/strict";

import {
  AdminRole,
  AdminPermission,
  hasPermission,
  canChangeUserRole,
  canSuspendOrDeleteUser,
  SUPER_ADMIN_CANONICAL_EMAIL,
} from "../src/lib/server/rbac";
import { sanitizeAuditState } from "../src/lib/server/adminAudit";
import { auditDuplicateUniversities, getAdminOverviewMetrics } from "../src/lib/server/adminDb";
import { isPostgresConfigured } from "../src/lib/server/postgresClient";

test("Admin RBAC: Super Admin has all permissions unconditionally", () => {
  const permissions: AdminPermission[] = [
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
  ];

  for (const perm of permissions) {
    assert.strictEqual(
      hasPermission("super_admin", perm),
      true,
      `super_admin must have permission: ${perm}`
    );
  }
});

test("Admin RBAC: Admin role has broad permissions but cannot modify super_admin or settings", () => {
  assert.strictEqual(hasPermission("admin", "users:read"), true);
  assert.strictEqual(hasPermission("admin", "users:manage"), true);
  assert.strictEqual(hasPermission("admin", "lecturers:manage"), true);
  assert.strictEqual(hasPermission("admin", "universities:merge"), true);
  assert.strictEqual(hasPermission("admin", "crawler:control"), true);
  assert.strictEqual(hasPermission("admin", "reviews:moderate"), true);
  assert.strictEqual(hasPermission("admin", "audit_logs:read"), true);

  // Settings modification and user role elevation are reserved for super_admin
  assert.strictEqual(hasPermission("admin", "settings:manage"), false);
  assert.strictEqual(hasPermission("admin", "users:roles"), false);
});

test("Admin RBAC: Moderator role is scoped to content and review moderation", () => {
  assert.strictEqual(hasPermission("moderator", "reviews:read"), true);
  assert.strictEqual(hasPermission("moderator", "reviews:moderate"), true);
  assert.strictEqual(hasPermission("moderator", "lecturers:read"), true);
  assert.strictEqual(hasPermission("moderator", "universities:read"), true);

  // Moderator cannot delete records, manage users, or merge universities
  assert.strictEqual(hasPermission("moderator", "users:manage"), false);
  assert.strictEqual(hasPermission("moderator", "users:suspend"), false);
  assert.strictEqual(hasPermission("moderator", "universities:merge"), false);
  assert.strictEqual(hasPermission("moderator", "settings:manage"), false);
});

test("Admin RBAC: Student / Regular user has NO administrative permissions", () => {
  assert.strictEqual(hasPermission("student", "users:read"), false);
  assert.strictEqual(hasPermission("student", "reviews:moderate"), false);
  assert.strictEqual(hasPermission("student", "crawler:control"), false);
  assert.strictEqual(hasPermission("student", "universities:merge"), false);
});

test("Admin RBAC: Canonical Super Admin protection and role management boundaries", () => {
  // Nobody can demote or alter the canonical super admin
  const demoteAttempt = canChangeUserRole(
    "super_admin",
    "dungpubgame@gmail.com",
    "dungpubgame@gmail.com",
    "student"
  );
  assert.strictEqual(demoteAttempt.allowed, false);

  // Admin cannot promote someone to admin or super_admin
  const adminElevationAttempt = canChangeUserRole(
    "admin",
    "subadmin@example.com",
    "student@example.com",
    "admin"
  );
  assert.strictEqual(adminElevationAttempt.allowed, false);

  // Super Admin can promote someone to admin
  const superAdminElevation = canChangeUserRole(
    "super_admin",
    "dungpubgame@gmail.com",
    "student@example.com",
    "admin"
  );
  assert.strictEqual(superAdminElevation.allowed, true);

  // Super Admin cannot be suspended or deleted
  const suspendCanonical = canSuspendOrDeleteUser("super_admin", "dungpubgame@gmail.com");
  assert.strictEqual(suspendCanonical.allowed, false);
});

test("Audit Logger: Sanitizes sensitive credentials from audit payloads", () => {
  const dirty = {
    username: "admin1",
    password: "super_secret_password",
    authToken: "bearer_xyz123",
    google_client_secret: "secret_val",
    nested: {
      safeValue: 42,
    },
  };

  const sanitized = sanitizeAuditState(dirty) as any;
  assert.strictEqual(sanitized.username, "admin1");
  assert.strictEqual(sanitized.password, "[REDACTED]");
  assert.strictEqual(sanitized.authToken, "[REDACTED]");
  assert.strictEqual(sanitized.google_client_secret, "[REDACTED]");
});

test("Admin DB: Overview Metrics fetch runs without throwing", async () => {
  const metrics = await getAdminOverviewMetrics();
  assert.ok(metrics, "Overview metrics must return an object");
  assert.ok(metrics.users, "Must contain user stats");
  assert.ok(metrics.lecturers, "Must contain lecturer stats");
  assert.ok(metrics.universities, "Must contain university stats");
  assert.ok(metrics.crawler, "Must contain crawler stats");
  assert.ok(Array.isArray(metrics.alerts), "Alerts must be an array");

  if (isPostgresConfigured()) {
    assert.ok(
      metrics.lecturers.total > 50000,
      `Cloud SQL should have 80K+ lecturers (found: ${metrics.lecturers.total})`
    );
    assert.strictEqual(
      metrics.universities.total,
      327,
      `Cloud SQL must strictly contain the 327 official MOET institutions (found: ${metrics.universities.total})`
    );
  }
});

test("Admin DB: Duplicate University Audit identifies cluster candidates", async () => {
  const clusters = await auditDuplicateUniversities();
  assert.ok(Array.isArray(clusters), "auditDuplicateUniversities must return an array of clusters");

  // Every detected cluster must contain at least 2 candidates
  for (const c of clusters) {
    assert.ok(
      c.candidates.length >= 2,
      `Cluster ${c.id} must contain multiple candidate records`
    );
  }

  // Vietnam Japan University (vnu-vju) is canonicalized with legacy duplicates resolved into aliases
  if (isPostgresConfigured()) {
    const { getPostgresPool } = await import("../src/lib/server/postgresClient");
    const pool = getPostgresPool();
    const vjuUnis = await pool.query("SELECT id FROM universities WHERE id IN ('vnu-vju', 'viet-nhat', 'viet-nhat-2')");
    assert.strictEqual(vjuUnis.rows.length, 1, "VJU must have exactly 1 canonical record in universities table");
    assert.strictEqual(vjuUnis.rows[0].id, "vnu-vju");
  }
});

test.after(async () => {
  if (isPostgresConfigured()) {
    const { getPostgresPool } = await import("../src/lib/server/postgresClient");
    await getPostgresPool().end();
  }
});
