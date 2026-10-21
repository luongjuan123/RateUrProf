import { NextRequest, NextResponse } from "next/server";
import { moderateReviewStatus } from "@/lib/server/db";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(req);

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing review ID" }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action as "hide" | "publish" | "delete";
    const reportId = body.reportId as string | undefined;

    if (!action || !["hide", "publish", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const success = await moderateReviewStatus(id, action, reportId);
    return NextResponse.json({ success }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API POST /api/reviews/[id]/moderate] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : "Failed to moderate review";
    return NextResponse.json({ error: message }, { status });
  }
}
