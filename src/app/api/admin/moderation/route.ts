import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getReportsList, getCorrectionRequestsList, moderateReviewStatus } from "@/lib/server/db";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "reviews:read");
    const [reports, corrections] = await Promise.all([
      getReportsList(),
      getCorrectionRequestsList(),
    ]);

    return NextResponse.json({
      success: true,
      reports,
      corrections,
    });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải dữ liệu kiểm duyệt." },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "reviews:moderate");
    const body = await req.json();
    const { action, reviewId, reportId, reason } = body;

    if (!action || !reviewId) {
      return NextResponse.json(
        { success: false, error: "Thiếu action hoặc reviewId." },
        { status: 400 }
      );
    }

    const ok = await moderateReviewStatus(reviewId, action, reportId);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Không thể cập nhật trạng thái đánh giá." },
        { status: 500 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    await recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "unknown",
      actorRole: session.user.role || "student",
      action: `review.${action}`,
      targetType: "review",
      targetId: reviewId,
      reason: reason || `Kiểm duyệt đánh giá: ${action}`,
      beforeState: { reviewId, reportId },
      afterState: { action, resolved: true },
      ipAddress: clientIp,
    });

    return NextResponse.json({ success: true, action, reviewId });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi thực hiện kiểm duyệt." },
      { status }
    );
  }
}
