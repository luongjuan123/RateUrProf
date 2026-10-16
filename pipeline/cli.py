"""Command-line interface (CLI) for RateProfCuaBan Academic Ingestion Pipeline.

Usage:
    python3 -m pipeline.cli --pilot
    python3 -m pipeline.cli --discovery
    python3 -m pipeline.cli --stats
"""

from __future__ import annotations
import argparse
import sys
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
        # Load from output file
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

            total_unis = qa.get("totalUniversities") or qa.get("total_universities") or len(unis)
            unis_domains = qa.get("universitiesWithRegisteredDomains") or qa.get("universities_with_registered_domains", 0)
            total_faculties = qa.get("totalFaculties") or qa.get("total_faculties", 0)
            total_profs = qa.get("totalProfessors") or qa.get("total_professors") or len(profs)
            verified_profs = qa.get("verifiedProfessorsCount") or qa.get("verified_professors_count", 0)
            unverified_profs = qa.get("unverifiedProfessorsCount") or qa.get("unverified_professors_count", 0)
            dup_candidates = qa.get("duplicateCandidatesCount") or qa.get("duplicate_candidates_count") or len(candidates)
            sources_health = qa.get("sourcesHealth") or qa.get("sources_health", {})
            active_sources = sources_health.get("active", len([s for s in sources if s.get("status") in ["active", "crawled"]]))
            failed_sources = sources_health.get("failed", 0)
            pending_sources = sources_health.get("pending", 0)
            last_crawl = qa.get("lastSuccessfulIngestionDate") or ingestion_run.get("completedAt") or ingestion_run.get("completed_at", 0)

            print("[*] Nationwide Academic Data Ingestion Operational Report:")
            print(f"    - Discovered Universities:                {total_unis}")
            print(f"    - Universities with Verified Domains:     {unis_domains}")
            print(f"    - Discovered Faculty/Dept Sources:        {total_faculties} faculties, {len(sources)} registry targets")
            print(f"    - Sources Successfully Crawled / Active:  {active_sources}")
            print(f"    - Sources Pending Crawl:                  {pending_sources}")
            print(f"    - Sources Failed:                         {failed_sources}")
            print(f"    - Lecturer Records Extracted:             {total_profs}")
            print(f"    - Lecturer Records Saved / Verified:      {verified_profs}")
            print(f"    - Records Awaiting Verification:          {unverified_profs}")
            print(f"    - Duplicates / Candidates In Review:      {dup_candidates}")
            print(f"    - Last Ingestion Timestamp:               {last_crawl}")
            
            cov = qa.get("coverageByRegion") or qa.get("coverage_by_region", {})
            if cov:
                print("\n[*] Regional Breakdown:")
                for reg, st in cov.items():
                    print(f"    - {reg.capitalize()}: {st.get('universities', 0)} universities, {st.get('professors', 0)} professors")
        except FileNotFoundError:
            print(f"[-] Data file {target_path} not found. Run with --pilot first.")
            sys.exit(1)
        sys.exit(0)

    parser.print_help()


if __name__ == "__main__":
    main()
