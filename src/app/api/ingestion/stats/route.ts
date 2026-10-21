import { NextResponse } from "next/server";
import { getServerIngestionStats } from "@/lib/server/searchIndex";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getServerIngestionStats();
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[API /api/ingestion/stats] Failed:", error);
    return NextResponse.json(
      { error: "Internal server error retrieving ingestion stats" },
      { status: 500 }
    );
  }
}
