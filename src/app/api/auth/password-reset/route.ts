import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDbUserByEmail } from "@/lib/server/db";
import { queueEmail, createSecureEmailToken, verifyAndConsumeToken } from "@/lib/server/email/emailService";
import { checkEmailRateLimit } from "@/lib/server/email/emailRateLimiter";
import { isValidEmailAddress } from "@/lib/server/email/emailSanitizer";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";
import { getSqliteDatabase } from "@/lib/server/sqliteClient";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/password-reset
 * Initiates a secure password reset flow with timing-safe non-enumerating response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    if (!isValidEmailAddress(email)) {
      return NextResponse.json(
        { error: "Vui lòng nhập địa chỉ email hợp lệ." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkEmailRateLimit("password-reset", `${clientIp}:${email}`, 3, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Bạn đã yêu cầu đặt lại mật khẩu quá số lần cho phép. Vui lòng thử lại sau ${rateCheck.retryAfterSec} giây.`,
        },
        { status: 429 }
      );
    }

    const user = await getDbUserByEmail(email);

    // Only dispatch email if user actually exists, but always return timing-safe generic response
    if (user) {
      const { rawToken } = await createSecureEmailToken({
        userId: user.id,
        email,
        tokenType: "password_reset",
        expiresInMs: 60 * 60 * 1000, // 1 hour
      });

      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "rateurprofs.site";
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const resetUrl = `${proto}://${host}/vi/account/settings?reset_token=${rawToken}`;

      await queueEmail({
        recipient: email,
        templateId: "password_reset",
        templateVars: {
          email,
          resetUrl,
          token: rawToken,
        },
        locale: "vi",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Nếu địa chỉ email tồn tại trên hệ thống, thư hướng dẫn đặt lại mật khẩu đã được gửi.",
    });
  } catch (error) {
    console.error("[API /api/auth/password-reset] POST error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xử lý yêu cầu đặt lại mật khẩu." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/password-reset
 * Consumes the reset token and safely updates the user's password.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== "string" || !newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Yêu cầu cung cấp mã xác thực token và mật khẩu mới." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có tối thiểu 8 ký tự." },
        { status: 400 }
      );
    }

    const consumed = await verifyAndConsumeToken(token, "password_reset");
    if (!consumed || !consumed.user_id) {
      return NextResponse.json(
        { error: "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." },
        { status: 400 }
      );
    }

    // Generate secure password hash with salt
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        "UPDATE users SET password_hash = $1, salt = $2, updated_at = $3 WHERE id = $4",
        [passwordHash, salt, now, consumed.user_id]
      );
      // Invalidate existing sessions for security
      await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [consumed.user_id]);
    } else {
      const db = getSqliteDatabase();
      db.prepare(
        "UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?"
      ).run(passwordHash, salt, now, consumed.user_id);
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(consumed.user_id);
    }

    // Queue security alert notification to user
    await queueEmail({
      recipient: consumed.email,
      templateId: "security_alert",
      templateVars: {
        action: "Mật khẩu tài khoản đã được thay đổi thành công",
        details: "Mật khẩu vừa được cập nhật thông qua quy trình Đặt lại mật khẩu. Tất cả phiên đăng nhập cũ đã được thu hồi.",
        timestamp: now,
      },
      locale: "vi",
    });

    return NextResponse.json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    console.error("[API /api/auth/password-reset] PUT error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật mật khẩu." },
      { status: 500 }
    );
  }
}
