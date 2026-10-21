import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { isPostgresConfigured, getPostgresPool } from "@/lib/server/postgresClient";
import { getSqliteDatabase } from "@/lib/server/sqliteClient";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  crawlerConcurrency: 5,
  crawlerRateLimitMs: 1500,
  duplicateThreshold: 0.85,
  autoApproveVerifiedDomain: true,
  moderationNoticeEmail: "dungpubgame@gmail.com",
  maintenanceMode: false,
};

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings:read");

    let settings = { ...DEFAULT_SETTINGS };

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT key, value_json FROM admin_settings");
      for (const row of res.rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settings as any)[row.key] = typeof row.value_json === "string" ? JSON.parse(row.value_json) : row.value_json;
      }
    } else {
      const db = getSqliteDatabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = db.prepare("SELECT key, value_json FROM admin_settings").all() as any[];
      for (const row of rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settings as any)[row.key] = JSON.parse(row.value_json);
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi tải cấu hình hệ thống." },
      { status }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "settings:manage");
    const body = await req.json();
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        for (const [key, val] of Object.entries(body)) {
          await client.query(`
            INSERT INTO admin_settings (key, value_json, updated_by, updated_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (key) DO UPDATE
            SET value_json = EXCLUDED.value_json,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at;
          `, [key, JSON.stringify(val), session.user.uid, now]);
        }
        await client.query("COMMIT;");
      } catch (err) {
        await client.query("ROLLBACK;");
        throw err;
      } finally {
        client.release();
      }
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    await recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "unknown",
      actorRole: session.user.role || "student",
      action: "settings.update",
      targetType: "setting",
      reason: "Cập nhật tham số hệ thống từ Bảng điều khiển Quản trị",
      afterState: body,
      ipAddress: clientIp,
    });

    return NextResponse.json({ success: true, settings: body });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi lưu cấu hình hệ thống." },
      { status }
    );
  }
}
