"""SQLite Relational Storage Engine for RateProfCuaBan.
Provides normalized entity persistence, transactions in WAL mode, foreign keys,
and indexing for nationwide lecturer collection and fast search queries.
"""

from __future__ import annotations
import os
import sqlite3
import unicodedata
import time
from typing import List, Dict, Any, Optional, Tuple

from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    SourceRegistryRecord,
)


def strip_vietnamese_diacritics(text: str) -> str:
    """Normalize Vietnamese text to lowercase ASCII for fast, diacritic-insensitive matching."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "d")
    return text.lower().strip()


class SqliteStorage:
    """Production-grade normalized SQLite persistence layer with WAL mode."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = db_path
        else:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            self.db_path = os.path.join(base_dir, "src", "data", "rateprof.db")

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=60.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 60000;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def init_db(self):
        """Creates normalized tables, indices, and triggers."""
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
                url TEXT NOT NULL,
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

            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                lecturer_id TEXT NOT NULL,
                university_id TEXT NOT NULL,
                user_display_name TEXT,
                course_name TEXT,
                overall_rating REAL NOT NULL,
                difficulty_score REAL,
                take_again INTEGER,
                comment TEXT,
                helpful_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'published',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
                FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
            );

            -- Indexes for high-speed queries
            CREATE INDEX IF NOT EXISTS idx_lecturers_normalized_name ON lecturers(normalized_name);
            CREATE INDEX IF NOT EXISTS idx_lecturers_academic_rank ON lecturers(academic_rank);
            CREATE INDEX IF NOT EXISTS idx_affiliations_lecturer ON affiliations(lecturer_id);
            CREATE INDEX IF NOT EXISTS idx_affiliations_university ON affiliations(university_id);
            CREATE INDEX IF NOT EXISTS idx_affiliations_primary ON affiliations(is_primary);
            CREATE INDEX IF NOT EXISTS idx_universities_short_name ON universities(short_name);
            CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
            CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
            CREATE INDEX IF NOT EXISTS idx_crawl_jobs_next_retry ON crawl_jobs(next_retry_at);
            """)

    def batch_upsert_universities(self, universities: List[UniversityRecord]) -> int:
        """Upserts a list of universities in a single transaction."""
        now = int(time.time() * 1000)
        records = []
        for u in universities:
            records.append((
                u.id,
                u.name,
                u.short_name,
                u.english_name or None,
                u.city or None,
                u.region or None,
                u.official_domain or None,
                u.official_website or None,
                u.institution_type or "university",
                u.total_professors or 0,
                "completed" if u.total_professors > 0 else "discovered",
                now,
                now,
            ))

        with self.get_connection() as conn:
            conn.executemany("""
            INSERT INTO universities (
                id, name, short_name, english_name, city, region,
                official_domain, official_website, institution_type,
                total_professors, collection_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                short_name = excluded.short_name,
                english_name = COALESCE(excluded.english_name, universities.english_name),
                city = COALESCE(excluded.city, universities.city),
                region = COALESCE(excluded.region, universities.region),
                official_domain = COALESCE(excluded.official_domain, universities.official_domain),
                official_website = COALESCE(excluded.official_website, universities.official_website),
                total_professors = excluded.total_professors,
                collection_status = excluded.collection_status,
                updated_at = excluded.updated_at;
            """, records)
        return len(records)

    def batch_upsert_professors(self, professors: List[ProfessorRecord]) -> Tuple[int, int]:
        """
        Transactional upsert of lecturers and their primary institutional affiliations.
        Returns (professors_saved, affiliations_saved).
        """
        import json

        now = int(time.time() * 1000)
        lecturer_rows = []
        affiliation_rows = []

        for p in professors:
            norm_name = strip_vietnamese_diacritics(p.name)
            src_json = json.dumps(p.source_urls) if p.source_urls else None

            # Academic rank distinction
            rank = None
            if "GS" in p.title or "Giáo sư" in p.title:
                rank = "GS" if "PGS" not in p.title else "PGS"
            elif p.academic_title in ["GS", "PGS"]:
                rank = p.academic_title

            lecturer_rows.append((
                p.id,
                p.name,
                norm_name,
                p.title or "Giảng viên",
                p.academic_title or None,
                rank,
                p.position or None,
                p.avatar or None,
                p.bio or None,
                p.verification_status or "verified",
                p.confidence_score or 1.0,
                p.rating_average,
                p.rating_count or 0,
                p.take_again_percent,
                p.difficulty_score,
                src_json,
                p.last_verified_at or now,
                now,
            ))

            # Primary affiliation
            aff_id = f"aff-{p.id}-{p.university_id}"
            affiliation_rows.append((
                aff_id,
                p.id,
                p.university_id,
                p.university_name,
                p.university_short_name,
                p.faculty or None,
                p.department or None,
                "permanent",
                1,
                p.source_urls[0] if p.source_urls else None,
                now,
            ))

            # Additional affiliations if present
            if hasattr(p, "previous_affiliations") and p.previous_affiliations:
                for idx, prev in enumerate(p.previous_affiliations):
                    prev_aff_id = f"aff-{p.id}-{prev.get('universityId', f'prev-{idx}')}"
                    affiliation_rows.append((
                        prev_aff_id,
                        p.id,
                        prev.get("universityId", "external"),
                        prev.get("universityName", "Affiliated Institution"),
                        prev.get("universityShortName", "Affiliate"),
                        prev.get("role", "Giảng viên"),
                        None,
                        "visiting",
                        0,
                        None,
                        now,
                    ))

        with self.get_connection() as conn:
            # 0. Ensure all referenced universities exist to satisfy foreign key constraints
            needed_unis = set()
            for aff in affiliation_rows:
                # aff: (aff_id, lecturer_id, university_id, university_name, university_short_name, ...)
                needed_unis.add((aff[2], aff[3] or aff[2], aff[4] or aff[2]))

            conn.executemany("""
            INSERT INTO universities (id, name, short_name, total_professors, collection_status, created_at, updated_at)
            VALUES (?, ?, ?, 0, 'discovered', ?, ?)
            ON CONFLICT(id) DO NOTHING;
            """, [(uid, uname, ushort, now, now) for uid, uname, ushort in needed_unis])

            # 1. Upsert lecturers
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
                avatar = COALESCE(excluded.avatar, lecturers.avatar),
                bio = COALESCE(excluded.bio, lecturers.bio),
                verification_status = excluded.verification_status,
                confidence_score = excluded.confidence_score,
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
                affiliation_status = excluded.affiliation_status,
                is_primary = excluded.is_primary,
                source_url = COALESCE(excluded.source_url, affiliations.source_url);
            """, affiliation_rows)

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

    def batch_upsert_sources(self, sources: List[SourceRegistryRecord]) -> int:
        """Upserts discovered sources into the source registry."""
        records = []
        for s in sources:
            records.append((
                s.id,
                s.university_id,
                s.url,
                s.domain,
                s.source_type,
                s.crawl_policy,
                s.status,
                s.content_hash,
                s.last_crawled_at,
                s.failure_count,
                s.last_error_message,
            ))

        now = int(time.time() * 1000)
        with self.get_connection() as conn:
            # Ensure referenced universities exist to satisfy foreign key
            needed_unis = {(s.university_id, s.university_id) for s in sources if s.university_id}
            conn.executemany("""
            INSERT INTO universities (id, name, short_name, total_professors, collection_status, created_at, updated_at)
            VALUES (?, ?, ?, 0, 'discovered', ?, ?)
            ON CONFLICT(id) DO NOTHING;
            """, [(uid, uname, uname, now, now) for uid, uname in needed_unis])

            conn.executemany("""
            INSERT INTO sources (
                id, university_id, url, domain, source_type, crawl_policy,
                status, content_hash, last_crawled_at, failure_count, last_error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                status = excluded.status,
                content_hash = COALESCE(excluded.content_hash, sources.content_hash),
                last_crawled_at = COALESCE(excluded.last_crawled_at, sources.last_crawled_at),
                failure_count = excluded.failure_count,
                last_error_message = excluded.last_error_message;
            """, records)
        return len(records)

    def get_stats(self) -> Dict[str, Any]:
        """Calculates exact audit metrics directly from SQL tables."""
        with self.get_connection() as conn:
            total_lecturers = conn.execute("SELECT COUNT(*) FROM lecturers;").fetchone()[0]
            verified_lecturers = conn.execute(
                "SELECT COUNT(*) FROM lecturers WHERE verification_status = 'verified';"
            ).fetchone()[0]
            synthetic_lecturers = conn.execute(
                "SELECT COUNT(*) FROM lecturers WHERE bio LIKE '%giữ chức vụ%' OR name LIKE '%giữ chức vụ%';"
            ).fetchone()[0]

            total_unis = conn.execute("SELECT COUNT(*) FROM universities;").fetchone()[0]
            unis_with_faculty = conn.execute(
                "SELECT COUNT(DISTINCT university_id) FROM affiliations;"
            ).fetchone()[0]

            sources_total = conn.execute("SELECT COUNT(*) FROM sources;").fetchone()[0]
            sources_crawled = conn.execute(
                "SELECT COUNT(*) FROM sources WHERE status = 'crawled';"
            ).fetchone()[0]
            sources_pending = conn.execute(
                "SELECT COUNT(*) FROM sources WHERE status = 'pending_crawl';"
            ).fetchone()[0]
            sources_failed = conn.execute(
                "SELECT COUNT(*) FROM sources WHERE status = 'failed';"
            ).fetchone()[0]

            # Regional breakdown
            regions = {}
            for row in conn.execute("""
                SELECT
                    COALESCE(u.region, 'Unknown') as reg,
                    COUNT(DISTINCT u.id) as uni_count,
                    COUNT(DISTINCT a.lecturer_id) as prof_count
                FROM universities u
                LEFT JOIN affiliations a ON a.university_id = u.id
                GROUP BY u.region;
            """).fetchall():
                regions[row["reg"]] = {
                    "universities": row["uni_count"],
                    "professors": row["prof_count"],
                }

        return {
            "total_lecturers": total_lecturers,
            "verified_lecturers": verified_lecturers,
            "synthetic_lecturers": synthetic_lecturers,
            "total_universities": total_unis,
            "universities_with_faculty": unis_with_faculty,
            "sources_total": sources_total,
            "sources_crawled": sources_crawled,
            "sources_pending": sources_pending,
            "sources_failed": sources_failed,
            "regional_breakdown": regions,
        }
