import { NextRequest, NextResponse } from "next/server";
import { UniversityRegistryService } from "@/lib/server/crawler/registry";
import { CampaignManager } from "@/lib/server/crawler/campaignManager";
import { CoverageAuditService } from "@/lib/server/crawler/coverageAudit";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";
import { getSqliteDb } from "@/lib/server/sqliteClient";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const institutions = await UniversityRegistryService.getAllInstitutions();
    const campaigns = await CampaignManager.listCampaigns(5);

    let totalProfessors = 0;
    let totalJobs = 0;
    let stagedCount = 0;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const profRes = await pool.query("SELECT COUNT(*) as c FROM lecturers");
      totalProfessors = parseInt(profRes.rows[0]?.c || "0", 10);

      const jobRes = await pool.query("SELECT COUNT(*) as c FROM crawl_jobs");
      totalJobs = parseInt(jobRes.rows[0]?.c || "0", 10);

      const stgRes = await pool.query("SELECT COUNT(*) as c FROM staging_professors");
      stagedCount = parseInt(stgRes.rows[0]?.c || "0", 10);
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profRow = db.prepare("SELECT COUNT(*) as c FROM lecturers").get() as any;
      totalProfessors = profRow?.c || 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobRow = db.prepare("SELECT COUNT(*) as c FROM crawl_jobs").get() as any;
      totalJobs = jobRow?.c || 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stgRow = db.prepare("SELECT COUNT(*) as c FROM staging_professors").get() as any;
      stagedCount = stgRow?.c || 0;
    }

    // Calculate quick coverage
    let completeCount = 0;
    let partialCount = 0;
    for (const inst of institutions) {
      const profCount = inst.validatedRecords || inst.totalProfessors || inst.extractedProfessors || 0;
      if (inst.crawlStatus === "completed" || (inst.crawlStatus as string) === "complete" || profCount >= 50) {
        completeCount++;
      } else if (inst.crawlStatus === "partial" || profCount > 0) {
        partialCount++;
      }
    }

    const coverageScore = institutions.length > 0
      ? Math.round(((completeCount + partialCount * 0.5) / institutions.length) * 100)
      : 0;

    const activeCampaigns = campaigns.filter((c) => c.status === "running").length;

    return NextResponse.json({
      success: true,
      stats: {
        totalInstitutions: institutions.length,
        completeInstitutions: completeCount,
        partialInstitutions: partialCount,
        nationwideCoverageScore: coverageScore,
        totalProfessors,
        totalJobs,
        stagedCount,
        activeCampaigns,
      },
      recentCampaigns: campaigns,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/overview] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
