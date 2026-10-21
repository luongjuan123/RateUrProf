import { NextRequest, NextResponse } from "next/server";
import { recoverAccountWithToken } from "@/lib/server/db";
import { queueEmail } from "@/lib/server/email/emailService";
import { createSessionForUser, getSessionCookieOptions } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const rawToken = body.token || searchParams.get("token");

    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp mã khôi phục tài khoản hợp lệ." },
        { status: 400 }
      );
    }

    const result = await recoverAccountWithToken(rawToken.trim());
    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.message || "Mã khôi phục không hợp lệ hoặc đã hết hạn sau 14 ngày." },
        { status: 400 }
      );
    }

    // Send confirmation email
    if (result.user.email) {
      queueEmail({
        recipient: result.user.email,
        templateId: "account_recovered",
        templateVars: {
          email: result.user.email,
          status: result.user.status,
        },
      }).catch((err) => console.warn("[API /api/account/recover] Email queue notice:", err));
    }

    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.display_name,
          status: result.user.status,
        },
      },
      { status: 200 }
    );

    // If the restored status is active, log them in automatically by setting session cookie
    if (result.user.status === "active") {
      const sessionToken = await createSessionForUser(result.user.id);
      const sessionCookieOpts = getSessionCookieOptions();
      response.cookies.set(sessionCookieOpts.name, sessionToken, sessionCookieOpts);
    }

    return response;
  } catch (error) {
    console.error("[API POST /api/account/recover] Error:", error);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu khôi phục tài khoản. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
