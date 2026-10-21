import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getAdminUniversities } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "universities:read");
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "15", 10);
    const search = searchParams.get("search") || undefined;
    const region = searchParams.get("region") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;

    const result = await getAdminUniversities({
      page,
      pageSize,
      search,
      region,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải danh sách cơ sở giáo dục." },
      { status }
    );
  }
}
