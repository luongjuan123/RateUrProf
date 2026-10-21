import { NextRequest, NextResponse } from "next/server";
import { getServerFeaturedProfessors } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 4;

    const items = await getServerFeaturedProfessors(Math.min(12, Math.max(1, limit)));

    return NextResponse.json(
      { items },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1200",
        },
      }
    );
  } catch (error) {
    console.error("[API /api/professors/featured] Failed:", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
