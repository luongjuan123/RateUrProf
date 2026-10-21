import { NextRequest, NextResponse } from "next/server";
import { authenticateSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import { hasPermission, AdminPermission, AdminRole } from "@/lib/server/rbac";
import { getInboundTickets, InboundMailbox } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inbox
 *
 * Role-Based Access Controlled endpoint for querying tickets:
 * - admin / super_admin: access to "admin", "support", "security"
 * - support: access ONLY to "support"
 * - security: access ONLY to "security"
 */
export async function GET(req: NextRequest) {
  try {
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

    // Calculate allowed mailboxes according to RBAC permissions
    const allowedMailboxes: InboundMailbox[] = [];
    if (hasPermission(role, "inbox:admin" as AdminPermission)) allowedMailboxes.push("admin");
    if (hasPermission(role, "inbox:support" as AdminPermission)) allowedMailboxes.push("support");
    if (hasPermission(role, "inbox:security" as AdminPermission)) allowedMailboxes.push("security");

    if (allowedMailboxes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Truy cập bị từ chối: Tài khoản của bạn không có quyền xem bất kỳ hộp thư nào.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedMailbox = searchParams.get("mailbox") || "all";
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || undefined;
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);
    const offset = (page - 1) * pageSize;

    // Enforce mailbox isolation
    let effectiveMailbox: string | undefined = undefined;

    if (requestedMailbox !== "all") {
      if (!allowedMailboxes.includes(requestedMailbox as InboundMailbox)) {
        return NextResponse.json(
          {
            success: false,
            error: `Truy cập bị từ chối: Vai trò [${role}] không có quyền xem hộp thư [${requestedMailbox}@rateurprofs.site].`,
          },
          { status: 403 }
        );
      }
      effectiveMailbox = requestedMailbox;
    } else {
      // If user only has access to one mailbox, clamp to that mailbox
      if (allowedMailboxes.length === 1) {
        effectiveMailbox = allowedMailboxes[0];
      }
    }

    const result = await getInboundTickets({
      mailbox: effectiveMailbox,
      status: status !== "all" ? status : undefined,
      search,
      limit: pageSize,
      offset,
    });

    return NextResponse.json({
      success: true,
      tickets: result.tickets,
      totalCount: result.totalCount,
      countsByStatus: result.countsByStatus,
      allowedMailboxes,
      userRole: role,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[API GET /api/admin/inbox] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
