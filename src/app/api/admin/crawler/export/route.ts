import { NextRequest, NextResponse } from "next/server";
import { CoverageAuditService } from "@/lib/server/crawler/coverageAudit";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";
import { getSqliteDb } from "@/lib/server/sqliteClient";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const audit = await CoverageAuditService.runNationwideAudit();

    // Fetch verified professors
    let professors: any[] = [];
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(`
        SELECT l.id, l.name, l.academic_rank, l.degree, l.academic_title,
               l.avatar, a.university_id, a.university_name, a.faculty, a.department
        FROM lecturers l
        LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
        ORDER BY l.name ASC
      `);
      professors = res.rows;
    } else {
      const db = getSqliteDb();
      professors = db.prepare(`
        SELECT l.id, l.name, l.academic_rank, l.degree, l.academic_title,
               l.avatar, a.university_id, a.university_name, a.faculty, a.department
        FROM lecturers l
        LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
        ORDER BY l.name ASC
      `).all();
    }

    if (format === "csv") {
      const csvHeader = "ID,Name,Rank,Degree,Title,University,Faculty,Department\n";
      const csvRows = professors.map((p) => {
        const escapeCsv = (str: string | null) => `"${(str || "").replace(/"/g, '""')}"`;
        return [
          escapeCsv(p.id),
          escapeCsv(p.name),
          escapeCsv(p.academic_rank),
          escapeCsv(p.degree),
          escapeCsv(p.academic_title),
          escapeCsv(p.university_name || p.university_id),
          escapeCsv(p.faculty),
          escapeCsv(p.department),
        ].join(",");
      }).join("\n");

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rateurprofs-nationwide-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      exportedAt: Date.now(),
      audit,
      professorsCount: professors.length,
      professors,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/export GET] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
