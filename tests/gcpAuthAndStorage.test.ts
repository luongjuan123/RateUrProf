import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  generateOAuthState,
  generateGoogleAuthUrl,
  upsertGoogleUserAndCreateSession,
  authenticateSessionToken,
  revokeSessionToken,
  isAdminUser,
  requireAdminSession,
  ADMIN_CANONICAL_EMAIL,
  SESSION_COOKIE_NAME,
} from "../src/lib/server/auth";
import {
  voteReview,
  getUserReviewsList,
  createReport,
  getReportsList,
  createCorrectionRequest,
  getCorrectionRequestsList,
  insertReview,
  getDbUserById,
} from "../src/lib/server/db";

describe("RateUrProfs — GCP Native Authentication & Relational Storage Suite", () => {
  const testSub = `sub_${Date.now()}`;
  const testEmail = `student_${Date.now()}@hust.edu.vn`;
  const testDisplayName = "Sinh viên Bách Khoa";
  let createdSessionToken = "";
  let testReviewId = "";

  it("01. Strict Zero-Firebase Assertion: zero imports or references in src/", () => {
    function scanDirectory(dir: string): string[] {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDirectory(fullPath));
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const srcFiles = scanDirectory(path.join(process.cwd(), "src"));
    const offendingFiles: string[] = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (
        content.includes('from "firebase') ||
        content.includes("from 'firebase") ||
        content.includes('require("firebase') ||
        content.includes("require('firebase") ||
        content.includes('from "./firebase"') ||
        content.includes('from "@/lib/firebase"')
      ) {
        offendingFiles.push(file);
      }
    }

    assert.deepStrictEqual(
      offendingFiles,
      [],
      `Zero Firebase imports permitted. Found in: ${offendingFiles.join(", ")}`
    );
  });

  it("02. Obsolete Auth Elimination: verify obsolete login/register/guest endpoints are completely removed", () => {
    const obsoleteRoutes = [
      path.join(process.cwd(), "src/app/api/auth/login"),
      path.join(process.cwd(), "src/app/api/auth/register"),
      path.join(process.cwd(), "src/app/api/auth/guest"),
    ];

    for (const routePath of obsoleteRoutes) {
      assert.strictEqual(
        fs.existsSync(routePath),
        false,
        `Obsolete auth route must be completely deleted: ${routePath}`
      );
    }
  });

  it("03. Google OAuth 2.0 State Security: high-entropy CSRF state and select_account prompt", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();
    assert.notStrictEqual(state1, state2, "OAuth states must be cryptographically unique");
    assert.ok(state1.length >= 32, "OAuth state must possess high entropy");

    const callbackUri = "http://localhost:3000/api/auth/google/callback";
    const { url, state } = generateGoogleAuthUrl(callbackUri, "/professors/prof-123");
    assert.ok(url.includes("accounts.google.com/o/oauth2/v2/auth"), "Must target official Google OAuth 2.0 endpoint");
    assert.ok(url.includes("prompt=select_account"), "Must include prompt=select_account for genuine account selection");
    assert.ok(url.includes("scope=openid"), "Must request openid scope");
    assert.ok(url.includes("email"), "Must request email scope");
    assert.ok(state.includes(encodeURIComponent("/professors/prof-123")), "State must safely encode return URL");
  });

  it("04. Google User Provisioning & Sub Claim Mapping: creates persistent user with goog_{sub}", async () => {
    const result = await upsertGoogleUserAndCreateSession({
      sub: testSub,
      email: testEmail,
      displayName: testDisplayName,
      photoUrl: "https://lh3.googleusercontent.com/a/test-avatar",
    });

    assert.strictEqual(result.user.uid, `goog_${testSub}`, "UID must be prefixed with goog_ and map to Google sub");
    assert.strictEqual(result.user.email, testEmail);
    assert.strictEqual(result.user.displayName, testDisplayName);
    assert.strictEqual(result.user.isAnonymous, false);
    assert.strictEqual(result.user.role, "student", "Regular Google accounts must receive role student");
    assert.ok(result.sessionToken.length >= 32, "Must issue secure session token");

    // Verify stored in DB
    const dbUser = await getDbUserById(`goog_${testSub}`);
    assert.ok(dbUser, "User record must persist in database");
    assert.strictEqual(dbUser?.email, testEmail);

    createdSessionToken = result.sessionToken;
  });

  it("05. Strict Admin RBAC Enforcement: dungpubgame@gmail.com is exclusively granted admin role", async () => {
    // 1. Authenticate with canonical admin email
    const adminGoogleSub = `sub_admin_${Date.now()}`;
    const adminResult = await upsertGoogleUserAndCreateSession({
      sub: adminGoogleSub,
      email: ADMIN_CANONICAL_EMAIL,
      displayName: "Dung Admin",
      photoUrl: null,
    });

    assert.strictEqual(adminResult.user.email, ADMIN_CANONICAL_EMAIL);
    assert.ok(adminResult.user.role === "admin" || adminResult.user.role === "super_admin", "dungpubgame@gmail.com must be granted admin or super_admin role");
    assert.strictEqual(isAdminUser(adminResult.user), true, "isAdminUser must return true for dungpubgame@gmail.com");

    // 2. Authenticate with an email trying to impersonate admin
    const impostorSub = `sub_impostor_${Date.now()}`;
    const impostorResult = await upsertGoogleUserAndCreateSession({
      sub: impostorSub,
      email: "admin@rateurprofs.site",
      displayName: "Fake Admin",
      photoUrl: null,
    });

    assert.strictEqual(impostorResult.user.role, "student", "Non-canonical accounts must NEVER receive admin role");
    assert.strictEqual(isAdminUser(impostorResult.user), false, "isAdminUser must return false for any other email");
  });

  it("06. Session Persistence & Revocation: validates active session and revokes on logout", async () => {
    assert.ok(createdSessionToken);
    const session = await authenticateSessionToken(createdSessionToken);
    assert.ok(session, "Valid session token must return authenticated user");
    assert.strictEqual(session?.user.email, testEmail);

    // Revoke session
    await revokeSessionToken(createdSessionToken);
    const expiredSession = await authenticateSessionToken(createdSessionToken);
    assert.strictEqual(expiredSession, null, "Revoked session token must return null");
  });

  it("07. Admin Authorization Guard: requireAdminSession throws 401 on missing session and 403 on non-admin user", async () => {
    // 1. Missing session throws 401
    const unauthenticatedReq = new NextRequest("http://localhost:3000/api/admin/crawler/overview");
    await assert.rejects(
      async () => {
        await requireAdminSession(unauthenticatedReq);
      },
      (err: any) => {
        assert.strictEqual(err.status, 401);
        return true;
      }
    );

    // 2. Non-admin session throws 403
    const studentUser = await upsertGoogleUserAndCreateSession({
      sub: `student_${Date.now()}`,
      email: "student@university.edu.vn",
      displayName: "Sinh viên",
      photoUrl: null,
    });
    const studentReq = new NextRequest("http://localhost:3000/api/admin/crawler/overview", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${studentUser.sessionToken}`,
      },
    });
    await assert.rejects(
      async () => {
        await requireAdminSession(studentReq);
      },
      (err: any) => {
        assert.strictEqual(err.status, 403);
        assert.ok(err.message.includes(ADMIN_CANONICAL_EMAIL));
        return true;
      }
    );

    // 3. Admin session succeeds
    const adminUser = await upsertGoogleUserAndCreateSession({
      sub: `admin_${Date.now()}`,
      email: ADMIN_CANONICAL_EMAIL,
      displayName: "Admin Dung",
      photoUrl: null,
    });
    const adminReq = new NextRequest("http://localhost:3000/api/admin/crawler/overview", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminUser.sessionToken}`,
      },
    });
    const verified = await requireAdminSession(adminReq);
    assert.strictEqual(verified.user.email, ADMIN_CANONICAL_EMAIL);
    assert.ok(verified.user.role === "admin" || verified.user.role === "super_admin");
  });

  it("08. Review Upvoting: toggles vote atomically and tracks helpful count", async () => {
    testReviewId = `rev-test-${Date.now()}`;
    const testVoterId = `voter-${Date.now()}`;

    // Seed test review with genuine lecturer
    await insertReview({
      id: testReviewId,
      lecturerId: "prof-vnu-hus-ngo-quoc-anh",
      universityId: "vnu-hus",
      userDisplayName: "Sinh viên Test",
      userId: `test-user-${Date.now()}`,
      courseName: "Giải tích hàm",
      overallRating: 5,
      difficultyScore: 3,
      takeAgain: 1,
      comment: "Thầy giảng dạy rất dễ hiểu và tận tâm.",
    });

    // 1st vote: toggle ON
    const firstVote = await voteReview(testReviewId, testVoterId);
    assert.strictEqual(firstVote.upvoted, true);
    assert.ok(firstVote.helpfulCount >= 1);

    // 2nd vote from same user: toggle OFF
    const secondVote = await voteReview(testReviewId, testVoterId);
    assert.strictEqual(secondVote.upvoted, false);
  });

  it("09. Reports & Moderation: stores community reports in relational database", async () => {
    const reportId = `rep-test-${Date.now()}`;
    await createReport({
      id: reportId,
      reviewId: testReviewId,
      professorId: "prof-vnu-hus-ngo-quoc-anh",
      professorName: "Ngô Quốc Anh",
      reviewCommentSnippet: "Nội dung cần kiểm tra...",
      reportedByUserId: "test-reporter",
      reason: "Spam",
      details: "Bình luận trùng lặp",
    });

    const reports = await getReportsList();
    const created = reports.find((r) => r.id === reportId);
    assert.ok(created, "Created report must be found in reports list");
    assert.strictEqual(created?.reason, "Spam");
    assert.strictEqual(created?.status, "pending");
  });

  it("10. Correction Requests: stores institutional correction requests", async () => {
    const reqId = `corr-test-${Date.now()}`;
    await createCorrectionRequest({
      id: reqId,
      professorId: "prof-nguyen-thanh-tung",
      professorName: "Nguyễn Thanh Tùng",
      requesterEmail: "contact@hust.edu.vn",
      requesterRelation: "Phòng Đào tạo",
      details: "Cập nhật học hàm Phó Giáo sư",
    });

    const requests = await getCorrectionRequestsList();
    const created = requests.find((c) => c.id === reqId);
    assert.ok(created, "Created correction request must be found in list");
    assert.strictEqual(created?.professorName, "Nguyễn Thanh Tùng");
    assert.strictEqual(created?.status, "pending");
  });

  after(async () => {
    try {
      const { getPostgresPool, isPostgresConfigured } = await import("../src/lib/server/postgresClient");
      if (isPostgresConfigured()) {
        await getPostgresPool().end();
      }
    } catch {
      // ignore
    }
  });
});
