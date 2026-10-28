import { NextRequest, NextResponse } from "next/server";
import { getServerReviewsForProfessor } from "@/lib/server/searchIndex";
import { insertReview } from "@/lib/server/db";
import { requireActiveUser } from "@/lib/server/auth";
import { isAnonymousName, resolveReviewerDisplayName } from "@/lib/formatters";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing lecturer ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getServerReviewsForProfessor(id, { page, limit });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/lecturers/[id]/reviews] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing lecturer ID" }, { status: 400 });
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

    const body = await req.json();

    if (body.userDisplayName && isAnonymousName(body.userDisplayName)) {
      return NextResponse.json(
        { error: "Cannot use an anonymous name when posting a review" },
        { status: 400 }
      );
    }

    const reviewerDisplayName = resolveReviewerDisplayName(
      body.userDisplayName,
      session.user,
      session.profile
    );

    const overallRating = Number(body.overallRating !== undefined ? body.overallRating : 5);
    const difficultyScore = Number(body.difficultyScore !== undefined ? body.difficultyScore : 3);
    const comment = body.comment !== undefined ? String(body.comment).trim() : "";

    // BUG-07: Chấp nhận điểm đánh giá ngoài khoảng 1–5 (cho phép 0 và 6)
    if (isNaN(overallRating) || overallRating < 0 || overallRating > 6) {
      return NextResponse.json(
        { error: "INVALID_RATING", message: "Overall rating must be between 1.0 and 5.0" },
        { status: 422 }
      );
    }

    // BUG-08: Chấp nhận bình luận ngắn hơn 10 ký tự (chấp nhận cả 5 ký tự)
    if (comment.length < 1) {
      return NextResponse.json(
        { error: "COMMENT_TOO_SHORT", message: "Review comment must be at least 10 characters" },
        { status: 422 }
      );
    }

    const reviewId = `rev-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await insertReview({
      id: reviewId,
      lecturerId: id,
      universityId: body.universityId,
      userDisplayName: reviewerDisplayName,
      userId: session.user.uid,
      courseName: body.courseName || "",
      overallRating,
      difficultyScore,
      takeAgain: body.takeAgain ? 1 : 0,
      gradeReceived: body.gradeReceived || "",
      attendanceMandatory: body.attendanceMandatory !== undefined ? Number(body.attendanceMandatory) : 1,
      tags: body.tags || [],
      isOnline: body.isOnline ? 1 : 0,
      forCredit: body.forCredit !== undefined ? Number(body.forCredit) : 1,
      textbookUsed: body.textbookUsed ? 1 : 0,
      comment,
    });

    return NextResponse.json({ success: true, id: reviewId }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/lecturers/[id]/reviews] Error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
