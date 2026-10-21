import { NextRequest, NextResponse } from "next/server";
import {
  authenticateSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  SUPER_ADMIN_CANONICAL_EMAIL,
} from "@/lib/server/auth";
import { requestAccountDeletion } from "@/lib/server/db";
import { queueEmail } from "@/lib/server/email/emailService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để thực hiện thao tác này." }, { status: 401 });
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn. Vui lòng đăng nhập lại." }, { status: 401 });
    }

    if (
      session.user.email &&
      session.user.email.trim().toLowerCase() === SUPER_ADMIN_CANONICAL_EMAIL
    ) {
      return NextResponse.json(
        { error: "Không thể yêu cầu xóa tài khoản Quản trị viên Tối cao." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

    const deletionResult = await requestAccountDeletion(session.user.uid, reason);

    // Dispatch recovery link email to user with 14-day grace period
    if (session.user.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rateurprofs.site";
      const recoveryUrl = `${siteUrl}/vi/account/recover?token=${deletionResult.recoveryToken}`;

      queueEmail({
        recipient: session.user.email,
        templateId: "account_deletion_requested",
        templateVars: {
          email: session.user.email,
          scheduledAt: deletionResult.scheduledAt,
          recoveryToken: deletionResult.recoveryToken,
          recoveryUrl,
        },
      }).catch((err) => console.warn("[API /api/account/delete] Email queue notice:", err));
    }

    const response = NextResponse.json(
      {
        success: true,
        message:
          "Yêu cầu xóa tài khoản đã được tiếp nhận. Tài khoản của bạn sẽ được giữ trong thời gian ân hạn 14 ngày. Email hướng dẫn khôi phục đã được gửi tới hòm thư của bạn.",
        scheduledAt: deletionResult.scheduledAt,
        recoveryToken: deletionResult.recoveryToken,
      },
      { status: 200 }
    );

    // Invalidate local session cookie
    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, "", {
      ...cookieOpts,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[API POST /api/account/delete] Error:", error);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu xóa tài khoản. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
