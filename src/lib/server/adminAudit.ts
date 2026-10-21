/**
 * RateUrProfs Append-Only Administrative Audit Logger
 *
 * Records all consequential administrative operations in an immutable audit trail.
 * Transparently persists to Cloud SQL PostgreSQL (production) or SQLite (offline/local).
 */

import { isPostgresConfigured, getPostgresPool } from "./postgresClient";
import { getSqliteDatabase } from "./sqliteClient";
import { AdminRole } from "./rbac";

export interface AuditLogEntry {
  actorId: string;
  actorEmail: string;
  actorRole?: AdminRole;
  action: string;
  targetType: "user" | "lecturer" | "university" | "faculty" | "duplicate_group" | "crawl_job" | "review" | "setting" | "system" | "email_job" | "inbound_ticket";
  targetId?: string | null;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  ip?: string | null;
}

export interface StoredAuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: number;
}

export function sanitizeAuditState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!state) return null;
  const sensitiveKeys = ["password", "password_hash", "salt", "token", "secret", "google_client_secret"];
  const copy: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(state)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      copy[key] = "[REDACTED]";
    } else {
      copy[key] = val;
    }
  }

  return copy;
}

/**
 * Appends a new immutable audit log record.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const now = Date.now();
  const sanitizedBefore = sanitizeAuditState(entry.beforeState);
  const sanitizedAfter = sanitizeAuditState(entry.afterState);

  try {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO admin_audit_logs (
          actor_id, actor_email, actor_role, action, target_type, target_id,
          reason, before_state, after_state, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.actorId,
          entry.actorEmail,
          entry.actorRole,
          entry.action,
          entry.targetType,
          entry.targetId || null,
          entry.reason || null,
          sanitizedBefore ? JSON.stringify(sanitizedBefore) : null,
          sanitizedAfter ? JSON.stringify(sanitizedAfter) : null,
          entry.ipAddress || null,
          now,
        ]
      );
    } else {
      const db = getSqliteDatabase();
      db.prepare(
        `INSERT INTO admin_audit_logs (
          actor_id, actor_email, actor_role, action, target_type, target_id,
          reason, before_state, after_state, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.actorId,
        entry.actorEmail,
        entry.actorRole,
        entry.action,
        entry.targetType,
        entry.targetId || null,
        entry.reason || null,
        sanitizedBefore ? JSON.stringify(sanitizedBefore) : null,
        sanitizedAfter ? JSON.stringify(sanitizedAfter) : null,
        entry.ipAddress || null,
        now
      );
    }
  } catch (err) {
    console.error("[AuditLog] Failed to persist audit log entry:", err);
  }
}

/**
 * Retrieves paginated audit logs with optional filters.
 */
export async function getAuditLogs(options: {
  page?: number;
  pageSize?: number;
  actorEmail?: string;
  action?: string;
  targetType?: string;
  search?: string;
}): Promise<{
  items: StoredAuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const offset = (page - 1) * pageSize;

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const whereClauses: string[] = ["1=1"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    if (options.actorEmail) {
      whereClauses.push(`actor_email ILIKE $${paramIndex}`);
      params.push(`%${options.actorEmail}%`);
      paramIndex++;
    }
    if (options.action) {
      whereClauses.push(`action = $${paramIndex}`);
      params.push(options.action);
      paramIndex++;
    }
    if (options.targetType) {
      whereClauses.push(`target_type = $${paramIndex}`);
      params.push(options.targetType);
      paramIndex++;
    }
    if (options.search) {
      whereClauses.push(`(action ILIKE $${paramIndex} OR reason ILIKE $${paramIndex + 1} OR target_id ILIKE $${paramIndex + 2})`);
      params.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`);
      paramIndex += 3;
    }

    const whereSql = whereClauses.join(" AND ");

    const countRes = await pool.query(`SELECT COUNT(*) as c FROM admin_audit_logs WHERE ${whereSql}`, params);
    const totalCount = parseInt(countRes.rows[0]?.c || "0", 10);

    const querySql = `
      SELECT id, actor_id, actor_email, actor_role, action, target_type, target_id,
             reason, before_state, after_state, ip_address, created_at
      FROM admin_audit_logs
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const rowsRes = await pool.query(querySql, [...params, pageSize, offset]);

    const items: StoredAuditLog[] = rowsRes.rows.map((r) => ({
      id: String(r.id),
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      beforeState: typeof r.before_state === "string" ? JSON.parse(r.before_state) : r.before_state,
      afterState: typeof r.after_state === "string" ? JSON.parse(r.after_state) : r.after_state,
      ipAddress: r.ip_address,
      createdAt: Number(r.created_at),
    }));

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  // SQLite Fallback
  const db = getSqliteDatabase();
  const whereClauses: string[] = ["1=1"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options.actorEmail) {
    whereClauses.push("actor_email LIKE ?");
    params.push(`%${options.actorEmail}%`);
  }
  if (options.action) {
    whereClauses.push("action = ?");
    params.push(options.action);
  }
  if (options.targetType) {
    whereClauses.push("target_type = ?");
    params.push(options.targetType);
  }
  if (options.search) {
    whereClauses.push("(action LIKE ? OR reason LIKE ? OR target_id LIKE ?)");
    params.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`);
  }

  const whereSql = whereClauses.join(" AND ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM admin_audit_logs WHERE ${whereSql}`).get(...params) as any;
  const totalCount = countRow?.c || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(`
    SELECT id, actor_id, actor_email, actor_role, action, target_type, target_id,
           reason, before_state, after_state, ip_address, created_at
    FROM admin_audit_logs
    WHERE ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as any[];

  const items: StoredAuditLog[] = rows.map((r) => ({
    id: String(r.id),
    actorId: r.actor_id,
    actorEmail: r.actor_email,
    actorRole: r.actor_role,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    beforeState: r.before_state ? JSON.parse(r.before_state) : null,
    afterState: r.after_state ? JSON.parse(r.after_state) : null,
    ipAddress: r.ip_address,
    createdAt: Number(r.created_at),
  }));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
