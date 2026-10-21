import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { batchAdminUserAction } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userIds, action, reason } = body as {
      userIds?: string[];
      action?: "temporary_delete" | "permanent_delete" | "restore";
      reason?: string;
    };

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn ít nhất một tài khoản người dùng." },
        { status: 400 }
      );
    }

    if (!action || !["temporary_delete", "permanent_delete", "restore"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Hành động hàng loạt không hợp lệ." },
        { status: 400 }
      );
    }

    const requiredPerm = action === "permanent_delete" ? "users:delete" : "users:suspend";
    const session = await requirePermission(req, requiredPerm);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await batchAdminUserAction(
      userIds,
      action,
      { reason },
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
      { success: false, error: error instanceof Error ? error.message : "Lỗi xử lý hàng loạt tài khoản." },
      { status }
    );
  }
}
