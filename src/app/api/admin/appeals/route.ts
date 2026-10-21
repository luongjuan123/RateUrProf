import { NextRequest, NextResponse } from "next/server";
import { requirePermission, clearSessionCache } from "@/lib/server/auth";
import {
  getAccountAppealsList,
  getAccountAppealById,
  updateAccountAppeal,
  unlockUserAccount,
  AppealStatus,
} from "@/lib/server/db";
import { queueEmail } from "@/lib/server/email/emailService";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "admin:access");

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "all") as AppealStatus | "all";
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;

    const result = await getAccountAppealsList({
      status,
      search,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: any) {
    console.error("[API GET /api/admin/appeals] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Không có quyền truy cập hoặc lỗi máy chủ." },
      { status: error?.status || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission(req, "admin:access");

    const body = await req.json();
    let { appealId, action, status, decisionReason, reviewerNotes, adminNotes } = body;

    if (!appealId || typeof appealId !== "string") {
      return NextResponse.json({ error: "Thiếu mã đơn kháng nghị (appealId)." }, { status: 400 });
    }

    // Support both action ("accept" | "reject" | "under_review") and status ("approved" | "accepted" | "rejected" | "under_review")
    if (!action && status) {
      if (status === "approved" || status === "accepted") action = "accept";
      else if (status === "rejected") action = "reject";
      else if (status === "under_review") action = "under_review";
    }

    if (!action || !["accept", "reject", "under_review"].includes(action)) {
      return NextResponse.json(
        { error: "Hành động không hợp lệ. Cho phép: accept, reject, under_review." },
        { status: 400 }
      );
    }

    const appeal = await getAccountAppealById(appealId);
    if (!appeal) {
      return NextResponse.json({ error: "Không tìm thấy đơn kháng nghị." }, { status: 404 });
    }

    let newStatus: AppealStatus = "under_review";
    if (action === "accept") newStatus = "accepted";
    if (action === "reject") newStatus = "rejected";

    const finalReason = decisionReason || reviewerNotes || adminNotes || "";
    const finalNotes = adminNotes || reviewerNotes || null;

    // 1. Update appeal record
    const updatedAppeal = await updateAccountAppeal(appealId, {
      status: newStatus,
      decisionReason: finalReason || null,
      adminNotes: finalNotes,
      reviewedBy: session.user.uid,
      reviewedByEmail: session.user.email,
    });

    // 2. If approved, unlock the user's account and restore content
    if (action === "accept") {
      await unlockUserAccount(appeal.user_id);

      // Send acceptance email
      if (appeal.user_email) {
        queueEmail({
          recipient: appeal.user_email,
          templateId: "appeal_accepted",
          templateVars: {
            appealId: appeal.id,
            decisionReason: finalReason || "Giải trình hợp lệ và cam kết tuân thủ quy chế.",
          },
        }).catch((err) => console.warn("[API /api/admin/appeals] Email queue notice:", err));
      }
    } else if (action === "reject") {
      // Send rejection email
      if (appeal.user_email) {
        queueEmail({
          recipient: appeal.user_email,
          templateId: "appeal_rejected",
          templateVars: {
            appealId: appeal.id,
            decisionReason: finalReason || "Nội dung giải trình chưa đáp ứng tiêu chuẩn xem xét.",
          },
        }).catch((err) => console.warn("[API /api/admin/appeals] Email queue notice:", err));
      }
    }

    // 3. Clear session cache so client immediately reflects status change
    clearSessionCache();

    // 4. Audit logging
    await recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "admin@rateurprofs.site",
      actorRole: session.user.role || "admin",
      action: `appeal.${action}`,
      targetType: "user",
      targetId: appeal.user_id,
      reason: finalReason || `Xử lý đơn kháng nghị [${appealId}]: ${action}`,
      beforeState: { appealStatus: appeal.status },
      afterState: { appealStatus: newStatus, decisionReason: finalReason },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true, appeal: updatedAppeal }, { status: 200 });
  } catch (error: any) {
    console.error("[API PATCH /api/admin/appeals] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Không thể xử lý đơn kháng nghị." },
      { status: error?.status || 500 }
    );
  }
}
