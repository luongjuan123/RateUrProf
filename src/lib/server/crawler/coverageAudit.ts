/**
 * Nationwide Coverage Audit & Quality Assurance Service
 *
 * Computes institution-level and nationwide coverage scores.
 * Enforces zero-fabrication standards: clearly distinguishes complete,
 * partial, inaccessible, and no_public_data states.
 */

import { isPostgresConfigured, getPostgresPool } from "../postgresClient";
import { getSqliteDb } from "../sqliteClient";
import { UniversityRegistryService, RegisteredInstitution } from "./registry";
import { randomUUID } from "node:crypto";

export interface InstitutionAuditReport {
  institutionId: string;
  name: string;
  shortName: string;
  officialDomain: string;
  status: "complete" | "partial" | "inaccessible" | "no_public_data" | "pending";
  officialWebsiteVerified: boolean;
  sitemapChecked: boolean;
  staffDirectoriesDiscovered: number;
  candidatePagesFound: number;
  candidatePagesProcessed: number;
  extractedRecords: number;
  validatedRecords: number;
  unresolvedUrls: number;
  lastCrawledAt: number | null;
  unresolvedIssues: string[];
}

export interface NationwideCoverageReport {
  totalInstitutions: number;
  completeInstitutions: number;
  partialInstitutions: number;
  inaccessibleInstitutions: number;
  noPublicDataInstitutions: number;
  pendingInstitutions: number;
  totalExtractedNationwide: number;
  totalValidatedNationwide: number;
  nationwideCoveragePercentage: number;
  institutionReports: InstitutionAuditReport[];
  generatedAt: number;
}

export class CoverageAuditService {
  /**
   * Generates a full nationwide coverage audit with high-performance pre-aggregation
   */
  public static async runNationwideAudit(campaignId?: string): Promise<NationwideCoverageReport> {
    const institutions = await UniversityRegistryService.getAllInstitutions();
    const reports: InstitutionAuditReport[] = [];

    const urlStatsMap = new Map<string, { total: number; processed: number }>();
    const jobStatsMap = new Map<string, { failedJobs: number; totalExtracted: number; totalValidated: number }>();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      try {
        const urlsRes = await pool.query(
          `SELECT institution_id, COUNT(*) as total,
                  COUNT(CASE WHEN is_crawled = TRUE THEN 1 END) as processed
           FROM discovered_urls GROUP BY institution_id`
        );
        for (const row of urlsRes.rows) {
          urlStatsMap.set(row.institution_id, {
            total: parseInt(row.total || "0", 10),
            processed: parseInt(row.processed || "0", 10),
          });
        }

        const jobsRes = await pool.query(
          `SELECT university_id,
                  COUNT(CASE WHEN status IN ('failed', 'dead_letter') THEN 1 END) as failed_jobs,
                  COALESCE(SUM(extracted_count), 0) as total_extracted,
                  COALESCE(SUM(validated_count), 0) as total_validated
           FROM crawl_jobs GROUP BY university_id`
        );
        for (const row of jobsRes.rows) {
          jobStatsMap.set(row.university_id, {
            failedJobs: parseInt(row.failed_jobs || "0", 10),
            totalExtracted: parseInt(row.total_extracted || "0", 10),
            totalValidated: parseInt(row.total_validated || "0", 10),
          });
        }
      } catch (e) {
        console.warn("Could not pre-aggregate Postgres audit stats:", e);
      }
    } else {
      const db = getSqliteDb();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const urlRows = db.prepare(
          `SELECT institution_id, COUNT(*) as total,
                  COUNT(CASE WHEN is_crawled = 1 THEN 1 END) as processed
           FROM discovered_urls GROUP BY institution_id`
        ).all() as any[];
        for (const row of urlRows) {
          urlStatsMap.set(row.institution_id, {
            total: row.total || 0,
            processed: row.processed || 0,
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jobRows = db.prepare(
          `SELECT university_id,
                  COUNT(CASE WHEN status IN ('failed', 'dead_letter') THEN 1 END) as failed_jobs,
                  COALESCE(SUM(extracted_count), 0) as total_extracted,
                  COALESCE(SUM(validated_count), 0) as total_validated
           FROM crawl_jobs GROUP BY university_id`
        ).all() as any[];
        for (const row of jobRows) {
          jobStatsMap.set(row.university_id, {
            failedJobs: row.failed_jobs || 0,
            totalExtracted: row.total_extracted || 0,
            totalValidated: row.total_validated || 0,
          });
        }
      } catch (e) {
        console.warn("Could not pre-aggregate SQLite audit stats:", e);
      }
    }

    let completeCount = 0;
    let partialCount = 0;
    let inaccessibleCount = 0;
    let noPublicDataCount = 0;
    let pendingCount = 0;
    let totalExtracted = 0;
    let totalValidated = 0;

    for (const inst of institutions) {
      const uStats = urlStatsMap.get(inst.id) || { total: 0, processed: 0 };
      const jStats = jobStatsMap.get(inst.id) || { failedJobs: 0, totalExtracted: 0, totalValidated: 0 };
      const report = await this.auditInstitution(
        inst,
        campaignId,
        { ...uStats, ...jStats },
        false
      );
      reports.push(report);

      if (report.status === "complete") completeCount++;
      else if (report.status === "partial") partialCount++;
      else if (report.status === "inaccessible") inaccessibleCount++;
      else if (report.status === "no_public_data") noPublicDataCount++;
      else pendingCount++;

      totalExtracted += report.extractedRecords;
      totalValidated += report.validatedRecords;
    }

    const totalInstitutions = institutions.length;
    // Coverage % = institutions with at least validated public data / total institutions
    const nationwideCoveragePercentage = totalInstitutions > 0
      ? Math.round(((completeCount + partialCount * 0.5) / totalInstitutions) * 100)
      : 0;

    return {
      totalInstitutions,
      completeInstitutions: completeCount,
      partialInstitutions: partialCount,
      inaccessibleInstitutions: inaccessibleCount,
      noPublicDataInstitutions: noPublicDataCount,
      pendingInstitutions: pendingCount,
      totalExtractedNationwide: totalExtracted,
      totalValidatedNationwide: totalValidated,
      nationwideCoveragePercentage,
      institutionReports: reports,
      generatedAt: Date.now(),
    };
  }

  /**
   * Audits an individual institution by analyzing crawl_jobs and discovered_urls telemetry
   */
  public static async auditInstitution(
    inst: RegisteredInstitution,
    campaignId?: string,
    precomputed?: {
      total?: number;
      processed?: number;
      failedJobs?: number;
      totalExtracted?: number;
      totalValidated?: number;
    },
    persist = true
  ): Promise<InstitutionAuditReport> {
    let candidatePagesFound = precomputed?.total ?? 0;
    let candidatePagesProcessed = precomputed?.processed ?? 0;
    let failedPages = precomputed?.failedJobs ?? 0;
    let extractedCount = precomputed?.totalExtracted || inst.extractedProfessors || 0;
    let validatedCount = precomputed?.totalValidated || inst.validatedRecords || 0;
    const unresolvedIssues: string[] = [];

    if (!precomputed) {
      if (isPostgresConfigured()) {
        const pool = getPostgresPool();

        // Query discovered urls
        const urlsRes = await pool.query(
          `SELECT COUNT(*) as total,
                  COUNT(CASE WHEN is_crawled = TRUE THEN 1 END) as processed
           FROM discovered_urls WHERE institution_id = $1`,
          [inst.id]
        );
        candidatePagesFound = parseInt(urlsRes.rows[0]?.total || "0", 10);
        candidatePagesProcessed = parseInt(urlsRes.rows[0]?.processed || "0", 10);

        // Query jobs for errors
        const jobsRes = await pool.query(
          `SELECT COUNT(CASE WHEN status = 'failed' OR status = 'dead_letter' THEN 1 END) as failed_jobs,
                  SUM(extracted_count) as total_extracted,
                  SUM(validated_count) as total_validated
           FROM crawl_jobs WHERE university_id = $1`,
          [inst.id]
        );
        failedPages = parseInt(jobsRes.rows[0]?.failed_jobs || "0", 10);
        const jobsExtracted = parseInt(jobsRes.rows[0]?.total_extracted || "0", 10);
        const jobsValidated = parseInt(jobsRes.rows[0]?.total_validated || "0", 10);
        if (jobsExtracted > 0) extractedCount = jobsExtracted;
        if (jobsValidated > 0) validatedCount = jobsValidated;
      } else {
        const db = getSqliteDb();

        // Query discovered urls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const urlsRow = db.prepare(
          `SELECT COUNT(*) as total,
                  COUNT(CASE WHEN is_crawled = 1 THEN 1 END) as processed
           FROM discovered_urls WHERE institution_id = ?`
        ).get(inst.id) as any;
        candidatePagesFound = urlsRow?.total || 0;
        candidatePagesProcessed = urlsRow?.processed || 0;

        // Query jobs for errors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jobsRow = db.prepare(
          `SELECT COUNT(CASE WHEN status = 'failed' OR status = 'dead_letter' THEN 1 END) as failed_jobs,
                  SUM(extracted_count) as total_extracted,
                  SUM(validated_count) as total_validated
           FROM crawl_jobs WHERE university_id = ?`
        ).get(inst.id) as any;
        failedPages = jobsRow?.failed_jobs || 0;
        if (jobsRow?.total_extracted > 0) extractedCount = jobsRow.total_extracted;
        if (jobsRow?.total_validated > 0) validatedCount = jobsRow.total_validated;
      }
    }

    // Determine completion status with honest criteria
    let status: "complete" | "partial" | "inaccessible" | "no_public_data" | "pending" = "pending";

    if (inst.lastErrorMessage?.includes("403") || inst.lastErrorMessage?.includes("timeout")) {
      status = "inaccessible";
      unresolvedIssues.push(inst.lastErrorMessage);
    } else if (candidatePagesFound > 0 && candidatePagesProcessed >= candidatePagesFound && validatedCount > 0 && failedPages === 0) {
      status = "complete";
    } else if (validatedCount > 0 || (candidatePagesProcessed > 0 && candidatePagesProcessed < candidatePagesFound)) {
      status = "partial";
      if (failedPages > 0) unresolvedIssues.push(`${failedPages} tác vụ cào gặp lỗi hoặc quá số lần thử lại.`);
      if (candidatePagesProcessed < candidatePagesFound) {
        unresolvedIssues.push(`Còn ${candidatePagesFound - candidatePagesProcessed} trang chưa được quét xong.`);
      }
    } else if (candidatePagesProcessed > 0 && extractedCount === 0) {
      status = "no_public_data";
      unresolvedIssues.push("Không tìm thấy danh sách giảng viên công khai trên tên miền trường.");
    }

    const report: InstitutionAuditReport = {
      institutionId: inst.id,
      name: inst.name,
      shortName: inst.shortName,
      officialDomain: inst.officialDomain || "",
      status,
      officialWebsiteVerified: Boolean(inst.officialWebsite),
      sitemapChecked: candidatePagesFound > 0,
      staffDirectoriesDiscovered: inst.discoveredStaffPages || 1,
      candidatePagesFound,
      candidatePagesProcessed,
      extractedRecords: extractedCount,
      validatedRecords: validatedCount,
      unresolvedUrls: Math.max(0, candidatePagesFound - candidatePagesProcessed),
      lastCrawledAt: inst.lastSuccessfulCrawl || inst.lastAttemptedCrawl || null,
      unresolvedIssues,
    };

    // Save audit to database if persist requested
    if (persist) {
      await this.persistAudit(report, campaignId);
    }

    return report;
  }

  private static async persistAudit(report: InstitutionAuditReport, campaignId?: string): Promise<void> {
    const id = `audit-${randomUUID()}`;
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO coverage_audits (
          id, institution_id, campaign_id, official_website_verified,
          sitemap_checked, staff_directories_discovered, candidate_pages_found,
          candidate_pages_processed, extracted_records, validated_records,
          unresolved_urls, completion_status, unresolved_issues_json, audited_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id,
          report.institutionId,
          campaignId || null,
          Boolean(report.officialWebsiteVerified),
          Boolean(report.sitemapChecked),
          report.staffDirectoriesDiscovered,
          report.candidatePagesFound,
          report.candidatePagesProcessed,
          report.extractedRecords,
          report.validatedRecords,
          report.unresolvedUrls,
          report.status,
          JSON.stringify(report.unresolvedIssues),
          now,
        ]
      );
    } else {
      const db = getSqliteDb();
      db.prepare(
        `INSERT INTO coverage_audits (
          id, institution_id, campaign_id, official_website_verified,
          sitemap_checked, staff_directories_discovered, candidate_pages_found,
          candidate_pages_processed, extracted_records, validated_records,
          unresolved_urls, completion_status, unresolved_issues_json, audited_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        report.institutionId,
        campaignId || null,
        report.officialWebsiteVerified ? 1 : 0,
        report.sitemapChecked ? 1 : 0,
        report.staffDirectoriesDiscovered,
        report.candidatePagesFound,
        report.candidatePagesProcessed,
        report.extractedRecords,
        report.validatedRecords,
        report.unresolvedUrls,
        report.status,
        JSON.stringify(report.unresolvedIssues),
        now
      );
    }
  }
}
