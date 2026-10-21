"""Continuous, Polite Collection Scheduler with Resumable Task Queuing and Backoff."""

from __future__ import annotations
import time
import ssl
import random
import urllib.parse
import urllib.robotparser
import urllib.request
from urllib.error import HTTPError, URLError
import concurrent.futures
import threading
from typing import List, Dict, Any, Optional, Tuple, Set

from data_collection.config import CONFIG
from data_collection.checkpoint import CheckpointManager
from data_collection.storage import StorageEngine
from data_collection.discovery import DiscoveryEngine
from data_collection.validation import RecordValidator
from data_collection.deduplication import DeduplicationEngine
from data_collection.monitoring import PipelineMonitor

# Collectors
from data_collection.collectors.base import BaseCollector
from data_collection.collectors.hdgsnn import HdgsnnCollector
from data_collection.collectors.ctu import CtuCollector
from data_collection.collectors.dut import DutCollector
from data_collection.collectors.hust import HustCollector
from data_collection.collectors.vnu import VnuCollector
from data_collection.collectors.vju import VjuCollector
from data_collection.collectors.vnuhcm import VnuHcmCollector
from data_collection.collectors.hau import HauCollector
from data_collection.collectors.generic import GenericAcademicCollector


SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE


import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class RateLimiter:
    """Manages robots.txt caching and per-domain polite rate limiting."""

    def __init__(self, user_agent: str = CONFIG.USER_AGENT, default_delay: float = CONFIG.DEFAULT_DOMAIN_DELAY):
        self.user_agent = user_agent
        self.default_delay = default_delay
        self._lock = threading.Lock()
        self._domain_locks: Dict[str, threading.Lock] = {}
        self._last_access: Dict[str, float] = {}
        self._robots_parsers: Dict[str, urllib.robotparser.RobotFileParser] = {}
        self._domain_delays: Dict[str, float] = {}
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

    def get_domain_lock(self, domain: str) -> threading.Lock:
        with self._lock:
            if domain not in self._domain_locks:
                self._domain_locks[domain] = threading.Lock()
            return self._domain_locks[domain]

    def can_fetch(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        if not domain:
            return False

        with self._lock:
            if domain not in self._robots_parsers:
                rp = urllib.robotparser.RobotFileParser()
                rp.set_url(f"https://{domain}/robots.txt")
                try:
                    resp = self.session.get(
                        f"https://{domain}/robots.txt",
                        timeout=(3, 4),
                        verify=False,
                    )
                    if resp.status_code == 200:
                        rp.parse(resp.text.splitlines())
                    else:
                        rp.allow_all = True
                except Exception:
                    rp.allow_all = True

                self._robots_parsers[domain] = rp
                delay = rp.crawl_delay(self.user_agent)
                self._domain_delays[domain] = float(delay) if delay else self.default_delay

        parser = self._robots_parsers[domain]
        try:
            return parser.can_fetch(self.user_agent, url)
        except Exception:
            return True

    def wait_for_domain(self, domain: str):
        """Enforces domain-specific polite crawl delay."""
        with self._lock:
            crawl_delay = self._domain_delays.get(domain, self.default_delay)
            now = time.time()
            last = self._last_access.get(domain, 0.0)
            elapsed = now - last
            wait_time = max(0.0, crawl_delay - elapsed)
            self._last_access[domain] = now + wait_time

        if wait_time > 0:
            time.sleep(wait_time)


class ContinuousScheduler:
    """Orchestrates long-running, multi-threaded, polite data collection across Vietnam."""

    def __init__(
        self,
        storage: Optional[StorageEngine] = None,
        checkpoint: Optional[CheckpointManager] = None,
        monitor: Optional[PipelineMonitor] = None,
    ):
        self.storage = storage or StorageEngine()
        self.checkpoint = checkpoint or CheckpointManager()
        self.monitor = monitor or PipelineMonitor()
        self.rate_limiter = RateLimiter()

        self.collectors: List[BaseCollector] = [
            HdgsnnCollector(),
            CtuCollector(),
            DutCollector(),
            HustCollector(),
            VjuCollector(),
            VnuCollector(),
            VnuHcmCollector(),
            HauCollector(),
            GenericAcademicCollector(),
        ]

        self._running = True
        self._lock = threading.Lock()
        self._lecturers_saved_since_export = 0

    def stop(self):
        """Signals worker to gracefully stop collection."""
        self.monitor.warn("Stopping collection scheduler gracefully...")
        self._running = False

    def get_collector_for_url(self, url: str) -> BaseCollector:
        for c in self.collectors:
            if c.can_handle(url):
                return c
        return self.collectors[-1]  # Generic fallback

    def fetch_url(self, url: str) -> Tuple[Optional[str], Optional[int], int, Optional[str]]:
        """
        Politely fetches a URL with rate limiting, timeouts, and robots compliance.
        Returns (html_content, http_status, duration_ms, error_message).
        """
        domain = urllib.parse.urlparse(url).netloc.lower()
        if not self.rate_limiter.can_fetch(url):
            return None, 403, 0, "Blocked by robots.txt policy"

        # Thread safety per domain: ensure requests to same host don't collide
        d_lock = self.rate_limiter.get_domain_lock(domain)
        with d_lock:
            self.rate_limiter.wait_for_domain(domain)
            headers = {
                "User-Agent": CONFIG.USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "vi,en-US;q=0.8,en;q=0.6",
            }

            # CTU form submission data if applicable
            request_data = None
            if "qldiem.ctu.edu.vn" in url:
                unit_code = "%%"
                page_no = "1"
                if "unit_" in url:
                    unit_code = url.split("unit_")[-1].split("&")[0]
                if "page=" in url:
                    page_no = url.split("page=")[-1].split("&")[0]
                headers["Content-Type"] = "application/x-www-form-urlencoded"
                request_data = urllib.parse.urlencode({
                    "cmbDonVi": unit_code,
                    "cmbBoMon": "%%",
                    "cboHocHam": "",
                    "cboHocVi": "",
                    "txtHoTen": "",
                    "btnSearch": "Tìm kiếm",
                    "curPage": page_no,
                }).encode("utf-8")

            start_t = time.time()
            try:
                if request_data:
                    resp = self.rate_limiter.session.post(
                        url,
                        data=urllib.parse.parse_qs(request_data.decode("utf-8")),
                        headers=headers,
                        timeout=(4, 8),
                        verify=False,
                    )
                else:
                    resp = self.rate_limiter.session.get(
                        url,
                        headers=headers,
                        timeout=(4, 8),
                        verify=False,
                    )

                duration_ms = int((time.time() - start_t) * 1000)
                status = resp.status_code
                if status == 200:
                    return resp.text, status, duration_ms, None
                else:
                    return None, status, duration_ms, f"HTTP Error {status}"

            except requests.exceptions.Timeout as e:
                duration_ms = int((time.time() - start_t) * 1000)
                return None, 0, duration_ms, f"Timeout Error: {str(e)}"
            except requests.exceptions.RequestException as e:
                duration_ms = int((time.time() - start_t) * 1000)
                return None, 0, duration_ms, f"Request Exception: {str(e)}"
            except Exception as e:
                duration_ms = int((time.time() - start_t) * 1000)
                return None, 0, duration_ms, f"Fetch Exception: {str(e)}"

    def process_job(self, job: Dict[str, Any]) -> int:
        """Processes a single crawl job and returns count of extracted lecturers."""
        job_id = job["id"]
        url = job["url"]
        u_id = job.get("university_id")
        domain = urllib.parse.urlparse(url).netloc.lower()

        # Check if already completed
        if self.checkpoint.is_url_completed(url):
            self.storage.mark_job_status(job_id, "completed")
            return 0

        self.storage.mark_job_status(job_id, "fetching")
        html, status, duration_ms, err = self.fetch_url(url)

        if status == 200 and html:
            # 1. Extraction
            collector = self.get_collector_for_url(url)
            u_info = {"id": u_id, "name": u_id} if u_id else None
            extracted = collector.collect(html, url, u_info)

            # Filter through strict validation gate
            valid_extracted = []
            for p in extracted:
                is_valid, _ = RecordValidator.is_valid_human_name(p.get("name", ""))
                if is_valid:
                    valid_extracted.append(p)

            # 2. Discovery: find more staff directories and faculty pages
            discovered = DiscoveryEngine.discover_links_from_html(html, url, domain)
            new_jobs = []
            for s_url in discovered["staff_directories"]:
                if not self.checkpoint.is_url_completed(s_url):
                    new_jobs.append((s_url, u_id, None, 25))
            for p_url in discovered["pagination_links"]:
                if not self.checkpoint.is_url_completed(p_url):
                    new_jobs.append((p_url, u_id, None, 20))
            for f_url in discovered["faculty_pages"]:
                if not self.checkpoint.is_url_completed(f_url):
                    new_jobs.append((f_url, u_id, None, 10))

            if new_jobs:
                self.storage.enqueue_jobs(new_jobs)

            # 3. Deduplication and persistence
            saved_count = 0
            if valid_extracted:
                with self._lock:
                    deduped, _ = DeduplicationEngine.deduplicate_batch(valid_extracted, [])
                    saved, _ = self.storage.batch_upsert_professors(deduped)
                    saved_count = saved
                    self._lecturers_saved_since_export += saved_count

            # 4. Checkpoint
            self.checkpoint.mark_url_completed(url)
            self.checkpoint.update_progress(
                stage="Stage_D_Extraction",
                institution_id=u_id,
                new_lecturers=saved_count,
            )
            self.storage.mark_job_status(job_id, "completed", records_extracted=saved_count)
            self.storage.log_crawl_attempt(job_id, url, status, duration_ms, saved_count)

            with self._lock:
                self.monitor.pages_processed += 1
                self.monitor.lecturers_saved += saved_count

            if self.monitor.pages_processed % 10 == 0:
                self.monitor.print_heartbeat(url, u_id)

            # Periodic sync to verified_academic_data.json
            with self._lock:
                if self._lecturers_saved_since_export >= CONFIG.JSON_EXPORT_EVERY_N_RECORDS:
                    self.storage.export_to_verified_json()
                    self._lecturers_saved_since_export = 0
                    self.checkpoint.save_checkpoint(status="running")

            return saved_count

        elif status == 403:
            # Check if robots or permanent block
            is_robots = "robots.txt" in (err or "")
            self.checkpoint.mark_domain_blocked(domain, err or "HTTP 403")
            self.storage.mark_job_status(job_id, "failed", error_message=err)
            self.storage.log_crawl_attempt(job_id, url, status, duration_ms, 0, "http_403", err)
            with self._lock:
                self.monitor.errors_count += 1
            return 0

        else:
            # Temporary error: retry with exponential backoff and jitter
            retries = job.get("retry_count", 0) + 1
            if retries >= job.get("max_retries", 5):
                self.storage.mark_job_status(job_id, "failed", error_message=err)
            else:
                backoff = int(min(3600, (CONFIG.BACKOFF_BASE ** retries) * 10 + random.uniform(0, 5)))
                self.storage.mark_job_status(
                    job_id, "retry_pending", error_message=err, backoff_seconds=backoff
                )

            self.storage.log_crawl_attempt(job_id, url, status, duration_ms, 0, "network", err)
            with self._lock:
                self.monitor.errors_count += 1
            return 0

    def run_sweep(self, batch_size: int = CONFIG.SWEEP_BATCH_SIZE) -> int:
        """Dequeues a batch of jobs and processes them with thread-pool concurrency."""
        jobs = self.storage.dequeue_jobs(limit=batch_size)
        if not jobs:
            return 0

        total_extracted = 0
        workers = min(CONFIG.MAX_GLOBAL_WORKERS, len(jobs))

        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_job = {executor.submit(self.process_job, job): job for job in jobs}
            for future in concurrent.futures.as_completed(future_to_job):
                if not self._running:
                    break
                try:
                    count = future.result()
                    total_extracted += count
                except Exception as exc:
                    self.monitor.error(f"Worker thread error: {exc}")

        return total_extracted

    def run_continuous(self, idle_poll_interval: int = CONFIG.IDLE_POLL_INTERVAL):
        """Continuously runs the scheduler loop until manually stopped or queue exhausted."""
        self.monitor.success(
            f"Starting continuous collection scheduler on {CONFIG.MAX_GLOBAL_WORKERS} threads..."
        )
        try:
            while self._running:
                try:
                    extracted = self.run_sweep()
                except Exception as sweep_err:
                    self.monitor.error(f"Sweep iteration encountered transient error: {sweep_err}. Pausing 5s...")
                    time.sleep(5.0)
                    continue

                if extracted == 0:
                    # Check if there are still queued jobs awaiting retry
                    stats = self.storage.get_stats()
                    pending = stats.get("job_stats", {}).get("queued", 0) + stats.get("job_stats", {}).get("retry_pending", 0)
                    if pending == 0:
                        self.monitor.info("Queue is empty. Running periodic discovery check...")
                        time.sleep(idle_poll_interval)
                    else:
                        time.sleep(2.0)
        except KeyboardInterrupt:
            self.monitor.warn("Received KeyboardInterrupt (Ctrl+C). Saving state...")
        finally:
            self.cleanup()

    def cleanup(self):
        """Commits all checkpoints, syncs JSON export, and cleans up state."""
        self.monitor.info("Finalizing collection state and checkpoints...")
        try:
            self.storage.clean_invalid_records()
        except Exception as exc:
            self.monitor.warn(f"Warning during clean_invalid_records: {exc}")
        try:
            self.storage.export_to_verified_json()
        except Exception as exc:
            self.monitor.warn(f"Warning during export_to_verified_json: {exc}")
        try:
            self.checkpoint.save_checkpoint(status="idle")
        except Exception as exc:
            self.monitor.warn(f"Warning during save_checkpoint: {exc}")
        try:
            stats = self.storage.get_stats()
            self.monitor.print_coverage_report(stats)
        except Exception as exc:
            self.monitor.warn(f"Warning during print_coverage_report: {exc}")
        self.monitor.success("Pipeline shutdown complete. Progress saved safely.")
