"""Main Command-Line Interface (CLI) Entrypoint for RateUrProfs Data Collection Pipeline."""

from __future__ import annotations
import sys
import signal
import argparse
from typing import Optional

from data_collection.config import CONFIG
from data_collection.storage import StorageEngine
from data_collection.checkpoint import CheckpointManager
from data_collection.monitoring import PipelineMonitor
from data_collection.sources import SourceRegistry
from data_collection.scheduler import ContinuousScheduler


def handle_run(args, scheduler: ContinuousScheduler):
    """Executes collection run or single sweep."""
    # 1. Clean any legacy invalid false-positive records first
    cleaned = scheduler.storage.clean_invalid_records()
    if cleaned > 0:
        scheduler.monitor.info(f"Purged {cleaned} false-positive non-human records.")

    # 2. Seed initial sources if queue is empty
    stats = scheduler.storage.get_stats()
    job_stats = stats.get("job_stats", {})
    queued_jobs = job_stats.get("queued", 0)

    if queued_jobs == 0:
        scheduler.monitor.info("Crawl queue has no active queued jobs. Initializing nationwide sources and HĐGSNN archive...")
        registry = SourceRegistry()
        unis = registry.get_all_institutions()
        scheduler.storage.batch_upsert_universities(unis)

        sources = registry.build_initial_crawl_sources()
        new_jobs = [(s["url"], s.get("university_id"), s.get("id"), s.get("priority", 10)) for s in sources]
        scheduler.storage.enqueue_jobs(new_jobs)
        scheduler.monitor.success(f"Enqueued {len(new_jobs):,} source URLs for discovery and extraction.")

    # 3. If target university specified, filter or prioritize
    if args.target:
        scheduler.monitor.info(f"Prioritizing collection for university: {args.target}")

    # 4. Run loop or sweep
    if args.continuous:
        scheduler.run_continuous()
    else:
        max_batches = args.batches or 10
        scheduler.monitor.info(f"Running bounded collection ({max_batches} sweeps)...")
        total_extracted = 0
        for b in range(max_batches):
            if not scheduler._running:
                break
            count = scheduler.run_sweep(batch_size=args.batch_size)
            total_extracted += count
            if count == 0 and b > 2:
                break
        scheduler.cleanup()


def handle_resume(args, scheduler: ContinuousScheduler):
    """Resumes collection from the last saved checkpoint."""
    summary = scheduler.checkpoint.get_summary()
    scheduler.monitor.info(
        f"Resuming collection from checkpoint (Pages already processed: {summary['total_pages_crawled']:,})..."
    )
    handle_run(args, scheduler)


def handle_status(args, scheduler: ContinuousScheduler):
    """Prints current live collection status without modifying state."""
    stats = scheduler.storage.get_stats()
    summary = scheduler.checkpoint.get_summary()
    scheduler.monitor.print_coverage_report(stats)
    print("\n[6] LIVE CHECKPOINT SNAPSHOT:")
    print(f"    - Checkpoint Status:       {summary.get('status')}")
    print(f"    - Current Stage:           {summary.get('current_stage')}")
    print(f"    - Completed URLs Count:    {summary.get('total_pages_crawled'):,}")
    print(f"    - Blocked Domains Count:   {summary.get('blocked_domains_count')}")
    print(f"    - Process Memory Usage:    {scheduler.monitor.get_memory_usage_mb()} MB")


def handle_report(args, scheduler: ContinuousScheduler):
    """Outputs full nationwide gap analysis and coverage report."""
    stats = scheduler.storage.get_stats()
    scheduler.monitor.print_coverage_report(stats)


def handle_retry_failed(args, scheduler: ContinuousScheduler):
    """Resets failed and retry_pending jobs so they can be re-evaluated."""
    with scheduler.storage.get_connection() as conn:
        res = conn.execute("""
        UPDATE crawl_jobs
        SET status = 'queued', retry_count = 0, next_retry_at = NULL, last_error = NULL
        WHERE status IN ('failed', 'retry_pending');
        """)
        count = res.rowcount
    scheduler.monitor.success(f"Reset {count:,} failed/retry_pending jobs back to 'queued' state.")


def main():
    parser = argparse.ArgumentParser(
        prog="data_collection",
        description="RateUrProfs Nationwide Academic Data Collection Pipeline",
    )
    subparsers = parser.add_subparsers(dest="command", help="Pipeline commands")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Run data collection")
    run_parser.add_argument("--continuous", action="store_true", help="Run continuously overnight")
    run_parser.add_argument("--target", type=str, default=None, help="Target specific university ID")
    run_parser.add_argument("--batches", type=int, default=None, help="Number of sweeps to execute")
    run_parser.add_argument("--batch-size", type=int, default=CONFIG.SWEEP_BATCH_SIZE, help="Jobs per sweep")

    # Command: resume
    resume_parser = subparsers.add_parser("resume", help="Resume from last checkpoint")
    resume_parser.add_argument("--continuous", action="store_true", default=True, help="Run continuously on resume")
    resume_parser.add_argument("--batches", type=int, default=None, help="Number of sweeps to execute")
    resume_parser.add_argument("--batch-size", type=int, default=CONFIG.SWEEP_BATCH_SIZE, help="Jobs per sweep")
    resume_parser.add_argument("--target", type=str, default=None, help="Target specific university ID")

    # Command: status
    subparsers.add_parser("status", help="Show current pipeline status and metrics")

    # Command: report
    subparsers.add_parser("report", help="Generate nationwide coverage and gap report")

    # Command: retry-failed
    subparsers.add_parser("retry-failed", help="Re-queue failed or retryable tasks")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    # Initialize core services
    storage = StorageEngine()
    checkpoint = CheckpointManager()
    monitor = PipelineMonitor()
    scheduler = ContinuousScheduler(storage=storage, checkpoint=checkpoint, monitor=monitor)

    # Graceful shutdown handlers
    def sig_handler(signum, frame):
        scheduler.stop()

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    if args.command == "run":
        handle_run(args, scheduler)
    elif args.command == "resume":
        handle_resume(args, scheduler)
    elif args.command == "status":
        handle_status(args, scheduler)
    elif args.command == "report":
        handle_report(args, scheduler)
    elif args.command == "retry-failed":
        handle_retry_failed(args, scheduler)


if __name__ == "__main__":
    main()
