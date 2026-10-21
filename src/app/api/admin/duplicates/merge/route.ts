import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { executeUniversityMerge } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "data_quality:merge");
    const body = await req.json();
    const { canonicalId, duplicateIds } = body;

    if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Thiếu canonicalId hoặc danh sách duplicateIds." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await executeUniversityMerge(canonicalId, duplicateIds, {
      id: session.user.uid,
      email: session.user.email || "unknown",
      role: session.user.role || "student",
      ip: clientIp,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi thực thi gộp bản ghi." },
      { status }
    );
  }
}
