import { NextRequest, NextResponse } from "next/server";
import { deleteSchoolReviewById, updateSchoolReview } from "@/lib/server/db";
import { isAnonymousName } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing school review ID" }, { status: 400 });
    }

    const body = await req.json();

    if (
      (body.userDisplayName && isAnonymousName(body.userDisplayName)) ||
      (body.cohort && isAnonymousName(body.cohort))
    ) {
      return NextResponse.json(
        { error: "Cannot use an anonymous name when updating a school review" },
        { status: 400 }
      );
    }
    const success = await updateSchoolReview(id, body.userId || "", {
      cohort: body.cohort,
      criteria: body.criteria,
      comment: body.comment,
      userDisplayName: body.userDisplayName,
    });

    if (!success) {
      return NextResponse.json({ error: "Could not update school review or unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[API PUT /api/school-reviews/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update school review" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing school review ID" }, { status: 400 });
    }

    const success = await deleteSchoolReviewById(id);
    return NextResponse.json({ success }, { status: 200 });
  } catch (error) {
    console.error("[API DELETE /api/school-reviews/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete school review" }, { status: 500 });
  }
}
