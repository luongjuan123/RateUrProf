/**
 * RateProfCuaBan Native SQLite Client (Node 24+)
 *
 * Utilizes Node 24 built-in `node:sqlite` (DatabaseSync) for high-performance,
 * zero-dependency relational querying of verified university lecturers.
 *
 * Features:
 * - Zero full-database transfers to the browser client.
 * - Bounded pagination (default 12, hard maximum 50).
 * - Diacritic-insensitive name and institutional search.
 * - Neutral SVG avatar fallback for missing photos.
 * - Exact table telemetry and database health monitoring.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { normalizeSearchString } from "../search/vietnameseNormalizer";
import { LightweightProfessorSummary } from "./searchIndex";

export interface SqlSearchOptions {
  query?: string;
  name?: string;
  universityId?: string;
  faculty?: string;
  academicRank?: string; // 'GS' | 'PGS'
  minRating?: number;
  page?: number;
  pageSize?: number;
}

export interface SqlSearchResult {
  items: LightweightProfessorSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  executionTimeMs: number;
}

export interface DatabaseStats {
  universitiesCount: number;
  lecturersCount: number;
  affiliationsCount: number;
  sourcesCount: number;
  crawlJobsCount: number;
  crawlLogsCount: number;
}

let dbInstance: DatabaseSync | null = null;

function resolveDatabasePath(): string {
  const cwd = process.cwd();
  const primaryPath = path.join(cwd, "src", "data", "rateprof.db");
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  const altPath = path.resolve(__dirname, "../../../src/data/rateprof.db");
  if (fs.existsSync(altPath)) {
    return altPath;
  }
  return primaryPath;
}

/**
 * Lazily initializes and returns the singleton DatabaseSync instance.
 */
export function getSqliteDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = resolveDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}. Run ingestion first.`);
    }
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    dbInstance.exec("PRAGMA busy_timeout = 10000;");
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_affiliations_lect_prim ON affiliations(lecturer_id, is_primary);");

    const reviewCols = [
      "ALTER TABLE reviews ADD COLUMN user_id TEXT;",
      "ALTER TABLE reviews ADD COLUMN grade_received TEXT;",
      "ALTER TABLE reviews ADD COLUMN attendance_mandatory INTEGER DEFAULT 1;",
      "ALTER TABLE reviews ADD COLUMN tags TEXT;",
      "ALTER TABLE reviews ADD COLUMN is_online INTEGER DEFAULT 0;",
      "ALTER TABLE reviews ADD COLUMN for_credit INTEGER DEFAULT 1;",
      "ALTER TABLE reviews ADD COLUMN textbook_used INTEGER DEFAULT 0;",
    ];
    for (const sql of reviewCols) {
      try {
        dbInstance.exec(sql);
      } catch {
        // Column already exists
      }
    }

    const uniCols = [
      "ALTER TABLE universities ADD COLUMN rating_average REAL;",
      "ALTER TABLE universities ADD COLUMN total_reviews INTEGER DEFAULT 0;",
      "ALTER TABLE universities ADD COLUMN criteria_averages_json TEXT;",
      "ALTER TABLE universities ADD COLUMN official_code TEXT;",
      "ALTER TABLE universities ADD COLUMN official_code_source TEXT DEFAULT 'moet_directory';",
      "ALTER TABLE universities ADD COLUMN official_code_verified_at INTEGER;",
      "ALTER TABLE universities ADD COLUMN official_code_status TEXT DEFAULT 'verified';",
      "ALTER TABLE universities ADD COLUMN common_abbreviations TEXT;",
      "ALTER TABLE universities ADD COLUMN external_identifiers TEXT;",
      "ALTER TABLE universities ADD COLUMN source_url TEXT;",
      "ALTER TABLE universities ADD COLUMN source_id TEXT;",
      "ALTER TABLE universities ADD COLUMN import_batch_id TEXT;",
      "ALTER TABLE institution_aliases ADD COLUMN alias_type TEXT DEFAULT 'abbreviation';",
    ];
    for (const sql of uniCols) {
      try {
        dbInstance.exec(sql);
      } catch {
        // Column already exists
      }
    }

    const userCols = [
      "ALTER TABLE users ADD COLUMN first_name TEXT;",
      "ALTER TABLE users ADD COLUMN last_name TEXT;",
      "ALTER TABLE users ADD COLUMN school TEXT;",
      "ALTER TABLE users ADD COLUMN field_of_study TEXT;",
      "ALTER TABLE users ADD COLUMN expected_graduation_year TEXT;",
    ];
    for (const sql of userCols) {
      try {
        dbInstance.exec(sql);
      } catch {
        // Column already exists
      }
    }

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS school_reviews (
        id TEXT PRIMARY KEY,
        university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        user_display_name TEXT,
        user_id TEXT,
        cohort TEXT,
        reputation REAL NOT NULL,
        location REAL NOT NULL,
        opportunities REAL NOT NULL,
        facilities REAL NOT NULL,
        internet REAL NOT NULL,
        food REAL NOT NULL,
        clubs REAL NOT NULL,
        social REAL NOT NULL,
        happiness REAL NOT NULL,
        safety REAL NOT NULL,
        overall_rating REAL NOT NULL,
        comment TEXT,
        helpful_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS school_review_votes (
        review_id TEXT NOT NULL REFERENCES school_reviews(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (review_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_school_reviews_uni ON school_reviews(university_id);
      CREATE INDEX IF NOT EXISTS idx_school_reviews_created ON school_reviews(created_at);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        salt TEXT,
        display_name TEXT,
        photo_url TEXT,
        role TEXT DEFAULT 'student',
        is_anonymous INTEGER DEFAULT 0,
        cohort TEXT,
        first_name TEXT,
        last_name TEXT,
        school TEXT,
        field_of_study TEXT,
        expected_graduation_year TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_votes (
        review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (review_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        review_id TEXT,
        professor_id TEXT,
        professor_name TEXT,
        review_comment_snippet TEXT,
        reported_by_user_id TEXT,
        reason TEXT,
        details TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS correction_requests (
        id TEXT PRIMARY KEY,
        professor_id TEXT,
        professor_name TEXT,
        requester_email TEXT,
        requester_relation TEXT,
        details TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_saved_professors (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        professor_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, professor_id)
      );

      CREATE INDEX IF NOT EXISTS idx_saved_professors_user ON user_saved_professors(user_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_lecturer_status ON reviews(lecturer_id, status);
      CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_school_reviews_uni_status ON school_reviews(university_id, status);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON user_sessions(token, expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        reason TEXT,
        before_state TEXT,
        after_state TEXT,
        ip_address TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_by TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS duplicate_merge_records (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        canonical_id TEXT NOT NULL,
        merged_ids TEXT NOT NULL,
        merge_plan TEXT NOT NULL,
        executed_by TEXT NOT NULL,
        executed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_outbox (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        template_id TEXT NOT NULL,
        template_vars TEXT NOT NULL,
        locale TEXT DEFAULT 'vi',
        status TEXT DEFAULT 'queued',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at INTEGER,
        provider TEXT,
        provider_message_id TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        sent_at INTEGER,
        delivered_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS email_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT UNIQUE,
        job_id TEXT,
        provider TEXT NOT NULL,
        event_type TEXT NOT NULL,
        recipient TEXT NOT NULL,
        payload_json TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_suppressions (
        email TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        details TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS email_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT,
        email TEXT NOT NULL,
        token_type TEXT NOT NULL,
        metadata_json TEXT,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON admin_audit_logs(actor_email);
      CREATE INDEX IF NOT EXISTS idx_email_outbox_dequeue ON email_outbox(status, next_retry_at, created_at);
      CREATE INDEX IF NOT EXISTS idx_email_outbox_recipient ON email_outbox(recipient);
      CREATE INDEX IF NOT EXISTS idx_email_events_job ON email_events(job_id);
      CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup ON email_tokens(token_type, expires_at);

      -- Inbound Email & Ticket Management
      CREATE TABLE IF NOT EXISTS inbound_tickets (
        id TEXT PRIMARY KEY,
        case_id TEXT UNIQUE NOT NULL,
        resend_email_id TEXT,
        message_id TEXT,
        mailbox TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        sender_name TEXT,
        subject TEXT,
        body_text TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        agent_reply TEXT,
        human_reply TEXT,
        replied_by TEXT,
        replied_at INTEGER,
        messages TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inbound_tickets_mailbox ON inbound_tickets(mailbox);
      CREATE INDEX IF NOT EXISTS idx_inbound_tickets_status ON inbound_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_inbound_tickets_created ON inbound_tickets(created_at DESC);
    `);

    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN last_login_at INTEGER;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN academic_email TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN academic_email_verified INTEGER DEFAULT 0;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN notification_preferences TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN lock_reason TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN locked_at INTEGER;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN locked_by TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN deletion_requested_at INTEGER;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN deletion_scheduled_at INTEGER;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN deletion_reason TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN recovery_token TEXT;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN recovery_token_expires_at INTEGER;");
    } catch {
      // Column already exists
    }
    try {
      dbInstance.exec("ALTER TABLE inbound_tickets ADD COLUMN messages TEXT DEFAULT '[]';");
    } catch {
      // Column already exists
    }

    try {
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS account_appeals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_email TEXT NOT NULL,
          user_display_name TEXT,
          category TEXT DEFAULT 'account_lock',
          reason TEXT NOT NULL,
          supporting_info TEXT,
          status TEXT DEFAULT 'submitted',
          admin_notes TEXT,
          decision_reason TEXT,
          reviewed_by TEXT,
          reviewed_by_email TEXT,
          reviewed_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_sqlite_appeals_user ON account_appeals(user_id);
        CREATE INDEX IF NOT EXISTS idx_sqlite_appeals_status ON account_appeals(status);
        CREATE INDEX IF NOT EXISTS idx_sqlite_appeals_created ON account_appeals(created_at DESC);
      `);
    } catch {
      // Table already exists
    }
  }
  return dbInstance;
}

export const getSqliteDb = getSqliteDatabase;

/**
 * Searches lecturers in SQLite with parameterized queries, bounded pagination,
 * and diacritic-insensitive matching.
 */
export function searchLecturersSql(options: SqlSearchOptions): SqlSearchResult {
  const startTime = Date.now();
  const db = getSqliteDatabase();

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize || 12));
  const offset = (page - 1) * pageSize;

  const whereClauses: string[] = ["1=1"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options.query && options.query.trim()) {
    const norm = normalizeSearchString(options.query.trim());
    const wildcard = `%${norm}%`;
    whereClauses.push(`(
      l.normalized_name LIKE ?
      OR l.name LIKE ?
      OR a.university_short_name LIKE ?
      OR a.university_name LIKE ?
      OR a.faculty LIKE ?
    )`);
    params.push(wildcard, `%${options.query.trim()}%`, `%${options.query.trim()}%`, `%${options.query.trim()}%`, `%${options.query.trim()}%`);
  }

  if (options.name && options.name.trim()) {
    const norm = normalizeSearchString(options.name.trim());
    const wildcard = `%${norm}%`;
    whereClauses.push(`(l.normalized_name LIKE ? OR l.name LIKE ?)`);
    params.push(wildcard, `%${options.name.trim()}%`);
  }

  if (options.universityId && options.universityId !== "all") {
    whereClauses.push("a.university_id = ?");
    params.push(options.universityId);
  }

  if (options.faculty && options.faculty !== "all") {
    whereClauses.push("a.faculty LIKE ?");
    params.push(`%${options.faculty}%`);
  }

  if (options.academicRank && options.academicRank !== "all") {
    whereClauses.push("l.academic_rank = ?");
    params.push(options.academicRank);
  }

  if (typeof options.minRating === "number" && options.minRating > 0) {
    whereClauses.push("l.rating_average >= ?");
    params.push(options.minRating);
  }

  const whereSql = whereClauses.join(" AND ");

  // 1. Total Count Query
  const countSql = `
    SELECT COUNT(*) as total
    FROM lecturers l
    LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
    WHERE ${whereSql};
  `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare(countSql).get(...params) as any;
  const totalCount = countRow ? Number(countRow.total) : 0;

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
    LIMIT ? OFFSET ?;
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(querySql).all(...params, pageSize, offset) as any[];

  const items: LightweightProfessorSummary[] = rows.map((r) => {
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
      ratingAverage: r.rating_average ?? null,
      averageRating: r.rating_average ?? null,
      ratingCount: r.rating_count || 0,
      publishedReviewCount: r.rating_count || 0,
      takeAgainPercent: r.take_again_percent ?? null,
      difficultyScore: r.difficulty_score ?? null,
      difficultyAverage: r.difficulty_score ?? null,
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
 * Fetches database table statistics for monitoring and QA auditing.
 */
export function getDatabaseStats(): DatabaseStats {
  const db = getSqliteDatabase();
  const tables = [
    { key: "universitiesCount", table: "universities" },
    { key: "lecturersCount", table: "lecturers" },
    { key: "affiliationsCount", table: "affiliations" },
    { key: "sourcesCount", table: "sources" },
    { key: "crawlJobsCount", table: "crawl_jobs" },
    { key: "crawlLogsCount", table: "crawl_logs" },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any = {};
  for (const { key, table } of tables) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table};`).get() as any;
      stats[key] = row ? Number(row.count) : 0;
    } catch {
      stats[key] = 0;
    }
  }

  return stats as DatabaseStats;
}
