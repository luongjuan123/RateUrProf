/**
 * Hierarchical Campaign Orchestrator & Campaign Manager
 *
 * Coordinates nationwide, regional, or institution-level crawl campaigns.
 * Generates discovery jobs, tracks campaign lifecycles (pending, running, paused, completed, cancelled),
 * and syncs live telemetry.
 */

import { isPostgresConfigured, getPostgresPool } from "../postgresClient";
import { getSqliteDb } from "../sqliteClient";
import { UniversityRegistryService, RegisteredInstitution } from "./registry";
import { PersistentJobSystem } from "./jobSystem";
import { randomUUID } from "node:crypto";

export interface CrawlCampaign {
  id: string;
  name: string;
  scope: "nationwide" | "regional" | "institution";
  status: "pending" | "running" | "paused" | "completed" | "cancelled" | "failed";
  createdAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
  totalInstitutions: number;
  completedInstitutions: number;
  partialInstitutions: number;
  failedInstitutions: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  extractedRecords: number;
  validatedRecords: number;
  coverageScore: number;
  configJson?: string;
  lastHeartbeat?: number | null;
}

export class CampaignManager {
  /**
   * Creates a new crawl campaign and enqueues initial seed jobs
   */
  public static async createCampaign(options: {
    name: string;
    scope?: "nationwide" | "regional" | "institution";
    institutionId?: string;
    region?: "North" | "Central" | "South";
  }): Promise<CrawlCampaign> {
    const id = `cmp-${randomUUID()}`;
    const now = Date.now();
    const scope = options.scope || (options.institutionId ? "institution" : "nationwide");

    // Fetch candidate institutions
    let targetInstitutions: RegisteredInstitution[] = [];
    if (scope === "institution" && options.institutionId) {
      const inst = await UniversityRegistryService.getInstitutionById(options.institutionId);
      if (inst) targetInstitutions = [inst];
    } else if (scope === "regional" && options.region) {
      const all = await UniversityRegistryService.getAllInstitutions();
      targetInstitutions = all.filter((i) => i.region === options.region);
    } else {
      targetInstitutions = await UniversityRegistryService.getAllInstitutions();
    }

    const campaign: CrawlCampaign = {
      id,
      name: options.name,
      scope,
      status: "pending",
      createdAt: now,
      startedAt: null,
      completedAt: null,
      totalInstitutions: targetInstitutions.length,
      completedInstitutions: 0,
      partialInstitutions: 0,
      failedInstitutions: 0,
      totalJobs: targetInstitutions.length,
      completedJobs: 0,
      failedJobs: 0,
      extractedRecords: 0,
      validatedRecords: 0,
      coverageScore: 0.0,
      configJson: JSON.stringify(options),
      lastHeartbeat: now,
    };

    // 1. Insert campaign row
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO crawl_campaigns (
          id, name, scope, status, created_at, total_institutions, total_jobs, config_json, last_heartbeat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, campaign.name, campaign.scope, campaign.status, now, campaign.totalInstitutions, campaign.totalJobs, campaign.configJson, now]
      );
    } else {
      const db = getSqliteDb();
      db.prepare(
        `INSERT INTO crawl_campaigns (
          id, name, scope, status, created_at, total_institutions, total_jobs, config_json, last_heartbeat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, campaign.name, campaign.scope, campaign.status, now, campaign.totalInstitutions, campaign.totalJobs, campaign.configJson, now);
    }

    // 2. Enqueue seed discovery jobs for each institution
    for (const inst of targetInstitutions) {
      const seedUrl = inst.officialWebsite || `https://${inst.officialDomain}`;
      await PersistentJobSystem.enqueueJob({
        campaignId: id,
        universityId: inst.id,
        url: seedUrl,
        jobType: "discovery",
        priority: 10,
        depth: 0,
      });
    }

    return campaign;
  }

  /**
   * Starts or resumes a campaign
   */
  public static async startCampaign(campaignId: string): Promise<boolean> {
    const now = Date.now();
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        `UPDATE crawl_campaigns
         SET status = 'running', started_at = COALESCE(started_at, $1), last_heartbeat = $1
         WHERE id = $2 RETURNING id`,
        [now, campaignId]
      );
      return (res.rowCount ?? 0) > 0;
    } else {
      const db = getSqliteDb();
      const res = db.prepare(
        `UPDATE crawl_campaigns
         SET status = 'running', started_at = COALESCE(started_at, ?), last_heartbeat = ?
         WHERE id = ?`
      ).run(now, now, campaignId);
      return res.changes > 0;
    }
  }

  /**
   * Pauses an active campaign
   */
  public static async pauseCampaign(campaignId: string): Promise<boolean> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        `UPDATE crawl_campaigns SET status = 'paused' WHERE id = $1 RETURNING id`,
        [campaignId]
      );
      return (res.rowCount ?? 0) > 0;
    } else {
      const db = getSqliteDb();
      const res = db.prepare(`UPDATE crawl_campaigns SET status = 'paused' WHERE id = ?`).run(campaignId);
      return res.changes > 0;
    }
  }

  /**
   * Cancels a campaign
   */
  public static async cancelCampaign(campaignId: string): Promise<boolean> {
    const now = Date.now();
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        `UPDATE crawl_campaigns SET status = 'cancelled', completed_at = $1 WHERE id = $2 RETURNING id`,
        [now, campaignId]
      );
      return (res.rowCount ?? 0) > 0;
    } else {
      const db = getSqliteDb();
      const res = db.prepare(`UPDATE crawl_campaigns SET status = 'cancelled', completed_at = ? WHERE id = ?`).run(now, campaignId);
      return res.changes > 0;
    }
  }

  /**
   * Syncs campaign progress counters by querying crawl_jobs
   */
  public static async syncCampaignProgress(campaignId: string): Promise<CrawlCampaign | null> {
    const now = Date.now();
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const statRes = await pool.query(
        `SELECT
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status IN ('succeeded', 'completed') THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status IN ('failed', 'dead_letter') THEN 1 END) as failed_jobs,
          COALESCE(SUM(extracted_count), 0) as extracted_records,
          COALESCE(SUM(validated_count), 0) as validated_records
         FROM crawl_jobs WHERE campaign_id = $1`,
        [campaignId]
      );
      const row = statRes.rows[0];
      const totalJobs = parseInt(row.total_jobs || "0", 10);
      const completedJobs = parseInt(row.completed_jobs || "0", 10);
      const failedJobs = parseInt(row.failed_jobs || "0", 10);
      const extractedRecords = parseInt(row.extracted_records || "0", 10);
      const validatedRecords = parseInt(row.validated_records || "0", 10);

      const isAllDone = totalJobs > 0 && completedJobs + failedJobs >= totalJobs;
      const newStatus = isAllDone ? "completed" : undefined;

      await pool.query(
        `UPDATE crawl_campaigns
         SET total_jobs = $1, completed_jobs = $2, failed_jobs = $3,
             extracted_records = $4, validated_records = $5,
             status = COALESCE($6, status),
             completed_at = CASE WHEN $6 = 'completed' THEN $7 ELSE completed_at END,
             last_heartbeat = $7
         WHERE id = $8`,
        [totalJobs, completedJobs, failedJobs, extractedRecords, validatedRecords, newStatus, now, campaignId]
      );
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = db.prepare(
        `SELECT
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status IN ('succeeded', 'completed') THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status IN ('failed', 'dead_letter') THEN 1 END) as failed_jobs,
          COALESCE(SUM(extracted_count), 0) as extracted_records,
          COALESCE(SUM(validated_count), 0) as validated_records
         FROM crawl_jobs WHERE campaign_id = ?`
      ).get(campaignId) as any;

      const totalJobs = row?.total_jobs || 0;
      const completedJobs = row?.completed_jobs || 0;
      const failedJobs = row?.failed_jobs || 0;
      const extractedRecords = row?.extracted_records || 0;
      const validatedRecords = row?.validated_records || 0;

      const isAllDone = totalJobs > 0 && completedJobs + failedJobs >= totalJobs;

      db.prepare(
        `UPDATE crawl_campaigns
         SET total_jobs = ?, completed_jobs = ?, failed_jobs = ?,
             extracted_records = ?, validated_records = ?,
             status = CASE WHEN ? = 1 THEN 'completed' ELSE status END,
             completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
             last_heartbeat = ?
         WHERE id = ?`
      ).run(totalJobs, completedJobs, failedJobs, extractedRecords, validatedRecords, isAllDone ? 1 : 0, isAllDone ? 1 : 0, now, now, campaignId);
    }

    return this.getCampaign(campaignId);
  }

  /**
   * Retrieves single campaign by ID
   */
  public static async getCampaign(campaignId: string): Promise<CrawlCampaign | null> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(`SELECT * FROM crawl_campaigns WHERE id = $1`, [campaignId]);
      if (res.rows.length === 0) return null;
      return this.mapCampaignRow(res.rows[0]);
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = db.prepare(`SELECT * FROM crawl_campaigns WHERE id = ?`).get(campaignId) as any;
      if (!row) return null;
      return this.mapCampaignRow(row);
    }
  }

  /**
   * Lists all campaigns sorted by newest first
   */
  public static async listCampaigns(limit = 20): Promise<CrawlCampaign[]> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        `SELECT * FROM crawl_campaigns ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return res.rows.map(this.mapCampaignRow);
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = db.prepare(
        `SELECT * FROM crawl_campaigns ORDER BY created_at DESC LIMIT ?`
      ).all(limit) as any[];
      return rows.map(this.mapCampaignRow);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mapCampaignRow(row: any): CrawlCampaign {
    return {
      id: row.id,
      name: row.name,
      scope: row.scope,
      status: row.status,
      createdAt: Number(row.created_at),
      startedAt: row.started_at ? Number(row.started_at) : null,
      completedAt: row.completed_at ? Number(row.completed_at) : null,
      totalInstitutions: Number(row.total_institutions || 0),
      completedInstitutions: Number(row.completed_institutions || 0),
      partialInstitutions: Number(row.partial_institutions || 0),
      failedInstitutions: Number(row.failed_institutions || 0),
      totalJobs: Number(row.total_jobs || 0),
      completedJobs: Number(row.completed_jobs || 0),
      failedJobs: Number(row.failed_jobs || 0),
      extractedRecords: Number(row.extracted_records || 0),
      validatedRecords: Number(row.validated_records || 0),
      coverageScore: Number(row.coverage_score || 0),
      configJson: row.config_json,
      lastHeartbeat: row.last_heartbeat ? Number(row.last_heartbeat) : null,
    };
  }
}
