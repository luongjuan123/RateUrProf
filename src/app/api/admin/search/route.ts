import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { searchAdminGlobal } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "admin:access");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const results = await searchAdminGlobal(q);
    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tìm kiếm quản trị." },
      { status }
    );
  }
}
