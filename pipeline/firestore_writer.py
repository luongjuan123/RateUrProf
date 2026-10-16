"""Firestore Database Writer for RateProfCuaBan Academic Ingestion Pipeline.
Handles persistent storage of Universities, Professors, Source Registries,
Ingestion Runs, and Data Quality Reports directly into Google Cloud Firestore.
"""

from __future__ import annotations
import os
import time
import json
from dataclasses import asdict
from typing import List, Dict, Any, Optional

from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    SourceRegistryRecord,
    IngestionRunRecord,
    DataQualityReportRecord,
    EntityMatchCandidateRecord,
)

# Optional firebase-admin or google-cloud-firestore
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    HAS_FIREBASE_ADMIN = True
except ImportError:
    HAS_FIREBASE_ADMIN = False


class FirestoreWriter:
    """Writes academic crawler and extraction outputs to Cloud Firestore."""

    def __init__(self, project_id: Optional[str] = None):
        self.project_id = (
            project_id
            or os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
            or "rateprofcuaban-vn"
        )
        self.db = None
        self._init_firestore()

    def _init_firestore(self):
        """Attempts to initialize Firestore client via ADC, service account, or default project."""
        if not HAS_FIREBASE_ADMIN:
            return

        try:
            if not firebase_admin._apps:
                cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred, {"projectId": self.project_id})
                else:
                    try:
                        cred = credentials.ApplicationDefault()
                        firebase_admin.initialize_app(cred, {"projectId": self.project_id})
                    except Exception:
                        firebase_admin.initialize_app(options={"projectId": self.project_id})

            self.db = firestore.client()
        except Exception as e:
            # Fallback or offline development mode
            print(f"[FirestoreWriter] Note: Cloud Firestore live connection not active: {e}")
            self.db = None

    @property
    def is_connected(self) -> bool:
        return self.db is not None

    def upsert_university(self, record: UniversityRecord) -> bool:
        """Upserts a University document in Firestore."""
        doc_data = {
            "id": record.id,
            "name": record.name,
            "nameVi": record.name,
            "nameEn": record.english_name or record.name,
            "shortName": record.short_name,
            "city": record.city,
            "region": record.region,
            "officialDomain": record.official_domain or "",
            "officialWebsite": record.official_website or "",
            "description": record.description or "",
            "descriptionVi": record.description or "",
            "logoUrl": record.logo_url or "",
            "coverImage": record.cover_image or "",
            "faculties": record.faculties,
            "sourceUrls": record.source_urls,
            "updatedAt": int(time.time() * 1000),
        }

        if self.db:
            try:
                self.db.collection("universities").document(record.id).set(
                    doc_data, merge=True
                )
                return True
            except Exception as e:
                print(f"[FirestoreWriter] Error upserting university {record.id}: {e}")
                return False
        return False

    def upsert_professor(self, record: ProfessorRecord) -> bool:
        """
        Upserts a Professor document in Firestore.
        Preserves existing student reviews and rating aggregates.
        Never fabricates rating data.
        """
        fullName = record.name
        normalizedName = record.name_variants[1] if len(record.name_variants) > 1 else record.name
        nameVariants = record.name_variants or [fullName, normalizedName]

        doc_data: Dict[str, Any] = {
            "id": record.id,
            "name": fullName,
            "fullName": fullName,
            "normalizedName": normalizedName,
            "nameVariants": nameVariants,
            "universityId": record.university_id,
            "universityName": record.university_name,
            "universityShortName": record.university_short_name,
            "faculty": record.faculty,
            "department": record.department or "",
            "title": record.title or "Giảng viên",
            "academicTitle": record.academic_title or record.title,
            "professionalPosition": record.position or "",
            "position": record.position or "",
            "avatar": record.avatar or "",
            "bio": record.bio or f"Giảng viên tại {record.university_name}.",
            "bioVi": record.bio_vi or record.bio or f"Giảng viên tại {record.university_name}.",
            "bioEn": record.bio_en or "",
            "courses": record.courses or [],
            "researchInterests": record.research_interests or [],
            "officialProfileUrls": record.official_profile_urls or [],
            "identifiers": record.identifiers or {},
            "sourceUrls": record.source_urls or [],
            "verificationStatus": record.verification_status or "verified",
            "confidenceScore": record.confidence_score or 0.9,
            "lastVerifiedAt": record.last_verified_at or int(time.time() * 1000),
            "hasPublicProfile": True,
            "hasPhoto": bool(record.avatar and record.avatar.strip()),
            "updatedAt": int(time.time() * 1000),
        }

        # Provenance records
        if record.provenance:
            doc_data["fieldProvenances"] = [
                {
                    "field": p.field,
                    "sourceUrl": p.source_url,
                    "extractedAt": p.extracted_at,
                    "confidence": p.confidence,
                    "sourceType": p.source_type,
                }
                for p in record.provenance
            ]

        if self.db:
            try:
                prof_ref = self.db.collection("professors").document(record.id)
                snapshot = prof_ref.get()

                if not snapshot.exists:
                    # New professor: initialize review stats to unrated
                    doc_data["ratingAverage"] = None
                    doc_data["averageRating"] = None
                    doc_data["ratingCount"] = 0
                    doc_data["publishedReviewCount"] = 0
                    doc_data["createdAt"] = int(time.time() * 1000)
                else:
                    # Existing professor: preserve student rating aggregates
                    existing_data = snapshot.to_dict() or {}
                    if "ratingAverage" in existing_data:
                        doc_data["ratingAverage"] = existing_data["ratingAverage"]
                    if "averageRating" in existing_data:
                        doc_data["averageRating"] = existing_data["averageRating"]
                    if "ratingCount" in existing_data:
                        doc_data["ratingCount"] = existing_data["ratingCount"]
                    if "publishedReviewCount" in existing_data:
                        doc_data["publishedReviewCount"] = existing_data["publishedReviewCount"]

                prof_ref.set(doc_data, merge=True)
                return True
            except Exception as e:
                print(f"[FirestoreWriter] Error upserting professor {record.id}: {e}")
                return False
        return False

    def upsert_source(self, record: SourceRegistryRecord) -> bool:
        """Upserts a SourceRegistryRecord document in Firestore."""
        doc_data = {
            "id": record.id,
            "universityId": record.university_id,
            "url": record.url,
            "domain": record.domain,
            "sourceType": record.source_type,
            "crawlPolicy": record.crawl_policy,
            "status": record.status,
            "lastCrawledAt": record.last_crawled_at,
            "etag": record.etag,
            "contentHash": record.content_hash,
            "failureCount": record.failure_count,
            "lastErrorMessage": record.last_error_message,
            "updatedAt": int(time.time() * 1000),
        }

        if self.db:
            try:
                self.db.collection("sourceRegistry").document(record.id).set(
                    doc_data, merge=True
                )
                return True
            except Exception as e:
                print(f"[FirestoreWriter] Error upserting source {record.id}: {e}")
                return False
        return False

    def save_ingestion_run(self, record: IngestionRunRecord) -> bool:
        """Stores execution metrics for an ingestion run."""
        doc_data = {
            "id": record.id,
            "runType": record.run_type,
            "startedAt": record.started_at,
            "completedAt": record.completed_at,
            "status": record.status,
            "universitiesProcessed": record.universities_processed,
            "professorsExtracted": record.professors_extracted,
            "professorsUpdated": record.professors_updated,
            "sourcesCrawled": record.sources_crawled,
            "errorsLogged": record.errors_logged,
            "updatedAt": int(time.time() * 1000),
        }

        if self.db:
            try:
                self.db.collection("ingestionRuns").document(record.id).set(doc_data)
                return True
            except Exception as e:
                print(f"[FirestoreWriter] Error saving ingestion run {record.id}: {e}")
                return False
        return False

    def save_qa_report(self, record: DataQualityReportRecord) -> bool:
        """Stores the latest data quality report in Firestore."""
        doc_data = {
            "id": record.id,
            "generatedAt": record.generated_at,
            "totalUniversities": record.total_universities,
            "universitiesWithRegisteredDomains": record.universities_with_registered_domains,
            "totalFaculties": record.total_faculties,
            "totalProfessors": record.total_professors,
            "verifiedProfessorsCount": record.verified_professors_count,
            "unverifiedProfessorsCount": record.unverified_professors_count,
            "duplicateCandidatesCount": record.duplicate_candidates_count,
            "profilesWithImagesCount": record.profiles_with_images_count,
            "imagesPendingReviewCount": record.images_pending_review_count,
            "missingKeyFields": record.missing_key_fields,
            "coverageByRegion": record.coverage_by_region,
            "sourcesHealth": record.sources_health,
            "lastSuccessfulIngestionDate": record.last_successful_ingestion_date or int(time.time() * 1000),
            "updatedAt": int(time.time() * 1000),
        }

        if self.db:
            try:
                self.db.collection("dataQualityReports").document(record.id).set(doc_data)
                return True
            except Exception as e:
                print(f"[FirestoreWriter] Error saving QA report {record.id}: {e}")
                return False
        return False
