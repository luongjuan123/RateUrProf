import { NextRequest, NextResponse } from "next/server";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";
import { getSqliteDb } from "@/lib/server/sqliteClient";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const universityId = searchParams.get("universityId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
    const offset = (page - 1) * pageSize;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const whereClauses: string[] = ["1=1"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];
      let pIdx = 1;

      if (campaignId) {
        whereClauses.push(`campaign_id = $${pIdx++}`);
        params.push(campaignId);
      }
      if (universityId) {
        whereClauses.push(`university_id = $${pIdx++}`);
        params.push(universityId);
      }
      if (status) {
        whereClauses.push(`status = $${pIdx++}`);
        params.push(status);
      }

      const whereSql = whereClauses.join(" AND ");
      const countRes = await pool.query(
        `SELECT COUNT(*) as total FROM crawl_jobs WHERE ${whereSql}`,
        params
      );
      const totalCount = parseInt(countRes.rows[0]?.total || "0", 10);

      const jobsRes = await pool.query(
        `SELECT * FROM crawl_jobs WHERE ${whereSql} ORDER BY priority DESC, created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...params, pageSize, offset]
      );

      return NextResponse.json({
        success: true,
        jobs: jobsRes.rows,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      });
    } else {
      const db = getSqliteDb();
      const whereClauses: string[] = ["1=1"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];

      if (campaignId) {
        whereClauses.push("campaign_id = ?");
        params.push(campaignId);
      }
      if (universityId) {
        whereClauses.push("university_id = ?");
        params.push(universityId);
      }
      if (status) {
        whereClauses.push("status = ?");
        params.push(status);
      }

      const whereSql = whereClauses.join(" AND ");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRow = db.prepare(`SELECT COUNT(*) as total FROM crawl_jobs WHERE ${whereSql}`).get(...params) as any;
      const totalCount = countRow?.total || 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobs = db.prepare(
        `SELECT * FROM crawl_jobs WHERE ${whereSql} ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?`
      ).all(...params, pageSize, offset) as any[];

      return NextResponse.json({
        success: true,
        jobs,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      });
    }
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/jobs GET] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
