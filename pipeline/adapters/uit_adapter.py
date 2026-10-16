"""Adapter for University of Information Technology - VNUHCM (UIT).
Handles CS, SE, CE, IS, and Information Security faculties.
"""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Optional
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


class UitAdapter(BaseAcademicAdapter):
    """Adapter for UIT faculties and directories."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "uit.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        card_pattern = re.compile(
            r'<div[^>]*class=["\'][^"\']*(?:views-row|person|member|can-bo|giang-vien|profile-teaser)[^"\']*["\'][^>]*>(.*?)</div>\s*</div>',
            re.DOTALL | re.IGNORECASE,
        )

        cards = list(card_pattern.finditer(html))

        if not cards:
            table_row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
            for row_m in table_row_pattern.finditer(html):
                row_html = row_m.group(1)
                if "<th" in row_html:
                    continue
                prof = self._extract_from_row(row_html, url, university)
                if prof:
                    professors.append(prof)
            if professors:
                return professors

            link_pattern = re.compile(
                r'<a[^>]+href=["\']([^"\']*(?:/giang-vien/|/nhan-su/|/can-bo/)[^"\']*)["\'][^>]*>([^<]+)</a>',
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

        for card in cards:
            card_html = card.group(1)

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

            img_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', card_html)
            avatar_url = urllib.parse.urljoin(url, img_m.group(1)) if img_m else ""

            text_snippet = re.sub(r"<[^>]+>", " ", card_html)
            text_snippet = re.sub(r"\s+", " ", text_snippet).strip()

            prof = self._build_prof_record(
                raw_name, profile_link, url, university, avatar_url, text_snippet
            )
            if prof:
                professors.append(prof)

        return professors

    def _extract_from_row(
        self, row_html: str, url: str, university: UniversityRecord
    ) -> Optional[ProfessorRecord]:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL | re.IGNORECASE)
        if len(cells) < 2:
            return None

        name_cell = cells[1] if len(cells) >= 2 else cells[0]
        name_clean = re.sub(r"<[^>]+>", " ", name_cell).strip()
        link_m = re.search(r'href=["\']([^"\']+)["\']', name_cell)
        profile_link = urllib.parse.urljoin(url, link_m.group(1)) if link_m else url

        row_text = " ".join([re.sub(r"<[^>]+>", " ", c).strip() for c in cells])
        return self._build_prof_record(name_clean, profile_link, url, university, snippet=row_text)

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
        prof_id = f"prof-uit-{norm_name.replace(' ', '-')}"

        position = None
        if "trưởng khoa" in snippet.lower():
            position = "Trưởng khoa"
        elif "phó trưởng khoa" in snippet.lower():
            position = "Phó trưởng khoa"
        elif "trưởng bộ môn" in snippet.lower():
            position = "Trưởng bộ môn"

        email_m = re.search(r'([a-zA-Z0-9_.+-]+@uit\.edu\.vn)', snippet)
        identifiers = {}
        if email_m:
            identifiers["institutionalEmail"] = email_m.group(1).lower()

        interests = []
        if "lĩnh vực nghiên cứu:" in snippet.lower() or "nghiên cứu:" in snippet.lower():
            parts = re.split(r"(?:lĩnh vực nghiên cứu:|nghiên cứu:)", snippet, flags=re.I)
            if len(parts) > 1:
                tail = parts[1].split(".")[0]
                interests = [t.strip() for t in tail.split(",") if len(t.strip()) > 2]

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id="uit",
            university_name="Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM",
            university_short_name="UIT",
            faculty="Khoa Khoa học Máy tính",
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            bio=snippet if len(snippet) > 20 else "Giảng viên tại Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM.",
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
