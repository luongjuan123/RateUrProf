"""Adapter for Ho Chi Minh City University of Technology (HCMUT - Bach Khoa TP.HCM).
Handles CSE departments, DEE, and other faculties.
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


class HcmutAdapter(BaseAcademicAdapter):
    """Adapter for HCMUT faculties and directories."""

    DEPARTMENTS_MAP = {
        "bo-mon-khoa-hoc-may-tinh": "Bộ môn Khoa học Máy tính",
        "bo-mon-cong-nghe-phan-mem": "Bộ môn Công nghệ Phần mềm",
        "bo-mon-he-thong-thong-tin": "Bộ môn Hệ thống Thông tin",
        "bo-mon-he-thong-va-mang-may-tinh": "Bộ môn Hệ thống & Mạng Máy tính",
        "bo-mon-ky-thuat-may-tinh": "Bộ môn Kỹ thuật Máy tính",
    }

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hcmut.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []
        seen_names = set()

        dept_name = "Khoa Khoa học & Kỹ thuật Máy tính"
        for slug, dname in self.DEPARTMENTS_MAP.items():
            if slug in url:
                dept_name = dname
                break

        table_row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        for row_m in table_row_pattern.finditer(html):
            row_html = row_m.group(1)
            if "<th" in row_html:
                continue
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL | re.IGNORECASE)
            if len(cells) < 2:
                continue

            name_cell = cells[1]
            raw_name = re.sub(r'<[^>]+>|&nbsp;', ' ', name_cell).strip()
            # Clean up whitespace
            raw_name = re.sub(r'\s+', ' ', raw_name).strip()

            position_cell = cells[2] if len(cells) > 2 else ""
            pos_text = re.sub(r'<[^>]+>|&nbsp;', ' ', position_cell).strip()
            pos_clean = re.sub(r'\s+', ' ', pos_text) if pos_text else None

            # Image check across cells
            avatar_url = ""
            for c in cells:
                c_img = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', c, re.IGNORECASE)
                if c_img:
                    s_val = c_img.group(1).strip()
                    if s_val and not any(bad in s_val.lower() for bad in ["logo", "icon", "blank", "default"]):
                        avatar_url = urllib.parse.urljoin(url, s_val)
                        break

            prof = self._build_prof_record(
                raw_name=raw_name,
                profile_url=url,
                source_page_url=url,
                university=university,
                dept_name=dept_name,
                position=pos_clean,
                avatar_url=avatar_url,
            )
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
        dept_name: str = "Khoa Khoa học & Kỹ thuật Máy tính",
        position: Optional[str] = None,
        avatar_url: str = "",
    ) -> Optional[ProfessorRecord]:
        clean_name = raw_name.strip()
        academic_title = None

        # Check English and Vietnamese titles
        if re.search(r"\b(?:assoc\.?\s*prof\.?\s*dr\.?|pgs\.?\s*ts\.?)\b", clean_name, re.IGNORECASE):
            academic_title = "PGS. TS"
            clean_name = re.sub(r"^(?:assoc\.?\s*prof\.?\s*dr\.?|pgs\.?\s*ts\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(?:prof\.?\s*dr\.?|gs\.?\s*ts\.?)\b", clean_name, re.IGNORECASE):
            academic_title = "GS. TS"
            clean_name = re.sub(r"^(?:prof\.?\s*dr\.?|gs\.?\s*ts\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(?:dr\.?|ts\.?|tiến sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "TS"
            clean_name = re.sub(r"^(?:dr\.?|ts\.?|tiến sĩ)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(?:meng\.?|ths\.?|thạc sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "ThS"
            clean_name = re.sub(r"^(?:meng\.?|ths\.?|thạc sĩ)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(?:beng\.?|eng\.?|ks\.?|kỹ sư)\b", clean_name, re.IGNORECASE):
            academic_title = "KS"
            clean_name = re.sub(r"^(?:beng\.?|eng\.?|ks\.?|kỹ sư)\s*", "", clean_name, flags=re.I).strip()

        clean_name = re.sub(r"^[,\-\.\s]+|[,\-\.\s]+$", "", clean_name).strip()
        if len(clean_name) < 3 or clean_name.lower().startswith(("no.", "full name")):
            return None

        clean_name = clean_name.title()

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-hcmut-{norm_name.replace(' ', '-')}"

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id="hcmut",
            university_name="Trường ĐH Bách Khoa - ĐHQG TP.HCM",
            university_short_name="HCMUT",
            faculty="Khoa Khoa học & Kỹ thuật Máy tính",
            department=dept_name,
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            official_profile_urls=[] if profile_url == source_page_url else [profile_url],
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
