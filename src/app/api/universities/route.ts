import { NextRequest, NextResponse } from "next/server";
import { getServerUniversities } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("query") || undefined;
    const universities = await getServerUniversities(q);
    return NextResponse.json(universities, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/universities] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
