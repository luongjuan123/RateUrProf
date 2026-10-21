import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getSystemHealthTelemetry } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "health:read");
    const telemetry = await getSystemHealthTelemetry();
    return NextResponse.json({ success: true, ...telemetry });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi kiểm tra trạng thái hệ thống." },
      { status }
    );
  }
}
