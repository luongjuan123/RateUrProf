/**
 * Persistent Crawl Job Lifecycle and Task Queue Management
 *
 * Provides database-backed job orchestration, bounded exponential backoff,
 * jitter, error classification, heartbeat monitoring, and crash recovery.
 */

import { getSqliteDatabase } from "../sqliteClient";
import { getPostgresPool } from "../postgresClient";
import { isPostgresConfigured } from "../db";
import { RateLimiterService } from "./rateLimiter";

export type CrawlJobStatus =
  | "pending"
  | "queued"
  | "running"
  | "succeeded"
  | "partially_succeeded"
  | "retry_scheduled"
  | "failed"
  | "skipped"
  | "dead_letter";

export type CrawlJobType =
  | "institution_discovery"
  | "discovery"
  | "sitemap_scan"
  | "directory_scan"
  | "directory"
  | "faculty_crawl"
  | "department_crawl"
  | "pagination_crawl"
  | "profile_extract"
  | "profile"
  | "generic_extract";

export type CrawlJob = CrawlJobRecord;

export interface CrawlJobRecord {
  id: string;
  campaignId?: string;
  institutionId?: string;
  universityId: string;
  url: string;
  jobType: CrawlJobType;
  priority: number;
  status: CrawlJobStatus;
  attemptCount: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  lastHeartbeat?: number;
  nextRetryAt?: number;
  extractedCount: number;
  validatedCount: number;
  errorCategory?: string;
  lastError?: string;
  retryEligibility: boolean;
  idempotencyKey?: string;
  depth: number;
  parentJobId?: string;
}

export class PersistentJobSystem {
  public static readonly STALE_JOB_THRESHOLD_MS = 300000; // 5 minutes without heartbeat
  public static readonly DEFAULT_MAX_ATTEMPTS = 5;

  /**
   * Enqueues a new crawl job with idempotent key.
   */
  public static async enqueueJob(params: {
    url: string;
    jobType: CrawlJobType;
    institutionId?: string;
    universityId?: string;
    campaignId?: string;
    priority?: number;
    depth?: number;
    parentJobId?: string;
    idempotencyKey?: string;
    maxAttempts?: number;
  }): Promise<CrawlJobRecord> {
    const instId = params.institutionId || params.universityId || null;
    const key = params.idempotencyKey || `${params.campaignId || "global"}:${params.jobType}:${params.url}`;
    const id = `job-${absHash(key)}`;
    const now = Date.now();
    const priority = params.priority ?? 10;
    const depth = params.depth ?? 0;
    const maxAttempts = params.maxAttempts ?? this.DEFAULT_MAX_ATTEMPTS;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const res = await client.query(
          `
          INSERT INTO crawl_jobs (
            id, campaign_id, university_id, url, job_type, priority,
            status, attempt_count, max_attempts, created_at, extracted_count,
            validated_count, retry_eligibility, idempotency_key, depth, parent_job_id
          ) VALUES ($1, $2, $3, $4, $5, $6, 'queued', 0, $7, $8, 0, 0, true, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            priority = GREATEST(crawl_jobs.priority, EXCLUDED.priority),
            campaign_id = COALESCE(crawl_jobs.campaign_id, EXCLUDED.campaign_id)
          RETURNING *;
          `,
          [
            id,
            params.campaignId || null,
            instId,
            params.url,
            params.jobType,
            priority,
            maxAttempts,
            now,
            key,
            depth,
            params.parentJobId || null,
          ]
        );
        return mapJobRow(res.rows[0]);
      } finally {
        client.release();
      }
    } else {
      const db = getSqliteDatabase();
      const existing = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(id) as any;
      if (existing) {
        db.prepare(
          "UPDATE crawl_jobs SET priority = MAX(priority, ?), campaign_id = COALESCE(campaign_id, ?) WHERE id = ?"
        ).run(priority, params.campaignId || null, id);
        return mapJobRow(existing);
      }

      db.prepare(
        `
        INSERT INTO crawl_jobs (
          id, campaign_id, university_id, url, job_type, priority,
          status, attempt_count, max_attempts, created_at, extracted_count,
          validated_count, retry_eligibility, idempotency_key, depth, parent_job_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, 0, 0, 1, ?, ?, ?);
        `
      ).run(
        id,
        params.campaignId || null,
        instId,
        params.url,
        params.jobType,
        priority,
        maxAttempts,
        now,
        key,
        depth,
        params.parentJobId || null
      );

      const created = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(id) as any;
      return mapJobRow(created);
    }
  }

  /**
   * Dequeues the next batch of pending or retry-eligible jobs ordered by priority.
   */
  public static async dequeueJobs(limit = 5, campaignId?: string): Promise<CrawlJobRecord[]> {
    await this.recoverStaleJobs();
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");

        const q = campaignId
          ? `
            SELECT * FROM crawl_jobs
            WHERE (status = 'queued' OR (status = 'retry_scheduled' AND next_retry_at <= $1))
              AND campaign_id = $2
            ORDER BY priority DESC, created_at ASC
            LIMIT $3
            FOR UPDATE SKIP LOCKED;
          `
          : `
            SELECT * FROM crawl_jobs
            WHERE (status = 'queued' OR (status = 'retry_scheduled' AND next_retry_at <= $1))
            ORDER BY priority DESC, created_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED;
          `;

        const args = campaignId ? [now, campaignId, limit] : [now, limit];
        const res = await client.query(q, args);

        const dequeued: CrawlJobRecord[] = [];
        for (const row of res.rows) {
          await client.query(
            `
            UPDATE crawl_jobs
            SET status = 'running', started_at = $1, last_heartbeat = $1, attempt_count = attempt_count + 1
            WHERE id = $2;
            `,
            [now, row.id]
          );
          dequeued.push(mapJobRow({ ...row, status: "running", started_at: now, last_heartbeat: now }));
        }

        await client.query("COMMIT;");
        return dequeued;
      } catch (err) {
        await client.query("ROLLBACK;");
        throw err;
      } finally {
        client.release();
      }
    } else {
      const db = getSqliteDatabase();
      const q = campaignId
        ? `
          SELECT * FROM crawl_jobs
          WHERE (status = 'queued' OR (status = 'retry_scheduled' AND (next_retry_at IS NULL OR next_retry_at <= ?)))
            AND campaign_id = ?
          ORDER BY priority DESC, created_at ASC
          LIMIT ?;
        `
        : `
          SELECT * FROM crawl_jobs
          WHERE (status = 'queued' OR (status = 'retry_scheduled' AND (next_retry_at IS NULL OR next_retry_at <= ?)))
          ORDER BY priority DESC, created_at ASC
          LIMIT ?;
        `;

      const args = campaignId ? [now, campaignId, limit] : [now, limit];
      const rows = db.prepare(q).all(...args) as any[];

      const dequeued: CrawlJobRecord[] = [];
      const updateStmt = db.prepare(
        "UPDATE crawl_jobs SET status = 'running', started_at = ?, last_heartbeat = ?, attempt_count = attempt_count + 1 WHERE id = ?"
      );

      for (const row of rows) {
        updateStmt.run(now, now, row.id);
        dequeued.push(mapJobRow({ ...row, status: "running", started_at: now, last_heartbeat: now }));
      }

      return dequeued;
    }
  }

  /**
   * Dequeues the single next highest-priority job
   */
  public static async dequeueNextJob(campaignId?: string): Promise<CrawlJobRecord | null> {
    const jobs = await this.dequeueJobs(1, campaignId);
    return jobs[0] || null;
  }

  /**
   * Updates worker heartbeat for long-running jobs.
   */
  public static async heartbeat(jobId: string): Promise<void> {
    const now = Date.now();
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query("UPDATE crawl_jobs SET last_heartbeat = $1 WHERE id = $2", [now, jobId]);
    } else {
      const db = getSqliteDatabase();
      db.prepare("UPDATE crawl_jobs SET last_heartbeat = ? WHERE id = ?").run(now, jobId);
    }
  }

  public static async updateHeartbeat(jobId: string): Promise<void> {
    await this.heartbeat(jobId);
  }

  /**
   * Marks a job as succeeded.
   */
  public static async markSucceeded(
    jobId: string,
    extractedCount = 0,
    validatedCount = 0
  ): Promise<void> {
    const now = Date.now();
    const status: CrawlJobStatus = extractedCount > 0 ? "succeeded" : "succeeded";

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `
        UPDATE crawl_jobs
        SET status = $1, completed_at = $2, extracted_count = $3, validated_count = $4, last_error = NULL
        WHERE id = $5;
        `,
        [status, now, extractedCount, validatedCount, jobId]
      );
    } else {
      const db = getSqliteDatabase();
      db.prepare(
        `
        UPDATE crawl_jobs
        SET status = ?, completed_at = ?, extracted_count = ?, validated_count = ?, last_error = NULL
        WHERE id = ?;
        `
      ).run(status, now, extractedCount, validatedCount, jobId);
    }
  }

  /**
   * Records a job failure and schedules retry with exponential backoff or routes to dead-letter queue.
   */
  public static async markFailed(
    jobId: string,
    error: Error | string,
    httpStatus?: number
  ): Promise<{ status: CrawlJobStatus; nextRetryAt?: number }> {
    const errorMsg = typeof error === "string" ? error : error.message || "Unknown crawl failure";
    const now = Date.now();
    const job = await this.getJobById(jobId);

    if (!job) {
      return { status: "failed" };
    }

    // Error classification
    let category = "unknown";
    let isRetryable = true;

    if (httpStatus === 429) {
      category = "rate_limit";
    } else if (httpStatus === 404 || httpStatus === 410) {
      category = "http_4xx";
      isRetryable = false; // Permanent missing resource
    } else if (httpStatus === 403 || httpStatus === 401) {
      category = "access_restricted";
      isRetryable = false;
    } else if (httpStatus && httpStatus >= 500) {
      category = "http_5xx";
    } else if (errorMsg.includes("timeout") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("ECONNRESET")) {
      category = "network_timeout";
    } else if (errorMsg.includes("robots.txt")) {
      category = "robots_disallowed";
      isRetryable = false;
    } else if (errorMsg.includes("parse") || errorMsg.includes("SyntaxError")) {
      category = "parsing_error";
      isRetryable = false;
    }

    const attempts = job.attemptCount;
    let nextStatus: CrawlJobStatus = "failed";
    let nextRetryAt: number | undefined;

    if (isRetryable && attempts < job.maxAttempts) {
      nextStatus = "retry_scheduled";
      const backoffMs = RateLimiterService.calculateBackoffMs(attempts);
      nextRetryAt = now + backoffMs;
    } else {
      nextStatus = isRetryable ? "dead_letter" : "failed";
    }

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `
        UPDATE crawl_jobs
        SET 
          status = $1, error_category = $2, last_error = $3,
          next_retry_at = $4, retry_eligibility = $5, completed_at = $6
        WHERE id = $7;
        `,
        [
          nextStatus,
          category,
          errorMsg,
          nextRetryAt || null,
          nextStatus === "retry_scheduled",
          nextStatus !== "retry_scheduled" ? now : null,
          jobId,
        ]
      );

      // Append to crawl_logs audit
      await pool.query(
        `
        INSERT INTO crawl_logs (job_id, url, http_status, error_category, error_message, logged_at)
        VALUES ($1, $2, $3, $4, $5, $6);
        `,
        [jobId, job.url, httpStatus || null, category, errorMsg, now]
      );
    } else {
      const db = getSqliteDatabase();
      db.prepare(
        `
        UPDATE crawl_jobs
        SET 
          status = ?, error_category = ?, last_error = ?,
          next_retry_at = ?, retry_eligibility = ?, completed_at = ?
        WHERE id = ?;
        `
      ).run(
        nextStatus,
        category,
        errorMsg,
        nextRetryAt || null,
        nextStatus === "retry_scheduled" ? 1 : 0,
        nextStatus !== "retry_scheduled" ? now : null,
        jobId
      );

      // Append to crawl_logs audit
      db.prepare(
        `
        INSERT INTO crawl_logs (job_id, url, http_status, error_category, error_message, logged_at)
        VALUES (?, ?, ?, ?, ?, ?);
        `
      ).run(jobId, job.url, httpStatus || null, category, errorMsg, now);
    }

    return { status: nextStatus, nextRetryAt };
  }

  public static async failJob(
    jobId: string,
    error: Error | string,
    errorCategory?: string,
    httpStatus?: number
  ): Promise<{ status: CrawlJobStatus; nextRetryAt?: number }> {
    return this.markFailed(jobId, error, httpStatus);
  }

  public static async completeJob(
    jobId: string,
    extractedCount = 0,
    validatedCount = 0
  ): Promise<void> {
    return this.markSucceeded(jobId, extractedCount, validatedCount);
  }

  /**
   * Recovers jobs stuck in 'running' due to an ungraceful crash or container restart.
   */
  public static async recoverStaleJobs(customThresholdMsOrSec?: number): Promise<number> {
    const deltaMs = customThresholdMsOrSec
      ? (customThresholdMsOrSec < 10000 ? customThresholdMsOrSec * 1000 : customThresholdMsOrSec)
      : this.STALE_JOB_THRESHOLD_MS;
    const threshold = Date.now() - deltaMs;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        `
        UPDATE crawl_jobs
        SET status = 'queued', started_at = NULL, last_heartbeat = NULL
        WHERE status = 'running' AND (last_heartbeat IS NULL OR last_heartbeat <= $1);
        `,
        [threshold]
      );
      return res.rowCount || 0;
    } else {
      const db = getSqliteDatabase();
      const res = db.prepare(
        `
        UPDATE crawl_jobs
        SET status = 'queued', started_at = NULL, last_heartbeat = NULL
        WHERE status = 'running' AND (last_heartbeat IS NULL OR last_heartbeat <= ?);
        `
      ).run(threshold);
      return res.changes;
    }
  }

  /**
   * Retrieves single job by ID.
   */
  public static async getJobById(jobId: string): Promise<CrawlJobRecord | null> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT * FROM crawl_jobs WHERE id = $1", [jobId]);
      if (res.rows.length === 0) return null;
      return mapJobRow(res.rows[0]);
    } else {
      const db = getSqliteDatabase();
      const row = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(jobId) as any;
      if (!row) return null;
      return mapJobRow(row);
    }
  }

  /**
   * Retrieves summary telemetry of jobs across statuses.
   */
  public static async getQueueStats(campaignId?: string): Promise<{
    queued: number;
    running: number;
    succeeded: number;
    partiallySucceeded: number;
    retryScheduled: number;
    failed: number;
    deadLetter: number;
    total: number;
  }> {
    const stats = {
      queued: 0,
      running: 0,
      succeeded: 0,
      partiallySucceeded: 0,
      retryScheduled: 0,
      failed: 0,
      deadLetter: 0,
      total: 0,
    };

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const q = campaignId
        ? "SELECT status, COUNT(*) as count FROM crawl_jobs WHERE campaign_id = $1 GROUP BY status"
        : "SELECT status, COUNT(*) as count FROM crawl_jobs GROUP BY status";
      const res = await pool.query(q, campaignId ? [campaignId] : []);
      for (const row of res.rows) {
        const count = parseInt(row.count, 10);
        assignStatusCount(stats, row.status, count);
      }
    } else {
      const db = getSqliteDatabase();
      const q = campaignId
        ? "SELECT status, COUNT(*) as count FROM crawl_jobs WHERE campaign_id = ? GROUP BY status"
        : "SELECT status, COUNT(*) as count FROM crawl_jobs GROUP BY status";
      const rows = db.prepare(q).all(...(campaignId ? [campaignId] : [])) as any[];
      for (const row of rows) {
        assignStatusCount(stats, row.status, row.count);
      }
    }

    return stats;
  }
}

function assignStatusCount(stats: any, status: string, count: number): void {
  stats.total += count;
  if (status === "queued" || status === "pending") stats.queued += count;
  else if (status === "running") stats.running += count;
  else if (status === "succeeded") stats.succeeded += count;
  else if (status === "partially_succeeded") stats.partiallySucceeded += count;
  else if (status === "retry_scheduled") stats.retryScheduled += count;
  else if (status === "failed") stats.failed += count;
  else if (status === "dead_letter") stats.deadLetter += count;
}

function absHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function mapJobRow(r: any): CrawlJobRecord {
  const uniId = r.university_id || r.institution_id || "";
  return {
    id: r.id,
    campaignId: r.campaign_id,
    institutionId: uniId,
    universityId: uniId,
    url: r.url,
    jobType: r.job_type || "directory_scan",
    priority: parseInt(r.priority || "10", 10),
    status: r.status,
    attemptCount: parseInt(r.attempt_count || "0", 10),
    maxAttempts: parseInt(r.max_attempts || "5", 10),
    createdAt: parseInt(r.created_at || "0", 10),
    startedAt: r.started_at ? parseInt(r.started_at, 10) : undefined,
    completedAt: r.completed_at ? parseInt(r.completed_at, 10) : undefined,
    lastHeartbeat: r.last_heartbeat ? parseInt(r.last_heartbeat, 10) : undefined,
    nextRetryAt: r.next_retry_at ? parseInt(r.next_retry_at, 10) : undefined,
    extractedCount: parseInt(r.extracted_count || "0", 10),
    validatedCount: parseInt(r.validated_count || "0", 10),
    errorCategory: r.error_category,
    lastError: r.last_error,
    retryEligibility: Boolean(r.retry_eligibility),
    idempotencyKey: r.idempotency_key,
    depth: parseInt(r.depth || "0", 10),
    parentJobId: r.parent_job_id,
  };
}
