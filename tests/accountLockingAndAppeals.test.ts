import test from "node:test";
import assert from "node:assert/strict";
import {
  lockUserAccount,
  unlockUserAccount,
  createAccountAppeal,
  getAccountAppealByUserId,
  getAccountAppealById,
  getAccountAppealsList,
  updateAccountAppeal,
  insertReview,
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

test("Account Locking & Appeals: Lock enforcement, appeal submission, and admin review", async () => {
  const testUserId = `test-lock-user-${Date.now()}`;
  const testEmail = `${testUserId}@rateurprofs.site`;
  const testLecturerId = `test-lecturer-lock-${Date.now()}`;
  const testReviewId = `test-rev-lock-${Date.now()}`;

  // 1. Seed user, lecturer, and review in DB
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES ($1, 'Lecturer For Lock Test', 'lecturer for lock test', 0, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [testLecturerId]
    );
    await pool.query(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES ($1, $2, 'Lock Test User', 'student', 'active', $3)`,
      [testUserId, testEmail, Date.now()]
    );
    await pool.query(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES ($1, $2, $3, 5.0, 2.0, 1, 'published', $4)`,
      [testReviewId, testLecturerId, testUserId, Date.now()]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `INSERT OR IGNORE INTO lecturers (id, name, normalized_name, rating_count, rating_average)
       VALUES (?, 'Lecturer For Lock Test', 'lecturer for lock test', 0, NULL)`
    ).run(testLecturerId);
    db.prepare(
      `INSERT INTO users (id, email, display_name, role, status, created_at)
       VALUES (?, ?, 'Lock Test User', 'student', 'active', ?)`
    ).run(testUserId, testEmail, Date.now());
    db.prepare(
      `INSERT INTO reviews (id, lecturer_id, user_id, overall_rating, difficulty_score, take_again, status, created_at)
       VALUES (?, ?, ?, 5.0, 2.0, 1, 'published', ?)`
    ).run(testReviewId, testLecturerId, testUserId, Date.now());
  }

  // Create session for the active user
  const sessionToken = await createSessionForUser(testUserId);
  const activeSession = await authenticateSessionToken(sessionToken);
  assert.ok(activeSession, "Session must exist");
  assert.strictEqual(activeSession.user.status, "active");

  // Mock NextRequest for active user
  const reqActive = new NextRequest("http://localhost:3000/api/lecturers/test/reviews", {
    headers: {
      cookie: `rateurprofs_session=${sessionToken}`,
    },
  });
  const verifiedActive = await requireActiveUser(reqActive);
  assert.strictEqual(verifiedActive.user.uid, testUserId);

  // 2. Lock the user account
  const lockReason = "Phát hiện ngôn từ không phù hợp trong bài đánh giá.";
  const lockedUser = await lockUserAccount(testUserId, lockReason, "admin@rateurprofs.site");
  assert.strictEqual(lockedUser.status, "locked");
  assert.strictEqual(lockedUser.lock_reason, lockReason);

  // 3. User MUST still be able to authenticate and have a valid session!
  const lockedSession = await authenticateSessionToken(sessionToken);
  assert.ok(lockedSession, "Locked user must still be authenticated");
  assert.strictEqual(lockedSession.user.status, "locked");
  assert.strictEqual(lockedSession.user.lockReason, lockReason);

  // 4. Content mutation APIs must reject with 403 account_locked
  const reqLocked = new NextRequest("http://localhost:3000/api/lecturers/test/reviews", {
    headers: {
      cookie: `rateurprofs_session=${sessionToken}`,
    },
  });
  await assert.rejects(
    async () => {
      await requireActiveUser(reqLocked);
    },
    (err: any) => {
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.code, "account_locked");
      assert.ok(err.message.includes(lockReason));
      return true;
    }
  );

  // 5. Submit an Appeal
  const appeal = await createAccountAppeal({
    userId: testUserId,
    userEmail: testEmail,
    userDisplayName: "Lock Test User",
    category: "Hiểu nhầm quy tắc cộng đồng",
    reason: "Tôi xin giải trình rằng bình luận của tôi chỉ mang tính nhận xét phương pháp giảng dạy, không có ý công kích cá nhân.",
    supportingInfo: "Đính kèm giáo trình môn học để đối chiếu.",
  });
  assert.ok(appeal.id.startsWith("appeal_"));
  assert.strictEqual(appeal.status, "submitted");
  assert.strictEqual(appeal.userDisplayName, "Lock Test User");
  assert.strictEqual(appeal.userEmail, testEmail);
  assert.ok(typeof appeal.createdAt === "number" && !isNaN(appeal.createdAt));
  assert.notStrictEqual(new Date(appeal.createdAt!).toString(), "Invalid Date");

  // Check latest appeal for user
  const userAppeal = await getAccountAppealByUserId(testUserId);
  assert.ok(userAppeal);
  assert.strictEqual(userAppeal.id, appeal.id);
  assert.strictEqual(userAppeal.status, "submitted");
  assert.strictEqual(userAppeal.userDisplayName, "Lock Test User");

  // Check appeals listing with status="submitted" AND status="pending" (mapped)
  const listSubmitted = await getAccountAppealsList({ status: "submitted", search: testEmail });
  assert.ok(listSubmitted.totalCount >= 1);
  assert.ok(listSubmitted.items.some((item) => item.id === appeal.id));

  const listPending = await getAccountAppealsList({ status: "pending" as any, search: testEmail });
  assert.ok(listPending.totalCount >= 1);
  assert.ok(listPending.items.some((item) => item.id === appeal.id));

  // 6. Admin accepts appeal and restores account
  const updatedAppeal = await updateAccountAppeal(appeal.id, {
    status: "accepted",
    decisionReason: "Giải trình thỏa đáng, chấp thuận mở khóa tài khoản.",
    adminNotes: "Người dùng đã cam kết tuân thủ quy chế.",
    reviewedBy: "admin-actor-id",
    reviewedByEmail: "admin@rateurprofs.site",
  });
  assert.strictEqual(updatedAppeal.status, "accepted");
  assert.strictEqual(updatedAppeal.decisionReason, "Giải trình thỏa đáng, chấp thuận mở khóa tài khoản.");

  // Check filter with status="approved"
  const listApproved = await getAccountAppealsList({ status: "approved" as any, search: testEmail });
  assert.ok(listApproved.totalCount >= 1);
  assert.ok(listApproved.items.some((item) => item.id === appeal.id));

  const restoredUser = await unlockUserAccount(testUserId);
  assert.strictEqual(restoredUser.status, "active");
  assert.strictEqual(restoredUser.lock_reason, null);

  // 7. Verify user can now perform mutations again
  const restoredSession = await authenticateSessionToken(sessionToken);
  assert.ok(restoredSession);
  assert.strictEqual(restoredSession.user.status, "active");

  const verifiedRestored = await requireActiveUser(reqActive);
  assert.strictEqual(verifiedRestored.user.uid, testUserId);

  setTimeout(() => process.exit(0), 100);
});
