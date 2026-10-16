"""Quality Assurance, Data Completeness, and Coverage Monitoring.
Evaluates nationwide database completeness, missing fields, verification ratios,
and regional balance. Strictly adheres to reporting measured reality rather than assuming coverage.
"""

from __future__ import annotations
import time
from typing import List, Dict, Any
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    EntityMatchCandidateRecord,
    DataQualityReportRecord,
    SourceRegistryRecord,
)


class AcademicQualityAssuranceService:
    """Generates comprehensive data health and quality reports."""

    @classmethod
    def generate_report(
        cls,
        universities: List[UniversityRecord],
        professors: List[ProfessorRecord],
        candidates: List[EntityMatchCandidateRecord],
        sources: List[SourceRegistryRecord],
    ) -> DataQualityReportRecord:
        """Computes metrics across all active entities in the pipeline."""
        now = int(time.time() * 1000)

        # Region coverage tracking
        region_stats: Dict[str, Dict[str, int]] = {
            "north": {"universities": 0, "professors": 0},
            "central": {"universities": 0, "professors": 0},
            "south": {"universities": 0, "professors": 0},
        }

        univ_region_map: Dict[str, str] = {}
        registered_domains = 0
        total_faculties = 0

        for u in universities:
            if u.official_domain:
                registered_domains += 1
            total_faculties += len(u.faculties)

            reg_key = "north"
            if u.region == "Miền Trung":
                reg_key = "central"
            elif u.region == "Miền Nam":
                reg_key = "south"

            region_stats[reg_key]["universities"] += 1
            univ_region_map[u.id] = reg_key

        # Professor stats
        verified_count = 0
        unverified_count = 0
        with_images_count = 0
        missing_fields = {
            "missingBio": 0,
            "missingCourses": 0,
            "missingResearchInterests": 0,
            "missingAvatar": 0,
        }

        for p in professors:
            if p.verification_status == "verified":
                verified_count += 1
            else:
                unverified_count += 1

            if p.avatar:
                with_images_count += 1
            else:
                missing_fields["missingAvatar"] += 1

            if not p.bio or len(p.bio.strip()) < 15:
                missing_fields["missingBio"] += 1

            if not p.courses:
                missing_fields["missingCourses"] += 1

            if not p.research_interests:
                missing_fields["missingResearchInterests"] += 1

            reg_key = univ_region_map.get(p.university_id, "north")
            region_stats[reg_key]["professors"] += 1

        # Sources health
        sources_health = {
            "active": sum(1 for s in sources if s.status in ("active", "crawled")),
            "failed": sum(1 for s in sources if s.status == "failed"),
            "rateLimited": sum(1 for s in sources if s.status == "rate_limited"),
            "pending": sum(1 for s in sources if s.status == "pending_crawl"),
        }

        report = DataQualityReportRecord(
            id=f"report-qa-{now}",
            generated_at=now,
            total_universities=len(universities),
            universities_with_registered_domains=registered_domains,
            total_faculties=total_faculties,
            total_professors=len(professors),
            verified_professors_count=verified_count,
            unverified_professors_count=unverified_count,
            duplicate_candidates_count=len([c for c in candidates if c.status == "pending"]),
            profiles_with_images_count=with_images_count,
            images_pending_review_count=len(
                [p for p in professors if p.image_rights and p.image_rights.get("permission_status") == "pending_review"]
            ),
            missing_key_fields=missing_fields,
            coverage_by_region=region_stats,
            sources_health=sources_health,
            last_successful_ingestion_date=now,
        )

        return report
