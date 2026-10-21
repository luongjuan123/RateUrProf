import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { renderEmailTemplate } from "@/lib/server/email/emailTemplates";
import { EmailTemplateId, EmailLocale } from "@/lib/server/email/emailTypes";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email/preview
 * Renders an email template with sample data for administration preview.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings:read");

    const { searchParams } = new URL(req.url);
    const templateId = (searchParams.get("templateId") || "review_moderated") as EmailTemplateId;
    const locale = (searchParams.get("locale") || "vi") as EmailLocale;

    const sampleVars: Record<string, unknown> = {
      email: "sinhvien.sample@hust.edu.vn",
      verifyUrl: "https://rateurprofs.site/vi/account?verify_token=sample_token_12345",
      resetUrl: "https://rateurprofs.site/vi/account?reset_token=sample_token_67890",
      token: "sample_token_abcxyz",
      isAcademic: true,
      professorName: "GS.TS. Nguyễn Văn A",
      action: "hide",
      reason: "Bình luận chứa ngôn từ không phù hợp với chuẩn mực học thuật",
      requestId: "REQ-2026-HUST-01",
      details: "Đính chính chức danh từ TS lên PGS được công nhận năm 2025",
      ip: "113.190.234.12 (Hà Nội, VN)",
      timestamp: Date.now(),
      title: "Phát hiện tần suất báo cáo bất thường",
      priority: "HIGH",
      message: "Có 15 báo cáo liên tiếp nhắm vào một giảng viên trong vòng 5 phút qua.",
      metadata: { lecturerId: "lec-hust-01", reportCount: 15, timeWindow: "5m" },
    };

    const rendered = renderEmailTemplate(templateId, sampleVars, locale);

    return NextResponse.json({
      success: true,
      templateId,
      locale,
      ...rendered,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/preview] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to preview email template",
      },
      { status }
    );
  }
}
