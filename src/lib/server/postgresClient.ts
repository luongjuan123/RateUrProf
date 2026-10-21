/**
 * RateUrProfs Cloud SQL PostgreSQL Client
 *
 * Utilizes `pg.Pool` for high-performance, connection-pooled relational querying
 * of verified university lecturers, universities, and reviews on Google Cloud Platform.
 *
 * Features:
 * - Connection pooling tuned for Cloud Run auto-scaling.
 * - Automatic schema migration and table creation.
 * - Trigram & normalized diacritic-insensitive search.
 * - Bounded pagination (default 12, hard max 50).
 * - Exact database health and table telemetry.
 */

import { Pool, PoolConfig } from "pg";
import { normalizeSearchString } from "../search/vietnameseNormalizer";
import { LightweightProfessorSummary } from "./searchIndex";
import { SqlSearchOptions, SqlSearchResult, DatabaseStats } from "./sqliteClient";
import { University } from "@/types";

let poolInstance: Pool | null = null;

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPostgresPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set in environment.");
    }

    const config: PoolConfig = {
      connectionString,
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || "20000", 10),
    };

    // Support Cloud SQL SSL if required by connection string
    if (process.env.DB_SSL === "true" || connectionString.includes("sslmode=require")) {
      config.ssl = { rejectUnauthorized: false };
    }

    poolInstance = new Pool(config);

    poolInstance.on("error", (err) => {
      console.error("[PostgresPool] Unexpected client error:", err);
    });

    // Proactively verify PostgreSQL schema once in background
    ensurePostgresSchema(poolInstance).catch((err) => {
      console.warn("[PostgresPool] Automatic schema verification notice:", err.message);
    });
  }

  return poolInstance;
}

let schemaInitPromise: Promise<void> | null = null;

export async function ensurePostgresSchema(pool: Pool = getPostgresPool()): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = initPostgresSchema(pool).catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
}

/**
 * Initializes PostgreSQL schema with required tables, relationships, and indexes.
 */
export async function initPostgresSchema(pool: Pool = getPostgresPool()): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");

    // Enable pg_trgm extension if available for trigram similarity
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    } catch (e) {
      console.warn("[Postgres] pg_trgm extension could not be enabled (ignorable if non-superuser):", e);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS universities (
        id VARCHAR(64) PRIMARY KEY,
        name TEXT NOT NULL,
        short_name VARCHAR(64) NOT NULL,
        english_name TEXT,
        city VARCHAR(128),
        region VARCHAR(64),
        official_domain VARCHAR(255),
        official_website TEXT,
        institution_type VARCHAR(64) DEFAULT 'university',
        total_professors INT DEFAULT 0,
        collection_status VARCHAR(64) DEFAULT 'discovered',
        created_at BIGINT,
        updated_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS faculties (
        id VARCHAR(128) PRIMARY KEY,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_en TEXT,
        website_url TEXT,
        directory_url TEXT,
        created_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS departments (
        id VARCHAR(128) PRIMARY KEY,
        faculty_id VARCHAR(128) REFERENCES faculties(id) ON DELETE CASCADE,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_en TEXT,
        created_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS lecturers (
        id VARCHAR(128) PRIMARY KEY,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        title VARCHAR(64),
        academic_title VARCHAR(64),
        academic_rank VARCHAR(32),
        degree VARCHAR(32),
        position TEXT,
        avatar TEXT,
        bio TEXT,
        verification_status VARCHAR(32) DEFAULT 'verified',
        rating_average NUMERIC(3, 2),
        rating_count INT DEFAULT 0,
        take_again_percent INT,
        difficulty_score NUMERIC(3, 2),
        source_urls_json JSONB,
        created_at BIGINT,
        updated_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS affiliations (
        id VARCHAR(128) PRIMARY KEY,
        lecturer_id VARCHAR(128) REFERENCES lecturers(id) ON DELETE CASCADE,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        university_name TEXT,
        university_short_name VARCHAR(64),
        faculty TEXT,
        department TEXT,
        affiliation_status VARCHAR(64) DEFAULT 'permanent',
        is_primary INT DEFAULT 1,
        source_url TEXT,
        created_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS sources (
        id VARCHAR(128) PRIMARY KEY,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        url TEXT UNIQUE NOT NULL,
        domain VARCHAR(255) NOT NULL,
        source_type VARCHAR(64) NOT NULL,
        crawl_policy VARCHAR(64) DEFAULT 'allowed',
        status VARCHAR(64) DEFAULT 'pending_crawl',
        content_hash VARCHAR(128),
        last_crawled_at BIGINT,
        failure_count INT DEFAULT 0,
        last_error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS crawl_jobs (
        id VARCHAR(128) PRIMARY KEY,
        source_id VARCHAR(128),
        university_id VARCHAR(64),
        url TEXT NOT NULL,
        status VARCHAR(64) DEFAULT 'queued',
        priority INT DEFAULT 10,
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 5,
        last_error TEXT,
        next_retry_at BIGINT,
        started_at BIGINT,
        completed_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS crawl_logs (
        id BIGSERIAL PRIMARY KEY,
        job_id VARCHAR(128),
        url TEXT NOT NULL,
        http_status INT,
        duration_ms INT,
        records_extracted INT DEFAULT 0,
        error_category VARCHAR(64),
        error_message TEXT,
        logged_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provenance (
        id BIGSERIAL PRIMARY KEY,
        lecturer_id VARCHAR(128) REFERENCES lecturers(id) ON DELETE CASCADE,
        field_name VARCHAR(64) NOT NULL,
        source_url TEXT NOT NULL,
        extracted_at BIGINT NOT NULL,
        confidence NUMERIC(3, 2) DEFAULT 1.0,
        source_type VARCHAR(64)
      );

      CREATE TABLE IF NOT EXISTS entity_match_candidates (
        id VARCHAR(128) PRIMARY KEY,
        source_professor_id VARCHAR(128) NOT NULL,
        candidate_professor_id VARCHAR(128) NOT NULL,
        source_name TEXT NOT NULL,
        candidate_name TEXT NOT NULL,
        source_university TEXT,
        candidate_university TEXT,
        match_score NUMERIC(4, 3) NOT NULL,
        match_reasons_json JSONB,
        status VARCHAR(32) DEFAULT 'pending',
        detected_at BIGINT NOT NULL,
        resolved_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(128) PRIMARY KEY,
        lecturer_id VARCHAR(128) REFERENCES lecturers(id) ON DELETE CASCADE,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        user_display_name VARCHAR(128),
        user_id VARCHAR(128),
        course_name VARCHAR(128),
        overall_rating NUMERIC(3, 2) NOT NULL,
        difficulty_score NUMERIC(3, 2),
        take_again INT,
        comment TEXT,
        helpful_count INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'published',
        created_at BIGINT NOT NULL
      );

      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS grade_received VARCHAR(32);
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS attendance_mandatory INT DEFAULT 1;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tags TEXT;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_online INT DEFAULT 0;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS for_credit INT DEFAULT 1;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS textbook_used INT DEFAULT 0;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3, 2);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS criteria_averages_json TEXT;

      CREATE TABLE IF NOT EXISTS school_reviews (
        id VARCHAR(128) PRIMARY KEY,
        university_id VARCHAR(64) REFERENCES universities(id) ON DELETE CASCADE,
        user_display_name VARCHAR(128),
        user_id VARCHAR(128),
        cohort VARCHAR(64),
        reputation NUMERIC(3, 2) NOT NULL,
        location NUMERIC(3, 2) NOT NULL,
        opportunities NUMERIC(3, 2) NOT NULL,
        facilities NUMERIC(3, 2) NOT NULL,
        internet NUMERIC(3, 2) NOT NULL,
        food NUMERIC(3, 2) NOT NULL,
        clubs NUMERIC(3, 2) NOT NULL,
        social NUMERIC(3, 2) NOT NULL,
        happiness NUMERIC(3, 2) NOT NULL,
        safety NUMERIC(3, 2) NOT NULL,
        overall_rating NUMERIC(3, 2) NOT NULL,
        comment TEXT,
        helpful_count INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'published',
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS school_review_votes (
        review_id VARCHAR(128) NOT NULL REFERENCES school_reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (review_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_school_reviews_uni ON school_reviews(university_id);
      CREATE INDEX IF NOT EXISTS idx_school_reviews_created ON school_reviews(created_at);

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        salt VARCHAR(128),
        display_name VARCHAR(255),
        photo_url TEXT,
        role VARCHAR(32) DEFAULT 'student',
        is_anonymous BOOLEAN DEFAULT false,
        cohort VARCHAR(64),
        created_at BIGINT NOT NULL,
        updated_at BIGINT
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS salt VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS field_of_study VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_graduation_year VARCHAR(32);

      CREATE TABLE IF NOT EXISTS user_sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_votes (
        review_id VARCHAR(128) NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (review_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(128) PRIMARY KEY,
        review_id VARCHAR(128) REFERENCES reviews(id) ON DELETE CASCADE,
        professor_id VARCHAR(128),
        professor_name TEXT,
        review_comment_snippet TEXT,
        reported_by_user_id VARCHAR(128),
        reason VARCHAR(128),
        details TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS correction_requests (
        id VARCHAR(128) PRIMARY KEY,
        professor_id VARCHAR(128),
        professor_name TEXT,
        requester_email VARCHAR(255),
        requester_relation VARCHAR(64),
        details TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_saved_professors (
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        professor_id VARCHAR(128) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, professor_id)
      );

      CREATE INDEX IF NOT EXISTS idx_saved_professors_user ON user_saved_professors(user_id);

      CREATE TABLE IF NOT EXISTS institution_aliases (
        alias_id VARCHAR(64) PRIMARY KEY,
        canonical_id VARCHAR(64) NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        alias_name TEXT,
        created_at BIGINT
      );

      ALTER TABLE institution_aliases ADD COLUMN IF NOT EXISTS alias_type VARCHAR(32) DEFAULT 'abbreviation';

      ALTER TABLE universities ADD COLUMN IF NOT EXISTS alternative_names TEXT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS official_code VARCHAR(32);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS official_code_source VARCHAR(128) DEFAULT 'moet_directory';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS official_code_verified_at BIGINT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS official_code_status VARCHAR(32) DEFAULT 'verified';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS common_abbreviations JSONB;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS external_identifiers JSONB;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS source_url TEXT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS source_id VARCHAR(128);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(128);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at BIGINT;

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_id VARCHAR(128) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        actor_role VARCHAR(32) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_type VARCHAR(64) NOT NULL,
        target_id VARCHAR(128),
        reason TEXT,
        before_state JSONB,
        after_state JSONB,
        ip_address VARCHAR(64),
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        key VARCHAR(128) PRIMARY KEY,
        value_json JSONB NOT NULL,
        updated_by VARCHAR(128),
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS duplicate_merge_records (
        id VARCHAR(128) PRIMARY KEY,
        entity_type VARCHAR(64) NOT NULL,
        canonical_id VARCHAR(128) NOT NULL,
        merged_ids JSONB NOT NULL,
        merge_plan JSONB NOT NULL,
        executed_by VARCHAR(128) NOT NULL,
        executed_at BIGINT NOT NULL
      );

      -- Automated Transactional Email System Tables
      CREATE TABLE IF NOT EXISTS email_outbox (
        id VARCHAR(128) PRIMARY KEY,
        idempotency_key VARCHAR(128) UNIQUE,
        sender VARCHAR(255) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        template_id VARCHAR(64) NOT NULL,
        template_vars JSONB NOT NULL,
        locale VARCHAR(10) DEFAULT 'vi',
        status VARCHAR(32) DEFAULT 'queued',
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 5,
        next_retry_at BIGINT,
        provider VARCHAR(32),
        provider_message_id VARCHAR(128),
        last_error TEXT,
        created_at BIGINT NOT NULL,
        sent_at BIGINT,
        delivered_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS email_events (
        id BIGSERIAL PRIMARY KEY,
        event_id VARCHAR(128) UNIQUE,
        job_id VARCHAR(128) REFERENCES email_outbox(id) ON DELETE SET NULL,
        provider VARCHAR(32) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        payload_json JSONB,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_suppressions (
        email VARCHAR(255) PRIMARY KEY,
        reason VARCHAR(64) NOT NULL,
        details TEXT,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_tokens (
        token_hash VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token_type VARCHAR(32) NOT NULL,
        metadata_json JSONB,
        expires_at BIGINT NOT NULL,
        used_at BIGINT,
        created_at BIGINT NOT NULL
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_email_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_reason TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at BIGINT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_by VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at BIGINT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at BIGINT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_token_expires_at BIGINT;

      CREATE TABLE IF NOT EXISTS account_appeals (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email VARCHAR(255) NOT NULL,
        user_display_name VARCHAR(255),
        category VARCHAR(64) DEFAULT 'account_lock',
        reason TEXT NOT NULL,
        supporting_info TEXT,
        status VARCHAR(32) DEFAULT 'submitted',
        admin_notes TEXT,
        decision_reason TEXT,
        reviewed_by VARCHAR(128),
        reviewed_by_email VARCHAR(255),
        reviewed_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT
      );

      CREATE INDEX IF NOT EXISTS idx_pg_account_appeals_user ON account_appeals(user_id);
      CREATE INDEX IF NOT EXISTS idx_pg_account_appeals_status ON account_appeals(status);
      CREATE INDEX IF NOT EXISTS idx_pg_account_appeals_created ON account_appeals(created_at DESC);

      -- High-performance indexes
      CREATE INDEX IF NOT EXISTS idx_pg_lecturers_normalized_name ON lecturers(normalized_name);
      CREATE INDEX IF NOT EXISTS idx_pg_lecturers_academic_rank ON lecturers(academic_rank);
      CREATE INDEX IF NOT EXISTS idx_pg_lecturers_rating ON lecturers(rating_average);
      CREATE INDEX IF NOT EXISTS idx_pg_affiliations_lect_prim ON affiliations(lecturer_id, is_primary);
      CREATE INDEX IF NOT EXISTS idx_pg_affiliations_university ON affiliations(university_id);
      CREATE INDEX IF NOT EXISTS idx_pg_universities_short_name ON universities(short_name);
      CREATE INDEX IF NOT EXISTS idx_pg_universities_official_code ON universities(official_code);
      CREATE INDEX IF NOT EXISTS idx_institution_aliases_canonical ON institution_aliases(canonical_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliations_lecturer_uni ON affiliations(lecturer_id, university_id);
      CREATE INDEX IF NOT EXISTS idx_pg_crawl_jobs_status ON crawl_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_pg_crawl_jobs_dequeue ON crawl_jobs(status, priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_pg_reviews_lecturer ON reviews(lecturer_id);
      CREATE INDEX IF NOT EXISTS idx_pg_reviews_lecturer_status ON reviews(lecturer_id, status);
      CREATE INDEX IF NOT EXISTS idx_pg_reviews_created ON reviews(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pg_school_reviews_uni_status ON school_reviews(university_id, status);
      CREATE INDEX IF NOT EXISTS idx_pg_user_sessions_lookup ON user_sessions(token, expires_at);
      CREATE INDEX IF NOT EXISTS idx_pg_user_sessions_token ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_pg_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_pg_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_pg_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_pg_correction_status ON correction_requests(status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON admin_audit_logs(actor_email);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_email_outbox_dequeue ON email_outbox(status, next_retry_at, created_at);
      CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient ON email_outbox(recipient);
      CREATE INDEX IF NOT EXISTS idx_email_events_job ON email_events(job_id);
      CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup ON email_tokens(token_type, expires_at);

      -- Trigram GIN indexes for fast diacritic & substring searches
      CREATE INDEX IF NOT EXISTS idx_pg_lecturers_trgm_norm ON lecturers USING gin (normalized_name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_pg_lecturers_trgm_name ON lecturers USING gin (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_pg_unis_trgm_name ON universities USING gin (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_pg_unis_trgm_short ON universities USING gin (short_name gin_trgm_ops);

      -- Inbound Email & Ticket Management
      CREATE TABLE IF NOT EXISTS inbound_tickets (
        id VARCHAR(128) PRIMARY KEY,
        case_id VARCHAR(64) UNIQUE NOT NULL,
        resend_email_id VARCHAR(128),
        message_id TEXT,
        mailbox VARCHAR(64) NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255),
        subject TEXT,
        body_text TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        agent_reply TEXT,
        human_reply TEXT,
        replied_by VARCHAR(255),
        replied_at BIGINT,
        messages TEXT DEFAULT '[]',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      ALTER TABLE inbound_tickets ADD COLUMN IF NOT EXISTS messages TEXT DEFAULT '[]';

      CREATE INDEX IF NOT EXISTS idx_pg_inbound_tickets_mailbox ON inbound_tickets(mailbox);
      CREATE INDEX IF NOT EXISTS idx_pg_inbound_tickets_status ON inbound_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_pg_inbound_tickets_created ON inbound_tickets(created_at DESC);
    `);

    await client.query("COMMIT;");
    console.log("[Postgres] Schema initialization verified.");
  } catch (err) {
    await client.query("ROLLBACK;");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Searches lecturers in PostgreSQL with parameterized queries, bounded pagination,
 * and diacritic-insensitive matching.
 */
export async function searchLecturersPostgres(options: SqlSearchOptions): Promise<SqlSearchResult> {
  const startTime = Date.now();
  const pool = getPostgresPool();

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize || 12));
  const offset = (page - 1) * pageSize;

  const whereClauses: string[] = ["1=1"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];
  let paramIndex = 1;

  if (options.query && options.query.trim()) {
    const norm = normalizeSearchString(options.query.trim());
    const wildcard = `%${norm}%`;
    const rawWildcard = `%${options.query.trim()}%`;
    whereClauses.push(`(
      l.normalized_name ILIKE $${paramIndex}
      OR l.name ILIKE $${paramIndex + 1}
      OR a.university_short_name ILIKE $${paramIndex + 2}
      OR a.university_name ILIKE $${paramIndex + 3}
      OR a.faculty ILIKE $${paramIndex + 4}
    )`);
    params.push(wildcard, rawWildcard, rawWildcard, rawWildcard, rawWildcard);
    paramIndex += 5;
  }

  if (options.name && options.name.trim()) {
    const norm = normalizeSearchString(options.name.trim());
    const wildcard = `%${norm}%`;
    const rawWildcard = `%${options.name.trim()}%`;
    whereClauses.push(`(l.normalized_name ILIKE $${paramIndex} OR l.name ILIKE $${paramIndex + 1})`);
    params.push(wildcard, rawWildcard);
    paramIndex += 2;
  }

  if (options.universityId && options.universityId !== "all") {
    whereClauses.push(`a.university_id = $${paramIndex}`);
    params.push(options.universityId);
    paramIndex += 1;
  }

  if (options.faculty && options.faculty !== "all") {
    whereClauses.push(`a.faculty ILIKE $${paramIndex}`);
    params.push(`%${options.faculty}%`);
    paramIndex += 1;
  }

  if (options.academicRank && options.academicRank !== "all") {
    whereClauses.push(`l.academic_rank = $${paramIndex}`);
    params.push(options.academicRank);
    paramIndex += 1;
  }

  if (typeof options.minRating === "number" && options.minRating > 0) {
    whereClauses.push(`l.rating_average >= $${paramIndex}`);
    params.push(options.minRating);
    paramIndex += 1;
  }

  const whereSql = whereClauses.join(" AND ");

  // 1. Total Count Query
  const countSql = `
    SELECT COUNT(*) as total
    FROM lecturers l
    LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
    WHERE ${whereSql};
  `;
  const countRes = await pool.query(countSql, params);
  const totalCount = parseInt(countRes.rows[0]?.total || "0", 10);

  // 2. Paginated Fetch Query
  const querySql = `
    SELECT
      l.id,
      l.name,
      l.title,
      l.academic_title,
      l.academic_rank,
      l.position,
      l.avatar,
      l.bio,
      l.verification_status,
      l.rating_average,
      l.rating_count,
      l.take_again_percent,
      l.difficulty_score,
      a.university_id,
      a.university_name,
      a.university_short_name,
      a.faculty,
      a.department
    FROM lecturers l
    LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
    WHERE ${whereSql}
    ORDER BY
      CASE WHEN l.academic_rank = 'GS' THEN 1 WHEN l.academic_rank = 'PGS' THEN 2 ELSE 3 END,
      l.name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const rowsRes = await pool.query(querySql, [...params, pageSize, offset]);

  const items: LightweightProfessorSummary[] = rowsRes.rows.map((r) => {
    const cleanName = (r.name || "").normalize("NFC");
    const rawAvatar = r.avatar || null;
    const isRealPhoto = typeof rawAvatar === "string" &&
      rawAvatar.trim().length > 0 &&
      !rawAvatar.startsWith("data:") &&
      !rawAvatar.toLowerCase().includes("no-image") &&
      (rawAvatar.startsWith("http://") || rawAvatar.startsWith("https://") || rawAvatar.startsWith("/"));

    return {
      id: r.id,
      name: cleanName,
      fullName: cleanName,
      universityId: r.university_id,
      universityName: r.university_name,
      universityShortName: r.university_short_name,
      faculty: r.faculty,
      department: r.department,
      title: r.title,
      academicTitle: r.academic_title,
      academicRank: r.academic_rank,
      position: r.position,
      avatar: isRealPhoto ? rawAvatar : null,
      photoUrl: isRealPhoto ? rawAvatar : null,
      photoStatus: isRealPhoto ? "verified_photo" : "default_avatar",
      ratingAverage: r.rating_average !== null ? parseFloat(r.rating_average) : null,
      averageRating: r.rating_average !== null ? parseFloat(r.rating_average) : null,
      ratingCount: r.rating_count || 0,
      publishedReviewCount: r.rating_count || 0,
      takeAgainPercent: r.take_again_percent ?? null,
      difficultyScore: r.difficulty_score !== null ? parseFloat(r.difficulty_score) : null,
      difficultyAverage: r.difficulty_score !== null ? parseFloat(r.difficulty_score) : null,
      verificationStatus: r.verification_status || "verified",
    };
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    executionTimeMs: Date.now() - startTime,
  };
}

/**
 * Fetches PostgreSQL database table statistics for monitoring and QA auditing.
 */
export async function getPostgresDatabaseStats(): Promise<DatabaseStats> {
  const pool = getPostgresPool();
  const tables = [
    { key: "universitiesCount", table: "universities" },
    { key: "lecturersCount", table: "lecturers" },
    { key: "affiliationsCount", table: "affiliations" },
    { key: "sourcesCount", table: "sources" },
    { key: "crawlJobsCount", table: "crawl_jobs" },
    { key: "crawlLogsCount", table: "crawl_logs" },
  ];

  const stats: Record<string, number> = {
    universitiesCount: 0,
    lecturersCount: 0,
    affiliationsCount: 0,
    sourcesCount: 0,
    crawlJobsCount: 0,
    crawlLogsCount: 0,
  };

  for (const { key, table } of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      stats[key] = parseInt(res.rows[0]?.count || "0", 10);
    } catch {
      stats[key] = 0;
    }
  }

  return stats as unknown as DatabaseStats;
}

/**
 * Fetches all universities from PostgreSQL.
 */
export async function getUniversitiesPostgres(): Promise<University[]> {
  const pool = getPostgresPool();
  const res = await pool.query(`
    SELECT
      id,
      name,
      short_name,
      english_name,
      city,
      region,
      official_website,
      official_domain,
      alternative_names,
      official_code,
      official_code_source,
      official_code_verified_at,
      official_code_status,
      common_abbreviations,
      external_identifiers,
      source_url,
      source_id,
      import_batch_id,
      total_professors,
      rating_average,
      total_reviews
    FROM universities
    ORDER BY total_professors DESC, name ASC
  `);

  return res.rows.map((r) => {
    let aliases: string[] = [];
    if (r.alternative_names) {
      try {
        aliases = typeof r.alternative_names === "string" ? JSON.parse(r.alternative_names) : r.alternative_names;
      } catch {
        aliases = [];
      }
    }
    let commonAbbr: string[] = [];
    if (r.common_abbreviations) {
      try {
        commonAbbr = typeof r.common_abbreviations === "string" ? JSON.parse(r.common_abbreviations) : r.common_abbreviations;
      } catch {
        commonAbbr = [];
      }
    }
    let extIds: Record<string, string> = {};
    if (r.external_identifiers) {
      try {
        extIds = typeof r.external_identifiers === "string" ? JSON.parse(r.external_identifiers) : r.external_identifiers;
      } catch {
        extIds = {};
      }
    }

    return {
      id: r.id,
      name: r.name,
      nameVi: r.name,
      nameEn: r.english_name || r.name,
      shortName: r.short_name || r.id.toUpperCase(),
      englishName: r.english_name,
      city: r.city,
      cityVi: r.city,
      region: r.region,
      regionVi: r.region,
      officialWebsite: r.official_website,
      officialDomain: r.official_domain,
      aliasesVi: aliases,
      aliasesEn: aliases,
      officialCode: r.official_code || null,
      officialCodeSource: r.official_code_source || null,
      officialCodeVerifiedAt: r.official_code_verified_at ? Number(r.official_code_verified_at) : null,
      officialCodeStatus: r.official_code_status || null,
      commonAbbreviations: commonAbbr,
      externalIdentifiers: extIds,
      sourceUrl: r.source_url || null,
      sourceId: r.source_id || null,
      importBatchId: r.import_batch_id || null,
      ratingAverage: r.rating_average !== null && r.rating_average !== undefined ? parseFloat(r.rating_average) : null,
      totalReviews: r.total_reviews !== null && r.total_reviews !== undefined ? parseInt(r.total_reviews, 10) : 0,
      totalProfessors: r.total_professors !== null && r.total_professors !== undefined ? parseInt(r.total_professors, 10) : 0,
    } as University;
  });
}

