import { NextRequest, NextResponse } from "next/server";
import { getServerAutocomplete } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 8;
    let type = searchParams.get("type") || undefined;
    if (!type) {
      if (pathname.includes("/professors/") || pathname.includes("/lecturers/")) {
        type = "professor";
      } else if (pathname.includes("/universities/") || pathname.includes("/schools/")) {
        type = "school";
      }
    }

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const suggestions = await getServerAutocomplete(q, limit, type);

    return NextResponse.json(
      { suggestions },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[API /api/autocomplete] Autocomplete failed:", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
