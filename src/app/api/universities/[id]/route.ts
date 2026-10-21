import { NextRequest, NextResponse } from "next/server";
import { getServerUniversityById } from "@/lib/server/searchIndex";

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

    const university = await getServerUniversityById(id);
    if (!university) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }

    return NextResponse.json(university, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/universities/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
