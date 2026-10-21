"""Durable Task Queue and Crawl Job Management for RateProfCuaBan.
Maintains persistent crawl jobs in SQLite with explicit state transitions:
discovered -> queued -> fetching -> parsed -> validated -> stored (or retry_pending/failed).
"""

from __future__ import annotations
import sqlite3
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from pipeline.sql_storage import SqliteStorage


@dataclass
class CrawlJob:
    id: str
    url: str
    university_id: Optional[str] = None
    source_id: Optional[str] = None
    status: str = "queued"
    priority: int = 10
    retry_count: int = 0
    max_retries: int = 5
    last_error: Optional[str] = None
    next_retry_at: Optional[int] = None
    started_at: Optional[int] = None
    completed_at: Optional[int] = None


class PersistentCrawlerQueue:
    """Manages crawl queue in SQLite with exponential backoff and resume support."""

    def __init__(self, storage: Optional[SqliteStorage] = None):
        self.storage = storage or SqliteStorage()
        self.recover_stale_jobs()

    def recover_stale_jobs(self, timeout_seconds: int = 300) -> int:
        """Recovers jobs stuck in 'fetching' due to an ungraceful crash/restart."""
        stale_threshold = int((time.time() - timeout_seconds) * 1000)
        with self.storage.get_connection() as conn:
            cursor = conn.execute(
                """
                UPDATE crawl_jobs
                SET status = 'queued', started_at = NULL
                WHERE status = 'fetching'
                  AND (started_at IS NULL OR started_at <= ?);
                """,
                (stale_threshold,),
            )
            return cursor.rowcount

    def enqueue(
        self,
        url: str,
        university_id: Optional[str] = None,
        source_id: Optional[str] = None,
        priority: int = 10,
    ) -> str:
        """Enqueues a URL if not already completed or queued."""
        job_id = f"job-{abs(hash(url))}"
        with self.storage.get_connection() as conn:
            # Check if already completed
            existing = conn.execute(
                "SELECT id, status FROM crawl_jobs WHERE url = ?;", (url,)
            ).fetchone()

            if existing:
                if existing["status"] == "completed":
                    return existing["id"]
                # Update priority if needed
                conn.execute(
                    "UPDATE crawl_jobs SET priority = MAX(priority, ?), university_id = COALESCE(university_id, ?) WHERE id = ?;",
                    (priority, university_id, existing["id"]),
                )
                return existing["id"]

            if university_id:
                conn.execute(
                    """
                    INSERT INTO universities (id, name, short_name, total_professors, collection_status, created_at, updated_at)
                    VALUES (?, ?, ?, 0, 'discovered', ?, ?)
                    ON CONFLICT(id) DO NOTHING;
                    """,
                    (university_id, university_id, university_id, int(time.time() * 1000), int(time.time() * 1000)),
                )

            conn.execute(
                """
                INSERT INTO crawl_jobs (
                    id, source_id, university_id, url, status, priority,
                    retry_count, max_retries, next_retry_at
                ) VALUES (?, ?, ?, ?, 'queued', ?, 0, 5, NULL);
                """,
                (job_id, source_id, university_id, url, priority),
            )
        return job_id

    def dequeue(self, limit: int = 1) -> List[CrawlJob]:
        """Dequeues the next highest-priority pending jobs ready for execution."""
        now = int(time.time() * 1000)
        jobs: List[CrawlJob] = []

        with self.storage.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, url, university_id, source_id, status, priority,
                       retry_count, max_retries, last_error, next_retry_at,
                       started_at, completed_at
                FROM crawl_jobs
                WHERE status IN ('queued', 'retry_pending')
                  AND (next_retry_at IS NULL OR next_retry_at <= ?)
                ORDER BY priority DESC, retry_count ASC, id ASC
                LIMIT ?;
                """,
                (now, limit),
            ).fetchall()

            for r in rows:
                jobs.append(
                    CrawlJob(
                        id=r["id"],
                        url=r["url"],
                        university_id=r["university_id"],
                        source_id=r["source_id"],
                        status=r["status"],
                        priority=r["priority"],
                        retry_count=r["retry_count"],
                        max_retries=r["max_retries"],
                        last_error=r["last_error"],
                        next_retry_at=r["next_retry_at"],
                        started_at=r["started_at"],
                        completed_at=r["completed_at"],
                    )
                )

        return jobs

    def mark_fetching(self, job_id: str):
        """Marks a job as actively fetching."""
        now = int(time.time() * 1000)
        with self.storage.get_connection() as conn:
            conn.execute(
                "UPDATE crawl_jobs SET status = 'fetching', started_at = ? WHERE id = ?;",
                (now, job_id),
            )

    def mark_completed(self, job_id: str, records_extracted: int = 0):
        """Marks a job as successfully completed."""
        now = int(time.time() * 1000)
        with self.storage.get_connection() as conn:
            conn.execute(
                "UPDATE crawl_jobs SET status = 'completed', completed_at = ?, last_error = NULL WHERE id = ?;",
                (now, job_id),
            )

    def mark_failed(
        self, job_id: str, error_message: str, error_category: str = "network"
    ):
        """
        Handles job failure with exponential backoff:
        delay = min(3600, 10 * (2 ** retry_count)) seconds.
        If retry_count >= max_retries, sets status to 'failed'.
        """
        now = int(time.time() * 1000)
        with self.storage.get_connection() as conn:
            job = conn.execute(
                "SELECT retry_count, max_retries FROM crawl_jobs WHERE id = ?;",
                (job_id,),
            ).fetchone()

            if not job:
                return

            current_retries = job["retry_count"] + 1
            max_retries = job["max_retries"]

            if current_retries >= max_retries:
                conn.execute(
                    """
                    UPDATE crawl_jobs
                    SET status = 'failed', retry_count = ?, last_error = ?, next_retry_at = NULL
                    WHERE id = ?;
                    """,
                    (current_retries, f"[{error_category}] {error_message}", job_id),
                )
            else:
                backoff_seconds = min(3600, 10 * (2 ** (current_retries - 1)))
                next_retry = now + (backoff_seconds * 1000)
                conn.execute(
                    """
                    UPDATE crawl_jobs
                    SET status = 'retry_pending', retry_count = ?, last_error = ?, next_retry_at = ?
                    WHERE id = ?;
                    """,
                    (current_retries, f"[{error_category}] {error_message}", next_retry, job_id),
                )

    def log_crawl(
        self,
        job_id: str,
        url: str,
        http_status: Optional[int],
        duration_ms: int,
        records_extracted: int = 0,
        error_category: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Persists audit log for each crawl attempt."""
        now = int(time.time() * 1000)
        with self.storage.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO crawl_logs (
                    job_id, url, http_status, duration_ms, records_extracted,
                    error_category, error_message, logged_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    job_id,
                    url,
                    http_status,
                    duration_ms,
                    records_extracted,
                    error_category,
                    error_message,
                    now,
                ),
            )

    def get_queue_stats(self) -> Dict[str, int]:
        """Returns counts for all job states in the queue."""
        with self.storage.get_connection() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as count FROM crawl_jobs GROUP BY status;"
            ).fetchall()
            return {r["status"]: r["count"] for r in rows}
