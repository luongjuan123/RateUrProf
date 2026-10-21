import { NextRequest, NextResponse } from "next/server";
import { authenticateSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { hasPermission, AdminPermission, AdminRole } from "@/lib/server/rbac";
import { getInboundTicketById, updateInboundTicketStatus, InboundTicketStatus } from "@/lib/server/db";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inbox/[id]/status
 *
 * Allows authorized staff to close ("resolved"), reopen ("in_progress"),
 * or change ticket status explicitly without sending an email.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu mã ticket (id)." },
        { status: 400 }
      );
    }

    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Yêu cầu đăng nhập tài khoản quản trị." },
        { status: 401 }
      );
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." },
        { status: 401 }
      );
    }

    const role = (session.user.role || "student") as AdminRole;

    // Fetch the target ticket
    const ticket = await getInboundTicketById(id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy yêu cầu liên hệ / ticket tương ứng." },
        { status: 404 }
      );
    }

    // Role-based permission guard for ticket's mailbox
    const requiredPermission: AdminPermission =
      ticket.mailbox === "security"
        ? "inbox:security"
        : ticket.mailbox === "admin"
        ? "inbox:admin"
        : "inbox:support";

    if (!hasPermission(role, requiredPermission)) {
      return NextResponse.json(
        {
          success: false,
          error: `Truy cập bị từ chối: Vai trò [${role}] không có quyền thay đổi trạng thái ticket thuộc hộp thư [${ticket.mailbox}@rateurprofs.site].`,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const newStatus = body?.status as InboundTicketStatus;
    const validStatuses: InboundTicketStatus[] = ["new", "auto_replied", "needs_human", "in_progress", "resolved"];

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: "Trạng thái ticket không hợp lệ." },
        { status: 400 }
      );
    }

    const updatedTicket = await updateInboundTicketStatus(ticket.id, newStatus);

    // Record audit log
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "unknown",
      actorRole: (session.user.role as AdminRole) || "support",
      action: "inbox:update_status",
      targetType: "inbound_ticket",
      targetId: ticket.case_id,
      reason: `Cập nhật trạng thái ticket ${ticket.case_id} từ [${ticket.status}] sang [${newStatus}]`,
      beforeState: { mailbox: ticket.mailbox, status: ticket.status },
      afterState: {
        mailbox: ticket.mailbox,
        status: newStatus,
      },
      ipAddress: clientIp,
    }).catch((err) => console.warn("[API Inbox Status] Audit log error:", err));

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("[API POST /api/admin/inbox/[id]/status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
