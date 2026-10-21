"""Command-line interface (CLI) for RateProfCuaBan Academic Ingestion Pipeline.

Usage:
    python3 -m pipeline.cli --pilot
    python3 -m pipeline.cli --discovery
    python3 -m pipeline.cli --stats
"""

from __future__ import annotations
import argparse
import sys
import os
import json
from pipeline.orchestrator import IngestionOrchestrator
from pipeline.discovery import UniversityDiscoveryService


def main():
    parser = argparse.ArgumentParser(
        description="RateProfCuaBan Automated Academic Data Ingestion Pipeline"
    )
    parser.add_argument(
        "--pilot",
        action="store_true",
        help="Run verified pilot ingestion and generate src/data/verified_academic_data.json",
    )
    parser.add_argument(
        "--discovery",
        action="store_true",
        help="Run nationwide university and source registry discovery",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Print current data quality and coverage statistics",
    )
    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Run end-to-end web crawling, extraction, dedup, and Firestore persistence",
    )
    parser.add_argument(
        "--worker",
        action="store_true",
        help="Run durable background crawler queue worker",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single sweep in worker mode and exit",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=15,
        help="Batch size for worker sweep",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Worker poll interval in seconds",
    )
    parser.add_argument(
        "--university",
        type=str,
        default=None,
        help="Target a specific university ID (e.g. hust, vnu-uet, hcmut)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Crawl and extract without writing changes to Firestore",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Custom output file path for generated JSON data",
    )

    args = parser.parse_args()

    if args.worker:
        from pipeline.worker import CollectionWorker
        worker = CollectionWorker()
        if args.once:
            print("[Worker] Running single collection sweep...")
            worker.run_sweep(batch_size=args.batch_size)
            stats = worker.storage.get_stats()
            print(f"[Worker] Sweep done. Database state: {stats['verified_lecturers']} verified lecturers.")
        else:
            worker.start_loop(poll_interval=args.interval, batch_size=args.batch_size)
        sys.exit(0)

    orchestrator = IngestionOrchestrator(data_output_path=args.output)

    if args.ingest:
        target_str = f" for {args.university}" if args.university else " nationwide"
        dry_str = " (DRY RUN - no database writes)" if args.dry_run else ""
        print(f"[*] Starting Academic Ingestion{target_str}{dry_str}...")
        try:
            result = orchestrator.run_full_ingestion(
                target_university_id=args.university,
                dry_run=args.dry_run
            )
            print(f"[+] Ingestion status: {result['status'].upper()}")
            print(f"    - Universities processed: {result['universities_count']}")
            print(f"    - Sources crawled:        {result['sources_crawled']}")
            print(f"    - Professors extracted:   {result['professors_count']}")
            print(f"    - Entity candidates:      {result['candidates_count']}")
            print(f"    - Errors logged:          {result['errors_count']}")
            print(f"    - Firestore synced:       {result['firestore_synced']}")
            print(f"    - Local export file:      {result['output_file']}")
            if result['errors']:
                print("\n[!] Sample errors:")
                for err in result['errors']:
                    print(f"    - {err}")
        except Exception as e:
            print(f"[-] Ingestion failed: {e}")
            sys.exit(1)
        sys.exit(0)

    if args.pilot:
        print("[*] Starting Nationwide Pilot Academic Ingestion...")
        result = orchestrator.run_pilot()
        print(f"[+] Ingestion completed successfully!")
        print(f"    - Universities registered: {result['universities_count']}")
        print(f"    - Verified Professors:     {result['professors_count']}")
        print(f"    - Sources indexed:         {result['sources_count']}")
        print(f"    - Deduplication candidates:{result['candidates_count']}")
        print(f"    - Output file:             {result['output_file']}")
        print("\n[*] Regional Coverage Summary:")
        for reg, stats in result["qa_summary"]["coverage_by_region"].items():
            print(f"    - {reg.capitalize()}: {stats['universities']} universities, {stats['professors']} professors")
        sys.exit(0)

    if args.discovery:
        discovery = UniversityDiscoveryService()
        universities = discovery.get_all_universities()
        sources = discovery.build_source_registry()
        print(f"[+] Discovered {len(universities)} universities across Vietnam.")
        print(f"[+] Generated {len(sources)} source registry items.")
        sys.exit(0)

    if args.stats:
        target_path = orchestrator.data_output_path
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            qa = data.get("qa_report", {})
            sources = data.get("sources", [])
            profs = data.get("professors", [])
            unis = data.get("universities", [])
            candidates = data.get("entity_candidates", [])
            ingestion_run = data.get("ingestion_run", {})

            # 1. Lecturer Counts
            total_profs = len(profs)
            verified_profs = sum(1 for p in profs if p.get("verificationStatus") == "verified")
            unverified_profs = sum(1 for p in profs if p.get("verificationStatus") != "verified")
            synthetic_profs = sum(1 for p in profs if "giữ chức vụ" in (p.get("bioVi") or "") or "giữ chức vụ" in (p.get("bio") or ""))
            real_verified_profs = verified_profs - synthetic_profs

            # 2. University Breakdown
            profs_by_uni = {}
            for p in profs:
                profs_by_uni.setdefault(p.get("universityId"), []).append(p)

            total_unis = len(unis)
            unis_with_sources = sum(1 for u in unis if u.get("facultyDirectoryUrls") or u.get("officialWebsite") or u.get("officialDomain"))
            unis_attempted = len(profs_by_uni)
            unis_successfully_processed = sum(1 for uid, u_profs in profs_by_uni.items() if len(u_profs) > 0)
            unis_fully_covered = sum(1 for uid, u_profs in profs_by_uni.items() if len(u_profs) >= 50)
            unis_partially_covered = unis_successfully_processed - unis_fully_covered
            unis_awaiting = total_unis - unis_successfully_processed

            # 3. Source Registry Metrics
            crawled_sources = [s for s in sources if s.get("status") in ["crawled", "active"]]
            failed_sources = [s for s in sources if s.get("status") == "failed"]
            pending_sources = [s for s in sources if s.get("status") in ["pending_crawl", "pending"]]

            # Failure reasons breakdown
            failure_reasons = {}
            for s in failed_sources:
                msg = s.get("lastErrorMessage") or "Unknown error"
                reason_key = "HTTP 404 (Not Found)" if "404" in msg else ("HTTP 403 / Robots" if "403" in msg or "robots" in msg.lower() else ("Timeout" if "time" in msg.lower() else "Connection/DNS"))
                failure_reasons[reason_key] = failure_reasons.get(reason_key, 0) + 1

            # 4. National Benchmark Coverage
            NATIONAL_BENCHMARK = 90700  # Ministry of Education and Training (Bộ GD&ĐT) HEMIS official statistic
            coverage_pct = (real_verified_profs / NATIONAL_BENCHMARK) * 100

            print("=" * 80)
            print(" RATEPROFCUABAN NATIONWIDE LECTURER COLLECTION AUDIT REPORT")
            print("=" * 80)
            print("\n[1] LECTURER POPULATION & VERIFICATION STATUS:")
            print(f"    - Current Total Unique Lecturer Records:   {total_profs:,}")
            print(f"    - Verified Authentic Lecturer Records:     {real_verified_profs:,}")
            print(f"    - Synthetic / Fabricated Records:          {synthetic_profs} (STRICT ZERO-TOLERANCE)")
            print(f"    - Records Awaiting Institutional Review:   {unverified_profs:,}")
            print(f"    - Duplicate Records Merged:                {ingestion_run.get('duplicatesResolved', 0)}")
            print(f"    - Cross-Institution Candidates in Review:  {len(candidates):,}")

            print("\n[2] INSTITUTIONAL DISCOVERY & COVERAGE DEPTH:")
            print(f"    - Universities & Institutions Discovered:  {total_unis:,}")
            print(f"    - Universities with Official Sources:      {unis_with_sources:,}")
            print(f"    - Universities Attempted:                  {unis_attempted:,}")
            print(f"    - Universities Successfully Processed:     {unis_successfully_processed:,}")
            print(f"        * Broad / Fully Processed (>= 50 staff): {unis_fully_covered:,}")
            print(f"        * Focused / Partially Processed (<50):  {unis_partially_covered:,}")
            print(f"    - Universities Awaiting Directory Intake:  {unis_awaiting:,}")

            print("\n[3] SOURCE REGISTRY & DIRECTORY HEALTH:")
            print(f"    - Total Identified Sources in Registry:    {len(sources):,}")
            print(f"    - Sources Successfully Crawled / Active:   {len(crawled_sources):,}")
            print(f"    - Sources Pending Crawl Queue:             {len(pending_sources):,}")
            print(f"    - Sources Inaccessible / Failed:           {len(failed_sources):,}")
            if failure_reasons:
                print("      * Breakdown of Source Failures:")
                for r_name, r_cnt in sorted(failure_reasons.items(), key=lambda x: -x[1]):
                    print(f"        - {r_name}: {r_cnt} sources")

            print("\n[4] NATIONAL BENCHMARK ASSESSMENT:")
            print(f"    - MOET/HEMIS National Lecturer Benchmark:  {NATIONAL_BENCHMARK:,} permanent university lecturers")
            print(f"    - Higher Education System Total (with CD): ~94,000–95,000 lecturers")
            print(f"    - Verified Database Coverage Achieved:     {coverage_pct:.2f}% of national total")
            print(f"    - Total Unique Institutions Represented:   {unis_successfully_processed} across all 3 regions (North, Central, South)")

            cov = qa.get("coverageByRegion") or qa.get("coverage_by_region", {})
            if cov:
                print("\n[5] REGIONAL COVERAGE BREAKDOWN:")
                for reg, st in cov.items():
                    print(f"    - {reg.capitalize():<8}: {st.get('universities', 0):>3} institutions, {st.get('professors', 0):>5} lecturers")

            # 6. SQLite Relational Persistence Metrics
            db_path = getattr(orchestrator, "db_path", "src/data/rateprof.db")
            if os.path.exists(db_path):
                import sqlite3
                print("\n[6] SQL RELATIONAL DATABASE (rateprof.db):")
                try:
                    conn = sqlite3.connect(db_path)
                    c = conn.cursor()
                    tables = ["universities", "faculties", "departments", "lecturers", "affiliations", "sources", "crawl_jobs", "crawl_logs", "reviews"]
                    for tbl in tables:
                        try:
                            c.execute(f"SELECT COUNT(*) FROM {tbl}")
                            cnt = c.fetchone()[0]
                            print(f"    - {tbl:<16}: {cnt:,} rows")
                        except sqlite3.OperationalError:
                            pass
                    conn.close()
                except Exception as dbe:
                    print(f"    - DB connection error: {dbe}")
            print("=" * 80)
        except FileNotFoundError:
            print(f"[-] Data file {target_path} not found. Run ingestion first.")
            sys.exit(1)
        sys.exit(0)

    parser.print_help()


if __name__ == "__main__":
    main()
