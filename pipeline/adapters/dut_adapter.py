"""Adapter for University of Science and Technology - University of Da Nang (DUT).
Extracts faculty and lecturer directories across all faculties from dut.udn.vn.
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


class DutAdapter(BaseAcademicAdapter):
    """Adapter for DUT faculties directory (https://dut.udn.vn/Danhba/id/{fid})."""

    FACULTY_IDS = [
        (27, "Khoa Công nghệ thông tin"),
        (33, "Khoa Cơ khí"),
        (39, "Khoa Cơ khí Giao thông và Năng lượng"),
        (45, "Khoa Điện"),
        (53, "Khoa Điện tử và Trí tuệ nhân tạo"),
        (59, "Khoa Hóa, Môi trường và Khoa học sự sống"),
        (67, "Khoa Kiến trúc"),
        (75, "Khoa Quản lý Dự án và Công nghiệp"),
        (157, "Khoa Xây dựng"),
    ]

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "dut.udn.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # Detect faculty name from page title/header
        faculty_name = "Khoa chuyên môn"
        for fid, fname in self.FACULTY_IDS:
            if f"/Danhba/id/{fid}" in url or f"id/{fid}" in url:
                faculty_name = fname
                break

        header_m = re.search(r'<h[1234][^>]*class=["\'][^"\']*title[^"\']*["\'][^>]*>(.*?)</h[1234]>', html, re.DOTALL | re.IGNORECASE)
        if not header_m:
            header_m = re.search(r'(KHOA\s+[^<\n-]+)', html, re.IGNORECASE)
        if header_m:
            clean_hdr = re.sub(r'<[^>]+>', '', header_m.group(1)).strip()
            if "KHOA" in clean_hdr.upper():
                faculty_name = clean_hdr.title()

        # Parse table rows: STT, Image, Name/Title/Position, Contact, Notes
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)

        for r in rows:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
            if len(tds) < 4:
                continue

            stt_str = re.sub(r'<[^>]+>|&nbsp;|\s', '', tds[0])
            if not stt_str.isdigit():
                continue

            # Column 1: Image / Avatar
            avatar_url = ""
            img_m = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', tds[1], re.IGNORECASE)
            if img_m:
                img_src = img_m.group(1).strip()
                if img_src and not any(bad in img_src.lower() for bad in ["noimage", "default", "blank", "spacer", "logo"]):
                    avatar_url = urllib.parse.urljoin("http://dut.udn.vn", img_src)

            # Column 2: Name, Academic Rank, Position
            name_cell_clean = re.sub(r'<[^>]+>', '\n', tds[2]).strip()
            lines = [l.strip() for l in name_cell_clean.splitlines() if l.strip() and l.strip() != '&nbsp;']
            if not lines:
                continue

            raw_name = lines[0]
            # Convert uppercase name into proper title case (e.g. PHẠM CÔNG THẮNG -> Phạm Công Thắng)
            clean_name = raw_name.title()

            # Rank / Academic Title (PGS. TS, TS, ThS, etc.)
            academic_title = None
            title_desc = "Giảng viên"
            position = None

            if len(lines) > 1:
                rank_line = lines[1]
                if any(t in rank_line.upper() for t in ["PGS", "GS", "TS", "THS", "TIẾN SĨ", "THẠC SĨ"]):
                    academic_title = rank_line
                else:
                    position = rank_line

            if len(lines) > 2:
                position = lines[2]

            # Column 3: Contact info (Email, Phone)
            contact_cell = re.sub(r'<[^>]+>', ' ', tds[3])
            email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', contact_cell)
            email = email_m.group(0).lower() if email_m else None

            # Profile URL: check for SCV link
            scv_m = re.search(r'href=[\"\'](https?://scv\.udn\.vn/[^\"\']+)[\"\']', r)
            profile_url = scv_m.group(1) if scv_m else None

            # Generate consistent professor ID
            norm_name = IdentityResolutionEngine.normalize_name(clean_name).replace(" ", "-")
            prof_id = f"dut-{norm_name}"

            identifiers = {}
            if email:
                identifiers["institutionalEmail"] = email
            if scv_m:
                identifiers["scvId"] = scv_m.group(1)

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
                faculty=faculty_name,
                department=faculty_name,
                title=title_desc,
                academic_title=academic_title,
                position=position,
                avatar=avatar_url,
                official_profile_urls=[profile_url] if profile_url else [],
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
