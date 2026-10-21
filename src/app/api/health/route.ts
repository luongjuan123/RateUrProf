import { NextResponse } from "next/server";
import { getDatabaseStatistics, isPostgresConfigured } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isPg = isPostgresConfigured();
    const stats = await getDatabaseStatistics();

    return NextResponse.json(
      {
        status: "healthy",
        service: "RateUrProfs",
        version: "0.1.0",
        backend: isPg ? "Cloud SQL (PostgreSQL)" : "Embedded Relational (SQLite)",
        universitiesCount: stats.universitiesCount,
        lecturersCount: stats.lecturersCount,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[HealthCheck] Error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        service: "RateUrProfs",
        error: error instanceof Error ? error.message : "Database connection issue",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
