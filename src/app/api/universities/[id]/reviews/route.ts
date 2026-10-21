import { NextRequest, NextResponse } from "next/server";
import { getSchoolReviewsAndStats, insertSchoolReview } from "@/lib/server/db";
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
      return NextResponse.json({ error: "Missing university ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await getSchoolReviewsAndStats(id, { page, limit });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/universities/[id]/reviews] Error:", error);
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
      return NextResponse.json({ error: "Missing university ID" }, { status: 400 });
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
    const criteria = body.criteria || {};

    const requiredFields = [
      "reputation",
      "location",
      "opportunities",
      "facilities",
      "internet",
      "food",
      "clubs",
      "social",
      "happiness",
      "safety",
    ] as const;

    for (const f of requiredFields) {
      if (criteria[f] === undefined || criteria[f] === null) {
        return NextResponse.json(
          { error: `Missing rating for criteria: ${f}` },
          { status: 400 }
        );
      }
    }

    if (
      (body.cohort && isAnonymousName(body.cohort)) ||
      (body.userDisplayName && isAnonymousName(body.userDisplayName))
    ) {
      return NextResponse.json(
        { error: "Cannot use an anonymous name when posting a review" },
        { status: 400 }
      );
    }

    const reviewerDisplayName = resolveReviewerDisplayName(
      body.cohort || body.userDisplayName,
      session.user,
      session.profile
    );

    const reviewId = `sch-rev-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await insertSchoolReview({
      id: reviewId,
      universityId: id,
      userDisplayName: reviewerDisplayName,
      userId: session.user.uid,
      cohort: (body.cohort && !isAnonymousName(body.cohort)) ? body.cohort : "",
      criteria: {
        reputation: Number(criteria.reputation || 5),
        location: Number(criteria.location || 5),
        opportunities: Number(criteria.opportunities || 5),
        facilities: Number(criteria.facilities || 5),
        internet: Number(criteria.internet || 5),
        food: Number(criteria.food || 5),
        clubs: Number(criteria.clubs || 5),
        social: Number(criteria.social || 5),
        happiness: Number(criteria.happiness || 5),
        safety: Number(criteria.safety || 5),
      },
      comment: body.comment || "",
    });

    return NextResponse.json({ success: true, id: reviewId }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/universities/[id]/reviews] Error:", error);
    return NextResponse.json({ error: "Failed to submit school review" }, { status: 500 });
  }
}
