import test from "node:test";
import assert from "node:assert/strict";

import {
  canSuspendOrDeleteUser,
  hasPermission,
  SUPER_ADMIN_CANONICAL_EMAIL,
} from "../src/lib/server/rbac";
import {
  deleteAdminUser,
  batchAdminUserAction,
  updateAdminUser,
  getAdminUsers,
} from "../src/lib/server/adminDb";
import { isPostgresConfigured, getPostgresPool } from "../src/lib/server/postgresClient";
import { getSqliteDatabase } from "../src/lib/server/sqliteClient";

test("Admin RBAC: Permissions for temporary vs permanent deletion", () => {
  // Super Admin has both users:suspend and users:delete
  assert.strictEqual(hasPermission("super_admin", "users:suspend"), true);
  assert.strictEqual(hasPermission("super_admin", "users:delete"), true);

  // Admin has users:suspend, but NOT users:delete
  assert.strictEqual(hasPermission("admin", "users:suspend"), true);
  assert.strictEqual(hasPermission("admin", "users:delete"), false);

  // canSuspendOrDeleteUser checks
  const adminSoftDelete = canSuspendOrDeleteUser("admin", "regular@example.com", false);
  assert.strictEqual(adminSoftDelete.allowed, true);

  const adminPermanentDelete = canSuspendOrDeleteUser("admin", "regular@example.com", true);
  assert.strictEqual(adminPermanentDelete.allowed, false);
  assert.ok(adminPermanentDelete.reason?.includes("Super Admin"));

  const superAdminPermanentDelete = canSuspendOrDeleteUser("super_admin", "regular@example.com", true);
  assert.strictEqual(superAdminPermanentDelete.allowed, true);

  // Canonical Super Admin is strictly immune to both soft and hard delete
  const canonicalSoft = canSuspendOrDeleteUser("super_admin", SUPER_ADMIN_CANONICAL_EMAIL, false);
  assert.strictEqual(canonicalSoft.allowed, false);

  const canonicalHard = canSuspendOrDeleteUser("super_admin", SUPER_ADMIN_CANONICAL_EMAIL, true);
  assert.strictEqual(canonicalHard.allowed, false);
});

test("Admin DB: Temporary Delete, Review Hiding, Rating Recalculation, and Restore Flow", async () => {
  const actor = {
    id: "admin-actor-1",
    email: "superadmin@example.com",
    role: "super_admin" as const,
  };

  const testUserId = `test-user-${Date.now()}`;
  const testEmail = `${testUserId}@example.com`;
  const testLecturerId = `test-lecturer-${Date.now()}`;
  const testReviewId = `test-review-${Date.now()}`;

  // Insert seed test data in DB (Postgres if configured, SQLite if not)
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    // Insert lecturer
    await pool.query(
      `INSERT INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES ($1, 'Test Lecturer For Soft Delete', 'test lecturer for soft delete', 0, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [testLecturerId]
    );
    // Insert user
    await pool.query(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES ($1, $2, 'Test User', 'student', 'active', $3)`,
      [testUserId, testEmail, Date.now()]
    );
    // Insert published review
    await pool.query(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES ($1, $2, $3, 5.0, 3.0, 1, 'published', $4)`,
      [testReviewId, testLecturerId, testUserId, Date.now()]
    );
    // Initial lecturer recalculation
    await pool.query(
      `UPDATE lecturers SET rating_count = 1, rating_average = 5.0 WHERE id = $1`,
      [testLecturerId]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `INSERT INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES (?, 'Test Lecturer For Soft Delete', 'test lecturer for soft delete', 1, 5.0)`
    ).run(testLecturerId);
    db.prepare(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES (?, ?, 'Test User', 'student', 'active', ?)`
    ).run(testUserId, testEmail, Date.now());
    db.prepare(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES (?, ?, ?, 5.0, 3.0, 1, 'published', ?)`
    ).run(testReviewId, testLecturerId, testUserId, Date.now());
  }

  // 1. Temporary Delete (Suspend & Hide Reviews)
  const softResult = await deleteAdminUser(testUserId, { permanent: false, reason: "Test soft delete" }, actor);
  assert.strictEqual(softResult.success, true);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const uRes = await pool.query("SELECT status FROM users WHERE id = $1", [testUserId]);
    assert.ok(
      uRes.rows[0]?.status === "suspended" || uRes.rows[0]?.status === "locked",
      "User status must be suspended or locked"
    );

    const rRes = await pool.query("SELECT status FROM reviews WHERE id = $1", [testReviewId]);
    assert.strictEqual(rRes.rows[0]?.status, "hidden", "User's review status must be hidden");

    const lRes = await pool.query("SELECT rating_count FROM lecturers WHERE id = $1", [testLecturerId]);
    assert.strictEqual(Number(lRes.rows[0]?.rating_count), 0, "Lecturer rating_count must recalculate to 0 when review is hidden");
  } else {
    const db = getSqliteDatabase();
    const uRow = db.prepare("SELECT status FROM users WHERE id = ?").get(testUserId) as any;
    assert.ok(
      uRow?.status === "suspended" || uRow?.status === "locked",
      "User status must be suspended or locked"
    );

    const rRow = db.prepare("SELECT status FROM reviews WHERE id = ?").get(testReviewId) as any;
    assert.strictEqual(rRow?.status, "hidden");

    const lRow = db.prepare("SELECT rating_count FROM lecturers WHERE id = ?").get(testLecturerId) as any;
    assert.strictEqual(Number(lRow?.rating_count), 0);
  }

  // 2. Restore User (Activate & Unhide Reviews)
  const restoreResult = await updateAdminUser(testUserId, { status: "active" }, actor);
  assert.strictEqual(restoreResult.success, true);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const uRes = await pool.query("SELECT status FROM users WHERE id = $1", [testUserId]);
    assert.strictEqual(uRes.rows[0]?.status, "active", "User status must be active");

    const rRes = await pool.query("SELECT status FROM reviews WHERE id = $1", [testReviewId]);
    assert.strictEqual(rRes.rows[0]?.status, "published", "User's review status must be published again");

    const lRes = await pool.query("SELECT rating_count, rating_average FROM lecturers WHERE id = $1", [testLecturerId]);
    assert.strictEqual(Number(lRes.rows[0]?.rating_count), 1, "Lecturer rating_count must restore to 1");
  } else {
    const db = getSqliteDatabase();
    const uRow = db.prepare("SELECT status FROM users WHERE id = ?").get(testUserId) as any;
    assert.strictEqual(uRow?.status, "active");

    const rRow = db.prepare("SELECT status FROM reviews WHERE id = ?").get(testReviewId) as any;
    assert.strictEqual(rRow?.status, "published");

    const lRow = db.prepare("SELECT rating_count FROM lecturers WHERE id = ?").get(testLecturerId) as any;
    assert.strictEqual(Number(lRow?.rating_count), 1);
  }

  // 3. Permanent Delete (Hard Delete User + Reviews)
  const hardResult = await deleteAdminUser(testUserId, { permanent: true, reason: "Test hard delete" }, actor);
  assert.strictEqual(hardResult.success, true);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const uRes = await pool.query("SELECT * FROM users WHERE id = $1", [testUserId]);
    assert.strictEqual(uRes.rows.length, 0, "User must be completely deleted");

    const rRes = await pool.query("SELECT * FROM reviews WHERE id = $1", [testReviewId]);
    assert.strictEqual(rRes.rows.length, 0, "Reviews must be completely deleted");

    const lRes = await pool.query("SELECT rating_count FROM lecturers WHERE id = $1", [testLecturerId]);
    assert.strictEqual(Number(lRes.rows[0]?.rating_count), 0, "Lecturer rating_count must be 0 after review deletion");

    // Cleanup test lecturer
    await pool.query("DELETE FROM lecturers WHERE id = $1", [testLecturerId]);
  } else {
    const db = getSqliteDatabase();
    const uRow = db.prepare("SELECT * FROM users WHERE id = ?").get(testUserId);
    assert.strictEqual(uRow, undefined);

    const rRow = db.prepare("SELECT * FROM reviews WHERE id = ?").get(testReviewId);
    assert.strictEqual(rRow, undefined);

    const lRow = db.prepare("SELECT rating_count FROM lecturers WHERE id = ?").get(testLecturerId) as any;
    assert.strictEqual(Number(lRow?.rating_count), 0);

    db.prepare("DELETE FROM lecturers WHERE id = ?").run(testLecturerId);
  }
});

test("Admin DB: Batch Actions via Tickbox Multi-Select", async () => {
  const actor = {
    id: "admin-actor-2",
    email: "superadmin2@example.com",
    role: "super_admin" as const,
  };

  const u1 = `batch-u1-${Date.now()}`;
  const u2 = `batch-u2-${Date.now()}`;
  const now = Date.now();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query("INSERT INTO users (id, email, display_name, status, created_at) VALUES ($1, $2, 'Batch 1', 'active', $3)", [u1, `${u1}@example.com`, now]);
    await pool.query("INSERT INTO users (id, email, display_name, status, created_at) VALUES ($1, $2, 'Batch 2', 'active', $3)", [u2, `${u2}@example.com`, now]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("INSERT INTO users (id, email, display_name, status, created_at) VALUES (?, ?, 'Batch 1', 'active', ?)").run(u1, `${u1}@example.com`, now);
    db.prepare("INSERT INTO users (id, email, display_name, status, created_at) VALUES (?, ?, 'Batch 2', 'active', ?)").run(u2, `${u2}@example.com`, now);
  }

  // Batch Temporary Delete
  const batchSoft = await batchAdminUserAction([u1, u2], "temporary_delete", { reason: "Batch test" }, actor);
  assert.strictEqual(batchSoft.success, true);
  assert.strictEqual(batchSoft.affectedCount, 2);

  // Batch Permanent Delete
  const batchHard = await batchAdminUserAction([u1, u2], "permanent_delete", { reason: "Batch hard delete" }, actor);
  assert.strictEqual(batchHard.success, true);
  assert.strictEqual(batchHard.affectedCount, 2);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT id FROM users WHERE id IN ($1, $2)", [u1, u2]);
    assert.strictEqual(res.rows.length, 0, "Batch deleted users must no longer exist");
  } else {
    const db = getSqliteDatabase();
    const rows = db.prepare("SELECT id FROM users WHERE id IN (?, ?)").all(u1, u2);
    assert.strictEqual(rows.length, 0);
  }
});

test.after(async () => {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.end();
  }
});
