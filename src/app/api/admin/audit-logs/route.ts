import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getAuditLogs } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "audit_logs:read");
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const actorEmail = searchParams.get("actorEmail") || undefined;
    const action = searchParams.get("action") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getAuditLogs({
      page,
      pageSize,
      actorEmail,
      action,
      targetType,
      search,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải nhật ký kiểm toán." },
      { status }
    );
  }
}
