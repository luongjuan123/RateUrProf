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
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


class HustAdapter(BaseAcademicAdapter):
    """Adapter for HUST faculties and directories."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hust.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []
        seen_names = set()

        # 1. First extract from rich officer/profile cards with photos (e.g. SoICT officer articles)
        cards = list(re.finditer(r'<article[^>]*class=["\'][^"\']*officer[^\"\']*["\'][^>]*>(.*?)</article>', html, re.DOTALL | re.IGNORECASE))
        if not cards:
            cards = list(re.finditer(r'<div[^>]*class=["\'][^"\']*(?:profile-box|member-item)[^"\']*["\'][^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE))

        for card in cards:
            card_html = card.group(1)
            name_m = re.search(r'<(?:h[1-6]|span|div)[^>]*class=["\'][^"\']*entry-title[^\"\']*[\"\'][^>]*><a[^>]*>([^<]+)</a>', card_html)
            profile_link = url
            if name_m:
                raw_name = name_m.group(1).strip()
            else:
                a_m = re.search(r'<a[^>]+href=["\']([^"\']+\.html)["\'][^>]*>([^<]+)</a>', card_html)
                if not a_m:
                    continue
                profile_link = urllib.parse.urljoin(url, a_m.group(1))
                raw_name = a_m.group(2).strip()

            # Photo extraction: support data-lazy-src, data-src, and standard src (ignoring data: svg placeholders)
            lazy_m = re.search(r'data-lazy-src=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
            avatar_url = lazy_m.group(1).strip() if lazy_m else ""
            if not avatar_url:
                data_m = re.search(r'data-src=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
                avatar_url = data_m.group(1).strip() if data_m else ""
            if not avatar_url:
                src_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
                if src_m and not src_m.group(1).startswith("data:"):
                    avatar_url = src_m.group(1).strip()

            if avatar_url:
                avatar_url = urllib.parse.urljoin(url, avatar_url)

            prof = self._build_prof_record(raw_name, profile_link, url, university, avatar_url=avatar_url)
            if prof and prof.name not in seen_names:
                seen_names.add(prof.name)
                professors.append(prof)

        if professors:
            return professors

        # 2. Fallback: Look for links containing academic titles (GS, PGS, TS, ThS)
        link_pattern = re.compile(
            r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )

        for m in link_pattern.finditer(html):
            href = m.group(1).strip()
            text = m.group(2)
            clean_text = re.sub(r'<[^>]+>', '', text).strip()

            if any(k in clean_text for k in ["TS.", "PGS.", "GS.", "ThS.", "TS ", "PGS ", "GS ", "ThS "]):
                profile_link = urllib.parse.urljoin(url, href)
                img_m = re.search(r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\']', text, re.IGNORECASE)
                avatar_url = urllib.parse.urljoin(url, img_m.group(1).strip()) if img_m and not img_m.group(1).startswith("data:") else ""
                prof = self._build_prof_record(clean_text, profile_link, url, university, avatar_url=avatar_url)
                if prof and prof.name not in seen_names:
                    seen_names.add(prof.name)
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

        # Clean any remaining trailing or leading punctuation
        clean_name = re.sub(r"^[,\-\.\s]+|[,\-\.\s]+$", "", clean_name)
        if len(clean_name) < 3:
            return None

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-hust-{norm_name.replace(' ', '-')}"

        faculty = "Trường Công nghệ Thông tin & Truyền thông"
        if "sme.hust" in source_page_url:
            faculty = "Trường Cơ khí"
        elif "seee.hust" in source_page_url:
            faculty = "Trường Điện - Điện tử"
        elif "fami.hust" in source_page_url:
            faculty = "Khoa Toán - Tin"

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=None,
            university_id="hust",
            university_name="Đại học Bách Khoa Hà Nội",
            university_short_name="HUST",
            faculty=faculty,
            department=faculty,
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            official_profile_urls=[profile_url] if profile_url else [source_page_url],
            identifiers={},
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=1.0,
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
            confidence_score=1.0,
            rating_average=None,
            rating_count=0,
            criteria_averages=None,
        )

        return record
