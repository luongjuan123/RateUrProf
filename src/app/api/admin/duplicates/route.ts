import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { auditDuplicateUniversities } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "data_quality:read");
    const duplicateGroups = await auditDuplicateUniversities();
    return NextResponse.json({ success: true, duplicateGroups });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi kiểm tra bản ghi trùng lặp." },
      { status }
    );
  }
}
