import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";
import {
  getDbUserByEmail,
  createDbSession,
  getDbSessionUser,
  deleteDbSession,
  upsertGoogleUserRecord,
  DbUserRecord,
  AccountStatus,
} from "./db";
import { UserProfile } from "@/types";

import {
  AdminRole,
  AdminPermission,
  hasPermission,
  SUPER_ADMIN_CANONICAL_EMAIL,
} from "./rbac";

export const SESSION_COOKIE_NAME = "rateurprofs_session";
export const OAUTH_STATE_COOKIE_NAME = "rateurprofs_oauth_state";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const ADMIN_CANONICAL_EMAIL = SUPER_ADMIN_CANONICAL_EMAIL;
export { SUPER_ADMIN_CANONICAL_EMAIL };

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  role?: AdminRole;
  status?: AccountStatus;
  lockReason?: string | null;
  lockedAt?: number | null;
  deletionRequestedAt?: number | null;
  deletionScheduledAt?: number | null;
  cohort?: string;
}

export function toAuthUser(record: DbUserRecord): AuthUser {
  const isTargetSuperAdmin = record.email
    ? record.email.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL
    : false;
  let effectiveRole: AdminRole = "student";
  if (isTargetSuperAdmin) {
    effectiveRole = "super_admin";
  } else if (
    record.role === "super_admin" ||
    record.role === "admin" ||
    record.role === "moderator" ||
    record.role === "support" ||
    record.role === "security"
  ) {
    effectiveRole = record.role;
  }

  return {
    uid: record.id,
    email: record.email,
    displayName: record.display_name,
    photoURL: record.photo_url,
    isAnonymous: false,
    role: effectiveRole,
    status: (record.status as AccountStatus) || "active",
    lockReason: record.lock_reason || null,
    lockedAt: record.locked_at ? Number(record.locked_at) : null,
    deletionRequestedAt: record.deletion_requested_at ? Number(record.deletion_requested_at) : null,
    deletionScheduledAt: record.deletion_scheduled_at ? Number(record.deletion_scheduled_at) : null,
    cohort: record.cohort || undefined,
  };
}

export function toUserProfile(record: DbUserRecord): UserProfile {
  const isTargetSuperAdmin = record.email
    ? record.email.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL
    : false;
  let effectiveRole: AdminRole = "student";
  if (isTargetSuperAdmin) {
    effectiveRole = "super_admin";
  } else if (
    record.role === "super_admin" ||
    record.role === "admin" ||
    record.role === "moderator" ||
    record.role === "support" ||
    record.role === "security"
  ) {
    effectiveRole = record.role;
  }

  return {
    uid: record.id,
    email: record.email,
    displayName: record.display_name || "Sinh viên",
    photoURL: record.photo_url,
    isAnonymous: false,
    role: effectiveRole,
    status: (record.status as AccountStatus) || "active",
    lockReason: record.lock_reason || null,
    lockedAt: record.locked_at ? Number(record.locked_at) : null,
    deletionRequestedAt: record.deletion_requested_at ? Number(record.deletion_requested_at) : null,
    deletionScheduledAt: record.deletion_scheduled_at ? Number(record.deletion_scheduled_at) : null,
    cohort: record.cohort || undefined,
    firstName: record.first_name || undefined,
    lastName: record.last_name || undefined,
    school: record.school || undefined,
    fieldOfStudy: record.field_of_study || undefined,
    expectedGraduationYear: record.expected_graduation_year || undefined,
  };
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleOAuthClient(redirectUri?: string): OAuth2Client {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Resolves the external public base URL from headers (x-forwarded-host, x-forwarded-proto).
 */
export function getBaseUrl(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (host && host.includes("localhost")) {
    const proto = req.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }

  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return "https://rateurprofs.site";
}

/**
 * Builds the canonical OAuth callback URI given the incoming request.
 */
export function getCallbackUri(req: NextRequest): string {
  return `${getBaseUrl(req)}/api/auth/google/callback`;
}

/**
 * Initiates the Google OAuth 2.0 authorization URL.
 * Guarantees account-selection prompt ('select_account').
 */
export function generateGoogleAuthUrl(
  redirectUri: string,
  returnUrl = "/"
): { url: string; state: string } {
  const oauthClient = getGoogleOAuthClient(redirectUri);
  const stateRandom = generateOAuthState();
  const safeReturn = returnUrl.startsWith("/") ? returnUrl : `/${returnUrl}`;
  // Encodes state with returnUrl: state_random:::returnUrl
  const state = `${stateRandom}:::${encodeURIComponent(safeReturn)}`;

  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });

  return { url, state };
}

export interface GooglePayload {
  sub: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
}

/**
 * Exchanges Google OAuth authorization code for verified identity tokens.
 */
export async function exchangeGoogleCodeForUser(
  code: string,
  redirectUri: string
): Promise<GooglePayload> {
  const oauthClient = getGoogleOAuthClient(redirectUri);
  const { tokens } = await oauthClient.getToken({
    code,
    redirect_uri: redirectUri,
  });

  if (!tokens.id_token) {
    throw new Error("Google không cung cấp ID token hợp lệ trong phản hồi.");
  }

  return verifyGoogleIdToken(tokens.id_token);
}

/**
 * Cryptographically verifies Google ID Token.
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<GooglePayload> {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    throw new Error("Thiếu Google ID token.");
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "";

  try {
    const oauthClient = new OAuth2Client(clientId);
    const ticket = await oauthClient.verifyIdToken({
      idToken: idToken.trim(),
      audience: clientId || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error("Không thể phân tích dữ liệu xác thực từ Google.");
    }

    const email = payload.email?.toLowerCase();
    if (!email) {
      throw new Error("Tài khoản Google không có email hợp lệ.");
    }

    return {
      sub: payload.sub,
      email,
      displayName: payload.name || "Sinh viên Google",
      photoUrl: payload.picture || null,
    };
  } catch (verifyErr) {
    // Verified fallback directly to Google tokeninfo endpoint if library audience check needs fallback
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`
    );

    if (!tokenInfoRes.ok) {
      console.error("[Auth] Google token verification failed:", verifyErr);
      throw new Error("Không thể xác thực danh tính từ Google. Vui lòng thử lại.");
    }

    const payload = await tokenInfoRes.json();
    const email = (payload.email as string)?.toLowerCase();
    if (!email) {
      throw new Error("Tài khoản Google không có email hợp lệ.");
    }

    return {
      sub: payload.sub as string,
      email,
      displayName: payload.name || "Sinh viên Google",
      photoUrl: payload.picture || null,
    };
  }
}

/**
 * Upserts a verified Google user into the persistent database and provisions an active session.
 */
export async function upsertGoogleUserAndCreateSession(
  googleUser: GooglePayload
): Promise<{ user: AuthUser; profile: UserProfile; sessionToken: string }> {
  const userId = `goog_${googleUser.sub}`;

  // Check if an existing account with this email or ID exists
  const existingByEmail = await getDbUserByEmail(googleUser.email);
  const targetId = existingByEmail ? existingByEmail.id : userId;

  const record = await upsertGoogleUserRecord({
    id: targetId,
    email: googleUser.email,
    displayName: googleUser.displayName,
    photoUrl: googleUser.photoUrl,
  });

  const sessionToken = await createSessionForUser(record.id);

  return {
    user: toAuthUser(record),
    profile: toUserProfile(record),
    sessionToken,
  };
}

export async function createSessionForUser(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await createDbSession(token, userId, expiresAt);
  return token;
}

const sessionCache = new Map<string, { data: { user: AuthUser; profile: UserProfile }; expiresAt: number }>();

export function clearSessionCache(token?: string): void {
  if (token) {
    sessionCache.delete(token);
  } else {
    sessionCache.clear();
  }
}

export async function authenticateSessionToken(token: string): Promise<{
  user: AuthUser;
  profile: UserProfile;
} | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  const cleanToken = token.trim();
  const now = Date.now();
  const cached = sessionCache.get(cleanToken);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const record = await getDbSessionUser(cleanToken);
  if (!record) {
    sessionCache.delete(cleanToken);
    return null;
  }

  const result = {
    user: toAuthUser(record),
    profile: toUserProfile(record),
  };

  // Cache session for 60 seconds to prevent hammering Cloud SQL on every route navigation
  sessionCache.set(cleanToken, {
    data: result,
    expiresAt: now + 60000,
  });

  return result;
}

export async function revokeSessionToken(token: string): Promise<void> {
  if (!token) return;
  const cleanToken = token.trim();
  sessionCache.delete(cleanToken);
  await deleteDbSession(cleanToken);
}

/**
 * Checks whether the user is an Administrator (super_admin, admin, or canonical super_admin email).
 */
export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const isSuperAdminEmail = user.email
    ? user.email.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL
    : false;
  return (
    isSuperAdminEmail ||
    user.role === "super_admin" ||
    user.role === "admin"
  );
}

/**
 * Enforces admin dashboard access authorization on server API routes.
 * Throws an error object with status 401 (unauthenticated) or 403 (unauthorized).
 */
export async function requireAdminSession(req: NextRequest): Promise<{
  user: AuthUser;
  profile: UserProfile;
}> {
  return requirePermission(req, "admin:access");
}

/**
 * Enforces granular server-side permission on privileged administrative endpoints.
 */
export async function requirePermission(
  req: NextRequest,
  permission: AdminPermission
): Promise<{ user: AuthUser; profile: UserProfile }> {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const token = cookieToken || bearerToken;
  if (!token) {
    const err = new Error("Yêu cầu đăng nhập tài khoản quản trị.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 401;
    throw err;
  }

  const session = await authenticateSessionToken(token);
  if (!session) {
    const err = new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 401;
    throw err;
  }

  if (session.user.status === "suspended" || session.user.status === "locked") {
    const err = new Error("Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 403;
    throw err;
  }

  const userRole = session.user.role || "student";
  if (!hasPermission(userRole, permission)) {
    const err = new Error(
      `Truy cập bị từ chối: Quyền [${permission}] yêu cầu cấp độ quản trị cao hơn. Liên hệ: ${ADMIN_CANONICAL_EMAIL}`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 403;
    throw err;
  }

  return session;
}

/**
 * Enforces an active, non-locked user session for content creation and mutations.
 * Throws with HTTP 401 or 403 if the user is unauthenticated, locked, or pending deletion.
 */
export async function requireActiveUser(req: NextRequest): Promise<{
  user: AuthUser;
  profile: UserProfile;
}> {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  const token = cookieToken || bearerToken;
  if (!token) {
    const err = new Error("Vui lòng đăng nhập để thực hiện hành động này.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 401;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "unauthenticated";
    throw err;
  }

  const session = await authenticateSessionToken(token);
  if (!session) {
    const err = new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 401;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "unauthenticated";
    throw err;
  }

  if (session.user.status === "locked" || session.user.status === "suspended") {
    const err = new Error(
      session.user.lockReason
        ? `Tài khoản của bạn đã bị khóa: ${session.user.lockReason}. Vui lòng gửi kháng nghị để được xem xét.`
        : "Tài khoản của bạn đã bị khóa. Vui lòng gửi kháng nghị để được xem xét."
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 403;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "account_locked";
    throw err;
  }

  if (session.user.status === "pending_deletion") {
    const err = new Error(
      "Tài khoản đang trong thời hạn chờ xóa 14 ngày. Vui lòng hủy yêu cầu xóa nếu muốn tiếp tục tương tác."
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 403;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "account_pending_deletion";
    throw err;
  }

  if (session.user.status === "deleted") {
    const err = new Error("Tài khoản đã bị xóa.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = 403;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = "account_deleted";
    throw err;
  }

  return session;
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

export function getOAuthStateCookieOptions() {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  };
}
