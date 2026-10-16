"""Semantic Indexer, Text Chunker, and Search Document Generator for RateProfCuaBan.
Prepares bilingual Vietnamese/English citation-grounded chunks for RAG and search indexing.
"""

from __future__ import annotations
import re
import unicodedata
from typing import List, Dict, Any, Optional
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    SourceDocumentRecord,
)
from pipeline.dedup import IdentityResolutionEngine


class AcademicSemanticIndexer:
    """Chunks and indexes academic entities into citation-grounded search documents."""

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Strips excessive whitespace and normalizes text."""
        return re.sub(r"\s+", " ", text or "").strip()

    @classmethod
    def build_professor_search_document(
        cls, professor: ProfessorRecord
    ) -> Dict[str, Any]:
        """
        Creates a structured search and RAG retrieval document for a professor,
        including bilingual terms and clickable source citations.
        """
        norm_name = IdentityResolutionEngine.normalize_name(professor.name)
        norm_univ = IdentityResolutionEngine.normalize_name(professor.university_name)
        norm_faculty = IdentityResolutionEngine.normalize_name(professor.faculty)

        interests_str = ", ".join(professor.research_interests)
        norm_interests = IdentityResolutionEngine.normalize_name(interests_str)

        courses_str = ", ".join(professor.courses)
        norm_courses = IdentityResolutionEngine.normalize_name(courses_str)

        # Primary source URL for clickable citations
        citation_url = (
            professor.official_profile_urls[0]
            if professor.official_profile_urls
            else (professor.source_urls[0] if professor.source_urls else f"https://rateprofcuaban.vn/professors/{professor.id}")
        )

        # Structured markdown chunk designed for direct LLM ingestion and grounding
        chunk_content = (
            f"### {professor.academic_title or ''} {professor.name} ({professor.university_short_name})\n"
            f"- **Học hàm / Học vị**: {professor.academic_title or 'Giảng viên'}\n"
            f"- **Chức vụ**: {professor.position or 'Cán bộ giảng dạy'}\n"
            f"- **Cơ sở đào tạo**: {professor.university_name} ({professor.university_short_name})\n"
            f"- **Khoa / Viện**: {professor.faculty}\n"
            f"- **Email**: {professor.identifiers.get('institutionalEmail', 'Chưa công bố')}\n"
            f"- **Lĩnh vực nghiên cứu**: {interests_str or 'Đang cập nhật'}\n"
            f"- **Học phần giảng dạy**: {courses_str or 'Đang cập nhật'}\n"
            f"- **Tiểu sử tóm tắt**: {professor.bio or ''}\n"
            f"- **Nguồn xác minh**: [{citation_url}]({citation_url})\n"
            f"- **Độ tin cậy xác thực**: {int(professor.confidence_score * 100)}%\n"
        )

        return {
            "id": f"doc-{professor.id}",
            "entityType": "professor",
            "entityId": professor.id,
            "title": f"{professor.academic_title or ''} {professor.name} - {professor.university_short_name}".strip(),
            "content": chunk_content,
            "sourceUrl": citation_url,
            "universityId": professor.university_id,
            "universityName": professor.university_name,
            "faculty": professor.faculty,
            "academicRank": professor.academic_title,
            "researchInterests": professor.research_interests,
            "courses": professor.courses,
            "keywords": [
                norm_name,
                norm_univ,
                norm_faculty,
                norm_interests,
                norm_courses,
                professor.university_short_name.lower(),
            ],
            "confidenceScore": professor.confidence_score,
            "verificationStatus": professor.verification_status,
        }

    @classmethod
    def build_university_search_document(
        cls, university: UniversityRecord
    ) -> Dict[str, Any]:
        """Creates a structured search and RAG retrieval document for a university."""
        faculties_str = "\n".join([f"  - {f}" for f in university.faculties])
        website = university.official_website or f"https://{university.official_domain}"

        chunk_content = (
            f"### {university.name} ({university.short_name})\n"
            f"- **Tên tiếng Anh**: {university.english_name or 'N/A'}\n"
            f"- **Khu vực**: {university.region} ({university.city})\n"
            f"- **Website chính thức**: [{website}]({website})\n"
            f"- **Mô tả**: {university.description or ''}\n"
            f"- **Các trường thành viên, khoa, viện trực thuộc**:\n{faculties_str}\n"
            f"- **Nguồn xác minh**: [{website}]({website})\n"
        )

        return {
            "id": f"doc-univ-{university.id}",
            "entityType": "university",
            "entityId": university.id,
            "title": f"{university.name} ({university.short_name})",
            "content": chunk_content,
            "sourceUrl": website,
            "city": university.city,
            "region": university.region,
            "faculties": university.faculties,
            "keywords": [
                IdentityResolutionEngine.normalize_name(university.name),
                university.short_name.lower(),
                IdentityResolutionEngine.normalize_name(university.english_name or ""),
                IdentityResolutionEngine.normalize_name(university.city),
                IdentityResolutionEngine.normalize_name(university.region),
            ],
        }
