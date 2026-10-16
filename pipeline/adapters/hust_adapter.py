"""Adapter for Hanoi University of Science and Technology (HUST).
Handles SoICT, SEEE, SME, and main HUST portals.
"""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Optional
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    AcademicPublicationRecord,
    ProvenanceEvidence,
)


class HustAdapter(BaseAcademicAdapter):
    """Adapter for HUST faculties and directories."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hust.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # Common title regex: PGS. TS., GS. TS., TS., ThS., KS., CN.
        title_regex = re.compile(
            r"\b(GS\.?\s*TS|PGS\.?\s*TS|TS|ThS|KS|CN|Thạc sĩ|Tiến sĩ|Phó Giáo sư|Giáo sư)\b\.?",
            re.IGNORECASE,
        )

        # 1. SoICT directory card pattern:
        # <div class="soict-card"> or <h3><a href="...">Tên cán bộ</a></h3>
        # <p class="title">Chức vụ / Học vị</p>
        card_pattern = re.compile(
            r'<div[^>]*class=["\'][^"\']*(?:can-bo|member|person|staff|lecturer|teacher)[^"\']*["\'][^>]*>(.*?)</div>\s*</div>',
            re.DOTALL | re.IGNORECASE,
        )

        cards = list(card_pattern.finditer(html))

        # Fallback to link/heading search if specific cards not found
        if not cards:
            link_pattern = re.compile(
                r'<a[^>]+href=["\']([^"\']*(?:/can-bo/|/giang-vien/|/profile/)[^"\']*)["\'][^>]*>([^<]+)</a>',
                re.IGNORECASE,
            )
            for m in link_pattern.finditer(html):
                profile_link = urllib.parse.urljoin(url, m.group(1))
                raw_name = m.group(2).strip()
                if len(raw_name) > 3 and not raw_name.lower().startswith(("xem", "chi tiết", "xem thêm")):
                    prof = self._build_prof_record(raw_name, profile_link, url, university)
                    if prof:
                        professors.append(prof)
            return professors

        for card in cards:
            card_html = card.group(1)

            # Name and link
            name_m = re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>', card_html)
            if not name_m:
                name_m = re.search(r'<h[345][^>]*>([^<]+)</h[345]>', card_html)
                profile_link = url
                raw_name = name_m.group(1).strip() if name_m else ""
            else:
                profile_link = urllib.parse.urljoin(url, name_m.group(1))
                raw_name = name_m.group(2).strip()

            if not raw_name:
                continue

            # Image
            img_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', card_html)
            avatar_url = urllib.parse.urljoin(url, img_m.group(1)) if img_m else ""

            # Bio / Dept / Email text
            text_snippet = re.sub(r"<[^>]+>", " ", card_html)
            text_snippet = re.sub(r"\s+", " ", text_snippet).strip()

            prof = self._build_prof_record(
                raw_name, profile_link, url, university, avatar_url, text_snippet
            )
            if prof:
                professors.append(prof)

        return professors

    def _build_prof_record(
        self,
        raw_name: str,
        profile_url: str,
        source_page_url: str,
        university: UniversityRecord,
        avatar_url: str = "",
        snippet: str = "",
    ) -> Optional[ProfessorRecord]:
        clean_name = raw_name.strip()
        academic_title = None

        # Detect and separate academic title
        if re.search(r"\b(PGS\.?\s*TS|Phó Giáo sư)\b", clean_name, re.IGNORECASE):
            academic_title = "PGS. TS"
            clean_name = re.sub(r"^(PGS\.?\s*TS\.?|Phó Giáo sư,?\s*Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(GS\.?\s*TS|Giáo sư)\b", clean_name, re.IGNORECASE):
            academic_title = "GS. TS"
            clean_name = re.sub(r"^(GS\.?\s*TS\.?|Giáo sư,?\s*Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(TS|Tiến sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "TS"
            clean_name = re.sub(r"^(TS\.?|Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(ThS|Thạc sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "ThS"
            clean_name = re.sub(r"^(ThS\.?|Thạc sĩ\.?)\s*", "", clean_name, flags=re.I).strip()

        if len(clean_name) < 3:
            return None

        # Slug generation
        from pipeline.dedup import IdentityResolutionEngine
        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-hust-{norm_name.replace(' ', '-')}"

        # Position detection from snippet
        position = None
        if "trưởng khoa" in snippet.lower():
            position = "Trưởng khoa"
        elif "phó trưởng khoa" in snippet.lower():
            position = "Phó trưởng khoa"
        elif "trưởng bộ môn" in snippet.lower():
            position = "Trưởng bộ môn"
        elif "giảng viên chính" in snippet.lower():
            position = "Giảng viên chính"

        # Email detection
        email_m = re.search(r'([a-zA-Z0-9_.+-]+@(?:[a-zA-Z0-9-]+\.)?hust\.edu\.vn)', snippet)
        identifiers = {}
        if email_m:
            identifiers["institutionalEmail"] = email_m.group(1).lower()

        # Research interests extraction from snippet
        interests = []
        if "nghiên cứu:" in snippet.lower() or "research:" in snippet.lower():
            parts = re.split(r"(?:nghiên cứu:|research:)", snippet, flags=re.I)
            if len(parts) > 1:
                tail = parts[1].split(".")[0]
                interests = [t.strip() for t in tail.split(",") if len(t.strip()) > 2]

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id="hust",
            university_name="Đại học Bách Khoa Hà Nội",
            university_short_name="HUST",
            faculty="Trường Công nghệ Thông tin & Truyền thông",
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            bio=snippet if len(snippet) > 20 else f"Giảng viên tại Đại học Bách Khoa Hà Nội.",
            research_interests=interests,
            official_profile_urls=[profile_url] if profile_url else [],
            identifiers=identifiers,
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=0.95,
                    source_type="official_faculty_page",
                ),
                ProvenanceEvidence(
                    field="university",
                    source_url=source_page_url,
                    confidence=1.0,
                    source_type="official_faculty_page",
                ),
            ],
            verification_status="verified",
            confidence_score=0.92,
            source_urls=[source_page_url, profile_url],
        )

        return record
