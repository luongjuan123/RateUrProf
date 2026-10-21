import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getAdminLecturers } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "lecturers:read");
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "15", 10);
    const search = searchParams.get("search") || undefined;
    const universityId = searchParams.get("universityId") || undefined;
    const rank = searchParams.get("rank") || undefined;
    const verificationStatus = searchParams.get("verificationStatus") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;

    const result = await getAdminLecturers({
      page,
      pageSize,
      search,
      universityId,
      rank,
      verificationStatus,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải danh sách giảng viên." },
      { status }
    );
  }
}
