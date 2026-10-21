import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { previewUniversityMerge } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "data_quality:merge");
    const body = await req.json();
    const { canonicalId, duplicateIds } = body;

    if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cần cung cấp canonicalId và danh sách duplicateIds." },
        { status: 400 }
      );
    }

    const preview = await previewUniversityMerge(canonicalId, duplicateIds);
    return NextResponse.json({ success: true, preview });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi xem trước kế hoạch gộp." },
      { status }
    );
  }
}
