"""Adapter for VNU University of Engineering and Technology (VNU-UET).
Handles FIT, FET, FEPN, and main UET portals.
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


class VnuUetAdapter(BaseAcademicAdapter):
    """Adapter for VNU-UET faculties and directories."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "uet.vnu.edu.vn" in domain or ("vnu.edu.vn" in domain and "uet" in url.lower())

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # Common WordPress profile card / staff directory patterns
        card_pattern = re.compile(
            r'<div[^>]*class=["\'][^"\']*(?:member|staff|team-member|profile-box|post-item|elementor-post|can-bo)[^"\']*["\'][^>]*>(.*?)</div>\s*</div>',
            re.DOTALL | re.IGNORECASE,
        )

        cards = list(card_pattern.finditer(html))

        # Fallback to table rows if directory is formatted as a table
        if not cards:
            table_row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
            for row_m in table_row_pattern.finditer(html):
                row_html = row_m.group(1)
                if "<th" in row_html:
                    continue  # skip headers
                prof = self._extract_from_row(row_html, url, university)
                if prof:
                    professors.append(prof)
            if professors:
                return professors

            # Link pattern fallback
            link_pattern = re.compile(
                r'<a[^>]+href=["\']([^"\']*(?:/can-bo/|/giang-vien/|/nhan-su/)[^"\']*)["\'][^>]*>([^<]+)</a>',
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

            # Name and profile link
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

            # Avatar image
            img_m = re.search(r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
            avatar_url = ""
            if img_m:
                s_val = img_m.group(1).strip()
                if s_val and not any(bad in s_val.lower() for bad in ["logo", "icon", "blank", "default"]):
                    avatar_url = urllib.parse.urljoin(url, s_val)

            # Snippet / details
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

        avatar_url = ""
        for c in cells:
            c_img = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', c, re.IGNORECASE)
            if c_img:
                s_val = c_img.group(1).strip()
                if s_val and not any(bad in s_val.lower() for bad in ["logo", "icon", "blank", "default"]):
                    avatar_url = urllib.parse.urljoin(url, s_val)
                    break

        name_cell = cells[1] if len(cells) >= 2 else cells[0]
        name_clean = re.sub(r"<[^>]+>", " ", name_cell).strip()
        link_m = re.search(r'href=["\']([^"\']+)["\']', name_cell)
        profile_link = urllib.parse.urljoin(url, link_m.group(1)) if link_m else url

        row_text = " ".join([re.sub(r"<[^>]+>", " ", c).strip() for c in cells])
        return self._build_prof_record(name_clean, profile_link, url, university, avatar_url=avatar_url, snippet=row_text)

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
        prof_id = f"prof-vnu-uet-{norm_name.replace(' ', '-')}"

        position = None
        if "chủ nhiệm khoa" in snippet.lower() or "trưởng khoa" in snippet.lower():
            position = "Trưởng khoa"
        elif "phó chủ nhiệm khoa" in snippet.lower() or "phó trưởng khoa" in snippet.lower():
            position = "Phó trưởng khoa"
        elif "chủ nhiệm bộ môn" in snippet.lower() or "trưởng bộ môn" in snippet.lower():
            position = "Trưởng bộ môn"

        email_m = re.search(r'([a-zA-Z0-9_.+-]+@vnu\.edu\.vn)', snippet)
        identifiers = {}
        if email_m:
            identifiers["institutionalEmail"] = email_m.group(1).lower()

        interests = []
        if "hướng nghiên cứu:" in snippet.lower() or "nghiên cứu:" in snippet.lower():
            parts = re.split(r"(?:hướng nghiên cứu:|nghiên cứu:)", snippet, flags=re.I)
            if len(parts) > 1:
                tail = parts[1].split(".")[0]
                interests = [t.strip() for t in tail.split(",") if len(t.strip()) > 2]

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id="vnu-uet",
            university_name="Trường Đại học Công nghệ - ĐHQG Hà Nội",
            university_short_name="VNU-UET",
            faculty="Khoa Công nghệ Thông tin",
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            bio=snippet if len(snippet) > 20 else "Giảng viên tại Trường ĐH Công nghệ - ĐHQG Hà Nội.",
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
