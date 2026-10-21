import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { queueEmail, processEmailOutboxBatch } from "@/lib/server/email/emailService";
import { checkEmailRateLimit } from "@/lib/server/email/emailRateLimiter";
import { isValidEmailAddress } from "@/lib/server/email/emailSanitizer";
import { EmailTemplateId, EmailLocale } from "@/lib/server/email/emailTypes";
import { getActiveEmailProvider } from "@/lib/server/email/emailProvider";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email/test
 * Sends an authorized test email to verify provider delivery & template rendering.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "settings:manage");
    const body = await req.json().catch(() => ({}));

    const recipient = (body.recipient || session.user.email || "").trim().toLowerCase();
    const templateId = (body.templateId || "test_email") as EmailTemplateId;
    const locale = (body.locale || "vi") as EmailLocale;

    if (!isValidEmailAddress(recipient)) {
      return NextResponse.json(
        { error: "Địa chỉ email người nhận thử nghiệm không hợp lệ." },
        { status: 400 }
      );
    }

    // Rate limit test sends: max 5 sends per 5 minutes
    const rateCheck = checkEmailRateLimit("admin-test-email", session.user.uid, 5, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Đã vượt quá tần suất gửi thử nghiệm. Vui lòng thử lại sau ${rateCheck.retryAfterSec} giây.`,
        },
        { status: 429 }
      );
    }

    const queueRes = await queueEmail({
      recipient,
      templateId,
      templateVars: {
        email: recipient,
        token: "demo_test_token_sample",
        verifyUrl: `https://rateurprofs.site/${locale}/account?verify_token=demo_test_token`,
        resetUrl: `https://rateurprofs.site/${locale}/account?reset_token=demo_test_token`,
        professorName: "GS.TS. Nguyễn Văn A",
        action: "Kiểm tra hệ thống thử nghiệm",
        reason: "Kiểm tra định dạng email và quy trình chuyển phát",
        details: "Thao tác được kích hoạt từ Bảng điều khiển Quản trị RateUrProfs",
        timestamp: Date.now(),
        ...body.templateVars,
      },
      locale,
    });

    if (!queueRes.success) {
      return NextResponse.json({ error: queueRes.error }, { status: 400 });
    }

    // Immediately process outbox so the admin sees the result immediately
    const batchResult = await processEmailOutboxBatch(1);

    const provider = getActiveEmailProvider();
    const config = await provider.verifyConfiguration();

    const message = config.isSandbox
      ? `Thư thử nghiệm đã được mô phỏng ở chế độ Sandbox (Mock). Do hệ thống chưa cấu hình API Key (RESEND_API_KEY / SENDGRID_API_KEY), thư chưa được gửi thực tế qua Internet tới ${recipient}.`
      : `Thư thử nghiệm đã được phát hành thành công tới ${recipient} qua ${config.provider.toUpperCase()}.`;

    return NextResponse.json({
      success: true,
      jobId: queueRes.jobId,
      recipient,
      templateId,
      batchResult,
      isSandbox: config.isSandbox,
      provider: config.provider,
      message,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/test] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test email",
      },
      { status }
    );
  }
}
