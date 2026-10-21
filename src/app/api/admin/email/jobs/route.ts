import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getEmailJobsList } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email/jobs
 * Searchable, filterable, paginated email outbox history.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings:read");

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20;
    const status = searchParams.get("status") || undefined;
    const templateId = searchParams.get("templateId") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getEmailJobsList({
      page,
      pageSize,
      status,
      templateId,
      search,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/jobs] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load email jobs",
      },
      { status }
    );
  }
}
