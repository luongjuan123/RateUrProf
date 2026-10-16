"""Generic Academic Adapter for Vietnamese Universities.
Serves as universal fallback for standard academic portals, CMSs (WordPress, Joomla, Drupal),
Schema.org JSON-LD structured data, and faculty directory tables.
"""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Optional
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.crawler import StructuredDataExtractor
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


class GenericAcademicAdapter(BaseAcademicAdapter):
    """Universal academic extractor for educational domains."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "edu.vn" in domain or "vnu.edu.vn" in domain or "udn.vn" in domain or "hueuni.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # 1. Try JSON-LD Person schema first (highest quality structured data)
        json_ld_items = StructuredDataExtractor.extract_json_ld(html)
        people = StructuredDataExtractor.extract_people(json_ld_items)
        if people:
            for p in people:
                prof = self._build_from_json_ld(p, url, university)
                if prof:
                    professors.append(prof)
            if professors:
                return professors

        # 2. Try HTML Card / Member components
        card_pattern = re.compile(
            r'<div[^>]*class=["\'][^"\']*(?:giang-vien|can-bo|nhan-su|faculty-item|member|staff|team-member|profile-item|card-teacher)[^"\']*["\'][^>]*>(.*?)</div>\s*</div>',
            re.DOTALL | re.IGNORECASE,
        )
        cards = list(card_pattern.finditer(html))

        if cards:
            for card in cards:
                card_html = card.group(1)
                name_m = re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>', card_html)
                if not name_m:
                    name_m = re.search(r'<h[2345][^>]*>([^<]+)</h[2345]>', card_html)
                    profile_link = url
                    raw_name = name_m.group(1).strip() if name_m else ""
                else:
                    profile_link = urllib.parse.urljoin(url, name_m.group(1))
                    raw_name = name_m.group(2).strip()

                if not raw_name:
                    continue

                img_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', card_html)
                avatar_url = urllib.parse.urljoin(url, img_m.group(1)) if img_m else ""

                text_snippet = re.sub(r"<[^>]+>", " ", card_html)
                text_snippet = re.sub(r"\s+", " ", text_snippet).strip()

                prof = self._build_prof_record(
                    raw_name, profile_link, url, university, avatar_url, text_snippet
                )
                if prof:
                    professors.append(prof)

            if professors:
                return professors

        # 3. Try Table Rows (e.g. Danh sách cán bộ / giảng viên)
        table_row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        for row_m in table_row_pattern.finditer(html):
            row_html = row_m.group(1)
            if "<th" in row_html:
                continue
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL | re.IGNORECASE)
            if len(cells) >= 2:
                name_cell = cells[1] if len(cells) >= 2 else cells[0]
                name_clean = re.sub(r"<[^>]+>", " ", name_cell).strip()
                link_m = re.search(r'href=["\']([^"\']+)["\']', name_cell)
                profile_link = urllib.parse.urljoin(url, link_m.group(1)) if link_m else url

                row_text = " ".join([re.sub(r"<[^>]+>", " ", c).strip() for c in cells])
                prof = self._build_prof_record(name_clean, profile_link, url, university, snippet=row_text)
                if prof:
                    professors.append(prof)

        # 4. Fallback link list
        if not professors:
            link_pattern = re.compile(
                r'<a[^>]+href=["\']([^"\']*(?:/can-bo/|/giang-vien/|/profile/)[^"\']*)["\'][^>]*>([^<]+)</a>',
                re.IGNORECASE,
            )
            for m in link_pattern.finditer(html):
                profile_link = urllib.parse.urljoin(url, m.group(1))
                raw_name = m.group(2).strip()
                if len(raw_name) > 3 and not raw_name.lower().startswith(("xem", "chi tiết")):
                    prof = self._build_prof_record(raw_name, profile_link, url, university)
                    if prof:
                        professors.append(prof)

        return professors

    def _build_from_json_ld(
        self, p_data: dict, source_page_url: str, university: UniversityRecord
    ) -> Optional[ProfessorRecord]:
        raw_name = p_data.get("name")
        if not raw_name or not isinstance(raw_name, str):
            return None

        clean_name = raw_name.strip()
        job_title = p_data.get("jobTitle", "Giảng viên")
        image = p_data.get("image", "")
        if isinstance(image, dict):
            image = image.get("url", "")
        profile_url = p_data.get("url", source_page_url)
        email = p_data.get("email", "")

        identifiers = {}
        if email and isinstance(email, str):
            identifiers["institutionalEmail"] = email.lower()

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-{university.id}-{norm_name.replace(' ', '-')}"

        return ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=None,
            title=job_title if isinstance(job_title, str) else "Giảng viên",
            position=job_title if isinstance(job_title, str) else None,
            university_id=university.id,
            university_name=university.name,
            university_short_name=university.short_name,
            faculty=university.faculties[0] if university.faculties else "Ban Giảng huấn",
            name_variants=[clean_name, norm_name],
            avatar=image if isinstance(image, str) else "",
            bio=p_data.get("description", f"Giảng viên tại {university.name}."),
            official_profile_urls=[profile_url] if profile_url else [],
            identifiers=identifiers,
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=0.98,
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
            confidence_score=0.94,
            source_urls=[source_page_url],
        )

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

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-{university.id}-{norm_name.replace(' ', '-')}"

        position = None
        if "trưởng khoa" in snippet.lower():
            position = "Trưởng khoa"
        elif "phó trưởng khoa" in snippet.lower():
            position = "Phó trưởng khoa"
        elif "trưởng bộ môn" in snippet.lower():
            position = "Trưởng bộ môn"

        # Email detection
        domain = university.official_domain or "edu.vn"
        email_m = re.search(rf'([a-zA-Z0-9_.+-]+@(?:[a-zA-Z0-9-]+\.)?{re.escape(domain)})', snippet)
        identifiers = {}
        if email_m:
            identifiers["institutionalEmail"] = email_m.group(1).lower()

        interests = []
        if "nghiên cứu:" in snippet.lower():
            parts = re.split(r"nghiên cứu:", snippet, flags=re.I)
            if len(parts) > 1:
                tail = parts[1].split(".")[0]
                interests = [t.strip() for t in tail.split(",") if len(t.strip()) > 2]

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id=university.id,
            university_name=university.name,
            university_short_name=university.short_name,
            faculty=university.faculties[0] if university.faculties else "Khoa Chuyên ngành",
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            bio=snippet if len(snippet) > 20 else f"Giảng viên tại {university.name}.",
            research_interests=interests,
            official_profile_urls=[profile_url] if profile_url else [],
            identifiers=identifiers,
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=0.92,
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
            confidence_score=0.90,
            source_urls=[source_page_url, profile_url],
        )

        return record
