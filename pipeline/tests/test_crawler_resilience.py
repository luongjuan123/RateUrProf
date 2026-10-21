"""Unit Tests for Durable Crawler Queue, Exponential Backoff, and Stale Job Recovery."""

import unittest
import tempfile
import os
import time
from pipeline.sql_storage import SqliteStorage
from pipeline.crawler_queue import PersistentCrawlerQueue, CrawlJob


class TestCrawlerResilience(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_queue.db")
        self.storage = SqliteStorage(db_path=self.db_path)
        self.queue = PersistentCrawlerQueue(storage=self.storage)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_enqueue_and_dequeue_with_priority(self):
        """Verifies that high-priority jobs are dequeued first."""
        j1 = self.queue.enqueue("https://hust.edu.vn/low", university_id="hust", priority=5)
        j2 = self.queue.enqueue("https://hdgsnn.gov.vn/high", university_id="hdgsnn", priority=20)
        j3 = self.queue.enqueue("https://ctu.edu.vn/mid", university_id="ctu", priority=10)

        dequeued = self.queue.dequeue(limit=3)
        self.assertEqual(len(dequeued), 3)
        self.assertEqual(dequeued[0].id, j2, "Job with priority 20 should be dequeued first")
        self.assertEqual(dequeued[1].id, j3, "Job with priority 10 should be dequeued second")
        self.assertEqual(dequeued[2].id, j1, "Job with priority 5 should be dequeued third")

    def test_job_lifecycle_success(self):
        """Verifies state transition: queued -> fetching -> completed."""
        url = "https://uet.vnu.edu.vn/faculty"
        job_id = self.queue.enqueue(url, university_id="vnu-uet")

        # Mark fetching
        self.queue.mark_fetching(job_id)
        with self.storage.get_connection() as conn:
            status = conn.execute("SELECT status, started_at FROM crawl_jobs WHERE id = ?;", (job_id,)).fetchone()
            self.assertEqual(status["status"], "fetching")
            self.assertIsNotNone(status["started_at"])

        # Mark completed
        self.queue.mark_completed(job_id, records_extracted=25)
        with self.storage.get_connection() as conn:
            status = conn.execute("SELECT status, completed_at, last_error FROM crawl_jobs WHERE id = ?;", (job_id,)).fetchone()
            self.assertEqual(status["status"], "completed")
            self.assertIsNotNone(status["completed_at"])
            self.assertIsNone(status["last_error"])

    def test_exponential_backoff_and_terminal_failure(self):
        """Verifies exponential backoff retry scheduling and transition to failed."""
        url = "https://flakey.edu.vn/errors"
        job_id = self.queue.enqueue(url, university_id="flakey")

        # First failure -> retry_pending (retry_count 1, backoff 10s)
        self.queue.mark_failed(job_id, "HTTP 500", "http_status")
        with self.storage.get_connection() as conn:
            j = conn.execute("SELECT status, retry_count, next_retry_at FROM crawl_jobs WHERE id = ?;", (job_id,)).fetchone()
            self.assertEqual(j["status"], "retry_pending")
            self.assertEqual(j["retry_count"], 1)
            self.assertIsNotNone(j["next_retry_at"])

        # Subsequent retries until max_retries (5)
        for _ in range(4):
            self.queue.mark_failed(job_id, "HTTP 500", "http_status")

        with self.storage.get_connection() as conn:
            j_final = conn.execute("SELECT status, retry_count FROM crawl_jobs WHERE id = ?;", (job_id,)).fetchone()
            self.assertEqual(j_final["status"], "failed")
            self.assertEqual(j_final["retry_count"], 5)

    def test_stale_job_recovery(self):
        """Verifies that jobs stuck in 'fetching' past the threshold are safely recovered to 'queued'."""
        job_id = self.queue.enqueue("https://crashed.edu.vn/page", university_id="crash-u")
        self.queue.mark_fetching(job_id)

        # Artificially age the started_at timestamp
        old_time = int((time.time() - 600) * 1000)
        with self.storage.get_connection() as conn:
            conn.execute("UPDATE crawl_jobs SET started_at = ? WHERE id = ?;", (old_time, job_id))

        recovered_count = self.queue.recover_stale_jobs(timeout_seconds=300)
        self.assertEqual(recovered_count, 1)

        with self.storage.get_connection() as conn:
            status = conn.execute("SELECT status, started_at FROM crawl_jobs WHERE id = ?;", (job_id,)).fetchone()
            self.assertEqual(status["status"], "queued")
            self.assertIsNone(status["started_at"])

    def test_crawl_audit_logging(self):
        """Verifies persistent telemetry recording in crawl_logs."""
        job_id = self.queue.enqueue("https://test.edu.vn/audit", university_id="audit-u")
        self.queue.log_crawl(
            job_id=job_id,
            url="https://test.edu.vn/audit",
            http_status=200,
            duration_ms=450,
            records_extracted=15,
        )

        with self.storage.get_connection() as conn:
            log_row = conn.execute("SELECT * FROM crawl_logs WHERE job_id = ?;", (job_id,)).fetchone()
            self.assertIsNotNone(log_row)
            self.assertEqual(log_row["http_status"], 200)
            self.assertEqual(log_row["duration_ms"], 450)
            self.assertEqual(log_row["records_extracted"], 15)


if __name__ == "__main__":
    unittest.main()
