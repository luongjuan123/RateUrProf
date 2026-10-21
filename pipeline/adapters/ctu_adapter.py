"""Adapter for Can Tho University (CTU).
Extracts faculty and lecturer directories across colleges and schools from qldiem.ctu.edu.vn.
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


class CtuAdapter(BaseAcademicAdapter):
    """Adapter for CTU official staff portal (https://qldiem.ctu.edu.vn/htql/quanly/llkhcongkhai/)."""

    UNITS = [
        ("DI", "Trường Công nghệ Thông tin & Truyền thông"),
        ("TN", "Trường Bách khoa"),
        ("KT", "Trường Kinh tế"),
        ("KH", "Trường Khoa học Tự nhiên"),
        ("NN", "Trường Nông nghiệp"),
        ("TS", "Trường Thủy sản"),
        ("SP", "Trường Sư phạm"),
        ("LK", "Khoa Luật"),
        ("FL", "Khoa Ngoại ngữ"),
        ("MT", "Khoa Môi trường & Tài nguyên thiên nhiên"),
    ]

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "ctu.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # Find which unit this response corresponds to, or default
        unit_name = "Khoa chuyên môn"
        for code, uname in self.UNITS:
            if f"unit_{code}" in url or f"cmbDonVi={code}" in url:
                unit_name = uname
                break

        # Check rows: Table with Stt, Mã số CB, Học hàm, Học vị, Họ và tên, Bộ môn, Ngày sinh, Nữ, LLKH
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)

        for r in rows:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
            if len(tds) < 6:
                continue

            stt_str = re.sub(r'<[^>]+>|&nbsp;|\s', '', tds[0])
            if not stt_str.isdigit():
                continue

            staff_id = re.sub(r'<[^>]+>|&nbsp;|\s', '', tds[1])
            hoc_ham = re.sub(r'<[^>]+>|&nbsp;', '', tds[2]).strip()
            hoc_vi = re.sub(r'<[^>]+>|&nbsp;', '', tds[3]).strip()
            raw_name = re.sub(r'<[^>]+>|&nbsp;', '', tds[4]).strip()
            department = re.sub(r'<[^>]+>|&nbsp;', '', tds[5]).strip()

            if not raw_name or len(raw_name) < 3:
                continue

            clean_name = raw_name.title()

            # Format academic title: e.g. "Phó giáo sư, Tiến sĩ" or "Tiến sĩ"
            academic_title_parts = []
            if hoc_ham:
                academic_title_parts.append(hoc_ham)
            if hoc_vi:
                academic_title_parts.append(hoc_vi)
            academic_title = ", ".join(academic_title_parts) if academic_title_parts else None

            # Photo extraction from cells if legitimate photo exists
            avatar_url = ""
            for c in tds:
                c_img = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', c, re.IGNORECASE)
                if c_img:
                    s_val = c_img.group(1).strip()
                    if s_val and not any(bad in s_val.lower() for bad in ["logo", "icon", "blank", "default", "pdf", "printer"]):
                        avatar_url = urllib.parse.urljoin(url, s_val)
                        break

            # Profile link or LLKH link
            llkh_m = re.search(r'href=[\"\']([^\"\']+)[\"\']', tds[-1] if len(tds) >= 9 else "")
            profile_url = urllib.parse.urljoin(url, llkh_m.group(1)) if llkh_m else url

            norm_name = IdentityResolutionEngine.normalize_name(clean_name).replace(" ", "-")
            prof_id = f"ctu-{staff_id}" if staff_id else f"ctu-{norm_name}"

            identifiers = {}
            if staff_id:
                identifiers["staffCode"] = staff_id

            faculty_str = department if department else unit_name

            provenance = [
                ProvenanceEvidence(
                    field="name",
                    source_url=url,
                    confidence=1.0,
                    source_type="official_faculty_page",
                ),
                ProvenanceEvidence(
                    field="university",
                    source_url=url,
                    confidence=1.0,
                    source_type="official_faculty_page",
                ),
            ]
            if academic_title:
                provenance.append(
                    ProvenanceEvidence(
                        field="academic_title",
                        source_url=url,
                        confidence=1.0,
                        source_type="official_faculty_page",
                    )
                )

            prof_rec = ProfessorRecord(
                id=prof_id,
                name=clean_name,
                university_id=university.id,
                university_name=university.name,
                university_short_name=university.short_name,
                faculty=faculty_str,
                department=department,
                title="Giảng viên",
                academic_title=academic_title,
                position=None,
                avatar=avatar_url,
                official_profile_urls=[profile_url] if llkh_m else [],
                identifiers=identifiers,
                provenance=provenance,
                verification_status="verified",
                confidence_score=1.0,
                rating_average=None,
                rating_count=0,
                criteria_averages=None,
            )

            professors.append(prof_rec)

        return professors
