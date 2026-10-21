import { NextRequest, NextResponse } from "next/server";
import { voteReview } from "@/lib/server/db";
import { requireActiveUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing review ID" }, { status: 400 });
    }

    let session;
    try {
      session = await requireActiveUser(req);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.code || "unauthorized", message: authErr.message },
        { status: authErr.status || 403 }
      );
    }

    const result = await voteReview(id, session.user.uid);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[API POST /api/reviews/[id]/upvote] Error:", error);
    return NextResponse.json({ error: "Failed to upvote review" }, { status: 500 });
  }
}
