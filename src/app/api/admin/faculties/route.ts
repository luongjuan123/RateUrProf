import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "faculties:read");
    const { searchParams } = new URL(req.url);
    const universityId = searchParams.get("universityId");
    const search = searchParams.get("search");

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const where: string[] = ["1=1"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];
      let pIdx = 1;

      if (universityId && universityId !== "all") {
        where.push(`f.university_id = $${pIdx}`);
        params.push(universityId);
        pIdx++;
      }

      if (search && search.trim()) {
        where.push(`(f.name ILIKE $${pIdx} OR f.name_en ILIKE $${pIdx + 1} OR u.name ILIKE $${pIdx + 2})`);
        params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
        pIdx += 3;
      }

      const whereSql = where.join(" AND ");

      const sql = `
        SELECT 
          f.id, f.university_id, f.name, f.name_en, f.website_url, f.directory_url,
          u.name as university_name, u.short_name as university_short_name,
          (SELECT COUNT(*) FROM departments d WHERE d.faculty_id = f.id) as department_count,
          (SELECT COUNT(*) FROM affiliations a WHERE a.university_id = f.university_id AND a.faculty ILIKE f.name) as lecturer_count
        FROM faculties f
        LEFT JOIN universities u ON f.university_id = u.id
        WHERE ${whereSql}
        ORDER BY lecturer_count DESC, f.name ASC
        LIMIT 100
      `;

      const res = await pool.query(sql, params);
      return NextResponse.json({
        success: true,
        items: res.rows.map((r) => ({
          id: r.id,
          universityId: r.university_id,
          name: r.name,
          nameEn: r.name_en,
          websiteUrl: r.website_url,
          directoryUrl: r.directory_url,
          universityName: r.university_name,
          universityShortName: r.university_short_name,
          departmentCount: parseInt(r.department_count || "0", 10),
          lecturerCount: parseInt(r.lecturer_count || "0", 10),
        })),
      });
    }

    return NextResponse.json({ success: true, items: [] });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải danh sách khoa & bộ môn." },
      { status }
    );
  }
}
