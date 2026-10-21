/**
 * Nationwide Crawler Database Schema & Migrations
 *
 * Ensures tables for crawl campaigns, persistent jobs, discovered URLs,
 * coverage audits, and staging records are initialized in both
 * SQLite (Local & Testing) and Cloud SQL PostgreSQL (GCP Production).
 */

import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";

export async function initCrawlerSqliteSchema(db: DatabaseSync): Promise<void> {
  // 1. Expand universities table with crawler metadata columns if missing
  const uniCols = [
    { name: "alternative_names", type: "TEXT" },
    { name: "verification_status", type: "TEXT DEFAULT 'verified'" },
    { name: "discovery_source", type: "TEXT DEFAULT 'seed'" },
    { name: "crawl_status", type: "TEXT DEFAULT 'pending'" },
    { name: "last_successful_crawl", type: "INTEGER" },
    { name: "last_attempted_crawl", type: "INTEGER" },
    { name: "estimated_pages", type: "INTEGER DEFAULT 0" },
    { name: "discovered_staff_pages", type: "INTEGER DEFAULT 0" },
    { name: "extracted_professors", type: "INTEGER DEFAULT 0" },
    { name: "validated_records", type: "INTEGER DEFAULT 0" },
    { name: "failed_jobs", type: "INTEGER DEFAULT 0" },
    { name: "last_error_message", type: "TEXT" },
    { name: "next_scheduled_crawl", type: "INTEGER" },
  ];

  for (const col of uniCols) {
    try {
      db.exec(`ALTER TABLE universities ADD COLUMN ${col.name} ${col.type};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure lecturers table has degree column if missing
  try {
    db.exec("ALTER TABLE lecturers ADD COLUMN degree TEXT;");
  } catch {
    // Column already exists
  }

  // 2. Crawl Campaigns Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT DEFAULT 'nationwide',
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      total_institutions INTEGER DEFAULT 0,
      completed_institutions INTEGER DEFAULT 0,
      partial_institutions INTEGER DEFAULT 0,
      failed_institutions INTEGER DEFAULT 0,
      total_jobs INTEGER DEFAULT 0,
      completed_jobs INTEGER DEFAULT 0,
      failed_jobs INTEGER DEFAULT 0,
      extracted_records INTEGER DEFAULT 0,
      validated_records INTEGER DEFAULT 0,
      coverage_score REAL DEFAULT 0.0,
      config_json TEXT,
      last_heartbeat INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON crawl_campaigns(status);
  `);

  // 3. Expand crawl_jobs table with robust lifecycle columns
  const jobCols = [
    { name: "campaign_id", type: "TEXT" },
    { name: "job_type", type: "TEXT DEFAULT 'directory_scan'" },
    { name: "attempt_count", type: "INTEGER DEFAULT 0" },
    { name: "max_attempts", type: "INTEGER DEFAULT 5" },
    { name: "last_heartbeat", type: "INTEGER" },
    { name: "extracted_count", type: "INTEGER DEFAULT 0" },
    { name: "validated_count", type: "INTEGER DEFAULT 0" },
    { name: "error_category", type: "TEXT" },
    { name: "retry_eligibility", type: "INTEGER DEFAULT 1" },
    { name: "idempotency_key", type: "TEXT" },
    { name: "depth", type: "INTEGER DEFAULT 0" },
    { name: "parent_job_id", type: "TEXT" },
    { name: "created_at", type: "INTEGER" },
  ];

  for (const col of jobCols) {
    try {
      db.exec(`ALTER TABLE crawl_jobs ADD COLUMN ${col.name} ${col.type};`);
    } catch {
      // Column already exists
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_status_prio ON crawl_jobs(status, priority DESC, next_retry_at ASC);
    CREATE INDEX IF NOT EXISTS idx_jobs_campaign ON crawl_jobs(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_institution ON crawl_jobs(university_id);
  `);

  // 4. Discovered URLs / Crawl Pages Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS discovered_urls (
      id TEXT PRIMARY KEY,
      institution_id TEXT,
      url TEXT UNIQUE NOT NULL,
      canonical_url TEXT,
      discovery_method TEXT,
      content_type TEXT,
      relevance_score REAL DEFAULT 0.0,
      content_hash TEXT,
      last_crawled_at INTEGER,
      http_status INTEGER,
      is_crawled INTEGER DEFAULT 0,
      parent_url TEXT,
      FOREIGN KEY (institution_id) REFERENCES universities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_disc_inst_crawled ON discovered_urls(institution_id, is_crawled);
    CREATE INDEX IF NOT EXISTS idx_disc_relevance ON discovered_urls(relevance_score DESC);
  `);

  // 5. Coverage Audits Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS coverage_audits (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      campaign_id TEXT,
      official_website_verified INTEGER DEFAULT 0,
      sitemap_checked INTEGER DEFAULT 0,
      staff_directories_discovered INTEGER DEFAULT 0,
      departments_explored INTEGER DEFAULT 0,
      pagination_exhausted INTEGER DEFAULT 0,
      candidate_pages_found INTEGER DEFAULT 0,
      candidate_pages_processed INTEGER DEFAULT 0,
      successful_pages INTEGER DEFAULT 0,
      failed_pages INTEGER DEFAULT 0,
      extracted_records INTEGER DEFAULT 0,
      validated_records INTEGER DEFAULT 0,
      unresolved_urls INTEGER DEFAULT 0,
      completion_status TEXT DEFAULT 'pending',
      unresolved_issues_json TEXT,
      audited_at INTEGER NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES universities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_audits_inst ON coverage_audits(institution_id);
    CREATE INDEX IF NOT EXISTS idx_audits_status ON coverage_audits(completion_status);
  `);

  // 6. Staging Professors Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS staging_professors (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      institution_id TEXT NOT NULL,
      raw_data_json TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      validation_status TEXT DEFAULT 'pending_review',
      validation_errors_json TEXT,
      confidence_score REAL DEFAULT 1.0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_staging_status ON staging_professors(validation_status);
    CREATE INDEX IF NOT EXISTS idx_staging_inst ON staging_professors(institution_id);
  `);
}

export async function initCrawlerPostgresSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Expand universities and lecturers tables
    const uniCols = [
      "ADD COLUMN IF NOT EXISTS alternative_names TEXT",
      "ADD COLUMN IF NOT EXISTS verification_status VARCHAR(64) DEFAULT 'verified'",
      "ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(64) DEFAULT 'seed'",
      "ADD COLUMN IF NOT EXISTS crawl_status VARCHAR(64) DEFAULT 'pending'",
      "ADD COLUMN IF NOT EXISTS last_successful_crawl BIGINT",
      "ADD COLUMN IF NOT EXISTS last_attempted_crawl BIGINT",
      "ADD COLUMN IF NOT EXISTS estimated_pages INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS discovered_staff_pages INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS extracted_professors INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS validated_records INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS failed_jobs INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS last_error_message TEXT",
      "ADD COLUMN IF NOT EXISTS next_scheduled_crawl BIGINT",
    ];

    for (const col of uniCols) {
      await client.query(`ALTER TABLE universities ${col};`);
    }

    try {
      await client.query("ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS degree VARCHAR(64);");
    } catch {
      // ignore
    }

    // 2. Crawl Campaigns Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS crawl_campaigns (
        id VARCHAR(128) PRIMARY KEY,
        name TEXT NOT NULL,
        scope VARCHAR(64) DEFAULT 'nationwide',
        status VARCHAR(64) DEFAULT 'pending',
        created_at BIGINT NOT NULL,
        started_at BIGINT,
        completed_at BIGINT,
        total_institutions INT DEFAULT 0,
        completed_institutions INT DEFAULT 0,
        partial_institutions INT DEFAULT 0,
        failed_institutions INT DEFAULT 0,
        total_jobs INT DEFAULT 0,
        completed_jobs INT DEFAULT 0,
        failed_jobs INT DEFAULT 0,
        extracted_records INT DEFAULT 0,
        validated_records INT DEFAULT 0,
        coverage_score NUMERIC(5, 2) DEFAULT 0.0,
        config_json TEXT,
        last_heartbeat BIGINT
      );
      CREATE INDEX IF NOT EXISTS idx_pg_campaigns_status ON crawl_campaigns(status);
    `);

    // 3. Expand crawl_jobs table
    const jobCols = [
      "ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(128)",
      "ADD COLUMN IF NOT EXISTS job_type VARCHAR(64) DEFAULT 'directory_scan'",
      "ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 5",
      "ADD COLUMN IF NOT EXISTS last_heartbeat BIGINT",
      "ADD COLUMN IF NOT EXISTS extracted_count INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS validated_count INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS error_category VARCHAR(64)",
      "ADD COLUMN IF NOT EXISTS retry_eligibility BOOLEAN DEFAULT TRUE",
      "ADD COLUMN IF NOT EXISTS idempotency_key TEXT",
      "ADD COLUMN IF NOT EXISTS depth INT DEFAULT 0",
      "ADD COLUMN IF NOT EXISTS parent_job_id VARCHAR(128)",
      "ADD COLUMN IF NOT EXISTS created_at BIGINT",
    ];

    for (const col of jobCols) {
      await client.query(`ALTER TABLE crawl_jobs ${col};`);
    }
    await client.query(`ALTER TABLE crawl_jobs ALTER COLUMN idempotency_key TYPE TEXT;`);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pg_jobs_status_prio ON crawl_jobs(status, priority DESC, next_retry_at ASC);
      CREATE INDEX IF NOT EXISTS idx_pg_jobs_campaign ON crawl_jobs(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_pg_jobs_institution ON crawl_jobs(university_id);
    `);

    // 4. Discovered URLs / Crawl Pages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS discovered_urls (
        id VARCHAR(128) PRIMARY KEY,
        institution_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        url TEXT UNIQUE NOT NULL,
        canonical_url TEXT,
        discovery_method VARCHAR(64),
        content_type VARCHAR(64),
        relevance_score NUMERIC(3, 2) DEFAULT 0.0,
        content_hash VARCHAR(128),
        last_crawled_at BIGINT,
        http_status INT,
        is_crawled BOOLEAN DEFAULT FALSE,
        parent_url TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pg_disc_inst_crawled ON discovered_urls(institution_id, is_crawled);
      CREATE INDEX IF NOT EXISTS idx_pg_disc_relevance ON discovered_urls(relevance_score DESC);
    `);

    // 5. Coverage Audits Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coverage_audits (
        id VARCHAR(128) PRIMARY KEY,
        institution_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        campaign_id VARCHAR(128),
        official_website_verified BOOLEAN DEFAULT FALSE,
        sitemap_checked BOOLEAN DEFAULT FALSE,
        staff_directories_discovered INT DEFAULT 0,
        departments_explored INT DEFAULT 0,
        pagination_exhausted BOOLEAN DEFAULT FALSE,
        candidate_pages_found INT DEFAULT 0,
        candidate_pages_processed INT DEFAULT 0,
        successful_pages INT DEFAULT 0,
        failed_pages INT DEFAULT 0,
        extracted_records INT DEFAULT 0,
        validated_records INT DEFAULT 0,
        unresolved_urls INT DEFAULT 0,
        completion_status VARCHAR(64) DEFAULT 'pending',
        unresolved_issues_json TEXT,
        audited_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pg_audits_inst ON coverage_audits(institution_id);
      CREATE INDEX IF NOT EXISTS idx_pg_audits_status ON coverage_audits(completion_status);
    `);

    // 6. Staging Professors Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staging_professors (
        id VARCHAR(128) PRIMARY KEY,
        job_id VARCHAR(128),
        institution_id VARCHAR(64) NOT NULL,
        raw_data_json TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        validation_status VARCHAR(32) DEFAULT 'pending_review',
        validation_errors_json TEXT,
        confidence_score NUMERIC(3, 2) DEFAULT 1.0,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pg_staging_status ON staging_professors(validation_status);
      CREATE INDEX IF NOT EXISTS idx_pg_staging_inst ON staging_professors(institution_id);
    `);
  } finally {
    client.release();
  }
}
