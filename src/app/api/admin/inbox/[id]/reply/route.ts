import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { authenticateSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { hasPermission, AdminPermission, AdminRole } from "@/lib/server/rbac";
import { getInboundTicketById, replyInboundTicket } from "@/lib/server/db";
import { renderEmailTemplate } from "@/lib/server/email/emailTemplates";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inbox/[id]/reply
 *
 * Dispatches an official human reply from the corresponding team email address
 * (admin@rateurprofs.site, support@rateurprofs.site, or security@rateurprofs.site),
 * preserves email thread headers, and updates the ticket to "resolved".
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
          error: `Truy cập bị từ chối: Vai trò [${role}] không có quyền trả lời yêu cầu thuộc hộp thư [${ticket.mailbox}@rateurprofs.site].`,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const replyText = typeof body?.replyText === "string" ? body.replyText.trim() : "";
    const closeTicket = Boolean(body?.closeTicket);
    if (!replyText) {
      return NextResponse.json(
        { success: false, error: "Nội dung phản hồi không được để trống." },
        { status: 400 }
      );
    }

    // Determine sender address based on mailbox
    const senderIdentity =
      ticket.mailbox === "security"
        ? "RateUrProfs Security <security@rateurprofs.site>"
        : ticket.mailbox === "admin"
        ? "RateUrProfs Administration <admin@rateurprofs.site>"
        : "RateUrProfs Support <support@rateurprofs.site>";

    // Build email with Neo-Brutalist template
    const rendered = renderEmailTemplate(
      "inbound_human_reply",
      {
        originalSubject: ticket.subject,
        replyText,
        ticketId: ticket.case_id,
        responderName: session.user.displayName || session.user.email || "Đội ngũ Quản trị",
        mailbox: ticket.mailbox,
      },
      "vi"
    );

    const outboundHeaders: Record<string, string> = {
      "X-Entity-Ref-ID": `ticket-${ticket.case_id}`,
    };
    if (ticket.message_id) {
      outboundHeaders["In-Reply-To"] = ticket.message_id;
      outboundHeaders["References"] = ticket.message_id;
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey) {
      const resend = new Resend(apiKey);
      try {
        const { error: sendError } = await resend.emails.send({
          from: senderIdentity,
          to: [ticket.sender_email],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: outboundHeaders,
        });

        if (sendError) {
          console.error("[API Inbox Reply] Error dispatching email via Resend:", sendError);
        }
      } catch (sendErr) {
        console.error("[API Inbox Reply] Exception during email dispatch:", sendErr);
      }
    } else {
      console.warn("[API Inbox Reply] RESEND_API_KEY is not configured, recording reply locally without sending.");
    }

    // Update ticket in database (keeps ticket open by default unless closeTicket is true)
    const updatedTicket = await replyInboundTicket(
      ticket.id,
      replyText,
      {
        email: session.user.email || "staff@rateurprofs.site",
        name: session.user.displayName || undefined,
      },
      { closeTicket }
    );

    // Record audit log
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "unknown",
      actorRole: (session.user.role as AdminRole) || "support",
      action: closeTicket ? "inbox:reply_and_close" : "inbox:reply",
      targetType: "inbound_ticket",
      targetId: ticket.case_id,
      reason: closeTicket
        ? `Trả lời thư hỗ trợ ${ticket.case_id} và đóng ticket`
        : `Trả lời thư hỗ trợ ${ticket.case_id} (giữ mở hội thoại)`,
      beforeState: { mailbox: ticket.mailbox, status: ticket.status },
      afterState: {
        mailbox: ticket.mailbox,
        recipient: ticket.sender_email,
        replyLength: replyText.length,
        status: updatedTicket?.status,
      },
      ipAddress: clientIp,
    }).catch((err) => console.warn("[API Inbox Reply] Audit log error:", err));

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("[API POST /api/admin/inbox/[id]/reply] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
