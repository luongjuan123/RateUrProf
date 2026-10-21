import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { updateAdminUser, deleteAdminUser } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const requiredPerm = body.role ? "users:roles" : "users:manage";
    const session = await requirePermission(req, requiredPerm);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await updateAdminUser(
      id,
      {
        role: body.role,
        status: body.status,
        displayName: body.displayName,
        reason: body.reason,
      },
      {
        id: session.user.uid,
        email: session.user.email || "unknown",
        role: session.user.role || "student",
        ip: clientIp,
      }
    );

    // Notify user of security-critical role or status modification
    if (body.role || body.status) {
      const { getDbUserById } = await import("@/lib/server/db");
      const targetUser = await getDbUserById(id);
      if (targetUser && targetUser.email) {
        const { queueEmail } = await import("@/lib/server/email/emailService");
        const changeDesc = body.role
          ? `Vai trò tài khoản được cập nhật thành: ${body.role}`
          : `Trạng thái tài khoản được cập nhật thành: ${body.status}`;

        queueEmail({
          recipient: targetUser.email,
          templateId: "security_alert",
          templateVars: {
            action: changeDesc,
            details: body.reason ? `Ghi chú từ Quản trị viên: ${body.reason}` : "Thay đổi được thực hiện bởi Quản trị viên hệ thống.",
            ip: clientIp,
            timestamp: Date.now(),
          },
          locale: "vi",
        }).catch((err) => console.warn("[API admin/users/[id]] User security alert email notice:", err));
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi cập nhật người dùng." },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    let permanent = searchParams.get("permanent") === "true";
    let reason = searchParams.get("reason") || undefined;

    try {
      const body = await req.json();
      if (body) {
        if (body.permanent !== undefined) permanent = Boolean(body.permanent);
        if (body.reason) reason = body.reason;
      }
    } catch {
      // Body is optional for DELETE
    }

    const requiredPerm = permanent ? "users:delete" : "users:suspend";
    const session = await requirePermission(req, requiredPerm);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await deleteAdminUser(
      id,
      { permanent, reason },
      {
        id: session.user.uid,
        email: session.user.email || "unknown",
        role: session.user.role || "student",
        ip: clientIp,
      }
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi xóa người dùng." },
      { status }
    );
  }
}

