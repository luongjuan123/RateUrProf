"""Data models for RateProfCuaBan Academic Ingestion Pipeline."""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any, Literal
import time
import json


@dataclass
class ProvenanceEvidence:
    field: str
    source_url: str
    extracted_at: int = field(default_factory=lambda: int(time.time() * 1000))
    confidence: float = 1.0  # 0.0 - 1.0
    source_type: Literal[
        "official_faculty_page",
        "university_portal",
        "pdf_directory",
        "authorized_social_lead",
        "manual_verified",
    ] = "official_faculty_page"


@dataclass
class AcademicPublicationRecord:
    id: str
    professor_id: str
    title: str
    authors: List[str] = field(default_factory=list)
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    citation_count: Optional[int] = None


@dataclass
class ImageAssetRecord:
    id: str
    source_url: str
    professor_id: Optional[str] = None
    storage_url: Optional[str] = None
    license_category: Literal[
        "official_academic_public",
        "open_license",
        "fair_use_educational",
        "restricted",
        "unknown",
    ] = "official_academic_public"
    permission_status: Literal["approved", "pending_review", "rejected"] = "approved"
    storage_mode: Literal[
        "gcp_storage", "source_url", "neutral_placeholder"
    ] = "source_url"
    verified_at: Optional[int] = None
    sha256: Optional[str] = None


@dataclass
class UniversityRecord:
    id: str
    name: str  # Vietnamese official name
    short_name: str
    city: str
    region: Literal["Miền Bắc", "Miền Trung", "Miền Nam"]
    english_name: Optional[str] = None
    official_domain: Optional[str] = None
    official_website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image: Optional[str] = None
    faculties: List[str] = field(default_factory=list)
    faculty_directory_urls: List[str] = field(default_factory=list)
    staff_directory_urls: List[str] = field(default_factory=list)
    research_institute_urls: List[str] = field(default_factory=list)
    course_catalog_urls: List[str] = field(default_factory=list)
    verified_social_links: List[Dict[str, Any]] = field(default_factory=list)
    rating_average: float = 0.0
    total_reviews: int = 0
    total_professors: int = 0
    source_urls: List[str] = field(default_factory=list)
    institution_type: Optional[str] = "university"


@dataclass
class FacultyRecord:
    id: str
    university_id: str
    name: str
    name_en: Optional[str] = None
    website_url: Optional[str] = None
    directory_url: Optional[str] = None
    dean_name: Optional[str] = None
    departments: List[str] = field(default_factory=list)


@dataclass
class DepartmentRecord:
    id: str
    faculty_id: str
    university_id: str
    name: str
    name_en: Optional[str] = None
    head_name: Optional[str] = None


@dataclass
class CourseRecord:
    id: str
    university_id: str
    name: str
    code: Optional[str] = None
    name_en: Optional[str] = None
    faculty_id: Optional[str] = None
    description: Optional[str] = None
    syllabus_url: Optional[str] = None


@dataclass
class ProfessorRecord:
    id: str
    name: str  # Full name in Vietnamese with diacritics
    university_id: str
    university_name: str
    university_short_name: str
    faculty: str
    title: str = "Giảng viên"  # PGS. TS, TS, ThS, etc.
    academic_title: Optional[str] = None  # Formal rank: GS, PGS, TS, ThS
    position: Optional[str] = None  # Administrative role: Trưởng khoa, GV chính
    name_variants: List[str] = field(default_factory=list)
    department: Optional[str] = None
    faculty_id: Optional[str] = None
    department_id: Optional[str] = None
    avatar: str = ""
    bio: Optional[str] = None
    bio_vi: Optional[str] = None
    bio_en: Optional[str] = None
    courses: List[str] = field(default_factory=list)
    qualifications: List[Dict[str, Any]] = field(default_factory=list)
    research_interests: List[str] = field(default_factory=list)
    publications: List[AcademicPublicationRecord] = field(default_factory=list)
    official_profile_urls: List[str] = field(default_factory=list)
    identifiers: Dict[str, str] = field(default_factory=dict)
    image_rights: Optional[Dict[str, Any]] = None
    provenance: List[ProvenanceEvidence] = field(default_factory=list)
    previous_affiliations: List[Dict[str, str]] = field(default_factory=list)
    verification_status: Literal[
        "verified", "partially_verified", "unverified", "pending_review", "social_lead_unverified"
    ] = "unverified"
    confidence_score: float = 0.5
    last_verified_at: int = field(default_factory=lambda: int(time.time() * 1000))
    rating_average: Optional[float] = None
    rating_count: int = 0
    rating_distribution: Dict[int, int] = field(
        default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    )
    criteria_averages: Optional[Dict[str, float]] = None
    featured: bool = False
    trending: bool = False
    featured_quote: Optional[str] = None
    take_again_percent: Optional[int] = None
    difficulty_score: Optional[float] = None
    source_urls: List[str] = field(default_factory=list)


@dataclass
class SourceRegistryRecord:
    id: str
    university_id: str
    url: str
    domain: str
    source_type: Literal[
        "official_homepage",
        "faculty_directory",
        "staff_profile",
        "course_catalog",
        "authorized_social_export",
    ]
    crawl_policy: Literal[
        "allowed", "disallowed_robots", "requires_auth", "manual_only"
    ] = "allowed"
    status: Literal[
        "active", "pending_crawl", "crawled", "failed", "rate_limited"
    ] = "pending_crawl"
    last_crawled_at: Optional[int] = None
    etag: Optional[str] = None
    content_hash: Optional[str] = None
    failure_count: int = 0
    last_error_message: Optional[str] = None


@dataclass
class SourceDocumentRecord:
    id: str
    source_url: str
    domain: str
    fetched_at: int = field(default_factory=lambda: int(time.time() * 1000))
    content_hash: str = ""
    http_status: int = 200
    title: Optional[str] = None
    extracted_text_length: int = 0
    entities_extracted_count: int = 0
    structured_json_ld: bool = False


@dataclass
class EntityMatchCandidateRecord:
    id: str
    source_professor_id: str
    candidate_professor_id: str
    source_name: str
    candidate_name: str
    source_university: str
    candidate_university: str
    match_score: float  # 0.0 to 1.0
    match_reasons: List[str] = field(default_factory=list)
    status: Literal["pending", "merged", "rejected", "dismissed"] = "pending"
    detected_at: int = field(default_factory=lambda: int(time.time() * 1000))
    resolved_at: Optional[int] = None
    resolved_by: Optional[str] = None


@dataclass
class IngestionRunRecord:
    id: str
    run_type: Literal["discovery", "full_pilot", "single_university", "incremental"]
    started_at: int = field(default_factory=lambda: int(time.time() * 1000))
    completed_at: Optional[int] = None
    status: Literal["running", "completed", "failed"] = "running"
    universities_processed: int = 0
    professors_extracted: int = 0
    professors_updated: int = 0
    sources_crawled: int = 0
    errors_logged: List[str] = field(default_factory=list)


@dataclass
class DataQualityReportRecord:
    id: str
    generated_at: int = field(default_factory=lambda: int(time.time() * 1000))
    total_universities: int = 0
    universities_with_registered_domains: int = 0
    total_faculties: int = 0
    total_professors: int = 0
    verified_professors_count: int = 0
    unverified_professors_count: int = 0
    duplicate_candidates_count: int = 0
    profiles_with_images_count: int = 0
    images_pending_review_count: int = 0
    missing_key_fields: Dict[str, int] = field(
        default_factory=lambda: {
            "missingBio": 0,
            "missingCourses": 0,
            "missingResearchInterests": 0,
            "missingAvatar": 0,
        }
    )
    coverage_by_region: Dict[str, Dict[str, int]] = field(
        default_factory=lambda: {
            "north": {"universities": 0, "professors": 0},
            "central": {"universities": 0, "professors": 0},
            "south": {"universities": 0, "professors": 0},
        }
    )
    sources_health: Dict[str, int] = field(
        default_factory=lambda: {"active": 0, "failed": 0, "rateLimited": 0}
    )
    last_successful_ingestion_date: Optional[int] = None
