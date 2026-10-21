"""Durable Background Collection Worker for RateProfCuaBan.
Runs multi-hour background ingestion sweeps, processes the persistent task queue,
handles retries with exponential backoff, and commits incremental checkpoints to SQLite.
"""

from __future__ import annotations
import sys
import time
import signal
import argparse
from typing import List

from pipeline.sql_storage import SqliteStorage
from pipeline.crawler_queue import PersistentCrawlerQueue, CrawlJob
from pipeline.crawler import PoliteFetcher
from pipeline.rights_checker import ImageRightsChecker
from pipeline.dedup import IdentityResolutionEngine
from pipeline.models import UniversityRecord, ProfessorRecord

# Adapters
from pipeline.adapters.hdgsnn_adapter import HdgsnnAdapter
from pipeline.adapters.hust_adapter import HustAdapter
from pipeline.adapters.vnu_uet_adapter import VnuUetAdapter
from pipeline.adapters.hcmut_adapter import HcmutAdapter
from pipeline.adapters.neu_adapter import NeuAdapter
from pipeline.adapters.ftu_adapter import FtuAdapter
from pipeline.adapters.uit_adapter import UitAdapter
from pipeline.adapters.dut_adapter import DutAdapter
from pipeline.adapters.ctu_adapter import CtuAdapter
from pipeline.adapters.generic_academic_adapter import GenericAcademicAdapter


class CollectionWorker:
    """Persistent background collection worker that continuously executes pending crawl jobs."""

    def __init__(self, db_path: str = None):
        self.storage = SqliteStorage(db_path)
        self.queue = PersistentCrawlerQueue(self.storage)
        self.fetcher = PoliteFetcher()
        self.adapters = [
            HdgsnnAdapter(),
            HustAdapter(),
            VnuUetAdapter(),
            HcmutAdapter(),
            NeuAdapter(),
            FtuAdapter(),
            UitAdapter(),
            DutAdapter(),
            CtuAdapter(),
            GenericAcademicAdapter(),
        ]
        self._running = True
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def _handle_signal(self, signum, frame):
        print(f"\n[Worker] Caught signal {signum}, gracefully terminating...")
        self._running = False

    def get_adapter(self, url: str):
        for a in self.adapters:
            if a.can_handle(url):
                return a
        return self.adapters[-1]

    def process_job(self, job: CrawlJob) -> int:
        """Processes a single CrawlJob and returns count of extracted lecturers."""
        self.queue.mark_fetching(job.id)
        start_t = time.time()
        print(f"[Worker] Fetching: {job.url}")

        try:
            html, status, meta = self.fetcher.fetch(job.url, check_robots=True)
            duration_ms = int((time.time() - start_t) * 1000)

            if status == 200 and html:
                adapter = self.get_adapter(job.url)
                extracted = adapter.extract_professors(html, job.url)
                
                # Assign image rights / avatars
                for p in extracted:
                    p.avatar = ImageRightsChecker.resolve_profile_image(p)

                # Incremental commit
                if extracted:
                    # Dynamically register discovered universities
                    with self.storage.get_connection() as conn:
                        existing_unis = {r["id"] for r in conn.execute("SELECT id FROM universities;").fetchall()}
                        new_unis = []
                        for p in extracted:
                            if p.university_id not in existing_unis:
                                new_unis.append(
                                    UniversityRecord(
                                        id=p.university_id,
                                        name=p.university_name,
                                        short_name=p.university_short_name,
                                        city="Việt Nam",
                                        region="national",
                                        official_domain=f"{p.university_id}.edu.vn",
                                        official_website="",
                                        faculties=[p.faculty] if p.faculty else [],
                                        institution_type="university",
                                    )
                                )
                                existing_unis.add(p.university_id)
                        if new_unis:
                            self.storage.batch_upsert_universities(new_unis)

                    # Deduplicate batch against itself
                    deduped, _ = IdentityResolutionEngine.deduplicate_batch(extracted, [])
                    self.storage.batch_upsert_professors(deduped)

                self.queue.mark_completed(job.id, len(extracted))
                self.queue.log_crawl(job.id, job.url, status, duration_ms, len(extracted))
                print(f"[Worker] Completed: {job.url} -> {len(extracted)} lecturers in {duration_ms}ms")
                return len(extracted)

            elif status == 403:
                is_robots = meta.get("error") == "Blocked by robots.txt policy"
                err_msg = "Blocked by robots.txt policy" if is_robots else "HTTP 403 Forbidden"
                self.queue.mark_failed(job.id, err_msg, "robots_policy" if is_robots else "http_403")
                self.queue.log_crawl(job.id, job.url, status, duration_ms, 0, "http_403", err_msg)
                print(f"[Worker] 403 Failed: {job.url} -> {err_msg}")
                return 0

            else:
                err_msg = meta.get("error", f"HTTP {status}")
                self.queue.mark_failed(job.id, err_msg, "http_status")
                self.queue.log_crawl(job.id, job.url, status, duration_ms, 0, "http_status", err_msg)
                print(f"[Worker] Failed: {job.url} -> {err_msg}")
                return 0

        except Exception as e:
            duration_ms = int((time.time() - start_t) * 1000)
            err_msg = str(e)
            self.queue.mark_failed(job.id, err_msg, "exception")
            self.queue.log_crawl(job.id, job.url, None, duration_ms, 0, "exception", err_msg)
            print(f"[Worker] Exception on {job.url}: {err_msg}")
            return 0

    def run_sweep(self, batch_size: int = 10) -> int:
        """Runs a single sweep through pending queue jobs."""
        jobs = self.queue.dequeue(limit=batch_size)
        if not jobs:
            return 0

        total_extracted = 0
        for job in jobs:
            if not self._running:
                break
            count = self.process_job(job)
            total_extracted += count
            time.sleep(1.0)  # Polite delay between jobs

        return total_extracted

    def start_loop(self, poll_interval: int = 5, batch_size: int = 10):
        """Continuously runs worker loop until interrupted."""
        print(f"[Worker] Starting collection daemon loop (interval={poll_interval}s, batch={batch_size})...")
        while self._running:
            extracted = self.run_sweep(batch_size=batch_size)
            if extracted == 0:
                time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="RateProfCuaBan Durable Collection Worker")
    parser.add_argument("--once", action="store_true", help="Run a single sweep and exit")
    parser.add_argument("--batch-size", type=int, default=15, help="Number of jobs per sweep")
    parser.add_argument("--interval", type=int, default=5, help="Seconds to sleep when idle")
    args = parser.parse_args()

    worker = CollectionWorker()
    if args.once:
        print("[Worker] Running single collection sweep...")
        worker.run_sweep(batch_size=args.batch_size)
        stats = worker.storage.get_stats()
        print(f"[Worker] Sweep done. Database state: {stats['verified_lecturers']} verified lecturers.")
    else:
        worker.start_loop(poll_interval=args.interval, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
