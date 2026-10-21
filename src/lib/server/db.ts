/**
 * RateUrProfs Unified Relational Database Access Layer
 *
 * Transparently dispatches queries to:
 * 1. Cloud SQL PostgreSQL (Production on GCP Cloud Run when DATABASE_URL is configured).
 * 2. SQLite (Local development, offline verification, and unit tests when DATABASE_URL is unset).
 */

import crypto from "node:crypto";
import { SqlSearchOptions, SqlSearchResult, DatabaseStats, searchLecturersSql, getDatabaseStats as getSqliteStats, getSqliteDatabase } from "./sqliteClient";
import { searchLecturersPostgres, getPostgresDatabaseStats, getPostgresPool } from "./postgresClient";
import { LightweightProfessorSummary } from "./searchIndex";
import { Review, Report, CorrectionRequest, SchoolReview, SchoolCriteriaRatings } from "@/types";

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Searches lecturers with bounded pagination and diacritic-insensitive matching.
 */
export async function searchLecturers(options: SqlSearchOptions): Promise<SqlSearchResult> {
  if (isPostgresConfigured()) {
    try {
      return await searchLecturersPostgres(options);
    } catch (err) {
      console.error("[DB] PostgreSQL search failed, falling back to SQLite if available:", err);
    }
  }

  return searchLecturersSql(options);
}

/**
 * Fetches database table statistics for telemetry and health checks.
 */
export async function getDatabaseStatistics(): Promise<DatabaseStats> {
  if (isPostgresConfigured()) {
    try {
      return await getPostgresDatabaseStats();
    } catch (err) {
      console.warn("[DB] PostgreSQL stats failed, checking SQLite:", err);
    }
  }

  return getSqliteStats();
}

export interface LecturerRatingAggregate {
  ratingCount: number;
  ratingAverage: number | null;
  difficultyScore: number | null;
  takeAgainPercent: number | null;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

let cachedRatingAggregates: {
  map: Map<string, LecturerRatingAggregate>;
  expiresAt: number;
} | null = null;

export function invalidateRatingAggregatesCache(): void {
  cachedRatingAggregates = null;
}

/**
 * Retrieves a real-time map of all lecturers with published reviews and their calculated ratings & distribution.
 */
export async function getRatedLecturersMap(): Promise<Map<string, LecturerRatingAggregate>> {
  const now = Date.now();
  if (cachedRatingAggregates && cachedRatingAggregates.expiresAt > now) {
    return cachedRatingAggregates.map;
  }

  const map = new Map<string, LecturerRatingAggregate>();

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const aggRes = await pool.query(
        `SELECT 
           lecturer_id,
           COUNT(*) as cnt,
           ROUND(AVG(overall_rating)::numeric, 2) as avg_rating,
           ROUND(AVG(difficulty_score)::numeric, 2) as avg_diff,
           ROUND((COUNT(*) FILTER (WHERE take_again = 1) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 0) as take_again
         FROM reviews
         WHERE status = 'published'
         GROUP BY lecturer_id`
      );

      const distRes = await pool.query(
        `SELECT 
           lecturer_id,
           ROUND(overall_rating)::int as star,
           COUNT(*)::int as cnt
         FROM reviews
         WHERE status = 'published'
         GROUP BY lecturer_id, ROUND(overall_rating)`
      );

      for (const row of aggRes.rows) {
        const id = row.lecturer_id;
        map.set(id, {
          ratingCount: parseInt(row.cnt, 10),
          ratingAverage: row.avg_rating !== null ? parseFloat(row.avg_rating) : null,
          difficultyScore: row.avg_diff !== null ? parseFloat(row.avg_diff) : null,
          takeAgainPercent: row.take_again !== null ? parseFloat(row.take_again) : null,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      }

      for (const row of distRes.rows) {
        const id = row.lecturer_id;
        const star = Math.min(5, Math.max(1, Number(row.star))) as 1 | 2 | 3 | 4 | 5;
        const entry = map.get(id);
        if (entry) {
          entry.ratingDistribution[star] = (entry.ratingDistribution[star] || 0) + Number(row.cnt);
        }
      }

      cachedRatingAggregates = { map, expiresAt: now + 30000 };
      return map;
    } catch (err) {
      console.error("[DB] PostgreSQL getRatedLecturersMap failed:", err);
    }
  }

  // SQLite fallback
  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggRows = db.prepare(
      `SELECT 
         lecturer_id,
         COUNT(*) as cnt,
         ROUND(AVG(overall_rating), 2) as avg_rating,
         ROUND(AVG(difficulty_score), 2) as avg_diff,
         ROUND((COUNT(CASE WHEN take_again = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 0) as take_again
       FROM reviews
       WHERE status = 'published'
       GROUP BY lecturer_id`
    ).all() as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distRows = db.prepare(
      `SELECT 
         lecturer_id,
         ROUND(overall_rating) as star,
         COUNT(*) as cnt
       FROM reviews
       WHERE status = 'published'
       GROUP BY lecturer_id, ROUND(overall_rating)`
    ).all() as any[];

    for (const row of aggRows) {
      const id = row.lecturer_id;
      map.set(id, {
        ratingCount: Number(row.cnt),
        ratingAverage: row.avg_rating !== null ? Number(row.avg_rating) : null,
        difficultyScore: row.avg_diff !== null ? Number(row.avg_diff) : null,
        takeAgainPercent: row.take_again !== null ? Number(row.take_again) : null,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    for (const row of distRows) {
      const id = row.lecturer_id;
      const star = Math.min(5, Math.max(1, Math.round(Number(row.star)))) as 1 | 2 | 3 | 4 | 5;
      const entry = map.get(id);
      if (entry) {
        entry.ratingDistribution[star] = (entry.ratingDistribution[star] || 0) + Number(row.cnt);
      }
    }

    cachedRatingAggregates = { map, expiresAt: now + 30000 };
    return map;
  } catch (err) {
    console.error("[DB] SQLite getRatedLecturersMap failed:", err);
    return map;
  }
}

export interface UniversityRatingAggregate {
  totalReviews: number;
  ratingAverage: number | null;
}

let cachedUniversityAggregates: {
  map: Map<string, UniversityRatingAggregate>;
  expiresAt: number;
} | null = null;

export function invalidateUniversityAggregatesCache(): void {
  cachedUniversityAggregates = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const searchIndex = require("./searchIndex");
    if (typeof searchIndex.invalidateServerUniversitiesCache === "function") {
      searchIndex.invalidateServerUniversitiesCache();
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves a real-time map of all universities with published reviews and their calculated ratings.
 */
export async function getRatedUniversitiesMap(): Promise<Map<string, UniversityRatingAggregate>> {
  const now = Date.now();
  if (cachedUniversityAggregates && cachedUniversityAggregates.expiresAt > now) {
    return cachedUniversityAggregates.map;
  }

  const map = new Map<string, UniversityRatingAggregate>();

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const aggRes = await pool.query(
        `SELECT 
           university_id,
           COUNT(*) as cnt,
           ROUND(AVG(overall_rating)::numeric, 2) as avg_rating
         FROM school_reviews
         WHERE status = 'published'
         GROUP BY university_id`
      );

      for (const row of aggRes.rows) {
        map.set(row.university_id, {
          totalReviews: parseInt(row.cnt, 10),
          ratingAverage: row.avg_rating !== null ? parseFloat(row.avg_rating) : null,
        });
      }

      cachedUniversityAggregates = { map, expiresAt: now + 30000 };
      return map;
    } catch (err) {
      console.error("[DB] PostgreSQL getRatedUniversitiesMap failed:", err);
    }
  }

  // SQLite fallback
  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggRows = db.prepare(
      `SELECT 
         university_id,
         COUNT(*) as cnt,
         ROUND(AVG(overall_rating), 2) as avg_rating
       FROM school_reviews
       WHERE status = 'published'
       GROUP BY university_id`
    ).all() as any[];

    for (const row of aggRows) {
      map.set(row.university_id, {
        totalReviews: Number(row.cnt),
        ratingAverage: row.avg_rating !== null ? Number(row.avg_rating) : null,
      });
    }

    cachedUniversityAggregates = { map, expiresAt: now + 30000 };
    return map;
  } catch (err) {
    console.error("[DB] SQLite getRatedUniversitiesMap failed:", err);
    return map;
  }
}

/**
 * Retrieves the calculated rating aggregates and star distribution for a single lecturer.
 * Uses indexed query on reviews(lecturer_id, status) instead of scanning the full table.
 */
export async function getLecturerRatingAggregate(lecturerId: string): Promise<LecturerRatingAggregate | null> {
  if (!lecturerId) return null;

  const now = Date.now();
  if (cachedRatingAggregates && cachedRatingAggregates.expiresAt > now) {
    const fromCache = cachedRatingAggregates.map.get(lecturerId);
    if (fromCache) return fromCache;
  }

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const [aggRes, distRes] = await Promise.all([
        pool.query(
          `SELECT 
             COUNT(*)::int as cnt,
             ROUND(AVG(overall_rating)::numeric, 2) as avg_rating,
             ROUND(AVG(difficulty_score)::numeric, 2) as avg_diff,
             ROUND((COUNT(*) FILTER (WHERE take_again = 1) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 0) as take_again
           FROM reviews
           WHERE lecturer_id = $1 AND status = 'published'`,
          [lecturerId]
        ),
        pool.query(
          `SELECT 
             ROUND(overall_rating)::int as star,
             COUNT(*)::int as cnt
           FROM reviews
           WHERE lecturer_id = $1 AND status = 'published'
           GROUP BY ROUND(overall_rating)`,
          [lecturerId]
        ),
      ]);

      const aggRow = aggRes.rows[0];
      const count = aggRow ? parseInt(aggRow.cnt || "0", 10) : 0;
      if (count === 0) return null;

      const dist: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of distRes.rows) {
        const star = Math.min(5, Math.max(1, Number(r.star))) as 1 | 2 | 3 | 4 | 5;
        dist[star] = Number(r.cnt);
      }

      return {
        ratingCount: count,
        ratingAverage: aggRow.avg_rating !== null ? parseFloat(aggRow.avg_rating) : null,
        difficultyScore: aggRow.avg_diff !== null ? parseFloat(aggRow.avg_diff) : null,
        takeAgainPercent: aggRow.take_again !== null ? parseFloat(aggRow.take_again) : null,
        ratingDistribution: dist,
      };
    } catch (err) {
      console.error("[DB] PostgreSQL getLecturerRatingAggregate failed:", err);
    }
  }

  // SQLite fallback
  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggRow = db.prepare(
      `SELECT 
         COUNT(*) as cnt,
         ROUND(AVG(overall_rating), 2) as avg_rating,
         ROUND(AVG(difficulty_score), 2) as avg_diff,
         ROUND((COUNT(CASE WHEN take_again = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 0) as take_again
       FROM reviews
       WHERE lecturer_id = ? AND status = 'published'`
    ).get(lecturerId) as any;

    const count = aggRow ? Number(aggRow.cnt || 0) : 0;
    if (count === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distRows = db.prepare(
      `SELECT 
         ROUND(overall_rating) as star,
         COUNT(*) as cnt
       FROM reviews
       WHERE lecturer_id = ? AND status = 'published'
       GROUP BY ROUND(overall_rating)`
    ).all(lecturerId) as any[];

    const dist: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of distRows) {
      const star = Math.min(5, Math.max(1, Number(r.star))) as 1 | 2 | 3 | 4 | 5;
      dist[star] = Number(r.cnt);
    }

    return {
      ratingCount: count,
      ratingAverage: aggRow.avg_rating !== null ? Number(aggRow.avg_rating) : null,
      difficultyScore: aggRow.avg_diff !== null ? Number(aggRow.avg_diff) : null,
      takeAgainPercent: aggRow.take_again !== null ? Number(aggRow.take_again) : null,
      ratingDistribution: dist,
    };
  } catch (err) {
    console.error("[DB] SQLite getLecturerRatingAggregate failed:", err);
    return null;
  }
}

/**
 * Retrieves the calculated rating aggregates for a single university.
 * Uses indexed query on school_reviews(university_id, status) instead of scanning the full table.
 */
export async function getUniversityRatingAggregate(universityId: string): Promise<UniversityRatingAggregate | null> {
  if (!universityId) return null;

  const now = Date.now();
  if (cachedUniversityAggregates && cachedUniversityAggregates.expiresAt > now) {
    const fromCache = cachedUniversityAggregates.map.get(universityId);
    if (fromCache) return fromCache;
  }

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const res = await pool.query(
        `SELECT 
           COUNT(*)::int as cnt,
           ROUND(AVG(overall_rating)::numeric, 2) as avg_rating
         FROM school_reviews
         WHERE university_id = $1 AND status = 'published'`,
        [universityId]
      );
      const row = res.rows[0];
      const count = row ? parseInt(row.cnt || "0", 10) : 0;
      if (count === 0) return null;
      return {
        totalReviews: count,
        ratingAverage: row.avg_rating !== null ? parseFloat(row.avg_rating) : null,
      };
    } catch (err) {
      console.error("[DB] PostgreSQL getUniversityRatingAggregate failed:", err);
    }
  }

  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = db.prepare(
      `SELECT 
         COUNT(*) as cnt,
         ROUND(AVG(overall_rating), 2) as avg_rating
       FROM school_reviews
       WHERE university_id = ? AND status = 'published'`
    ).get(universityId) as any;
    const count = row ? Number(row.cnt || 0) : 0;
    if (count === 0) return null;
    return {
      totalReviews: count,
      ratingAverage: row.avg_rating !== null ? Number(row.avg_rating) : null,
    };
  } catch (err) {
    console.error("[DB] SQLite getUniversityRatingAggregate failed:", err);
    return null;
  }
}

/**
 * Retrieves a single lecturer by ID with live aggregates and rating distribution.
 */
export async function getLecturerById(id: string): Promise<LightweightProfessorSummary | null> {
  const agg = await getLecturerRatingAggregate(id);

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const res = await pool.query(
        `SELECT l.*, a.university_id, a.university_name, a.university_short_name, a.faculty, a.department
         FROM lecturers l
         LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
         WHERE l.id = $1 LIMIT 1`,
        [id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        const cleanName = (r.name || "").normalize("NFC");
        const ratingAvg = agg ? agg.ratingAverage : (r.rating_average !== null ? parseFloat(r.rating_average) : null);
        const ratingCnt = agg ? agg.ratingCount : (r.rating_count || 0);
        const diffScore = agg ? agg.difficultyScore : (r.difficulty_score !== null ? parseFloat(r.difficulty_score) : null);
        const takeAgain = agg ? agg.takeAgainPercent : (r.take_again_percent ?? null);
        const dist = agg ? agg.ratingDistribution : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        const rawAvatar = r.avatar || null;
        const isRealPhoto = typeof rawAvatar === "string" &&
          rawAvatar.trim().length > 0 &&
          !rawAvatar.startsWith("data:") &&
          !rawAvatar.toLowerCase().includes("no-image") &&
          (rawAvatar.startsWith("http://") || rawAvatar.startsWith("https://") || rawAvatar.startsWith("/"));
        const photoUrl = isRealPhoto ? rawAvatar : null;
        const photoStatus = isRealPhoto ? "verified_photo" : "default_avatar";

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
          avatar: photoUrl,
          photoUrl: photoUrl,
          photoStatus: photoStatus,
          ratingAverage: ratingAvg,
          averageRating: ratingAvg,
          ratingCount: ratingCnt,
          publishedReviewCount: ratingCnt,
          takeAgainPercent: takeAgain,
          difficultyScore: diffScore,
          difficultyAverage: diffScore,
          ratingDistribution: dist,
          verificationStatus: r.verification_status || "verified",
        };
      }
      return null;
    } catch (err) {
      console.error("[DB] PostgreSQL getLecturerById failed:", err);
    }
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db
    .prepare(
      `SELECT l.*, a.university_id, a.university_name, a.university_short_name, a.faculty, a.department
       FROM lecturers l
       LEFT JOIN affiliations a ON l.id = a.lecturer_id AND a.is_primary = 1
       WHERE l.id = ? LIMIT 1`
    )
    .get(id) as any;

  if (!row) return null;

  const cleanName = (row.name || "").normalize("NFC");
  const ratingAvg = agg ? agg.ratingAverage : (row.rating_average ?? null);
  const ratingCnt = agg ? agg.ratingCount : (row.rating_count || 0);
  const diffScore = agg ? agg.difficultyScore : (row.difficulty_score ?? null);
  const takeAgain = agg ? agg.takeAgainPercent : (row.take_again_percent ?? null);
  const dist = agg ? agg.ratingDistribution : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const sqliteRawAvatar = row.avatar || null;
  const isSqliteRealPhoto = typeof sqliteRawAvatar === "string" &&
    sqliteRawAvatar.trim().length > 0 &&
    !sqliteRawAvatar.startsWith("data:") &&
    !sqliteRawAvatar.toLowerCase().includes("no-image") &&
    (sqliteRawAvatar.startsWith("http://") || sqliteRawAvatar.startsWith("https://") || sqliteRawAvatar.startsWith("/"));
  const sqlitePhotoUrl = isSqliteRealPhoto ? sqliteRawAvatar : null;
  const sqlitePhotoStatus = isSqliteRealPhoto ? "verified_photo" : "default_avatar";

  return {
    id: row.id,
    name: cleanName,
    fullName: cleanName,
    universityId: row.university_id,
    universityName: row.university_name,
    universityShortName: row.university_short_name,
    faculty: row.faculty,
    department: row.department,
    title: row.title,
    academicTitle: row.academic_title,
    academicRank: row.academic_rank,
    position: row.position,
    avatar: sqlitePhotoUrl,
    photoUrl: sqlitePhotoUrl,
    photoStatus: sqlitePhotoStatus,
    ratingAverage: ratingAvg,
    averageRating: ratingAvg,
    ratingCount: ratingCnt,
    publishedReviewCount: ratingCnt,
    takeAgainPercent: takeAgain,
    difficultyScore: diffScore,
    difficultyAverage: diffScore,
    ratingDistribution: dist,
    verificationStatus: row.verification_status || "verified",
  };
}

/**
 * Retrieves paginated reviews for a lecturer.
 */
export async function getLecturerReviews(
  lecturerId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ reviews: Review[]; total: number }> {
  const boundedPage = Math.max(1, page);
  const boundedSize = Math.min(50, Math.max(1, pageSize));
  const offset = (boundedPage - 1) * boundedSize;

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const countRes = await pool.query(
        "SELECT COUNT(*) as total FROM reviews WHERE lecturer_id = $1 AND status = 'published'",
        [lecturerId]
      );
      const total = parseInt(countRes.rows[0]?.total || "0", 10);

      const rowsRes = await pool.query(
        `SELECT * FROM reviews
         WHERE lecturer_id = $1 AND status = 'published'
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [lecturerId, boundedSize, offset]
      );

      const reviews: Review[] = rowsRes.rows.map((r) => {
        const rating = parseFloat(r.overall_rating || "0");
        const diff = r.difficulty_score ? parseFloat(r.difficulty_score) : 3;
        return {
          id: r.id,
          professorId: r.lecturer_id,
          professorName: r.professor_name || "",
          lecturerId: r.lecturer_id,
          universityId: r.university_id,
          userDisplayName: r.user_display_name || "Sinh viên",
          userId: r.user_id || "anonymous",
          courseName: r.course_name || "",
          gradeReceived: r.grade_received || undefined,
          isOnline: Boolean(r.is_online),
          forCredit: r.for_credit !== null && r.for_credit !== undefined ? Boolean(r.for_credit) : true,
          textbookUsed: Boolean(r.textbook_used),
          overallRating: rating,
          attendanceMandatory: Boolean(r.attendance_mandatory),
          takeAgain: Boolean(r.take_again),
          criteria: {
            teachingQuality: rating,
            clarity: rating,
            gradingFairness: rating,
            communication: rating,
            difficulty: diff,
          },
          comment: r.comment || "",
          tags: (() => {
            if (!r.tags) return [];
            try {
              const parsed = JSON.parse(r.tags);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return String(r.tags).split(",").map((s: string) => s.trim()).filter(Boolean);
            }
          })(),
          helpfulCount: r.helpful_count || 0,
          helpfulUserIds: [],
          createdAt: Number(r.created_at || Date.now()),
          status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
        };
      });

      return { reviews, total };
    } catch (err) {
      console.error("[DB] PostgreSQL getLecturerReviews failed:", err);
    }
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db
    .prepare("SELECT COUNT(*) as total FROM reviews WHERE lecturer_id = ? AND status = 'published'")
    .get(lecturerId) as any;
  const total = countRow ? Number(countRow.total) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db
    .prepare(
      `SELECT * FROM reviews
       WHERE lecturer_id = ? AND status = 'published'
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(lecturerId, boundedSize, offset) as any[];

  const reviews: Review[] = rows.map((r) => {
    const rating = Number(r.overall_rating || 0);
    const diff = r.difficulty_score ? Number(r.difficulty_score) : 3;
    return {
      id: r.id,
      professorId: r.lecturer_id,
      professorName: r.professor_name || "",
      lecturerId: r.lecturer_id,
      universityId: r.university_id,
      userDisplayName: r.user_display_name || "Sinh viên",
      userId: r.user_id || "anonymous",
      courseName: r.course_name || "",
      gradeReceived: r.grade_received || undefined,
      isOnline: Boolean(r.is_online),
      forCredit: r.for_credit !== null && r.for_credit !== undefined ? Boolean(r.for_credit) : true,
      textbookUsed: Boolean(r.textbook_used),
      overallRating: rating,
      attendanceMandatory: Boolean(r.attendance_mandatory),
      takeAgain: Boolean(r.take_again),
      criteria: {
        teachingQuality: rating,
        clarity: rating,
        gradingFairness: rating,
        communication: rating,
        difficulty: diff,
      },
      comment: r.comment || "",
      tags: (() => {
        if (!r.tags) return [];
        try {
          const parsed = JSON.parse(r.tags);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return String(r.tags).split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      })(),
      helpfulCount: r.helpful_count || 0,
      helpfulUserIds: [],
      createdAt: Number(r.created_at || Date.now()),
      status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    };
  });

  return { reviews, total };
}

/**
 * Checks if an authenticated student has already rated a specific lecturer.
 */
export async function getExistingReviewByUserAndLecturer(
  userId: string,
  lecturerId: string
): Promise<Review | null> {
  if (!userId || userId === "anonymous" || !lecturerId) return null;

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT r.*, l.name as professor_name FROM reviews r
       LEFT JOIN lecturers l ON r.lecturer_id = l.id
       WHERE r.user_id = $1 AND r.lecturer_id = $2 AND r.status != 'hidden'
       ORDER BY r.created_at DESC LIMIT 1`,
      [userId, lecturerId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    const rating = Number(r.overall_rating || 0);
    const diff = r.difficulty_score ? Number(r.difficulty_score) : 3;
    let tagsArr: string[] = [];
    try {
      tagsArr = JSON.parse(r.tags || "[]");
    } catch {
      tagsArr = [];
    }
    return {
      id: r.id,
      professorId: r.lecturer_id,
      professorName: r.professor_name || "",
      lecturerId: r.lecturer_id,
      universityId: r.university_id,
      userDisplayName: r.user_display_name || "Sinh viên",
      userId: r.user_id,
      courseName: r.course_name || "",
      isOnline: Boolean(r.is_online),
      forCredit: Boolean(r.for_credit),
      textbookUsed: Boolean(r.textbook_used),
      overallRating: rating,
      gradeReceived: r.grade_received || "",
      attendanceMandatory: Boolean(r.attendance_mandatory),
      takeAgain: Boolean(r.take_again),
      criteria: {
        teachingQuality: rating,
        clarity: rating,
        gradingFairness: rating,
        communication: rating,
        difficulty: diff,
      },
      comment: r.comment || "",
      tags: tagsArr,
      helpfulCount: r.helpful_count || 0,
      helpfulUserIds: [],
      createdAt: Number(r.created_at || Date.now()),
      status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    };
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = db.prepare(
    `SELECT r.*, l.name as professor_name FROM reviews r
     LEFT JOIN lecturers l ON r.lecturer_id = l.id
     WHERE r.user_id = ? AND r.lecturer_id = ? AND r.status != 'hidden'
     ORDER BY r.created_at DESC LIMIT 1`
  ).get(userId, lecturerId) as any;

  if (!r) return null;
  const rating = Number(r.overall_rating || 0);
  const diff = r.difficulty_score ? Number(r.difficulty_score) : 3;
  let tagsArr: string[] = [];
  try {
    tagsArr = JSON.parse(r.tags || "[]");
  } catch {
    tagsArr = [];
  }
  return {
    id: r.id,
    professorId: r.lecturer_id,
    professorName: r.professor_name || "",
    lecturerId: r.lecturer_id,
    universityId: r.university_id,
    userDisplayName: r.user_display_name || "Sinh viên",
    userId: r.user_id,
    courseName: r.course_name || "",
    isOnline: Boolean(r.is_online),
    forCredit: Boolean(r.for_credit),
    textbookUsed: Boolean(r.textbook_used),
    overallRating: rating,
    gradeReceived: r.grade_received || "",
    attendanceMandatory: Boolean(r.attendance_mandatory),
    takeAgain: Boolean(r.take_again),
    criteria: {
      teachingQuality: rating,
      clarity: rating,
      gradingFairness: rating,
      communication: rating,
      difficulty: diff,
    },
    comment: r.comment || "",
    tags: tagsArr,
    helpfulCount: r.helpful_count || 0,
    helpfulUserIds: [],
    createdAt: Number(r.created_at || Date.now()),
    status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
  };
}

/**
 * Updates an existing review and recalculates lecturer rating aggregates.
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  updateData: {
    courseName?: string;
    overallRating: number;
    difficultyScore?: number;
    takeAgain?: number;
    gradeReceived?: string;
    attendanceMandatory?: number;
    tags?: string[] | string;
    isOnline?: number;
    forCredit?: number;
    textbookUsed?: number;
    comment?: string;
    userDisplayName?: string;
  }
): Promise<boolean> {
  const tagsStr = Array.isArray(updateData.tags) ? JSON.stringify(updateData.tags) : (updateData.tags || "[]");

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const findRes = await pool.query("SELECT lecturer_id, user_id FROM reviews WHERE id = $1", [reviewId]);
    if (findRes.rows.length === 0) return false;
    const existing = findRes.rows[0];
    if (userId && existing.user_id !== userId && existing.user_id !== "anonymous") {
      return false;
    }
    const lecturerId = existing.lecturer_id;

    await pool.query(
      `UPDATE reviews SET
        course_name = $1,
        overall_rating = $2,
        difficulty_score = $3,
        take_again = $4,
        grade_received = $5,
        attendance_mandatory = $6,
        tags = $7,
        is_online = $8,
        for_credit = $9,
        textbook_used = $10,
        comment = $11,
        user_display_name = COALESCE($12, user_display_name)
      WHERE id = $13`,
      [
        updateData.courseName || "",
        updateData.overallRating,
        updateData.difficultyScore || 3,
        updateData.takeAgain ? 1 : 0,
        updateData.gradeReceived || null,
        updateData.attendanceMandatory !== undefined ? updateData.attendanceMandatory : 1,
        tagsStr,
        updateData.isOnline ? 1 : 0,
        updateData.forCredit !== undefined ? updateData.forCredit : 1,
        updateData.textbookUsed ? 1 : 0,
        updateData.comment || "",
        updateData.userDisplayName || null,
        reviewId,
      ]
    );

    if (lecturerId) {
      await pool.query(
        `UPDATE lecturers
         SET rating_count = (SELECT COUNT(*) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             difficulty_score = (SELECT ROUND(AVG(difficulty_score)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             take_again_percent = (SELECT ROUND((COUNT(*) FILTER (WHERE take_again = 1) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 0) FROM reviews WHERE lecturer_id = $1 AND status = 'published')
         WHERE id = $1`,
        [lecturerId]
      );
    }
    invalidateRatingAggregatesCache();
    return true;
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT lecturer_id, user_id FROM reviews WHERE id = ?").get(reviewId) as any;
  if (!row) return false;
  if (userId && row.user_id !== userId && row.user_id !== "anonymous") {
    return false;
  }
  const lecturerId = row.lecturer_id;

  db.prepare(`
    UPDATE reviews SET
      course_name = ?,
      overall_rating = ?,
      difficulty_score = ?,
      take_again = ?,
      grade_received = ?,
      attendance_mandatory = ?,
      tags = ?,
      is_online = ?,
      for_credit = ?,
      textbook_used = ?,
      comment = ?,
      user_display_name = COALESCE(?, user_display_name)
    WHERE id = ?
  `).run(
    updateData.courseName || "",
    updateData.overallRating,
    updateData.difficultyScore || 3,
    updateData.takeAgain ? 1 : 0,
    updateData.gradeReceived || null,
    updateData.attendanceMandatory !== undefined ? updateData.attendanceMandatory : 1,
    tagsStr,
    updateData.isOnline ? 1 : 0,
    updateData.forCredit !== undefined ? updateData.forCredit : 1,
    updateData.textbookUsed ? 1 : 0,
    updateData.comment || "",
    updateData.userDisplayName || null,
    reviewId
  );

  if (lecturerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = db.prepare(
      `SELECT COUNT(*) as count, AVG(overall_rating) as avg_rating, AVG(difficulty_score) as avg_diff,
              SUM(CASE WHEN take_again = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as take_again_pct
       FROM reviews WHERE lecturer_id = ? AND status = 'published'`
    ).get(lecturerId) as any;

    db.prepare(
      `UPDATE lecturers SET
         rating_count = ?,
         rating_average = ?,
         difficulty_score = ?,
         take_again_percent = ?
       WHERE id = ?`
    ).run(stats?.count || 0, stats?.avg_rating || null, stats?.avg_diff || null, stats?.take_again_pct || null, lecturerId);
  }

  invalidateRatingAggregatesCache();
  return true;
}

/**
 * Inserts a new review and recalculates lecturer rating aggregates in PostgreSQL / SQLite.
 * If user is authenticated and already reviewed this lecturer, updates existing review.
 */
export async function insertReview(review: {
  id: string;
  lecturerId: string;
  universityId?: string;
  userDisplayName?: string;
  userId?: string;
  courseName?: string;
  overallRating: number;
  difficultyScore?: number;
  takeAgain?: number;
  gradeReceived?: string;
  attendanceMandatory?: number;
  tags?: string[] | string;
  isOnline?: number;
  forCredit?: number;
  textbookUsed?: number;
  comment?: string;
}): Promise<void> {
  // Prevent duplicate reviews for authenticated users
  if (review.userId && review.userId !== "anonymous") {
    const existing = await getExistingReviewByUserAndLecturer(review.userId, review.lecturerId);
    if (existing) {
      await updateReview(existing.id, review.userId, {
        courseName: review.courseName,
        overallRating: review.overallRating,
        difficultyScore: review.difficultyScore,
        takeAgain: review.takeAgain,
        gradeReceived: review.gradeReceived,
        attendanceMandatory: review.attendanceMandatory,
        tags: review.tags,
        isOnline: review.isOnline,
        forCredit: review.forCredit,
        textbookUsed: review.textbookUsed,
        comment: review.comment,
        userDisplayName: review.userDisplayName,
      });
      return;
    }
  }

  const createdAt = Date.now();
  const tagsStr = Array.isArray(review.tags) ? JSON.stringify(review.tags) : (review.tags || "[]");

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO reviews (
        id, lecturer_id, university_id, user_display_name, user_id,
        course_name, grade_received, attendance_mandatory, tags,
        is_online, for_credit, textbook_used,
        overall_rating, difficulty_score, take_again, comment, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published', $17)`,
      [
        review.id,
        review.lecturerId,
        review.universityId || null,
        review.userDisplayName || "Sinh viên",
        review.userId || "anonymous",
        review.courseName || "",
        review.gradeReceived || null,
        review.attendanceMandatory !== undefined ? review.attendanceMandatory : 1,
        tagsStr,
        review.isOnline ? 1 : 0,
        review.forCredit !== undefined ? review.forCredit : 1,
        review.textbookUsed ? 1 : 0,
        review.overallRating,
        review.difficultyScore || 3,
        review.takeAgain ? 1 : 0,
        review.comment || "",
        createdAt,
      ]
    );

    await pool.query(
      `UPDATE lecturers
       SET rating_count = (SELECT COUNT(*) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
           rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
           difficulty_score = (SELECT ROUND(AVG(difficulty_score)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
           take_again_percent = (SELECT ROUND((COUNT(*) FILTER (WHERE take_again = 1) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 0) FROM reviews WHERE lecturer_id = $1 AND status = 'published')
       WHERE id = $1`,
      [review.lecturerId]
    );
    invalidateRatingAggregatesCache();
    return;
  }

  // SQLite fallback
  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO reviews (
      id, lecturer_id, university_id, user_display_name, user_id,
      course_name, grade_received, attendance_mandatory, tags,
      is_online, for_credit, textbook_used,
      overall_rating, difficulty_score, take_again, comment, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`
  ).run(
    review.id,
    review.lecturerId,
    review.universityId || null,
    review.userDisplayName || "Sinh viên",
    review.userId || "anonymous",
    review.courseName || "",
    review.gradeReceived || null,
    review.attendanceMandatory !== undefined ? review.attendanceMandatory : 1,
    tagsStr,
    review.isOnline ? 1 : 0,
    review.forCredit !== undefined ? review.forCredit : 1,
    review.textbookUsed ? 1 : 0,
    review.overallRating,
    review.difficultyScore || 3,
    review.takeAgain ? 1 : 0,
    review.comment || "",
    createdAt
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = db.prepare(
    `SELECT COUNT(*) as count, AVG(overall_rating) as avg_rating, AVG(difficulty_score) as avg_diff,
            SUM(CASE WHEN take_again = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as take_again_pct
     FROM reviews WHERE lecturer_id = ? AND status = 'published'`
  ).get(review.lecturerId) as any;

  db.prepare(
    `UPDATE lecturers SET
       rating_count = ?,
       rating_average = ?,
       difficulty_score = ?,
       take_again_percent = ?
     WHERE id = ?`
  ).run(stats?.count || 0, stats?.avg_rating || null, stats?.avg_diff || null, stats?.take_again_pct || null, review.lecturerId);

  invalidateRatingAggregatesCache();
}

// ---------------------------------------------------------------------------
// Native GCP User & Session Storage (Cloud SQL PostgreSQL + SQLite fallback)
// ---------------------------------------------------------------------------

export type AccountStatus = "active" | "locked" | "suspended" | "pending_deletion" | "deleted";

export interface DbUserRecord {
  id: string;
  email: string | null;
  password_hash: string | null;
  salt: string | null;
  display_name: string | null;
  photo_url: string | null;
  role: 'student' | 'admin' | 'moderator' | 'super_admin' | 'support' | 'security';
  status?: AccountStatus;
  lock_reason?: string | null;
  locked_at?: number | null;
  locked_by?: string | null;
  deletion_requested_at?: number | null;
  deletion_scheduled_at?: number | null;
  deletion_reason?: string | null;
  recovery_token?: string | null;
  recovery_token_expires_at?: number | null;
  last_login_at?: number | null;
  is_anonymous: boolean;
  cohort: string | null;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  field_of_study: string | null;
  expected_graduation_year: string | null;
  created_at: number;
  updated_at?: number | null;
}

export type AppealStatus = "submitted" | "under_review" | "accepted" | "rejected" | "closed";

export interface DbAccountAppeal {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name?: string | null;
  category: string;
  reason: string;
  supporting_info?: string | null;
  status: AppealStatus;
  admin_notes?: string | null;
  decision_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_by_email?: string | null;
  reviewed_at?: number | null;
  created_at: number;
  updated_at?: number | null;

  // CamelCase aliases for frontend and API compatibility
  userId?: string;
  userEmail?: string;
  userDisplayName?: string | null;
  supportingInfo?: string | null;
  adminNotes?: string | null;
  decisionReason?: string | null;
  reviewerNotes?: string | null;
  reviewedBy?: string | null;
  reviewedByEmail?: string | null;
  reviewedAt?: number | null;
  createdAt?: number;
  updatedAt?: number | null;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbUserRow(r: any): DbUserRecord {
  return {
    id: r.id,
    email: r.email || null,
    password_hash: r.password_hash || null,
    salt: r.salt || null,
    display_name: r.display_name || null,
    photo_url: r.photo_url || null,
    role: r.role || 'student',
    status: (r.status as AccountStatus) || 'active',
    lock_reason: r.lock_reason || null,
    locked_at: r.locked_at ? Number(r.locked_at) : null,
    locked_by: r.locked_by || null,
    deletion_requested_at: r.deletion_requested_at ? Number(r.deletion_requested_at) : null,
    deletion_scheduled_at: r.deletion_scheduled_at ? Number(r.deletion_scheduled_at) : null,
    deletion_reason: r.deletion_reason || null,
    recovery_token: r.recovery_token || null,
    recovery_token_expires_at: r.recovery_token_expires_at ? Number(r.recovery_token_expires_at) : null,
    last_login_at: r.last_login_at ? Number(r.last_login_at) : null,
    is_anonymous: Boolean(r.is_anonymous),
    cohort: r.cohort || null,
    first_name: r.first_name || null,
    last_name: r.last_name || null,
    school: r.school || null,
    field_of_study: r.field_of_study || null,
    expected_graduation_year: r.expected_graduation_year || null,
    created_at: Number(r.created_at),
    updated_at: r.updated_at ? Number(r.updated_at) : null,
  };
}

function parseAppealTimestamp(val: any): number {
  if (!val) return Date.now();
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) return num;
    const parsed = new Date(val).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (val instanceof Date) return val.getTime();
  return Date.now();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbAppealRow(r: any): DbAccountAppeal {
  const createdAt = parseAppealTimestamp(r.created_at);
  const updatedAt = r.updated_at ? parseAppealTimestamp(r.updated_at) : null;
  const reviewedAt = r.reviewed_at ? parseAppealTimestamp(r.reviewed_at) : null;
  const userDisplayName = r.user_display_name || null;
  const userEmail = r.user_email || "";
  const supportingInfo = r.supporting_info || null;
  const adminNotes = r.admin_notes || null;
  const decisionReason = r.decision_reason || null;
  const reviewedBy = r.reviewed_by || null;
  const reviewedByEmail = r.reviewed_by_email || null;
  const status = (r.status as AppealStatus) || "submitted";

  return {
    id: r.id,
    user_id: r.user_id,
    user_email: userEmail,
    user_display_name: userDisplayName,
    category: r.category,
    reason: r.reason,
    supporting_info: supportingInfo,
    status,
    admin_notes: adminNotes,
    decision_reason: decisionReason,
    reviewed_by: reviewedBy,
    reviewed_by_email: reviewedByEmail,
    reviewed_at: reviewedAt,
    created_at: createdAt,
    updated_at: updatedAt,

    // CamelCase aliases
    userId: r.user_id,
    userEmail,
    userDisplayName,
    supportingInfo,
    adminNotes,
    decisionReason,
    reviewerNotes: decisionReason || adminNotes,
    reviewedBy,
    reviewedByEmail,
    reviewedAt,
    createdAt,
    updatedAt,
  };
}

export async function createDbUser(user: {
  id: string;
  email?: string | null;
  passwordHash?: string | null;
  salt?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
  role?: string;
  isAnonymous?: boolean;
  cohort?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  school?: string | null;
  fieldOfStudy?: string | null;
  expectedGraduationYear?: string | null;
  createdAt?: number;
}): Promise<DbUserRecord> {
  const createdAt = user.createdAt || Date.now();
  // STRICT CONSTRAINT: Admin console & permissions belong ONLY to dungpubgame@gmail.com
  const isTargetAdmin = user.email ? user.email.trim().toLowerCase() === "dungpubgame@gmail.com" : false;
  const role: 'student' | 'admin' | 'moderator' = isTargetAdmin ? 'admin' : 'student';
  const isAnonymous = Boolean(user.isAnonymous);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `INSERT INTO users (id, email, password_hash, salt, display_name, photo_url, role, is_anonymous, cohort, first_name, last_name, school, field_of_study, expected_graduation_year, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
         first_name = COALESCE(EXCLUDED.first_name, users.first_name),
         last_name = COALESCE(EXCLUDED.last_name, users.last_name),
         school = COALESCE(EXCLUDED.school, users.school),
         field_of_study = COALESCE(EXCLUDED.field_of_study, users.field_of_study),
         expected_graduation_year = COALESCE(EXCLUDED.expected_graduation_year, users.expected_graduation_year),
         role = CASE WHEN LOWER(COALESCE(EXCLUDED.email, users.email)) = 'dungpubgame@gmail.com' THEN 'admin' ELSE 'student' END,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        user.id,
        user.email || null,
        user.passwordHash || null,
        user.salt || null,
        user.displayName || null,
        user.photoUrl || null,
        role,
        isAnonymous,
        user.cohort || null,
        user.firstName || null,
        user.lastName || null,
        user.school || null,
        user.fieldOfStudy || null,
        user.expectedGraduationYear || null,
        createdAt,
        Date.now(),
      ]
    );

    return mapDbUserRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, salt, display_name, photo_url, role, is_anonymous, cohort, first_name, last_name, school, field_of_study, expected_graduation_year, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       email = COALESCE(excluded.email, users.email),
       display_name = COALESCE(excluded.display_name, users.display_name),
       photo_url = COALESCE(excluded.photo_url, users.photo_url),
       first_name = COALESCE(excluded.first_name, users.first_name),
       last_name = COALESCE(excluded.last_name, users.last_name),
       school = COALESCE(excluded.school, users.school),
       field_of_study = COALESCE(excluded.field_of_study, users.field_of_study),
       expected_graduation_year = COALESCE(excluded.expected_graduation_year, users.expected_graduation_year),
       role = CASE WHEN LOWER(COALESCE(excluded.email, users.email)) = 'dungpubgame@gmail.com' THEN 'admin' ELSE 'student' END,
       updated_at = excluded.updated_at`
  ).run(
    user.id,
    user.email || null,
    user.passwordHash || null,
    user.salt || null,
    user.displayName || null,
    user.photoUrl || null,
    role,
    isAnonymous ? 1 : 0,
    user.cohort || null,
    user.firstName || null,
    user.lastName || null,
    user.school || null,
    user.fieldOfStudy || null,
    user.expectedGraduationYear || null,
    createdAt,
    Date.now()
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
  return mapDbUserRow(row);
}

export async function upsertGoogleUserRecord(data: {
  id: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
}): Promise<DbUserRecord> {
  return createDbUser({
    id: data.id,
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName || null,
    photoUrl: data.photoUrl || null,
    isAnonymous: false,
  });
}

export async function getDbUserByEmail(email: string): Promise<DbUserRecord | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email.trim()]);
    if (res.rows.length === 0) return null;
    return mapDbUserRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1").get(email.trim()) as any;
  if (!row) return null;
  return mapDbUserRow(row);
}

export async function getDbUserById(id: string): Promise<DbUserRecord | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) return null;
    return mapDbUserRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id) as any;
  if (!row) return null;
  return mapDbUserRow(row);
}

export async function createDbSession(token: string, userId: string, expiresAt: number): Promise<void> {
  const createdAt = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO user_sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)`,
      [token, userId, expiresAt, createdAt]
    );
    return;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO user_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).run(token, userId, expiresAt, createdAt);
}

export async function getDbSessionUser(token: string): Promise<DbUserRecord | null> {
  const now = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT u.* FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > $2
       LIMIT 1`,
      [token, now]
    );
    if (res.rows.length === 0) return null;
    return mapDbUserRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(
    `SELECT u.* FROM user_sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?
     LIMIT 1`
  ).get(token, now) as any;
  if (!row) return null;
  return mapDbUserRow(row);
}

// ---------------------------------------------------------------------------
// Account Appeals & Lifecycle (Locking, Deletion, Recovery)
// ---------------------------------------------------------------------------

export async function createAccountAppeal(data: {
  userId: string;
  userEmail: string;
  userDisplayName?: string | null;
  category: string;
  reason: string;
  supportingInfo?: string | null;
}): Promise<DbAccountAppeal> {
  const id = `appeal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = Date.now();
  const status: AppealStatus = "submitted";

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `INSERT INTO account_appeals (
        id, user_id, user_email, user_display_name, category, reason, supporting_info, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        data.userId,
        data.userEmail.trim().toLowerCase(),
        data.userDisplayName || null,
        data.category.trim(),
        data.reason.trim(),
        data.supportingInfo?.trim() || null,
        status,
        now,
        now,
      ]
    );
    return mapDbAppealRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO account_appeals (
      id, user_id, user_email, user_display_name, category, reason, supporting_info, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.userId,
    data.userEmail.trim().toLowerCase(),
    data.userDisplayName || null,
    data.category.trim(),
    data.reason.trim(),
    data.supportingInfo?.trim() || null,
    status,
    now,
    now
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT * FROM account_appeals WHERE id = ?").get(id) as any;
  return mapDbAppealRow(row);
}

export async function getAccountAppealByUserId(userId: string): Promise<DbAccountAppeal | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM account_appeals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
    return mapDbAppealRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(
    `SELECT * FROM account_appeals WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  ).get(userId) as any;
  if (!row) return null;
  return mapDbAppealRow(row);
}

export async function getAccountAppealById(appealId: string): Promise<DbAccountAppeal | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM account_appeals WHERE id = $1 LIMIT 1`,
      [appealId]
    );
    if (res.rows.length === 0) return null;
    return mapDbAppealRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(`SELECT * FROM account_appeals WHERE id = ? LIMIT 1`).get(appealId) as any;
  if (!row) return null;
  return mapDbAppealRow(row);
}

export async function getAccountAppealsList(options: {
  status?: AppealStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  items: DbAccountAppeal[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
  const offset = (page - 1) * pageSize;

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const where: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let pIdx = 1;

    if (options.status && options.status !== "all") {
      let mappedStatus = options.status as string;
      if (mappedStatus === "pending") mappedStatus = "submitted";
      else if (mappedStatus === "approved") mappedStatus = "accepted";
      where.push(`status = $${pIdx++}`);
      params.push(mappedStatus);
    }
    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      where.push(`(LOWER(user_email) LIKE $${pIdx} OR LOWER(COALESCE(user_display_name, '')) LIKE $${pIdx} OR LOWER(reason) LIKE $${pIdx})`);
      params.push(q);
      pIdx++;
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const countRes = await pool.query(`SELECT COUNT(*) as c FROM account_appeals ${whereSql}`, params);
    const totalCount = parseInt(countRes.rows[0]?.c || "0", 10);

    const listRes = await pool.query(
      `SELECT * FROM account_appeals ${whereSql} ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, pageSize, offset]
    );

    return {
      items: listRes.rows.map(mapDbAppealRow),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  const db = getSqliteDatabase();
  const where: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options.status && options.status !== "all") {
    let mappedStatus = options.status as string;
    if (mappedStatus === "pending") mappedStatus = "submitted";
    else if (mappedStatus === "approved") mappedStatus = "accepted";
    where.push(`status = ?`);
    params.push(mappedStatus);
  }
  if (options.search && options.search.trim()) {
    const q = `%${options.search.trim().toLowerCase()}%`;
    where.push(`(LOWER(user_email) LIKE ? OR LOWER(COALESCE(user_display_name, '')) LIKE ? OR LOWER(reason) LIKE ?)`);
    params.push(q, q, q);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM account_appeals ${whereSql}`).get(...params) as any;
  const totalCount = parseInt(countRow?.c || "0", 10);

  const rows = db.prepare(
    `SELECT * FROM account_appeals ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as any[];

  return {
    items: rows.map(mapDbAppealRow),
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function updateAccountAppeal(
  id: string,
  updates: {
    status?: AppealStatus;
    adminNotes?: string | null;
    decisionReason?: string | null;
    reviewedBy?: string | null;
    reviewedByEmail?: string | null;
  }
): Promise<DbAccountAppeal> {
  const now = Date.now();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const setClauses: string[] = ["updated_at = $1"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [now];
    let pIdx = 2;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${pIdx++}`);
      values.push(updates.status);
    }
    if (updates.adminNotes !== undefined) {
      setClauses.push(`admin_notes = $${pIdx++}`);
      values.push(updates.adminNotes);
    }
    if (updates.decisionReason !== undefined) {
      setClauses.push(`decision_reason = $${pIdx++}`);
      values.push(updates.decisionReason);
    }
    if (updates.reviewedBy !== undefined) {
      setClauses.push(`reviewed_by = $${pIdx++}`);
      values.push(updates.reviewedBy);
    }
    if (updates.reviewedByEmail !== undefined) {
      setClauses.push(`reviewed_by_email = $${pIdx++}`);
      values.push(updates.reviewedByEmail);
    }
    setClauses.push(`reviewed_at = $${pIdx++}`);
    values.push(now);

    values.push(id);
    const res = await pool.query(
      `UPDATE account_appeals SET ${setClauses.join(", ")} WHERE id = $${pIdx} RETURNING *`,
      values
    );
    if (res.rows.length === 0) throw new Error("Kháng nghị không tồn tại.");
    return mapDbAppealRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  const setClauses: string[] = ["updated_at = ?"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [now];

  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    values.push(updates.status);
  }
  if (updates.adminNotes !== undefined) {
    setClauses.push("admin_notes = ?");
    values.push(updates.adminNotes);
  }
  if (updates.decisionReason !== undefined) {
    setClauses.push("decision_reason = ?");
    values.push(updates.decisionReason);
  }
  if (updates.reviewedBy !== undefined) {
    setClauses.push("reviewed_by = ?");
    values.push(updates.reviewedBy);
  }
  if (updates.reviewedByEmail !== undefined) {
    setClauses.push("reviewed_by_email = ?");
    values.push(updates.reviewedByEmail);
  }
  setClauses.push("reviewed_at = ?");
  values.push(now);

  values.push(id);
  db.prepare(`UPDATE account_appeals SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT * FROM account_appeals WHERE id = ?").get(id) as any;
  if (!row) throw new Error("Kháng nghị không tồn tại.");
  return mapDbAppealRow(row);
}

export async function lockUserAccount(
  userId: string,
  reason: string,
  lockedBy?: string
): Promise<DbUserRecord> {
  const now = Date.now();
  const affectedLecturerIds = new Set<string>();
  const affectedUniIds = new Set<string>();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const lRes = await pool.query("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = $1 AND lecturer_id IS NOT NULL", [userId]);
    lRes.rows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    const uRes = await pool.query("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = $1 AND university_id IS NOT NULL", [userId]);
    uRes.rows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    await pool.query(
      `UPDATE users
       SET status = 'locked', lock_reason = $1, locked_at = $2, locked_by = $3, updated_at = $4
       WHERE id = $5`,
      [reason, now, lockedBy || null, now, userId]
    );
    await pool.query("UPDATE reviews SET status = 'hidden' WHERE user_id = $1 AND status = 'published'", [userId]);
    await pool.query("UPDATE school_reviews SET status = 'hidden' WHERE user_id = $1 AND status = 'published'", [userId]);
  }

  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lRows = db.prepare("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = ? AND lecturer_id IS NOT NULL").all(userId) as any[];
    lRows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uRows = db.prepare("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = ? AND university_id IS NOT NULL").all(userId) as any[];
    uRows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    db.prepare(`
      UPDATE users
      SET status = 'locked', lock_reason = ?, locked_at = ?, locked_by = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, now, lockedBy || null, now, userId);
    db.prepare("UPDATE reviews SET status = 'hidden' WHERE user_id = ? AND status = 'published'").run(userId);
    db.prepare("UPDATE school_reviews SET status = 'hidden' WHERE user_id = ? AND status = 'published'").run(userId);
  } catch {
    // ignore
  }

  if (affectedLecturerIds.size > 0 || affectedUniIds.size > 0) {
    const { recalculateLecturersRatings, recalculateUniversitiesRatings } = await import("./adminDb");
    if (affectedLecturerIds.size > 0) await recalculateLecturersRatings(Array.from(affectedLecturerIds));
    if (affectedUniIds.size > 0) await recalculateUniversitiesRatings(Array.from(affectedUniIds));
  }

  const { clearSessionCache } = await import("./auth");
  clearSessionCache();

  const updated = await getDbUserById(userId);
  if (!updated) throw new Error("Không tìm thấy người dùng mục tiêu.");
  return updated;
}

export async function unlockUserAccount(userId: string): Promise<DbUserRecord> {
  const now = Date.now();
  const affectedLecturerIds = new Set<string>();
  const affectedUniIds = new Set<string>();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const lRes = await pool.query("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = $1 AND lecturer_id IS NOT NULL", [userId]);
    lRes.rows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    const uRes = await pool.query("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = $1 AND university_id IS NOT NULL", [userId]);
    uRes.rows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    await pool.query(
      `UPDATE users
       SET status = 'active', lock_reason = NULL, locked_at = NULL, locked_by = NULL, updated_at = $1
       WHERE id = $2`,
      [now, userId]
    );
    await pool.query("UPDATE reviews SET status = 'published' WHERE user_id = $1 AND status = 'hidden'", [userId]);
    await pool.query("UPDATE school_reviews SET status = 'published' WHERE user_id = $1 AND status = 'hidden'", [userId]);
  }

  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lRows = db.prepare("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = ? AND lecturer_id IS NOT NULL").all(userId) as any[];
    lRows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uRows = db.prepare("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = ? AND university_id IS NOT NULL").all(userId) as any[];
    uRows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    db.prepare(`
      UPDATE users
      SET status = 'active', lock_reason = NULL, locked_at = NULL, locked_by = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, userId);
    db.prepare("UPDATE reviews SET status = 'published' WHERE user_id = ? AND status = 'hidden'").run(userId);
    db.prepare("UPDATE school_reviews SET status = 'published' WHERE user_id = ? AND status = 'hidden'").run(userId);
  } catch {
    // ignore
  }

  if (affectedLecturerIds.size > 0 || affectedUniIds.size > 0) {
    const { recalculateLecturersRatings, recalculateUniversitiesRatings } = await import("./adminDb");
    if (affectedLecturerIds.size > 0) await recalculateLecturersRatings(Array.from(affectedLecturerIds));
    if (affectedUniIds.size > 0) await recalculateUniversitiesRatings(Array.from(affectedUniIds));
  }

  const { clearSessionCache: clearSessionCacheUnlock } = await import("./auth");
  clearSessionCacheUnlock();

  const updated = await getDbUserById(userId);
  if (!updated) throw new Error("Không tìm thấy người dùng mục tiêu.");
  return updated;
}

export async function requestAccountDeletion(
  userId: string,
  reason?: string
): Promise<{ success: boolean; recoveryToken: string; scheduledAt: number; user: DbUserRecord }> {
  const recoveryToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const scheduledAt = now + 14 * 24 * 60 * 60 * 1000; // 14-day grace period
  const affectedLecturerIds = new Set<string>();
  const affectedUniIds = new Set<string>();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const lRes = await pool.query("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = $1 AND lecturer_id IS NOT NULL", [userId]);
    lRes.rows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    const uRes = await pool.query("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = $1 AND university_id IS NOT NULL", [userId]);
    uRes.rows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    await pool.query(
      `UPDATE users
       SET status = 'pending_deletion',
           deletion_requested_at = $1,
           deletion_scheduled_at = $2,
           deletion_reason = $3,
           recovery_token = $4,
           recovery_token_expires_at = $5,
           updated_at = $6
       WHERE id = $7`,
      [now, scheduledAt, reason || "Người dùng yêu cầu xóa tài khoản", recoveryToken, scheduledAt, now, userId]
    );
    await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
    await pool.query("UPDATE reviews SET status = 'hidden' WHERE user_id = $1 AND status = 'published'", [userId]);
    await pool.query("UPDATE school_reviews SET status = 'hidden' WHERE user_id = $1 AND status = 'published'", [userId]);
  }

  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lRows = db.prepare("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = ? AND lecturer_id IS NOT NULL").all(userId) as any[];
    lRows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uRows = db.prepare("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = ? AND university_id IS NOT NULL").all(userId) as any[];
    uRows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

    db.prepare(`
      UPDATE users
      SET status = 'pending_deletion',
          deletion_requested_at = ?,
          deletion_scheduled_at = ?,
          deletion_reason = ?,
          recovery_token = ?,
          recovery_token_expires_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, scheduledAt, reason || "Người dùng yêu cầu xóa tài khoản", recoveryToken, scheduledAt, now, userId);
    db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
    db.prepare("UPDATE reviews SET status = 'hidden' WHERE user_id = ? AND status = 'published'").run(userId);
    db.prepare("UPDATE school_reviews SET status = 'hidden' WHERE user_id = ? AND status = 'published'").run(userId);
  } catch {
    // ignore
  }

  if (affectedLecturerIds.size > 0 || affectedUniIds.size > 0) {
    const { recalculateLecturersRatings, recalculateUniversitiesRatings } = await import("./adminDb");
    if (affectedLecturerIds.size > 0) await recalculateLecturersRatings(Array.from(affectedLecturerIds));
    if (affectedUniIds.size > 0) await recalculateUniversitiesRatings(Array.from(affectedUniIds));
  }

  try {
    const { clearSessionCache } = await import("./auth");
    clearSessionCache();
  } catch {
    // ignore
  }

  const updated = await getDbUserById(userId);
  if (!updated) throw new Error("Không tìm thấy người dùng.");
  return { success: true, recoveryToken, scheduledAt, user: updated };
}

export async function recoverAccountWithToken(
  rawToken: string
): Promise<{ success: boolean; message: string; user?: DbUserRecord }> {
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    return { success: false, message: "Mã khôi phục không hợp lệ." };
  }

  const token = rawToken.trim();
  const now = Date.now();
  let user: DbUserRecord | null = null;

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT * FROM users
       WHERE recovery_token = $1
         AND recovery_token_expires_at > $2
         AND status = 'pending_deletion'
       LIMIT 1`,
      [token, now]
    );
    if (res.rows.length > 0) user = mapDbUserRow(res.rows[0]);
  }

  if (!user) {
    try {
      const db = getSqliteDatabase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = db.prepare(
        `SELECT * FROM users
         WHERE recovery_token = ?
           AND recovery_token_expires_at > ?
           AND status = 'pending_deletion'
         LIMIT 1`
      ).get(token, now) as any;
      if (row) user = mapDbUserRow(row);
    } catch {
      // ignore
    }
  }

  if (!user) {
    return { success: false, message: "Mã khôi phục không hợp lệ hoặc đã hết hạn sau 14 ngày." };
  }

  const targetUserId = user.id;
  // If the account was previously locked for moderation, keep it locked, otherwise set active
  const nextStatus: AccountStatus = user.lock_reason ? "locked" : "active";

  const affectedLecturerIds = new Set<string>();
  const affectedUniIds = new Set<string>();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE users
       SET status = $1,
           deletion_requested_at = NULL,
           deletion_scheduled_at = NULL,
           deletion_reason = NULL,
           recovery_token = NULL,
           recovery_token_expires_at = NULL,
           updated_at = $2
       WHERE id = $3`,
      [nextStatus, now, targetUserId]
    );

    if (nextStatus === "active") {
      const lRes = await pool.query("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = $1 AND lecturer_id IS NOT NULL", [targetUserId]);
      lRes.rows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
      const uRes = await pool.query("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = $1 AND university_id IS NOT NULL", [targetUserId]);
      uRes.rows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

      await pool.query("UPDATE reviews SET status = 'published' WHERE user_id = $1 AND status = 'hidden'", [targetUserId]);
      await pool.query("UPDATE school_reviews SET status = 'published' WHERE user_id = $1 AND status = 'hidden'", [targetUserId]);
    }
  }

  try {
    const db = getSqliteDatabase();
    db.prepare(`
      UPDATE users
      SET status = ?,
          deletion_requested_at = NULL,
          deletion_scheduled_at = NULL,
          deletion_reason = NULL,
          recovery_token = NULL,
          recovery_token_expires_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(nextStatus, now, targetUserId);

    if (nextStatus === "active") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lRows = db.prepare("SELECT DISTINCT lecturer_id FROM reviews WHERE user_id = ? AND lecturer_id IS NOT NULL").all(targetUserId) as any[];
      lRows.forEach((r) => { if (r.lecturer_id) affectedLecturerIds.add(r.lecturer_id); });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uRows = db.prepare("SELECT DISTINCT university_id FROM school_reviews WHERE user_id = ? AND university_id IS NOT NULL").all(targetUserId) as any[];
      uRows.forEach((r) => { if (r.university_id) affectedUniIds.add(r.university_id); });

      db.prepare("UPDATE reviews SET status = 'published' WHERE user_id = ? AND status = 'hidden'").run(targetUserId);
      db.prepare("UPDATE school_reviews SET status = 'published' WHERE user_id = ? AND status = 'hidden'").run(targetUserId);
    }
  } catch {
    // ignore
  }

  if (affectedLecturerIds.size > 0 || affectedUniIds.size > 0) {
    const { recalculateLecturersRatings, recalculateUniversitiesRatings } = await import("./adminDb");
    if (affectedLecturerIds.size > 0) await recalculateLecturersRatings(Array.from(affectedLecturerIds));
    if (affectedUniIds.size > 0) await recalculateUniversitiesRatings(Array.from(affectedUniIds));
  }

  try {
    const { clearSessionCache } = await import("./auth");
    clearSessionCache();
  } catch {
    // ignore
  }

  const restoredUser = await getDbUserById(targetUserId);
  return {
    success: true,
    message: nextStatus === "active"
      ? "Tài khoản của bạn đã được khôi phục thành công. Các bài đánh giá đã hiển thị trở lại."
      : "Yêu cầu xóa tài khoản đã được hủy thành công. Lưu ý: Tài khoản của bạn vẫn đang ở trạng thái bị khóa do vi phạm, bạn có thể gửi kháng nghị.",
    user: restoredUser || undefined,
  };
}

export async function deleteDbSession(token: string): Promise<void> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query("DELETE FROM user_sessions WHERE token = $1", [token]);
    return;
  }

  const db = getSqliteDatabase();
  db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
}

export async function updateDbUserProfile(userId: string, updates: {
  firstName?: string | null;
  lastName?: string | null;
  school?: string | null;
  fieldOfStudy?: string | null;
  expectedGraduationYear?: string | null;
  displayName?: string | null;
}): Promise<DbUserRecord | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex}`);
      values.push(updates.firstName);
      paramIndex++;
    }
    if (updates.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex}`);
      values.push(updates.lastName);
      paramIndex++;
    }
    if (updates.school !== undefined) {
      setClauses.push(`school = $${paramIndex}`);
      values.push(updates.school);
      paramIndex++;
    }
    if (updates.fieldOfStudy !== undefined) {
      setClauses.push(`field_of_study = $${paramIndex}`);
      values.push(updates.fieldOfStudy);
      paramIndex++;
    }
    if (updates.expectedGraduationYear !== undefined) {
      setClauses.push(`expected_graduation_year = $${paramIndex}`);
      values.push(updates.expectedGraduationYear);
      paramIndex++;
    }
    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex}`);
      values.push(updates.displayName);
      paramIndex++;
    }

    setClauses.push(`updated_at = $${paramIndex}`);
    values.push(Date.now());
    paramIndex++;

    values.push(userId);

    if (setClauses.length > 0) {
      await pool.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }

    return getDbUserById(userId);
  }

  const db = getSqliteDatabase();
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.firstName !== undefined) {
    setClauses.push("first_name = ?");
    values.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    setClauses.push("last_name = ?");
    values.push(updates.lastName);
  }
  if (updates.school !== undefined) {
    setClauses.push("school = ?");
    values.push(updates.school);
  }
  if (updates.fieldOfStudy !== undefined) {
    setClauses.push("field_of_study = ?");
    values.push(updates.fieldOfStudy);
  }
  if (updates.expectedGraduationYear !== undefined) {
    setClauses.push("expected_graduation_year = ?");
    values.push(updates.expectedGraduationYear);
  }
  if (updates.displayName !== undefined) {
    setClauses.push("display_name = ?");
    values.push(updates.displayName);
  }

  setClauses.push("updated_at = ?");
  values.push(Date.now());

  values.push(userId);

  if (setClauses.length > 0) {
    db.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).run(...values);
  }

  return getDbUserById(userId);
}

// ---------------------------------------------------------------------------
// Review Upvotes & User Reviews
// ---------------------------------------------------------------------------

export async function voteReview(reviewId: string, userId: string): Promise<{ helpfulCount: number; upvoted: boolean }> {
  const createdAt = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const existing = await pool.query(
      "SELECT 1 FROM review_votes WHERE review_id = $1 AND user_id = $2",
      [reviewId, userId]
    );

    if (existing.rows.length > 0) {
      // Toggle off
      await pool.query("DELETE FROM review_votes WHERE review_id = $1 AND user_id = $2", [reviewId, userId]);
      const updateRes = await pool.query(
        "UPDATE reviews SET helpful_count = GREATEST(0, COALESCE(helpful_count, 0) - 1) WHERE id = $1 RETURNING helpful_count",
        [reviewId]
      );
      const count = updateRes.rows[0]?.helpful_count || 0;
      return { helpfulCount: count, upvoted: false };
    } else {
      // Toggle on
      await pool.query(
        "INSERT INTO review_votes (review_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [reviewId, userId, createdAt]
      );
      const updateRes = await pool.query(
        "UPDATE reviews SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = $1 RETURNING helpful_count",
        [reviewId]
      );
      const count = updateRes.rows[0]?.helpful_count || 1;
      return { helpfulCount: count, upvoted: true };
    }
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = db.prepare("SELECT 1 FROM review_votes WHERE review_id = ? AND user_id = ?").get(reviewId, userId) as any;
  if (existing) {
    db.prepare("DELETE FROM review_votes WHERE review_id = ? AND user_id = ?").run(reviewId, userId);
    db.prepare("UPDATE reviews SET helpful_count = MAX(0, COALESCE(helpful_count, 0) - 1) WHERE id = ?").run(reviewId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = db.prepare("SELECT helpful_count FROM reviews WHERE id = ?").get(reviewId) as any;
    return { helpfulCount: row?.helpful_count || 0, upvoted: false };
  } else {
    db.prepare("INSERT OR IGNORE INTO review_votes (review_id, user_id, created_at) VALUES (?, ?, ?)").run(reviewId, userId, createdAt);
    db.prepare("UPDATE reviews SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = ?").run(reviewId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = db.prepare("SELECT helpful_count FROM reviews WHERE id = ?").get(reviewId) as any;
    return { helpfulCount: row?.helpful_count || 1, upvoted: true };
  }
}

export async function getUserReviewsList(userId: string): Promise<Review[]> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const rowsRes = await pool.query(
      `SELECT r.*, l.name as professor_name FROM reviews r
       LEFT JOIN lecturers l ON r.lecturer_id = l.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return rowsRes.rows.map((r) => {
      const rating = parseFloat(r.overall_rating || "0");
      const diff = r.difficulty_score ? parseFloat(r.difficulty_score) : 3;
      return {
        id: r.id,
        professorId: r.lecturer_id,
        professorName: r.professor_name || "",
        lecturerId: r.lecturer_id,
        universityId: r.university_id,
        userDisplayName: r.user_display_name || "Sinh viên",
        userId: r.user_id,
        courseName: r.course_name || "",
        overallRating: rating,
        attendanceMandatory: Boolean(r.attendance_mandatory),
        takeAgain: Boolean(r.take_again),
        criteria: {
          teachingQuality: rating,
          clarity: rating,
          gradingFairness: rating,
          communication: rating,
          difficulty: diff,
        },
        comment: r.comment || "",
        tags: [],
        helpfulCount: r.helpful_count || 0,
        helpfulUserIds: [],
        createdAt: Number(r.created_at || Date.now()),
        status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
      };
    });
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    `SELECT r.*, l.name as professor_name FROM reviews r
     LEFT JOIN lecturers l ON r.lecturer_id = l.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`
  ).all(userId) as any[];

  return rows.map((r) => {
    const rating = Number(r.overall_rating || 0);
    const diff = r.difficulty_score ? Number(r.difficulty_score) : 3;
    return {
      id: r.id,
      professorId: r.lecturer_id,
      professorName: r.professor_name || "",
      lecturerId: r.lecturer_id,
      universityId: r.university_id,
      userDisplayName: r.user_display_name || "Sinh viên",
      userId: r.user_id,
      courseName: r.course_name || "",
      overallRating: rating,
      attendanceMandatory: Boolean(r.attendance_mandatory),
      takeAgain: Boolean(r.take_again),
      criteria: {
        teachingQuality: rating,
        clarity: rating,
        gradingFairness: rating,
        communication: rating,
        difficulty: diff,
      },
      comment: r.comment || "",
      tags: [],
      helpfulCount: r.helpful_count || 0,
      helpfulUserIds: [],
      createdAt: Number(r.created_at || Date.now()),
      status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    };
  });
}

export async function deleteReviewById(reviewId: string): Promise<boolean> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const findRes = await pool.query("SELECT lecturer_id FROM reviews WHERE id = $1", [reviewId]);
    const lecturerId = findRes.rows[0]?.lecturer_id;
    await pool.query("DELETE FROM reviews WHERE id = $1", [reviewId]);
    if (lecturerId) {
      await pool.query(
        `UPDATE lecturers
         SET rating_count = (SELECT COUNT(*) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             difficulty_score = (SELECT ROUND(AVG(difficulty_score)::numeric, 2) FROM reviews WHERE lecturer_id = $1 AND status = 'published'),
             take_again_percent = (SELECT ROUND((COUNT(*) FILTER (WHERE take_again = 1) * 100.0 / NULLIF(COUNT(*), 0))::numeric, 0) FROM reviews WHERE lecturer_id = $1 AND status = 'published')
         WHERE id = $1`,
        [lecturerId]
      );
    }
    invalidateRatingAggregatesCache();
    return true;
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT lecturer_id FROM reviews WHERE id = ?").get(reviewId) as any;
  db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
  if (row?.lecturer_id) {
    const lid = row.lecturer_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = db.prepare(
      `SELECT COUNT(*) as count, AVG(overall_rating) as avg_rating, AVG(difficulty_score) as avg_diff,
              SUM(CASE WHEN take_again = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as take_again_pct
       FROM reviews WHERE lecturer_id = ? AND status = 'published'`
    ).get(lid) as any;
    db.prepare(
      `UPDATE lecturers SET
         rating_count = ?,
         rating_average = ?,
         difficulty_score = ?,
         take_again_percent = ?
       WHERE id = ?`
    ).run(stats?.count || 0, stats?.avg_rating || null, stats?.avg_diff || null, stats?.take_again_pct || null, lid);
  }
  invalidateRatingAggregatesCache();
  return true;
}

export async function moderateReviewStatus(reviewId: string, action: 'hide' | 'publish' | 'delete', reportId?: string): Promise<boolean> {
  if (action === 'delete') {
    await deleteReviewById(reviewId);
  } else {
    const newStatus = action === 'hide' ? 'hidden' : 'published';
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query("UPDATE reviews SET status = $1 WHERE id = $2", [newStatus, reviewId]);
    } else {
      const db = getSqliteDatabase();
      db.prepare("UPDATE reviews SET status = ? WHERE id = ?").run(newStatus, reviewId);
    }
    invalidateRatingAggregatesCache();
  }

  if (reportId) {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query("UPDATE reports SET status = 'resolved' WHERE id = $1", [reportId]);
    } else {
      const db = getSqliteDatabase();
      db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Reports & Correction Requests
// ---------------------------------------------------------------------------

export async function createReport(report: {
  id: string;
  reviewId: string;
  professorId: string;
  professorName?: string;
  reviewCommentSnippet?: string;
  reportedByUserId: string;
  reason: string;
  details?: string;
  createdAt?: number;
}): Promise<string> {
  const createdAt = report.createdAt || Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO reports (id, review_id, professor_id, professor_name, review_comment_snippet, reported_by_user_id, reason, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
      [
        report.id,
        report.reviewId,
        report.professorId,
        report.professorName || null,
        report.reviewCommentSnippet || null,
        report.reportedByUserId,
        report.reason,
        report.details || null,
        createdAt,
      ]
    );
    return report.id;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO reports (id, review_id, professor_id, professor_name, review_comment_snippet, reported_by_user_id, reason, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    report.id,
    report.reviewId,
    report.professorId,
    report.professorName || null,
    report.reviewCommentSnippet || null,
    report.reportedByUserId,
    report.reason,
    report.details || null,
    createdAt
  );
  return report.id;
}

export async function getReportsList(): Promise<Report[]> {
  const query = `
    SELECT 
      rep.id,
      rep.review_id,
      rep.professor_id,
      COALESCE(rep.professor_name, l.name) AS professor_name,
      rep.review_comment_snippet,
      rep.reported_by_user_id,
      rep.reason,
      rep.details,
      rep.status,
      rep.created_at,
      r.course_name,
      r.overall_rating,
      r.difficulty_score,
      r.comment AS review_full_comment,
      r.take_again,
      r.grade_received,
      r.attendance_mandatory,
      r.user_display_name AS reviewer_name,
      r.status AS review_status,
      r.created_at AS review_created_at,
      a.university_name,
      a.university_short_name
    FROM reports rep
    LEFT JOIN reviews r ON rep.review_id = r.id
    LEFT JOIN lecturers l ON rep.professor_id = l.id
    LEFT JOIN affiliations a ON rep.professor_id = a.lecturer_id AND a.is_primary = 1
    ORDER BY rep.created_at DESC
  `;

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const res = await pool.query(query);
      return res.rows.map((r) => ({
        id: r.id,
        reviewId: r.review_id,
        professorId: r.professor_id,
        professorName: r.professor_name || undefined,
        universityName: r.university_name || undefined,
        universityShortName: r.university_short_name || undefined,
        reviewCommentSnippet: r.review_comment_snippet || undefined,
        reviewFullComment: r.review_full_comment || undefined,
        courseName: r.course_name || undefined,
        overallRating: r.overall_rating != null ? parseFloat(r.overall_rating) : undefined,
        difficultyScore: r.difficulty_score != null ? parseFloat(r.difficulty_score) : undefined,
        takeAgain: r.take_again != null ? Boolean(r.take_again) : undefined,
        gradeReceived: r.grade_received || undefined,
        attendanceMandatory: r.attendance_mandatory != null ? Boolean(r.attendance_mandatory) : undefined,
        reviewerName: r.reviewer_name || undefined,
        reviewStatus: r.review_status || undefined,
        reviewCreatedAt: r.review_created_at ? Number(r.review_created_at) : undefined,
        reportedByUserId: r.reported_by_user_id,
        reason: r.reason,
        details: r.details || undefined,
        createdAt: Number(r.created_at),
        status: (r.status as 'pending' | 'resolved' | 'dismissed') || 'pending',
      }));
    } catch (pgErr) {
      console.warn("[getReportsList] Postgres query failed, falling back to SQLite:", pgErr);
    }
  }

  try {
    const db = getSqliteDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = db.prepare(query).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      reviewId: r.review_id,
      professorId: r.professor_id,
      professorName: r.professor_name || undefined,
      universityName: r.university_name || undefined,
      universityShortName: r.university_short_name || undefined,
      reviewCommentSnippet: r.review_comment_snippet || undefined,
      reviewFullComment: r.review_full_comment || undefined,
      courseName: r.course_name || undefined,
      overallRating: r.overall_rating != null ? parseFloat(r.overall_rating) : undefined,
      difficultyScore: r.difficulty_score != null ? parseFloat(r.difficulty_score) : undefined,
      takeAgain: r.take_again != null ? Boolean(r.take_again) : undefined,
      gradeReceived: r.grade_received || undefined,
      attendanceMandatory: r.attendance_mandatory != null ? Boolean(r.attendance_mandatory) : undefined,
      reviewerName: r.reviewer_name || undefined,
      reviewStatus: r.review_status || undefined,
      reviewCreatedAt: r.review_created_at ? Number(r.review_created_at) : undefined,
      reportedByUserId: r.reported_by_user_id,
      reason: r.reason,
      details: r.details || undefined,
      createdAt: Number(r.created_at),
      status: (r.status as 'pending' | 'resolved' | 'dismissed') || 'pending',
    }));
  } catch (sqliteErr) {
    console.error("[getReportsList] SQLite query failed:", sqliteErr);
    return [];
  }
}

export async function createCorrectionRequest(req: {
  id: string;
  professorId: string;
  professorName: string;
  requesterEmail?: string;
  requesterRelation?: string;
  details?: string;
  createdAt?: number;
}): Promise<string> {
  const createdAt = req.createdAt || Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO correction_requests (id, professor_id, professor_name, requester_email, requester_relation, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [
        req.id,
        req.professorId,
        req.professorName,
        req.requesterEmail || null,
        req.requesterRelation || null,
        req.details || null,
        createdAt,
      ]
    );
    return req.id;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO correction_requests (id, professor_id, professor_name, requester_email, requester_relation, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    req.id,
    req.professorId,
    req.professorName,
    req.requesterEmail || null,
    req.requesterRelation || null,
    req.details || null,
    createdAt
  );
  return req.id;
}

export async function getCorrectionRequestsList(): Promise<CorrectionRequest[]> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT * FROM correction_requests ORDER BY created_at DESC");
    return res.rows.map((r) => ({
      id: r.id,
      professorId: r.professor_id,
      professorName: r.professor_name || "",
      universityId: "",
      requestType: 'correction',
      evidenceUrl: "",
      notes: r.details || "",
      contactEmail: r.requester_email || undefined,
      createdAt: Number(r.created_at),
      status: (r.status as 'pending' | 'reviewed' | 'resolved' | 'rejected') || 'pending',
    }));
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare("SELECT * FROM correction_requests ORDER BY created_at DESC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    professorId: r.professor_id,
    professorName: r.professor_name || "",
    universityId: "",
    requestType: 'correction',
    evidenceUrl: "",
    notes: r.details || "",
    contactEmail: r.requester_email || undefined,
    createdAt: Number(r.created_at),
    status: (r.status as 'pending' | 'reviewed' | 'resolved' | 'rejected') || 'pending',
  }));
}

// ---------------------------------------------------------------------------
// School / University Reviews
// ---------------------------------------------------------------------------

export async function getSchoolReviewsAndStats(
  universityId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{
  reviews: SchoolReview[];
  total: number;
  ratingAverage: number | null;
  criteriaAverages: SchoolCriteriaRatings | null;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const [aggRes, rowsRes] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*)::int as total,
             ROUND(AVG(overall_rating)::numeric, 2) as avg_rating,
             ROUND(AVG(reputation)::numeric, 2) as avg_reputation,
             ROUND(AVG(location)::numeric, 2) as avg_location,
             ROUND(AVG(opportunities)::numeric, 2) as avg_opportunities,
             ROUND(AVG(facilities)::numeric, 2) as avg_facilities,
             ROUND(AVG(internet)::numeric, 2) as avg_internet,
             ROUND(AVG(food)::numeric, 2) as avg_food,
             ROUND(AVG(clubs)::numeric, 2) as avg_clubs,
             ROUND(AVG(social)::numeric, 2) as avg_social,
             ROUND(AVG(happiness)::numeric, 2) as avg_happiness,
             ROUND(AVG(safety)::numeric, 2) as avg_safety
           FROM school_reviews
           WHERE university_id = $1 AND status = 'published'`,
          [universityId]
        ),
        pool.query(
          `SELECT * FROM school_reviews
           WHERE university_id = $1 AND status = 'published'
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [universityId, limit, offset]
        ),
      ]);

      const agg = aggRes.rows[0];
      const total = parseInt(agg?.total || "0", 10);
      const ratingAverage = agg?.avg_rating !== null && agg?.avg_rating !== undefined ? parseFloat(agg.avg_rating) : null;
      const criteriaAverages: SchoolCriteriaRatings | null = total > 0 ? {
        reputation: parseFloat(agg.avg_reputation || "0"),
        location: parseFloat(agg.avg_location || "0"),
        opportunities: parseFloat(agg.avg_opportunities || "0"),
        facilities: parseFloat(agg.avg_facilities || "0"),
        internet: parseFloat(agg.avg_internet || "0"),
        food: parseFloat(agg.avg_food || "0"),
        clubs: parseFloat(agg.avg_clubs || "0"),
        social: parseFloat(agg.avg_social || "0"),
        happiness: parseFloat(agg.avg_happiness || "0"),
        safety: parseFloat(agg.avg_safety || "0"),
      } : null;

      const reviews: SchoolReview[] = rowsRes.rows.map((r) => ({
        id: r.id,
        universityId: r.university_id,
        userId: r.user_id || "anonymous",
        userDisplayName: r.user_display_name || "Sinh viên",
        cohort: r.cohort || undefined,
        criteria: {
          reputation: parseFloat(r.reputation || "0"),
          location: parseFloat(r.location || "0"),
          opportunities: parseFloat(r.opportunities || "0"),
          facilities: parseFloat(r.facilities || "0"),
          internet: parseFloat(r.internet || "0"),
          food: parseFloat(r.food || "0"),
          clubs: parseFloat(r.clubs || "0"),
          social: parseFloat(r.social || "0"),
          happiness: parseFloat(r.happiness || "0"),
          safety: parseFloat(r.safety || "0"),
        },
        overallRating: parseFloat(r.overall_rating || "0"),
        comment: r.comment || "",
        helpfulCount: r.helpful_count || 0,
        helpfulUserIds: [],
        status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
        createdAt: Number(r.created_at || Date.now()),
      }));

      return { reviews, total, ratingAverage, criteriaAverages };
    } catch (err) {
      console.error("[DB] PostgreSQL getSchoolReviewsAndStats failed:", err);
    }
  }

  // SQLite fallback
  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare("SELECT COUNT(*) as total FROM school_reviews WHERE university_id = ? AND status = 'published'").get(universityId) as any;
  const total = countRow ? Number(countRow.total) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agg = db.prepare(`
    SELECT
      ROUND(AVG(overall_rating), 2) as avg_rating,
      ROUND(AVG(reputation), 2) as avg_reputation,
      ROUND(AVG(location), 2) as avg_location,
      ROUND(AVG(opportunities), 2) as avg_opportunities,
      ROUND(AVG(facilities), 2) as avg_facilities,
      ROUND(AVG(internet), 2) as avg_internet,
      ROUND(AVG(food), 2) as avg_food,
      ROUND(AVG(clubs), 2) as avg_clubs,
      ROUND(AVG(social), 2) as avg_social,
      ROUND(AVG(happiness), 2) as avg_happiness,
      ROUND(AVG(safety), 2) as avg_safety
    FROM school_reviews
    WHERE university_id = ? AND status = 'published'
  `).get(universityId) as any;

  const ratingAverage = agg?.avg_rating !== null && agg?.avg_rating !== undefined ? Number(agg.avg_rating) : null;
  const criteriaAverages: SchoolCriteriaRatings | null = total > 0 ? {
    reputation: Number(agg.avg_reputation || 0),
    location: Number(agg.avg_location || 0),
    opportunities: Number(agg.avg_opportunities || 0),
    facilities: Number(agg.avg_facilities || 0),
    internet: Number(agg.avg_internet || 0),
    food: Number(agg.avg_food || 0),
    clubs: Number(agg.avg_clubs || 0),
    social: Number(agg.avg_social || 0),
    happiness: Number(agg.avg_happiness || 0),
    safety: Number(agg.avg_safety || 0),
  } : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(`
    SELECT * FROM school_reviews
    WHERE university_id = ? AND status = 'published'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(universityId, limit, offset) as any[];

  const reviews: SchoolReview[] = rows.map((r) => ({
    id: r.id,
    universityId: r.university_id,
    userId: r.user_id || "anonymous",
    userDisplayName: r.user_display_name || "Sinh viên",
    cohort: r.cohort || undefined,
    criteria: {
      reputation: Number(r.reputation || 0),
      location: Number(r.location || 0),
      opportunities: Number(r.opportunities || 0),
      facilities: Number(r.facilities || 0),
      internet: Number(r.internet || 0),
      food: Number(r.food || 0),
      clubs: Number(r.clubs || 0),
      social: Number(r.social || 0),
      happiness: Number(r.happiness || 0),
      safety: Number(r.safety || 0),
    },
    overallRating: Number(r.overall_rating || 0),
    comment: r.comment || "",
    helpfulCount: Number(r.helpful_count || 0),
    helpfulUserIds: [],
    status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    createdAt: Number(r.created_at || Date.now()),
  }));

  return { reviews, total, ratingAverage, criteriaAverages };
}

/**
 * Checks if an authenticated student has already rated a specific university.
 */
export async function getExistingSchoolReviewByUserAndUni(
  userId: string,
  universityId: string
): Promise<SchoolReview | null> {
  if (!userId || userId === "anonymous" || !universityId) return null;

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT sr.*, u.name as university_name FROM school_reviews sr
       LEFT JOIN universities u ON sr.university_id = u.id
       WHERE sr.user_id = $1 AND sr.university_id = $2 AND sr.status != 'hidden'
       ORDER BY sr.created_at DESC LIMIT 1`,
      [userId, universityId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      universityId: r.university_id,
      universityName: r.university_name || "",
      userId: r.user_id,
      userDisplayName: r.user_display_name || "Sinh viên",
      cohort: r.cohort || undefined,
      criteria: {
        reputation: parseFloat(r.reputation || "0"),
        location: parseFloat(r.location || "0"),
        opportunities: parseFloat(r.opportunities || "0"),
        facilities: parseFloat(r.facilities || "0"),
        internet: parseFloat(r.internet || "0"),
        food: parseFloat(r.food || "0"),
        clubs: parseFloat(r.clubs || "0"),
        social: parseFloat(r.social || "0"),
        happiness: parseFloat(r.happiness || "0"),
        safety: parseFloat(r.safety || "0"),
      },
      overallRating: parseFloat(r.overall_rating || "0"),
      comment: r.comment || "",
      helpfulCount: r.helpful_count || 0,
      helpfulUserIds: [],
      status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
      createdAt: Number(r.created_at || Date.now()),
    };
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = db.prepare(
    `SELECT sr.*, u.name as university_name FROM school_reviews sr
     LEFT JOIN universities u ON sr.university_id = u.id
     WHERE sr.user_id = ? AND sr.university_id = ? AND sr.status != 'hidden'
     ORDER BY sr.created_at DESC LIMIT 1`
  ).get(userId, universityId) as any;

  if (!r) return null;
  return {
    id: r.id,
    universityId: r.university_id,
    universityName: r.university_name || "",
    userId: r.user_id,
    userDisplayName: r.user_display_name || "Sinh viên",
    cohort: r.cohort || undefined,
    criteria: {
      reputation: Number(r.reputation || 0),
      location: Number(r.location || 0),
      opportunities: Number(r.opportunities || 0),
      facilities: Number(r.facilities || 0),
      internet: Number(r.internet || 0),
      food: Number(r.food || 0),
      clubs: Number(r.clubs || 0),
      social: Number(r.social || 0),
      happiness: Number(r.happiness || 0),
      safety: Number(r.safety || 0),
    },
    overallRating: Number(r.overall_rating || 0),
    comment: r.comment || "",
    helpfulCount: Number(r.helpful_count || 0),
    helpfulUserIds: [],
    status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    createdAt: Number(r.created_at || Date.now()),
  };
}

/**
 * Updates an existing school review and recalculates university rating aggregates.
 */
export async function updateSchoolReview(
  reviewId: string,
  userId: string,
  updateData: {
    cohort?: string;
    criteria: SchoolCriteriaRatings;
    comment?: string;
    userDisplayName?: string;
  }
): Promise<boolean> {
  const c = updateData.criteria;
  const overall = Number(
    (
      (c.reputation +
        c.location +
        c.opportunities +
        c.facilities +
        c.internet +
        c.food +
        c.clubs +
        c.social +
        c.happiness +
        c.safety) /
      10.0
    ).toFixed(2)
  );

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const findRes = await pool.query("SELECT university_id, user_id FROM school_reviews WHERE id = $1", [reviewId]);
    if (findRes.rows.length === 0) return false;
    const existing = findRes.rows[0];
    if (userId && existing.user_id !== userId && existing.user_id !== "anonymous") {
      return false;
    }
    const universityId = existing.university_id;

    await pool.query(
      `UPDATE school_reviews SET
        cohort = $1,
        reputation = $2, location = $3, opportunities = $4, facilities = $5, internet = $6,
        food = $7, clubs = $8, social = $9, happiness = $10, safety = $11,
        overall_rating = $12, comment = $13,
        user_display_name = COALESCE($14, user_display_name)
      WHERE id = $15`,
      [
        updateData.cohort || null,
        c.reputation, c.location, c.opportunities, c.facilities, c.internet,
        c.food, c.clubs, c.social, c.happiness, c.safety,
        overall, updateData.comment || "",
        updateData.userDisplayName || null,
        reviewId,
      ]
    );

    if (universityId) {
      await pool.query(
        `UPDATE universities
         SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = $1 AND status = 'published'),
             rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM school_reviews WHERE university_id = $1 AND status = 'published')
         WHERE id = $1`,
        [universityId]
      );
    }
    invalidateUniversityAggregatesCache();
    return true;
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT university_id, user_id FROM school_reviews WHERE id = ?").get(reviewId) as any;
  if (!row) return false;
  if (userId && row.user_id !== userId && row.user_id !== "anonymous") {
    return false;
  }
  const universityId = row.university_id;

  db.prepare(`
    UPDATE school_reviews SET
      cohort = ?,
      reputation = ?, location = ?, opportunities = ?, facilities = ?, internet = ?,
      food = ?, clubs = ?, social = ?, happiness = ?, safety = ?,
      overall_rating = ?, comment = ?,
      user_display_name = COALESCE(?, user_display_name)
    WHERE id = ?
  `).run(
    updateData.cohort || null,
    c.reputation, c.location, c.opportunities, c.facilities, c.internet,
    c.food, c.clubs, c.social, c.happiness, c.safety,
    overall, updateData.comment || "",
    updateData.userDisplayName || null,
    reviewId
  );

  if (universityId) {
    db.prepare(`
      UPDATE universities
      SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = ? AND status = 'published'),
          rating_average = (SELECT ROUND(AVG(overall_rating), 2) FROM school_reviews WHERE university_id = ? AND status = 'published')
      WHERE id = ?
    `).run(universityId, universityId, universityId);
  }

  invalidateUniversityAggregatesCache();
  return true;
}

/**
 * Deletes a school review and recalculates university rating aggregates.
 */
export async function deleteSchoolReviewById(reviewId: string): Promise<boolean> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const findRes = await pool.query("SELECT university_id FROM school_reviews WHERE id = $1", [reviewId]);
    const universityId = findRes.rows[0]?.university_id;
    await pool.query("DELETE FROM school_reviews WHERE id = $1", [reviewId]);
    if (universityId) {
      await pool.query(
        `UPDATE universities
         SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = $1 AND status = 'published'),
             rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM school_reviews WHERE university_id = $1 AND status = 'published')
         WHERE id = $1`,
        [universityId]
      );
    }
    invalidateUniversityAggregatesCache();
    return true;
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare("SELECT university_id FROM school_reviews WHERE id = ?").get(reviewId) as any;
  db.prepare("DELETE FROM school_reviews WHERE id = ?").run(reviewId);
  if (row?.university_id) {
    const uid = row.university_id;
    db.prepare(`
      UPDATE universities
      SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = ? AND status = 'published'),
          rating_average = (SELECT ROUND(AVG(overall_rating), 2) FROM school_reviews WHERE university_id = ? AND status = 'published')
      WHERE id = ?
    `).run(uid, uid, uid);
  }
  invalidateUniversityAggregatesCache();
  return true;
}

/**
 * Returns all school reviews authored by a specific user.
 */
export async function getUserSchoolReviewsList(userId: string): Promise<SchoolReview[]> {
  if (!userId) return [];
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT sr.*, u.name as university_name FROM school_reviews sr
       LEFT JOIN universities u ON sr.university_id = u.id
       WHERE sr.user_id = $1 ORDER BY sr.created_at DESC`,
      [userId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      universityId: r.university_id,
      universityName: r.university_name || "",
      userId: r.user_id,
      userDisplayName: r.user_display_name || "Sinh viên",
      cohort: r.cohort || undefined,
      criteria: {
        reputation: parseFloat(r.reputation || "0"),
        location: parseFloat(r.location || "0"),
        opportunities: parseFloat(r.opportunities || "0"),
        facilities: parseFloat(r.facilities || "0"),
        internet: parseFloat(r.internet || "0"),
        food: parseFloat(r.food || "0"),
        clubs: parseFloat(r.clubs || "0"),
        social: parseFloat(r.social || "0"),
        happiness: parseFloat(r.happiness || "0"),
        safety: parseFloat(r.safety || "0"),
      },
      overallRating: parseFloat(r.overall_rating || "0"),
      comment: r.comment || "",
      helpfulCount: r.helpful_count || 0,
      helpfulUserIds: [],
      status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
      createdAt: Number(r.created_at || Date.now()),
    }));
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    `SELECT sr.*, u.name as university_name FROM school_reviews sr
     LEFT JOIN universities u ON sr.university_id = u.id
     WHERE sr.user_id = ? ORDER BY sr.created_at DESC`
  ).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    universityId: r.university_id,
    universityName: r.university_name || "",
    userId: r.user_id,
    userDisplayName: r.user_display_name || "Sinh viên",
    cohort: r.cohort || undefined,
    criteria: {
      reputation: Number(r.reputation || 0),
      location: Number(r.location || 0),
      opportunities: Number(r.opportunities || 0),
      facilities: Number(r.facilities || 0),
      internet: Number(r.internet || 0),
      food: Number(r.food || 0),
      clubs: Number(r.clubs || 0),
      social: Number(r.social || 0),
      happiness: Number(r.happiness || 0),
      safety: Number(r.safety || 0),
    },
    overallRating: Number(r.overall_rating || 0),
    comment: r.comment || "",
    helpfulCount: Number(r.helpful_count || 0),
    helpfulUserIds: [],
    status: (r.status as 'published' | 'pending' | 'flagged' | 'hidden') || 'published',
    createdAt: Number(r.created_at || Date.now()),
  }));
}

export async function insertSchoolReview(review: {
  id: string;
  universityId: string;
  userDisplayName?: string;
  userId?: string;
  cohort?: string;
  criteria: SchoolCriteriaRatings;
  comment?: string;
}): Promise<void> {
  // Prevent duplicate school reviews for authenticated users
  if (review.userId && review.userId !== "anonymous") {
    const existing = await getExistingSchoolReviewByUserAndUni(review.userId, review.universityId);
    if (existing) {
      await updateSchoolReview(existing.id, review.userId, {
        cohort: review.cohort,
        criteria: review.criteria,
        comment: review.comment,
        userDisplayName: review.userDisplayName,
      });
      return;
    }
  }

  const c = review.criteria;
  const overall = Number(
    (
      (c.reputation +
        c.location +
        c.opportunities +
        c.facilities +
        c.internet +
        c.food +
        c.clubs +
        c.social +
        c.happiness +
        c.safety) /
      10.0
    ).toFixed(2)
  );
  const createdAt = Date.now();

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO school_reviews (
        id, university_id, user_display_name, user_id, cohort,
        reputation, location, opportunities, facilities, internet,
        food, clubs, social, happiness, safety,
        overall_rating, comment, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'published', $18)`,
      [
        review.id,
        review.universityId,
        review.userDisplayName || "Sinh viên",
        review.userId || "anonymous",
        review.cohort || null,
        c.reputation,
        c.location,
        c.opportunities,
        c.facilities,
        c.internet,
        c.food,
        c.clubs,
        c.social,
        c.happiness,
        c.safety,
        overall,
        review.comment || "",
        createdAt,
      ]
    );

    await pool.query(
      `UPDATE universities
       SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = $1 AND status = 'published'),
           rating_average = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM school_reviews WHERE university_id = $1 AND status = 'published')
       WHERE id = $1`,
      [review.universityId]
    );
    invalidateUniversityAggregatesCache();
    return;
  }

  // SQLite fallback
  const db = getSqliteDatabase();
  db.prepare(`
    INSERT INTO school_reviews (
      id, university_id, user_display_name, user_id, cohort,
      reputation, location, opportunities, facilities, internet,
      food, clubs, social, happiness, safety,
      overall_rating, comment, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
  `).run(
    review.id,
    review.universityId,
    review.userDisplayName || "Sinh viên",
    review.userId || "anonymous",
    review.cohort || null,
    c.reputation,
    c.location,
    c.opportunities,
    c.facilities,
    c.internet,
    c.food,
    c.clubs,
    c.social,
    c.happiness,
    c.safety,
    overall,
    review.comment || "",
    createdAt
  );

  db.prepare(`
    UPDATE universities
    SET total_reviews = (SELECT COUNT(*) FROM school_reviews WHERE university_id = ? AND status = 'published'),
        rating_average = (SELECT ROUND(AVG(overall_rating), 2) FROM school_reviews WHERE university_id = ? AND status = 'published')
    WHERE id = ?
  `).run(review.universityId, review.universityId, review.universityId);
  invalidateUniversityAggregatesCache();
}

export async function upvoteSchoolReview(reviewId: string, userId: string): Promise<boolean> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    try {
      const checkVote = await pool.query(
        "SELECT 1 FROM school_review_votes WHERE review_id = $1 AND user_id = $2",
        [reviewId, userId]
      );
      if (checkVote.rowCount && checkVote.rowCount > 0) {
        await pool.query("DELETE FROM school_review_votes WHERE review_id = $1 AND user_id = $2", [reviewId, userId]);
        await pool.query("UPDATE school_reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = $1", [reviewId]);
      } else {
        await pool.query("INSERT INTO school_review_votes (review_id, user_id, created_at) VALUES ($1, $2, $3)", [reviewId, userId, Date.now()]);
        await pool.query("UPDATE school_reviews SET helpful_count = helpful_count + 1 WHERE id = $1", [reviewId]);
      }
      return true;
    } catch (err) {
      console.error("[DB] PostgreSQL upvoteSchoolReview error:", err);
      return false;
    }
  }

  const db = getSqliteDatabase();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare("SELECT 1 FROM school_review_votes WHERE review_id = ? AND user_id = ?").get(reviewId, userId) as any;
    if (existing) {
      db.prepare("DELETE FROM school_review_votes WHERE review_id = ? AND user_id = ?").run(reviewId, userId);
      db.prepare("UPDATE school_reviews SET helpful_count = MAX(0, helpful_count - 1) WHERE id = ?").run(reviewId);
    } else {
      db.prepare("INSERT INTO school_review_votes (review_id, user_id, created_at) VALUES (?, ?, ?)").run(reviewId, userId, Date.now());
      db.prepare("UPDATE school_reviews SET helpful_count = helpful_count + 1 WHERE id = ?").run(reviewId);
    }
    return true;
  } catch (err) {
    console.error("[DB] SQLite upvoteSchoolReview error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// User Saved Professors (Account-Scoped Bookmarks)
// ---------------------------------------------------------------------------

export async function getUserSavedProfessorIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const res = await pool.query(
        "SELECT professor_id FROM user_saved_professors WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return res.rows.map((r) => r.professor_id);
    } catch (err) {
      console.error("[DB] PostgreSQL getUserSavedProfessorIds error:", err);
      return [];
    }
  }

  const db = getSqliteDatabase();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = db.prepare(
      "SELECT professor_id FROM user_saved_professors WHERE user_id = ? ORDER BY created_at DESC"
    ).all(userId) as any[];
    return rows.map((r) => r.professor_id);
  } catch (err) {
    console.error("[DB] SQLite getUserSavedProfessorIds error:", err);
    return [];
  }
}

export async function toggleUserSavedProfessor(
  userId: string,
  professorId: string
): Promise<{ isSaved: boolean; professorIds: string[] }> {
  if (!userId || !professorId) {
    return { isSaved: false, professorIds: [] };
  }

  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const checkRes = await pool.query(
        "SELECT 1 FROM user_saved_professors WHERE user_id = $1 AND professor_id = $2",
        [userId, professorId]
      );
      let isSaved = false;
      if (checkRes.rows.length > 0) {
        await pool.query(
          "DELETE FROM user_saved_professors WHERE user_id = $1 AND professor_id = $2",
          [userId, professorId]
        );
        isSaved = false;
      } else {
        await pool.query(
          "INSERT INTO user_saved_professors (user_id, professor_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, professor_id) DO NOTHING",
          [userId, professorId, Date.now()]
        );
        isSaved = true;
      }
      const list = await getUserSavedProfessorIds(userId);
      return { isSaved, professorIds: list };
    } catch (err) {
      console.error("[DB] PostgreSQL toggleUserSavedProfessor error:", err);
      const list = await getUserSavedProfessorIds(userId);
      return { isSaved: false, professorIds: list };
    }
  }

  const db = getSqliteDatabase();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare(
      "SELECT 1 FROM user_saved_professors WHERE user_id = ? AND professor_id = ?"
    ).get(userId, professorId) as any;

    let isSaved = false;
    if (existing) {
      db.prepare(
        "DELETE FROM user_saved_professors WHERE user_id = ? AND professor_id = ?"
      ).run(userId, professorId);
      isSaved = false;
    } else {
      db.prepare(
        "INSERT OR IGNORE INTO user_saved_professors (user_id, professor_id, created_at) VALUES (?, ?, ?)"
      ).run(userId, professorId, Date.now());
      isSaved = true;
    }
    const list = await getUserSavedProfessorIds(userId);
    return { isSaved, professorIds: list };
  } catch (err) {
    console.error("[DB] SQLite toggleUserSavedProfessor error:", err);
    const list = await getUserSavedProfessorIds(userId);
    return { isSaved: false, professorIds: list };
  }
}

export async function syncUserSavedProfessors(
  userId: string,
  professorIds: string[]
): Promise<string[]> {
  if (!userId || !Array.isArray(professorIds) || professorIds.length === 0) {
    return getUserSavedProfessorIds(userId);
  }

  const now = Date.now();
  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      for (const profId of professorIds) {
        if (!profId || typeof profId !== "string") continue;
        await pool.query(
          "INSERT INTO user_saved_professors (user_id, professor_id, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, professor_id) DO NOTHING",
          [userId, profId.trim(), now]
        );
      }
      return getUserSavedProfessorIds(userId);
    } catch (err) {
      console.error("[DB] PostgreSQL syncUserSavedProfessors error:", err);
      return getUserSavedProfessorIds(userId);
    }
  }

  const db = getSqliteDatabase();
  try {
    const insertStmt = db.prepare(
      "INSERT OR IGNORE INTO user_saved_professors (user_id, professor_id, created_at) VALUES (?, ?, ?)"
    );
    for (const profId of professorIds) {
      if (!profId || typeof profId !== "string") continue;
      insertStmt.run(userId, profId.trim(), now);
    }
    return getUserSavedProfessorIds(userId);
  } catch (err) {
    console.error("[DB] SQLite syncUserSavedProfessors error:", err);
    return getUserSavedProfessorIds(userId);
  }
}

// ===========================================================================
// EMAIL SYSTEM DATA ACCESS LAYER
// ===========================================================================

export interface DbEmailJob {
  id: string;
  idempotency_key?: string | null;
  sender: string;
  recipient: string;
  subject: string;
  template_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template_vars: Record<string, any>;
  locale: string;
  status: "queued" | "processing" | "sent" | "delivered" | "bounced" | "failed";
  retry_count: number;
  max_retries: number;
  next_retry_at: number | null;
  provider: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: number;
  sent_at: number | null;
  delivered_at: number | null;
}

export interface DbEmailEvent {
  event_id: string;
  job_id?: string | null;
  provider: string;
  event_type: string;
  recipient: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload_json?: any;
  created_at?: number;
}

export interface DbEmailSuppression {
  email: string;
  reason: string;
  details?: string | null;
  created_at: number;
}

export interface DbEmailToken {
  token_hash: string;
  user_id: string | null;
  email: string;
  token_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata_json?: any;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export async function insertEmailJob(job: DbEmailJob): Promise<DbEmailJob> {
  const varsJson = JSON.stringify(job.template_vars || {});
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO email_outbox (
        id, idempotency_key, sender, recipient, subject, template_id, template_vars,
        locale, status, retry_count, max_retries, next_retry_at, provider,
        provider_message_id, last_error, created_at, sent_at, delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        job.id,
        job.idempotency_key || null,
        job.sender,
        job.recipient.toLowerCase().trim(),
        job.subject,
        job.template_id,
        varsJson,
        job.locale || "vi",
        job.status || "queued",
        job.retry_count || 0,
        job.max_retries || 5,
        job.next_retry_at || null,
        job.provider || null,
        job.provider_message_id || null,
        job.last_error || null,
        job.created_at,
        job.sent_at || null,
        job.delivered_at || null,
      ]
    );
    return job;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT OR IGNORE INTO email_outbox (
      id, idempotency_key, sender, recipient, subject, template_id, template_vars,
      locale, status, retry_count, max_retries, next_retry_at, provider,
      provider_message_id, last_error, created_at, sent_at, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    job.id,
    job.idempotency_key || null,
    job.sender,
    job.recipient.toLowerCase().trim(),
    job.subject,
    job.template_id,
    varsJson,
    job.locale || "vi",
    job.status || "queued",
    job.retry_count || 0,
    job.max_retries || 5,
    job.next_retry_at || null,
    job.provider || null,
    job.provider_message_id || null,
    job.last_error || null,
    job.created_at,
    job.sent_at || null,
    job.delivered_at || null
  );

  return job;
}

export async function lockAndFetchQueuedEmailJobs(limit = 10): Promise<DbEmailJob[]> {
  const now = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN;");
      const res = await client.query(
        `SELECT * FROM email_outbox
         WHERE status = 'queued'
            OR (status = 'failed' AND retry_count < max_retries AND (next_retry_at IS NULL OR next_retry_at <= $1))
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [now, limit]
      );

      if (res.rows.length > 0) {
        const ids = res.rows.map((r) => r.id);
        await client.query(
          `UPDATE email_outbox
           SET status = 'processing'
           WHERE id = ANY($1::varchar[])`,
          [ids]
        );
      }
      await client.query("COMMIT;");

      return res.rows.map((r) => ({
        id: r.id,
        idempotency_key: r.idempotency_key,
        sender: r.sender,
        recipient: r.recipient,
        subject: r.subject,
        template_id: r.template_id,
        template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
        locale: r.locale,
        status: "processing",
        retry_count: Number(r.retry_count || 0),
        max_retries: Number(r.max_retries || 5),
        next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
        provider: r.provider,
        provider_message_id: r.provider_message_id,
        last_error: r.last_error,
        created_at: Number(r.created_at),
        sent_at: r.sent_at ? Number(r.sent_at) : null,
        delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
      }));
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    } finally {
      client.release();
    }
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    `SELECT * FROM email_outbox
     WHERE status = 'queued'
        OR (status = 'failed' AND retry_count < max_retries AND (next_retry_at IS NULL OR next_retry_at <= ?))
     ORDER BY created_at ASC
     LIMIT ?`
  ).all(now, limit) as any[];

  if (rows.length > 0) {
    const updateStmt = db.prepare("UPDATE email_outbox SET status = 'processing' WHERE id = ?");
    for (const r of rows) {
      updateStmt.run(r.id);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    idempotency_key: r.idempotency_key,
    sender: r.sender,
    recipient: r.recipient,
    subject: r.subject,
    template_id: r.template_id,
    template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
    locale: r.locale,
    status: "processing",
    retry_count: Number(r.retry_count || 0),
    max_retries: Number(r.max_retries || 5),
    next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
    provider: r.provider,
    provider_message_id: r.provider_message_id,
    last_error: r.last_error,
    created_at: Number(r.created_at),
    sent_at: r.sent_at ? Number(r.sent_at) : null,
    delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
  }));
}

export async function updateEmailJobStatus(
  id: string,
  update: {
    status: "queued" | "processing" | "sent" | "delivered" | "bounced" | "failed";
    provider?: string | null;
    provider_message_id?: string | null;
    retry_count?: number;
    next_retry_at?: number | null;
    last_error?: string | null;
    sent_at?: number | null;
    delivered_at?: number | null;
  }
): Promise<void> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const fields: string[] = ["status = $2"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [id, update.status];
    let idx = 3;

    if (update.provider !== undefined) {
      fields.push(`provider = $${idx++}`);
      values.push(update.provider);
    }
    if (update.provider_message_id !== undefined) {
      fields.push(`provider_message_id = $${idx++}`);
      values.push(update.provider_message_id);
    }
    if (update.retry_count !== undefined) {
      fields.push(`retry_count = $${idx++}`);
      values.push(update.retry_count);
    }
    if (update.next_retry_at !== undefined) {
      fields.push(`next_retry_at = $${idx++}`);
      values.push(update.next_retry_at);
    }
    if (update.last_error !== undefined) {
      fields.push(`last_error = $${idx++}`);
      values.push(update.last_error);
    }
    if (update.sent_at !== undefined) {
      fields.push(`sent_at = $${idx++}`);
      values.push(update.sent_at);
    }
    if (update.delivered_at !== undefined) {
      fields.push(`delivered_at = $${idx++}`);
      values.push(update.delivered_at);
    }

    await pool.query(
      `UPDATE email_outbox SET ${fields.join(", ")} WHERE id = $1`,
      values
    );
    return;
  }

  const db = getSqliteDatabase();
  const fields: string[] = ["status = ?"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [update.status];

  if (update.provider !== undefined) {
    fields.push("provider = ?");
    values.push(update.provider);
  }
  if (update.provider_message_id !== undefined) {
    fields.push("provider_message_id = ?");
    values.push(update.provider_message_id);
  }
  if (update.retry_count !== undefined) {
    fields.push("retry_count = ?");
    values.push(update.retry_count);
  }
  if (update.next_retry_at !== undefined) {
    fields.push("next_retry_at = ?");
    values.push(update.next_retry_at);
  }
  if (update.last_error !== undefined) {
    fields.push("last_error = ?");
    values.push(update.last_error);
  }
  if (update.sent_at !== undefined) {
    fields.push("sent_at = ?");
    values.push(update.sent_at);
  }
  if (update.delivered_at !== undefined) {
    fields.push("delivered_at = ?");
    values.push(update.delivered_at);
  }

  values.push(id);
  db.prepare(`UPDATE email_outbox SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export async function getEmailJobById(id: string): Promise<DbEmailJob | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT * FROM email_outbox WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      idempotency_key: r.idempotency_key,
      sender: r.sender,
      recipient: r.recipient,
      subject: r.subject,
      template_id: r.template_id,
      template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
      locale: r.locale,
      status: r.status,
      retry_count: Number(r.retry_count || 0),
      max_retries: Number(r.max_retries || 5),
      next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
      provider: r.provider,
      provider_message_id: r.provider_message_id,
      last_error: r.last_error,
      created_at: Number(r.created_at),
      sent_at: r.sent_at ? Number(r.sent_at) : null,
      delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
    };
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = db.prepare("SELECT * FROM email_outbox WHERE id = ? LIMIT 1").get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    idempotency_key: r.idempotency_key,
    sender: r.sender,
    recipient: r.recipient,
    subject: r.subject,
    template_id: r.template_id,
    template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
    locale: r.locale,
    status: r.status,
    retry_count: Number(r.retry_count || 0),
    max_retries: Number(r.max_retries || 5),
    next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
    provider: r.provider,
    provider_message_id: r.provider_message_id,
    last_error: r.last_error,
    created_at: Number(r.created_at),
    sent_at: r.sent_at ? Number(r.sent_at) : null,
    delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
  };
}

export async function isEmailSuppressed(email: string): Promise<boolean> {
  const normEmail = email.toLowerCase().trim();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("SELECT 1 FROM email_suppressions WHERE email = $1 LIMIT 1", [normEmail]);
    return res.rows.length > 0;
  }

  const db = getSqliteDatabase();
  const row = db.prepare("SELECT 1 FROM email_suppressions WHERE email = ? LIMIT 1").get(normEmail);
  return Boolean(row);
}

export async function addEmailSuppression(email: string, reason: string, details?: string | null): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  const now = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO email_suppressions (email, reason, details, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason, details = EXCLUDED.details`,
      [normEmail, reason, details || null, now]
    );
    return;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO email_suppressions (email, reason, details, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET reason = excluded.reason, details = excluded.details`
  ).run(normEmail, reason, details || null, now);
}

export async function removeEmailSuppression(email: string): Promise<boolean> {
  const normEmail = email.toLowerCase().trim();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query("DELETE FROM email_suppressions WHERE email = $1", [normEmail]);
    return (res.rowCount ?? 0) > 0;
  }

  const db = getSqliteDatabase();
  const res = db.prepare("DELETE FROM email_suppressions WHERE email = ?").run(normEmail);
  return res.changes > 0;
}

export async function getEmailSuppressions(limit = 50, offset = 0): Promise<DbEmailSuppression[]> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      "SELECT * FROM email_suppressions ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    return res.rows.map((r) => ({
      email: r.email,
      reason: r.reason,
      details: r.details,
      created_at: Number(r.created_at),
    }));
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    "SELECT * FROM email_suppressions ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset) as any[];

  return rows.map((r) => ({
    email: r.email,
    reason: r.reason,
    details: r.details,
    created_at: Number(r.created_at),
  }));
}

export async function recordEmailEvent(event: DbEmailEvent): Promise<void> {
  const now = event.created_at || Date.now();
  const payloadJson = JSON.stringify(event.payload_json || {});
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO email_events (event_id, job_id, provider, event_type, recipient, payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.event_id, event.job_id || null, event.provider, event.event_type, event.recipient.toLowerCase().trim(), payloadJson, now]
    );

    // If bounce or complaint, automatically suppress email
    if (event.event_type === "bounced" || event.event_type === "bounce" || event.event_type === "complaint" || event.event_type === "spam") {
      await addEmailSuppression(event.recipient, event.event_type, `Auto-suppressed via ${event.provider} webhook`);
    }

    // Update job status if matching job exists
    if (event.job_id) {
      if (event.event_type === "delivered") {
        await updateEmailJobStatus(event.job_id, { status: "delivered", delivered_at: now });
      } else if (event.event_type === "bounced" || event.event_type === "bounce") {
        await updateEmailJobStatus(event.job_id, { status: "bounced", last_error: "Recipient bounced" });
      }
    }
    return;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT OR IGNORE INTO email_events (event_id, job_id, provider, event_type, recipient, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(event.event_id, event.job_id || null, event.provider, event.event_type, event.recipient.toLowerCase().trim(), payloadJson, now);

  if (event.event_type === "bounced" || event.event_type === "bounce" || event.event_type === "complaint" || event.event_type === "spam") {
    await addEmailSuppression(event.recipient, event.event_type, `Auto-suppressed via ${event.provider} webhook`);
  }

  if (event.job_id) {
    if (event.event_type === "delivered") {
      await updateEmailJobStatus(event.job_id, { status: "delivered", delivered_at: now });
    } else if (event.event_type === "bounced" || event.event_type === "bounce") {
      await updateEmailJobStatus(event.job_id, { status: "bounced", last_error: "Recipient bounced" });
    }
  }
}

export async function createEmailToken(data: {
  tokenHash: string;
  userId?: string | null;
  email: string;
  tokenType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  expiresInMs: number;
}): Promise<void> {
  const now = Date.now();
  const expiresAt = now + data.expiresInMs;
  const metaJson = JSON.stringify(data.metadata || {});

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO email_tokens (token_hash, user_id, email, token_type, metadata_json, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.tokenHash, data.userId || null, data.email.toLowerCase().trim(), data.tokenType, metaJson, expiresAt, now]
    );
    return;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO email_tokens (token_hash, user_id, email, token_type, metadata_json, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(data.tokenHash, data.userId || null, data.email.toLowerCase().trim(), data.tokenType, metaJson, expiresAt, now);
}

export async function consumeEmailToken(
  tokenHash: string,
  expectedType: string
): Promise<DbEmailToken | null> {
  const now = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `UPDATE email_tokens
       SET used_at = $1
       WHERE token_hash = $2 AND token_type = $3 AND used_at IS NULL AND expires_at > $1
       RETURNING *`,
      [now, tokenHash, expectedType]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      token_hash: r.token_hash,
      user_id: r.user_id,
      email: r.email,
      token_type: r.token_type,
      metadata_json: typeof r.metadata_json === "string" ? JSON.parse(r.metadata_json) : r.metadata_json,
      expires_at: Number(r.expires_at),
      used_at: Number(r.used_at),
      created_at: Number(r.created_at),
    };
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(
    `SELECT * FROM email_tokens
     WHERE token_hash = ? AND token_type = ? AND used_at IS NULL AND expires_at > ?`
  ).get(tokenHash, expectedType, now) as any;

  if (!row) return null;

  db.prepare("UPDATE email_tokens SET used_at = ? WHERE token_hash = ?").run(now, tokenHash);

  return {
    token_hash: row.token_hash,
    user_id: row.user_id,
    email: row.email,
    token_type: row.token_type,
    metadata_json: typeof row.metadata_json === "string" ? JSON.parse(row.metadata_json) : row.metadata_json,
    expires_at: Number(row.expires_at),
    used_at: now,
    created_at: Number(row.created_at),
  };
}

export async function getEmailOutboxStats(): Promise<{
  queued: number;
  processing: number;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  total: number;
  suppressionsCount: number;
}> {
  if (isPostgresConfigured()) {
    try {
      const pool = getPostgresPool();
      const [countsRes, suppRes] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'queued') as queued,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
            COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
            COUNT(*) FILTER (WHERE status = 'failed') as failed
          FROM email_outbox
        `),
        pool.query("SELECT COUNT(*) as c FROM email_suppressions"),
      ]);

      const c = countsRes.rows[0];
      return {
        total: Number(c.total || 0),
        queued: Number(c.queued || 0),
        processing: Number(c.processing || 0),
        sent: Number(c.sent || 0),
        delivered: Number(c.delivered || 0),
        bounced: Number(c.bounced || 0),
        failed: Number(c.failed || 0),
        suppressionsCount: Number(suppRes.rows[0]?.c || 0),
      };
    } catch (e) {
      console.error("[DB] PostgreSQL getEmailOutboxStats error:", e);
    }
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM email_outbox
  `).get() as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suppRow = db.prepare("SELECT COUNT(*) as c FROM email_suppressions").get() as any;

  return {
    total: Number(row?.total || 0),
    queued: Number(row?.queued || 0),
    processing: Number(row?.processing || 0),
    sent: Number(row?.sent || 0),
    delivered: Number(row?.delivered || 0),
    bounced: Number(row?.bounced || 0),
    failed: Number(row?.failed || 0),
    suppressionsCount: Number(suppRow?.c || 0),
  };
}

export async function getEmailJobsList(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  templateId?: string;
  search?: string;
}): Promise<{
  jobs: DbEmailJob[];
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
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let pIdx = 1;

    if (options.status) {
      conditions.push(`status = $${pIdx++}`);
      params.push(options.status);
    }
    if (options.templateId) {
      conditions.push(`template_id = $${pIdx++}`);
      params.push(options.templateId);
    }
    if (options.search) {
      conditions.push(`(recipient ILIKE $${pIdx} OR subject ILIKE $${pIdx})`);
      params.push(`%${options.search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await pool.query(`SELECT COUNT(*) as c FROM email_outbox ${whereClause}`, params);
    const totalCount = Number(countRes.rows[0]?.c || 0);

    const listRes = await pool.query(
      `SELECT * FROM email_outbox ${whereClause} ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx}`,
      [...params, pageSize, offset]
    );

    const jobs: DbEmailJob[] = listRes.rows.map((r) => ({
      id: r.id,
      idempotency_key: r.idempotency_key,
      sender: r.sender,
      recipient: r.recipient,
      subject: r.subject,
      template_id: r.template_id,
      template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
      locale: r.locale,
      status: r.status,
      retry_count: Number(r.retry_count || 0),
      max_retries: Number(r.max_retries || 5),
      next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
      provider: r.provider,
      provider_message_id: r.provider_message_id,
      last_error: r.last_error,
      created_at: Number(r.created_at),
      sent_at: r.sent_at ? Number(r.sent_at) : null,
      delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
    }));

    return {
      jobs,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  const db = getSqliteDatabase();
  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options.status) {
    conditions.push("status = ?");
    params.push(options.status);
  }
  if (options.templateId) {
    conditions.push("template_id = ?");
    params.push(options.templateId);
  }
  if (options.search) {
    conditions.push("(recipient LIKE ? OR subject LIKE ?)");
    const s = `%${options.search.trim()}%`;
    params.push(s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM email_outbox ${whereClause}`).get(...params) as any;
  const totalCount = Number(countRow?.c || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    `SELECT * FROM email_outbox ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as any[];

  const jobs: DbEmailJob[] = rows.map((r) => ({
    id: r.id,
    idempotency_key: r.idempotency_key,
    sender: r.sender,
    recipient: r.recipient,
    subject: r.subject,
    template_id: r.template_id,
    template_vars: typeof r.template_vars === "string" ? JSON.parse(r.template_vars) : r.template_vars,
    locale: r.locale,
    status: r.status,
    retry_count: Number(r.retry_count || 0),
    max_retries: Number(r.max_retries || 5),
    next_retry_at: r.next_retry_at ? Number(r.next_retry_at) : null,
    provider: r.provider,
    provider_message_id: r.provider_message_id,
    last_error: r.last_error,
    created_at: Number(r.created_at),
    sent_at: r.sent_at ? Number(r.sent_at) : null,
    delivered_at: r.delivered_at ? Number(r.delivered_at) : null,
  }));

  return {
    jobs,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ============================================================================
// INBOUND EMAIL TICKET MANAGEMENT & HUMAN RESOLUTION
// ============================================================================

export type InboundMailbox = "admin" | "support" | "security";
export type InboundTicketStatus = "new" | "auto_replied" | "needs_human" | "in_progress" | "resolved";

export interface InboundTicketMessage {
  id: string;
  sender_type: "user" | "bot" | "staff";
  sender_email?: string;
  sender_name?: string;
  content: string;
  created_at: number;
}

export interface InboundTicket {
  id: string;
  case_id: string;
  resend_email_id: string | null;
  message_id: string | null;
  mailbox: InboundMailbox;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  body_text: string | null;
  status: InboundTicketStatus;
  agent_reply: string | null;
  human_reply: string | null;
  replied_by: string | null;
  replied_at: number | null;
  messages: InboundTicketMessage[];
  created_at: number;
  updated_at: number;
}

export function mapDbInboundTicketRow(r: any): InboundTicket {
  let parsedMessages: InboundTicketMessage[] = [];
  if (r.messages) {
    try {
      const raw = typeof r.messages === "string" ? JSON.parse(r.messages) : r.messages;
      if (Array.isArray(raw)) {
        parsedMessages = raw;
      }
    } catch {
      parsedMessages = [];
    }
  }

  // If no stored messages array exists (e.g. legacy row), synthesize messages from fields
  if (parsedMessages.length === 0) {
    if (r.body_text) {
      parsedMessages.push({
        id: `msg-${r.id}-user-initial`,
        sender_type: "user",
        sender_email: r.sender_email,
        sender_name: r.sender_name || undefined,
        content: r.body_text,
        created_at: Number(r.created_at),
      });
    }
    if (r.agent_reply) {
      parsedMessages.push({
        id: `msg-${r.id}-bot-auto`,
        sender_type: "bot",
        sender_name: "RateUrProfs AI Assistant",
        content: r.agent_reply,
        created_at: Number(r.created_at) + 1000,
      });
    }
    if (r.human_reply) {
      parsedMessages.push({
        id: `msg-${r.id}-staff-reply`,
        sender_type: "staff",
        sender_name: r.replied_by || "Quản trị viên",
        content: r.human_reply,
        created_at: r.replied_at ? Number(r.replied_at) : Number(r.updated_at),
      });
    }
  }

  return {
    id: r.id,
    case_id: r.case_id,
    resend_email_id: r.resend_email_id || null,
    message_id: r.message_id || null,
    mailbox: r.mailbox,
    sender_email: r.sender_email,
    sender_name: r.sender_name || null,
    subject: r.subject || "No Subject",
    body_text: r.body_text || null,
    status: r.status,
    agent_reply: r.agent_reply || null,
    human_reply: r.human_reply || null,
    replied_by: r.replied_by || null,
    replied_at: r.replied_at ? Number(r.replied_at) : null,
    messages: parsedMessages,
    created_at: Number(r.created_at),
    updated_at: Number(r.updated_at),
  };
}

export function generateCaseId(mailbox: InboundMailbox): string {
  const prefix = mailbox === "security" ? "RUP-SEC" : mailbox === "admin" ? "RUP-ADM" : "RUP-SUP";
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

export async function createInboundTicket(ticket: {
  id: string;
  case_id?: string;
  resend_email_id?: string | null;
  message_id?: string | null;
  mailbox: InboundMailbox;
  sender_email: string;
  sender_name?: string | null;
  subject: string;
  body_text?: string | null;
  status?: InboundTicketStatus;
  agent_reply?: string | null;
  messages?: InboundTicketMessage[];
  created_at?: number;
}): Promise<InboundTicket> {
  const now = Date.now();
  const caseId = ticket.case_id || generateCaseId(ticket.mailbox);
  const status: InboundTicketStatus = ticket.status || "new";

  const initialMessages: InboundTicketMessage[] = ticket.messages ? [...ticket.messages] : [];
  if (initialMessages.length === 0) {
    if (ticket.body_text) {
      initialMessages.push({
        id: `msg-${ticket.id}-user`,
        sender_type: "user",
        sender_email: ticket.sender_email.trim().toLowerCase(),
        sender_name: ticket.sender_name || undefined,
        content: ticket.body_text,
        created_at: ticket.created_at || now,
      });
    }
    if (ticket.agent_reply) {
      initialMessages.push({
        id: `msg-${ticket.id}-bot`,
        sender_type: "bot",
        sender_name: "RateUrProfs AI Assistant",
        content: ticket.agent_reply,
        created_at: (ticket.created_at || now) + 1000,
      });
    }
  }

  const messagesJson = JSON.stringify(initialMessages);

  const fullTicket: InboundTicket = {
    id: ticket.id,
    case_id: caseId,
    resend_email_id: ticket.resend_email_id || null,
    message_id: ticket.message_id || null,
    mailbox: ticket.mailbox,
    sender_email: ticket.sender_email.trim().toLowerCase(),
    sender_name: ticket.sender_name || null,
    subject: ticket.subject || "No Subject",
    body_text: ticket.body_text || null,
    status,
    agent_reply: ticket.agent_reply || null,
    human_reply: null,
    replied_by: null,
    replied_at: null,
    messages: initialMessages,
    created_at: ticket.created_at || now,
    updated_at: now,
  };

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO inbound_tickets (
        id, case_id, resend_email_id, message_id, mailbox, sender_email,
        sender_name, subject, body_text, status, agent_reply, human_reply,
        replied_by, replied_at, messages, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        fullTicket.id,
        fullTicket.case_id,
        fullTicket.resend_email_id,
        fullTicket.message_id,
        fullTicket.mailbox,
        fullTicket.sender_email,
        fullTicket.sender_name,
        fullTicket.subject,
        fullTicket.body_text,
        fullTicket.status,
        fullTicket.agent_reply,
        fullTicket.human_reply,
        fullTicket.replied_by,
        fullTicket.replied_at,
        messagesJson,
        fullTicket.created_at,
        fullTicket.updated_at,
      ]
    );
    return fullTicket;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO inbound_tickets (
      id, case_id, resend_email_id, message_id, mailbox, sender_email,
      sender_name, subject, body_text, status, agent_reply, human_reply,
      replied_by, replied_at, messages, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    fullTicket.id,
    fullTicket.case_id,
    fullTicket.resend_email_id,
    fullTicket.message_id,
    fullTicket.mailbox,
    fullTicket.sender_email,
    fullTicket.sender_name,
    fullTicket.subject,
    fullTicket.body_text,
    fullTicket.status,
    fullTicket.agent_reply,
    fullTicket.human_reply,
    fullTicket.replied_by,
    fullTicket.replied_at,
    messagesJson,
    fullTicket.created_at,
    fullTicket.updated_at
  );

  return fullTicket;
}

export async function getInboundTickets(options: {
  mailbox?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  tickets: InboundTicket[];
  totalCount: number;
  countsByStatus: Record<string, number>;
}> {
  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const offset = Math.max(options.offset || 0, 0);

  const conditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [];

  if (options.mailbox && options.mailbox !== "all") {
    params.push(options.mailbox);
    conditions.push(`mailbox = $${params.length}`);
  }

  if (options.status && options.status !== "all") {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim()}%`;
    params.push(s);
    const pIdx = params.length;
    conditions.push(`(case_id ILIKE $${pIdx} OR sender_email ILIKE $${pIdx} OR subject ILIKE $${pIdx})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const countRes = await pool.query(`SELECT COUNT(*) as c FROM inbound_tickets ${whereClause}`, params);
    const totalCount = parseInt(countRes.rows[0]?.c || "0", 10);

    // Also get status counts for authorized mailbox
    const mbCond = options.mailbox && options.mailbox !== "all" ? `WHERE mailbox = '${options.mailbox}'` : "";
    const statusCountsRes = await pool.query(
      `SELECT status, COUNT(*) as c FROM inbound_tickets ${mbCond} GROUP BY status`
    );
    const countsByStatus: Record<string, number> = { all: totalCount, needs_human: 0, auto_replied: 0, in_progress: 0, resolved: 0, new: 0 };
    for (const r of statusCountsRes.rows) {
      countsByStatus[r.status] = parseInt(r.c || "0", 10);
    }

    const rowsRes = await pool.query(
      `SELECT * FROM inbound_tickets ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const tickets: InboundTicket[] = rowsRes.rows.map(mapDbInboundTicketRow);

    return { tickets, totalCount, countsByStatus };
  }

  // SQLite fallback
  const db = getSqliteDatabase();
  const sqliteConditions: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqliteParams: any[] = [];

  if (options.mailbox && options.mailbox !== "all") {
    sqliteParams.push(options.mailbox);
    sqliteConditions.push("mailbox = ?");
  }

  if (options.status && options.status !== "all") {
    sqliteParams.push(options.status);
    sqliteConditions.push("status = ?");
  }

  if (options.search && options.search.trim()) {
    sqliteParams.push(`%${options.search.trim()}%`);
    sqliteConditions.push("(case_id LIKE ? OR sender_email LIKE ? OR subject LIKE ?)");
  }

  const sqliteWhere = sqliteConditions.length > 0 ? `WHERE ${sqliteConditions.join(" AND ")}` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM inbound_tickets ${sqliteWhere}`).get(...sqliteParams) as any;
  const totalCount = Number(countRow?.c || 0);

  const mbCond = options.mailbox && options.mailbox !== "all" ? `WHERE mailbox = '${options.mailbox}'` : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusRows = db.prepare(`SELECT status, COUNT(*) as c FROM inbound_tickets ${mbCond} GROUP BY status`).all() as any[];
  const countsByStatus: Record<string, number> = { all: totalCount, needs_human: 0, auto_replied: 0, in_progress: 0, resolved: 0, new: 0 };
  for (const r of statusRows) {
    countsByStatus[r.status] = Number(r.c || 0);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(
    `SELECT * FROM inbound_tickets ${sqliteWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...sqliteParams, limit, offset) as any[];

  const tickets: InboundTicket[] = rows.map(mapDbInboundTicketRow);

  return { tickets, totalCount, countsByStatus };
}

export async function getInboundTicketById(id: string): Promise<InboundTicket | null> {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      "SELECT * FROM inbound_tickets WHERE id = $1 OR case_id = $1 LIMIT 1",
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapDbInboundTicketRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = db.prepare("SELECT * FROM inbound_tickets WHERE id = ? OR case_id = ? LIMIT 1").get(id, id) as any;
  if (!r) return null;

  return mapDbInboundTicketRow(r);
}

export async function replyInboundTicket(
  ticketId: string,
  humanReply: string,
  staffUser: { email: string; name?: string },
  options?: { closeTicket?: boolean }
): Promise<InboundTicket | null> {
  const existing = await getInboundTicketById(ticketId);
  if (!existing) return null;

  const now = Date.now();
  const staffIdentifier = staffUser.name ? `${staffUser.name} <${staffUser.email}>` : staffUser.email;
  const newStatus: InboundTicketStatus = options?.closeTicket ? "resolved" : "in_progress";

  const updatedMessages: InboundTicketMessage[] = [...(existing.messages || [])];
  updatedMessages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender_type: "staff",
    sender_email: staffUser.email,
    sender_name: staffUser.name || "Quản trị viên",
    content: humanReply,
    created_at: now,
  });

  const messagesJson = JSON.stringify(updatedMessages);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `UPDATE inbound_tickets
       SET status = $1,
           human_reply = $2,
           replied_by = $3,
           replied_at = $4,
           messages = $5,
           updated_at = $4
       WHERE id = $6 OR case_id = $6
       RETURNING *`,
      [newStatus, humanReply, staffIdentifier, now, messagesJson, ticketId]
    );
    if (res.rows.length === 0) return null;
    return mapDbInboundTicketRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  db.prepare(
    `UPDATE inbound_tickets
     SET status = ?,
         human_reply = ?,
         replied_by = ?,
         replied_at = ?,
         messages = ?,
         updated_at = ?
     WHERE id = ? OR case_id = ?`
  ).run(newStatus, humanReply, staffIdentifier, now, messagesJson, now, ticketId, ticketId);

  return getInboundTicketById(ticketId);
}

export async function updateInboundTicketStatus(
  ticketId: string,
  status: InboundTicketStatus
): Promise<InboundTicket | null> {
  const now = Date.now();
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `UPDATE inbound_tickets
       SET status = $1,
           updated_at = $2
       WHERE id = $3 OR case_id = $3
       RETURNING *`,
      [status, now, ticketId]
    );
    if (res.rows.length === 0) return null;
    return mapDbInboundTicketRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  db.prepare(
    `UPDATE inbound_tickets
     SET status = ?,
         updated_at = ?
     WHERE id = ? OR case_id = ?`
  ).run(status, now, ticketId, ticketId);

  return getInboundTicketById(ticketId);
}

export async function appendInboundTicketMessage(
  ticketId: string,
  message: {
    sender_type: "user" | "bot" | "staff";
    sender_email?: string;
    sender_name?: string;
    content: string;
    status?: InboundTicketStatus;
  }
): Promise<InboundTicket | null> {
  const existing = await getInboundTicketById(ticketId);
  if (!existing) return null;

  const now = Date.now();
  const nextStatus = message.status || (message.sender_type === "user" ? "needs_human" : existing.status);

  const updatedMessages: InboundTicketMessage[] = [...(existing.messages || [])];
  updatedMessages.push({
    id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
    sender_type: message.sender_type,
    sender_email: message.sender_email,
    sender_name: message.sender_name,
    content: message.content,
    created_at: now,
  });

  const messagesJson = JSON.stringify(updatedMessages);

  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    const res = await pool.query(
      `UPDATE inbound_tickets
       SET status = $1,
           messages = $2,
           updated_at = $3
       WHERE id = $4 OR case_id = $4
       RETURNING *`,
      [nextStatus, messagesJson, now, ticketId]
    );
    if (res.rows.length === 0) return null;
    return mapDbInboundTicketRow(res.rows[0]);
  }

  const db = getSqliteDatabase();
  db.prepare(
    `UPDATE inbound_tickets
     SET status = ?,
         messages = ?,
         updated_at = ?
     WHERE id = ? OR case_id = ?`
  ).run(nextStatus, messagesJson, now, ticketId, ticketId);

  return getInboundTicketById(ticketId);
}



