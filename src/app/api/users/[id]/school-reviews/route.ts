import { NextRequest, NextResponse } from "next/server";
import { getUserSchoolReviewsList } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const reviews = await getUserSchoolReviewsList(id);
    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error("[API GET /api/users/[id]/school-reviews] Error:", error);
    return NextResponse.json({ error: "Failed to fetch user school reviews" }, { status: 500 });
  }
}
