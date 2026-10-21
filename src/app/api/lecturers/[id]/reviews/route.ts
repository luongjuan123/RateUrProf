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

    const reviewId = `rev-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await insertReview({
      id: reviewId,
      lecturerId: id,
      universityId: body.universityId,
      userDisplayName: reviewerDisplayName,
      userId: session.user.uid,
      courseName: body.courseName || "",
      overallRating: Number(body.overallRating || 5),
      difficultyScore: Number(body.difficultyScore || 3),
      takeAgain: body.takeAgain ? 1 : 0,
      gradeReceived: body.gradeReceived || "",
      attendanceMandatory: body.attendanceMandatory !== undefined ? Number(body.attendanceMandatory) : 1,
      tags: body.tags || [],
      isOnline: body.isOnline ? 1 : 0,
      forCredit: body.forCredit !== undefined ? Number(body.forCredit) : 1,
      textbookUsed: body.textbookUsed ? 1 : 0,
      comment: body.comment || "",
    });

    return NextResponse.json({ success: true, id: reviewId }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/lecturers/[id]/reviews] Error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
