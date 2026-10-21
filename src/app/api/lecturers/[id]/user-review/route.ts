import { NextRequest, NextResponse } from "next/server";
import { getExistingReviewByUserAndLecturer } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ review: null }, { status: 200 });
    }

    const review = await getExistingReviewByUserAndLecturer(userId, id);
    return NextResponse.json({ review }, { status: 200 });
  } catch (error) {
    console.error("[API /api/lecturers/[id]/user-review] Error:", error);
    return NextResponse.json({ review: null }, { status: 500 });
  }
}
