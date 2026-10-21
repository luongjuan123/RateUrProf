import test from "node:test";
import assert from "node:assert/strict";
import {
  requestAccountDeletion,
  recoverAccountWithToken,
  getDbUserById,
} from "../src/lib/server/db";
import {
  createSessionForUser,
  authenticateSessionToken,
  requireActiveUser,
} from "../src/lib/server/auth";
import { isPostgresConfigured, getPostgresPool } from "../src/lib/server/postgresClient";
import { getSqliteDatabase } from "../src/lib/server/sqliteClient";
import { NextRequest } from "next/server";

test("Account Deletion & Recovery: 14-day grace period, review hiding, and token recovery", async () => {
  const testUserId = `test-del-user-${Date.now()}`;
  const testEmail = `${testUserId}@rateurprofs.site`;
  const testLecturerId = `test-lecturer-del-${Date.now()}`;
  const testReviewId = `test-rev-del-${Date.now()}`;

  // 1. Seed user, lecturer, and published review in DB
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES ($1, 'Lecturer For Deletion Test', 'lecturer for deletion test', 0, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [testLecturerId]
    );
    await pool.query(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES ($1, $2, 'Delete Test User', 'student', 'active', $3)`,
      [testUserId, testEmail, Date.now()]
    );
    await pool.query(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES ($1, $2, $3, 4.0, 3.0, 1, 'published', $4)`,
      [testReviewId, testLecturerId, testUserId, Date.now()]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `INSERT OR IGNORE INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES (?, 'Lecturer For Deletion Test', 'lecturer for deletion test', 0, NULL)`
    ).run(testLecturerId);
    db.prepare(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES (?, ?, 'Delete Test User', 'student', 'active', ?)`
    ).run(testUserId, testEmail, Date.now());
    db.prepare(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES (?, ?, ?, 4.0, 3.0, 1, 'published', ?)`
    ).run(testReviewId, testLecturerId, testUserId, Date.now());
  }

  // 2. Request account deletion
  const deletionResult = await requestAccountDeletion(testUserId, "Tôi muốn xóa tài khoản.");
  assert.strictEqual(deletionResult.success, true);
  assert.ok(deletionResult.recoveryToken);
  assert.ok(deletionResult.scheduledAt > Date.now() + 13 * 24 * 60 * 60 * 1000);

  // Check user state in database
  const userPending = await getDbUserById(testUserId);
  assert.ok(userPending);
  assert.strictEqual(userPending.status, "pending_deletion");
  assert.strictEqual(userPending.recovery_token, deletionResult.recoveryToken);

  // Check that review was hidden and lecturer rating recalculated
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const rRes = await pool.query("SELECT status FROM reviews WHERE id = $1", [testReviewId]);
    assert.strictEqual(rRes.rows[0]?.status, "hidden");

    const lRes = await pool.query("SELECT rating_count FROM lecturers WHERE id = $1", [testLecturerId]);
    assert.strictEqual(Number(lRes.rows[0]?.rating_count), 0);
  }

  // 3. Authenticated session check on pending_deletion
  const newSessionToken = await createSessionForUser(testUserId);
  const sessionPending = await authenticateSessionToken(newSessionToken);
  assert.ok(sessionPending);
  assert.strictEqual(sessionPending.user.status, "pending_deletion");

  const reqPending = new NextRequest("http://localhost:3000/api/lecturers/test/reviews", {
    headers: {
      cookie: `rateurprofs_session=${newSessionToken}`,
    },
  });
  await assert.rejects(
    async () => {
      await requireActiveUser(reqPending);
    },
    (err: any) => {
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.code, "account_pending_deletion");
      return true;
    }
  );

  // 4. Invalid recovery token fails
  const invalidRecovery = await recoverAccountWithToken("invalid-fake-token-12345");
  assert.strictEqual(invalidRecovery.success, false);

  // 5. Valid recovery token succeeds and restores account
  const recoveryResult = await recoverAccountWithToken(deletionResult.recoveryToken);
  assert.strictEqual(recoveryResult.success, true);
  assert.strictEqual(recoveryResult.user?.status, "active");

  const userRestored = await getDbUserById(testUserId);
  assert.ok(userRestored);
  assert.strictEqual(userRestored.status, "active");
  assert.strictEqual(userRestored.recovery_token, null);
  assert.strictEqual(userRestored.deletion_scheduled_at, null);

  // Verify review unhidden
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const rRes = await pool.query("SELECT status FROM reviews WHERE id = $1", [testReviewId]);
    assert.strictEqual(rRes.rows[0]?.status, "published");
  }

  // 6. User can now perform mutations again
  const restoredSession = await authenticateSessionToken(newSessionToken);
  assert.ok(restoredSession);
  assert.strictEqual(restoredSession.user.status, "active");

  const verifiedRestored = await requireActiveUser(reqPending);
  assert.strictEqual(verifiedRestored.user.uid, testUserId);
});
