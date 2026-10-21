"""Persistent SQLite and JSON Storage Engine for RateUrProfs Collection Pipeline."""

from __future__ import annotations
import os
import json
import sqlite3
import time
from typing import List, Dict, Any, Optional, Tuple, Set

from data_collection.config import CONFIG
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator


class StorageEngine:
    """Production-grade relational storage engine for academic entities, queue jobs, and provenance."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or CONFIG.SQLITE_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns SQLite connection configured with busy timeout, foreign keys and normal synchronous mode."""
        conn = sqlite3.connect(self.db_path, timeout=60.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 60000;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def init_db(self):
        """Initializes normalized database schema with appropriate indexes."""
        # Ensure WAL journal mode is set once on database initialization
        with sqlite3.connect(self.db_path, timeout=60.0) as init_conn:
            init_conn.execute("PRAGMA journal_mode = WAL;")
            init_conn.execute("PRAGMA busy_timeout = 60000;")
        with self.get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS universities (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                short_name TEXT NOT NULL,
                english_name TEXT,
                city TEXT,
                region TEXT,
                official_domain TEXT,
                official_website TEXT,
                institution_type TEXT DEFAULT 'university',
                total_professors INTEGER DEFAULT 0,
                collection_status TEXT DEFAULT 'discovered',
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS faculties (
                id TEXT PRIMARY KEY,
                university_id TEXT NOT NULL,
                name TEXT NOT NULL,
                name_en TEXT,
                website_url TEXT,
                directory_url TEXT,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                faculty_id TEXT NOT NULL,
                university_id TEXT NOT NULL,
                name TEXT NOT NULL,
                name_en TEXT,
                FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS lecturers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                normalized_name TEXT NOT NULL,
                title TEXT,
                academic_title TEXT,
                academic_rank TEXT,
                position TEXT,
                avatar TEXT,
                bio TEXT,
                verification_status TEXT DEFAULT 'verified',
                confidence_score REAL DEFAULT 1.0,
                rating_average REAL,
                rating_count INTEGER DEFAULT 0,
                take_again_percent INTEGER,
                difficulty_score REAL,
                source_urls_json TEXT,
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS affiliations (
                id TEXT PRIMARY KEY,
                lecturer_id TEXT NOT NULL,
                university_id TEXT NOT NULL,
                university_name TEXT,
                university_short_name TEXT,
                faculty TEXT,
                department TEXT,
                affiliation_status TEXT DEFAULT 'permanent',
                is_primary INTEGER DEFAULT 1,
                source_url TEXT,
                created_at INTEGER,
                FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY,
                university_id TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                domain TEXT NOT NULL,
                source_type TEXT NOT NULL,
                crawl_policy TEXT DEFAULT 'allowed',
                status TEXT DEFAULT 'pending_crawl',
                content_hash TEXT,
                last_crawled_at INTEGER,
                failure_count INTEGER DEFAULT 0,
                last_error_message TEXT,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS crawl_jobs (
                id TEXT PRIMARY KEY,
                source_id TEXT,
                university_id TEXT,
                url TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'queued',
                priority INTEGER DEFAULT 10,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 5,
                last_error TEXT,
                next_retry_at INTEGER,
                started_at INTEGER,
                completed_at INTEGER,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS crawl_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT,
                url TEXT NOT NULL,
                http_status INTEGER,
                duration_ms INTEGER,
                records_extracted INTEGER DEFAULT 0,
                error_category TEXT,
                error_message TEXT,
                logged_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS provenance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lecturer_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                source_url TEXT NOT NULL,
                extracted_at INTEGER NOT NULL,
                confidence REAL DEFAULT 1.0,
                source_type TEXT,
                FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS entity_match_candidates (
                id TEXT PRIMARY KEY,
                source_professor_id TEXT NOT NULL,
                candidate_professor_id TEXT NOT NULL,
                source_name TEXT NOT NULL,
                candidate_name TEXT NOT NULL,
                source_university TEXT,
                candidate_university TEXT,
                match_score REAL NOT NULL,
                match_reasons_json TEXT,
                status TEXT DEFAULT 'pending',
                detected_at INTEGER NOT NULL,
                resolved_at INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_lecturers_normalized_name ON lecturers(normalized_name);
            CREATE INDEX IF NOT EXISTS idx_lecturers_academic_rank ON lecturers(academic_rank);
            CREATE INDEX IF NOT EXISTS idx_affiliations_lecturer ON affiliations(lecturer_id);
            CREATE INDEX IF NOT EXISTS idx_affiliations_university ON affiliations(university_id);
            CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
            CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
            CREATE INDEX IF NOT EXISTS idx_crawl_jobs_next_retry ON crawl_jobs(next_retry_at);
            """)

    def clean_invalid_records(self) -> int:
        """Removes known non-human / navigational false positive records."""
        removed = 0
        try:
            with self.get_connection() as conn:
                rows = conn.execute("SELECT id, name FROM lecturers;").fetchall()
                bad_ids = []
                for r in rows:
                    is_valid, _ = RecordValidator.is_valid_human_name(r["name"])
                    if not is_valid:
                        bad_ids.append(r["id"])

                if bad_ids:
                    conn.execute(
                        f"DELETE FROM affiliations WHERE lecturer_id IN ({','.join(['?']*len(bad_ids))});",
                        bad_ids
                    )
                    conn.execute(
                        f"DELETE FROM provenance WHERE lecturer_id IN ({','.join(['?']*len(bad_ids))});",
                        bad_ids
                    )
                    conn.execute(
                        f"DELETE FROM lecturers WHERE id IN ({','.join(['?']*len(bad_ids))});",
                        bad_ids
                    )
                    removed = len(bad_ids)
        except Exception:
            pass
        return removed

    def batch_upsert_universities(self, universities: List[Dict[str, Any]]) -> int:
        """Idempotently upserts institutions into the database."""
        now = int(time.time() * 1000)
        rows = []
        for u in universities:
            uid = u.get("id")
            if not uid:
                continue
            rows.append((
                uid,
                u.get("name"),
                u.get("short_name") or u.get("shortName") or uid.upper(),
                u.get("english_name") or u.get("englishName"),
                u.get("city"),
                u.get("region"),
                u.get("official_domain") or u.get("officialDomain"),
                u.get("official_website") or u.get("officialWebsite"),
                u.get("institution_type") or u.get("institutionType") or "university",
                now,
                now,
            ))

        with self.get_connection() as conn:
            conn.executemany("""
            INSERT INTO universities (
                id, name, short_name, english_name, city, region,
                official_domain, official_website, institution_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                short_name = excluded.short_name,
                english_name = COALESCE(excluded.english_name, universities.english_name),
                city = COALESCE(excluded.city, universities.city),
                region = COALESCE(excluded.region, universities.region),
                official_domain = COALESCE(excluded.official_domain, universities.official_domain),
                official_website = COALESCE(excluded.official_website, universities.official_website),
                updated_at = excluded.updated_at;
            """, rows)
        return len(rows)

    def batch_upsert_professors(self, professors: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        Idempotently inserts or updates professors, their primary affiliations, and provenance.
        Returns (professors_upserted, affiliations_upserted).
        """
        now = int(time.time() * 1000)
        lecturer_rows = []
        affiliation_rows = []
        provenance_rows = []
        referenced_unis = set()

        for p in professors:
            name = p.get("name")
            if not name:
                continue
            # Validate name
            is_valid, _ = RecordValidator.is_valid_human_name(name)
            if not is_valid:
                continue

            prof_id = p.get("id")
            uni_id = p.get("university_id") or p.get("universityId")
            if not uni_id:
                continue
            if not prof_id:
                prof_id = Normalizer.make_canonical_professor_id(uni_id, name)

            norm_name = Normalizer.normalize_name_for_matching(name)
            raw_title = p.get("title") or "Giảng viên"
            rank, degree, clean_title = Normalizer.parse_academic_ranks(raw_title)
            if p.get("academic_rank"):
                rank = p.get("academic_rank")

            src_urls = p.get("source_urls") or p.get("sourceUrls") or []
            if not src_urls and p.get("source_url"):
                src_urls = [p["source_url"]]
            src_json = json.dumps(src_urls, ensure_ascii=False) if src_urls else None

            lecturer_rows.append((
                prof_id,
                name.strip(),
                norm_name,
                clean_title,
                degree,
                rank,
                p.get("position"),
                p.get("avatar") or "",
                p.get("bio"),
                p.get("verification_status") or "verified",
                float(p.get("confidence_score") or 1.0),
                p.get("rating_average"),
                int(p.get("rating_count") or 0),
                p.get("take_again_percent"),
                p.get("difficulty_score"),
                src_json,
                p.get("created_at") or now,
                now,
            ))

            uni_name = p.get("university_name") or p.get("universityName") or uni_id
            uni_short = p.get("university_short_name") or p.get("universityShortName") or uni_id.upper()
            referenced_unis.add((uni_id, uni_name, uni_short))

            aff_id = f"aff-{prof_id}-{uni_id}"
            affiliation_rows.append((
                aff_id,
                prof_id,
                uni_id,
                uni_name,
                uni_short,
                Normalizer.normalize_department(p.get("faculty")),
                Normalizer.normalize_department(p.get("department")),
                "permanent",
                1,
                src_urls[0] if src_urls else None,
                now,
            ))

            for s_url in src_urls:
                provenance_rows.append((
                    prof_id,
                    "profile",
                    s_url,
                    now,
                    1.0,
                    p.get("source_type") or "official_faculty_page",
                ))

        if not lecturer_rows:
            return 0, 0

        with self.get_connection() as conn:
            # Ensure foreign key validity for universities
            conn.executemany("""
            INSERT INTO universities (id, name, short_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING;
            """, [(uid, uname, ushort, now, now) for uid, uname, ushort in referenced_unis])

            # Upsert lecturers
            conn.executemany("""
            INSERT INTO lecturers (
                id, name, normalized_name, title, academic_title, academic_rank,
                position, avatar, bio, verification_status, confidence_score,
                rating_average, rating_count, take_again_percent, difficulty_score,
                source_urls_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                normalized_name = excluded.normalized_name,
                title = excluded.title,
                academic_title = COALESCE(excluded.academic_title, lecturers.academic_title),
                academic_rank = COALESCE(excluded.academic_rank, lecturers.academic_rank),
                position = COALESCE(excluded.position, lecturers.position),
                avatar = CASE WHEN (excluded.avatar IS NOT NULL AND excluded.avatar != '') THEN excluded.avatar ELSE lecturers.avatar END,
                bio = COALESCE(excluded.bio, lecturers.bio),
                source_urls_json = COALESCE(excluded.source_urls_json, lecturers.source_urls_json),
                updated_at = excluded.updated_at;
            """, lecturer_rows)

            # Upsert affiliations
            conn.executemany("""
            INSERT INTO affiliations (
                id, lecturer_id, university_id, university_name, university_short_name,
                faculty, department, affiliation_status, is_primary, source_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                faculty = COALESCE(excluded.faculty, affiliations.faculty),
                department = COALESCE(excluded.department, affiliations.department),
                source_url = COALESCE(excluded.source_url, affiliations.source_url);
            """, affiliation_rows)

            # Insert provenance logs
            if provenance_rows:
                conn.executemany("""
                INSERT INTO provenance (
                    lecturer_id, field_name, source_url, extracted_at, confidence, source_type
                ) VALUES (?, ?, ?, ?, ?, ?);
                """, provenance_rows)

            # Update universities total_professors count
            conn.execute("""
            UPDATE universities
            SET total_professors = (
                SELECT COUNT(DISTINCT lecturer_id)
                FROM affiliations
                WHERE affiliations.university_id = universities.id
            );
            """)

        return len(lecturer_rows), len(affiliation_rows)

    def enqueue_jobs(self, urls_and_unis: List[Tuple[str, Optional[str], Optional[str], int]]) -> int:
        """
        Enqueues URL crawl jobs with priority.
        Tuple format: (url, university_id, source_id, priority)
        """
        rows = []
        for url, u_id, s_id, prio in urls_and_unis:
            clean = url.strip()
            job_id = f"job-{abs(hash(clean))}"
            rows.append((job_id, s_id, u_id, clean, "queued", prio, 0, 5, None))

        with self.get_connection() as conn:
            conn.executemany("""
            INSERT INTO crawl_jobs (
                id, source_id, university_id, url, status, priority,
                retry_count, max_retries, next_retry_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                priority = MAX(crawl_jobs.priority, excluded.priority),
                university_id = COALESCE(crawl_jobs.university_id, excluded.university_id);
            """, rows)
        return len(rows)

    def dequeue_jobs(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves eligible pending or retryable jobs."""
        now = int(time.time() * 1000)
        for attempt in range(3):
            try:
                with self.get_connection() as conn:
                    rows = conn.execute("""
                    SELECT id, url, university_id, source_id, status, priority,
                           retry_count, max_retries, last_error, next_retry_at
                    FROM crawl_jobs
                    WHERE status IN ('queued', 'retry_pending')
                      AND (next_retry_at IS NULL OR next_retry_at <= ?)
                    ORDER BY priority DESC, retry_count ASC, id ASC
                    LIMIT ?;
                    """, (now, limit)).fetchall()
                    return [dict(r) for r in rows]
            except sqlite3.OperationalError:
                if attempt == 2:
                    raise
                time.sleep(0.2 * (attempt + 1))
        return []

    def mark_job_status(
        self,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        records_extracted: int = 0,
        backoff_seconds: int = 0,
    ):
        """Updates job status with retry logic and logs attempt."""
        now = int(time.time() * 1000)
        with self.get_connection() as conn:
            if status == "completed":
                conn.execute("""
                UPDATE crawl_jobs
                SET status = 'completed', completed_at = ?, last_error = NULL
                WHERE id = ?;
                """, (now, job_id))
            elif status == "retry_pending":
                next_retry = now + (backoff_seconds * 1000)
                conn.execute("""
                UPDATE crawl_jobs
                SET status = 'retry_pending',
                    retry_count = retry_count + 1,
                    last_error = ?,
                    next_retry_at = ?
                WHERE id = ?;
                """, (error_message, next_retry, job_id))
            elif status == "failed":
                conn.execute("""
                UPDATE crawl_jobs
                SET status = 'failed',
                    retry_count = retry_count + 1,
                    last_error = ?,
                    next_retry_at = NULL
                WHERE id = ?;
                """, (error_message, job_id))
            elif status == "fetching":
                conn.execute("""
                UPDATE crawl_jobs
                SET status = 'fetching', started_at = ?
                WHERE id = ?;
                """, (now, job_id))

    def log_crawl_attempt(
        self,
        job_id: str,
        url: str,
        http_status: Optional[int],
        duration_ms: int,
        records_extracted: int,
        error_category: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Logs crawl metrics to audit table."""
        now = int(time.time() * 1000)
        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO crawl_logs (
                job_id, url, http_status, duration_ms, records_extracted,
                error_category, error_message, logged_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                job_id, url, http_status, duration_ms, records_extracted,
                error_category, error_message, now
            ))

    def export_to_verified_json(self, output_path: Optional[str] = None) -> int:
        """
        Exports all verified entities to the Next.js platform JSON format
        (src/data/verified_academic_data.json) to keep search and frontend fully in sync.
        """
        target_path = output_path or CONFIG.JSON_OUTPUT_PATH
        with self.get_connection() as conn:
            # 1. Fetch universities
            u_rows = conn.execute("SELECT * FROM universities ORDER BY id;").fetchall()
            universities = []
            for r in u_rows:
                universities.append({
                    "id": r["id"],
                    "name": r["name"],
                    "shortName": r["short_name"],
                    "englishName": r["english_name"],
                    "city": r["city"],
                    "region": r["region"],
                    "officialDomain": r["official_domain"],
                    "officialWebsite": r["official_website"],
                    "institutionType": r["institution_type"],
                    "totalProfessors": r["total_professors"],
                })

            # 2. Fetch lecturers with affiliations
            p_rows = conn.execute("""
            SELECT l.*, a.university_id, a.university_name, a.university_short_name,
                   a.faculty, a.department
            FROM lecturers l
            LEFT JOIN affiliations a ON a.lecturer_id = l.id AND a.is_primary = 1
            ORDER BY l.id;
            """).fetchall()

            professors = []
            for r in p_rows:
                src_list = []
                if r["source_urls_json"]:
                    try:
                        src_list = json.loads(r["source_urls_json"])
                    except Exception:
                        pass

                professors.append({
                    "id": r["id"],
                    "name": r["name"],
                    "title": r["title"] or "Giảng viên",
                    "academicTitle": r["academic_title"],
                    "academicRank": r["academic_rank"],
                    "position": r["position"],
                    "universityId": r["university_id"],
                    "universityName": r["university_name"],
                    "universityShortName": r["university_short_name"],
                    "faculty": r["faculty"] or "Ban Giảng huấn",
                    "department": r["department"],
                    "avatar": r["avatar"] or "",
                    "bio": r["bio"],
                    "verificationStatus": r["verification_status"],
                    "confidenceScore": r["confidence_score"],
                    "ratingAverage": r["rating_average"],
                    "ratingCount": r["rating_count"],
                    "takeAgainPercent": r["take_again_percent"],
                    "difficultyScore": r["difficulty_score"],
                    "sourceUrls": src_list,
                })

            # 3. Fetch sources
            s_rows = conn.execute("SELECT * FROM sources;").fetchall()
            sources = [dict(s) for s in s_rows]

            # 4. Fetch candidates
            c_rows = conn.execute("SELECT * FROM entity_match_candidates;").fetchall()
            candidates = [dict(c) for c in c_rows]

        output_payload = {
            "metadata": {
                "version": "2.0.0",
                "last_updated": int(time.time() * 1000),
                "generated_by": "RateUrProfs Nationwide Collection Pipeline",
                "total_professors": len(professors),
                "total_universities": len(universities),
            },
            "universities": universities,
            "professors": professors,
            "sources": sources,
            "entity_candidates": candidates,
        }

        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, ensure_ascii=False, indent=2)

        return len(professors)

    def get_stats(self) -> Dict[str, Any]:
        """Calculates audit metrics directly from SQL tables."""
        with self.get_connection() as conn:
            total_lecturers = conn.execute("SELECT COUNT(*) FROM lecturers;").fetchone()[0]
            verified_lecturers = conn.execute(
                "SELECT COUNT(*) FROM lecturers WHERE verification_status = 'verified';"
            ).fetchone()[0]
            gs_count = conn.execute("SELECT COUNT(*) FROM lecturers WHERE academic_rank = 'GS';").fetchone()[0]
            pgs_count = conn.execute("SELECT COUNT(*) FROM lecturers WHERE academic_rank = 'PGS';").fetchone()[0]

            total_unis = conn.execute("SELECT COUNT(*) FROM universities;").fetchone()[0]
            unis_with_faculty = conn.execute(
                "SELECT COUNT(DISTINCT university_id) FROM affiliations;"
            ).fetchone()[0]

            # Queue metrics
            job_stats = {}
            for r in conn.execute("SELECT status, COUNT(*) as cnt FROM crawl_jobs GROUP BY status;").fetchall():
                job_stats[r["status"]] = r["cnt"]

            # Regional breakdown
            regions = {}
            for r in conn.execute("""
            SELECT COALESCE(u.region, 'Unknown') as reg,
                   COUNT(DISTINCT u.id) as uni_count,
                   COUNT(DISTINCT a.lecturer_id) as prof_count
            FROM universities u
            LEFT JOIN affiliations a ON a.university_id = u.id
            GROUP BY u.region;
            """).fetchall():
                regions[r["reg"]] = {
                    "universities": r["uni_count"],
                    "professors": r["prof_count"],
                }

        return {
            "total_lecturers": total_lecturers,
            "verified_lecturers": verified_lecturers,
            "gs_count": gs_count,
            "pgs_count": pgs_count,
            "total_universities": total_unis,
            "universities_with_faculty": unis_with_faculty,
            "job_stats": job_stats,
            "regional_breakdown": regions,
            "national_hemis_benchmark": CONFIG.NATIONAL_HEMIS_BENCHMARK,
            "coverage_hemis_pct": round((verified_lecturers / CONFIG.NATIONAL_HEMIS_BENCHMARK) * 100, 2)
            if CONFIG.NATIONAL_HEMIS_BENCHMARK else 0.0,
        }
