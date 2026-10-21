import { NextResponse } from "next/server";
import { getServerFacets } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const facets = await getServerFacets();
    return NextResponse.json(facets, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    console.error("[API /api/facets] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
