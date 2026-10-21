import { NextRequest, NextResponse } from "next/server";
import { deleteReviewById, updateReview } from "@/lib/server/db";
import { isAnonymousName } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing review ID" }, { status: 400 });
    }

    const body = await req.json();

    if (body.userDisplayName && isAnonymousName(body.userDisplayName)) {
      return NextResponse.json(
        { error: "Cannot use an anonymous name when updating a review" },
        { status: 400 }
      );
    }
    const success = await updateReview(id, body.userId || "", {
      courseName: body.courseName,
      overallRating: Number(body.overallRating),
      difficultyScore: body.difficultyScore !== undefined ? Number(body.difficultyScore) : undefined,
      takeAgain: body.takeAgain !== undefined ? (body.takeAgain ? 1 : 0) : undefined,
      gradeReceived: body.gradeReceived,
      attendanceMandatory: body.attendanceMandatory !== undefined ? (body.attendanceMandatory ? 1 : 0) : undefined,
      tags: body.tags,
      isOnline: body.isOnline !== undefined ? (body.isOnline ? 1 : 0) : undefined,
      forCredit: body.forCredit !== undefined ? (body.forCredit ? 1 : 0) : undefined,
      textbookUsed: body.textbookUsed !== undefined ? (body.textbookUsed ? 1 : 0) : undefined,
      comment: body.comment,
      userDisplayName: body.userDisplayName,
    });

    if (!success) {
      return NextResponse.json({ error: "Could not update review or unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[API PUT /api/reviews/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing review ID" }, { status: 400 });
    }

    const success = await deleteReviewById(id);
    return NextResponse.json({ success }, { status: 200 });
  } catch (error) {
    console.error("[API DELETE /api/reviews/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
