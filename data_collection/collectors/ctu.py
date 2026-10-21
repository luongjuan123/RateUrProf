"""Collector for Can Tho University (Trường Đại học Cần Thơ - CTU)."""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator


class CtuCollector(BaseCollector):
    """Collector for Can Tho University staff directory and academic management portal."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "ctu.edu.vn" in domain

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        professors = []
        soup = BeautifulSoup(html, "lxml")
        u_info = university or {
            "id": "ctu",
            "name": "Trường Đại học Cần Thơ",
            "short_name": "CTU",
        }

        # 1. CTU QLDiem table parsing
        rows = soup.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 4:
                continue

            # First cell usually index or code
            c0 = cells[0].get_text(strip=True)
            if not c0.isdigit() and not (c0.startswith("0") or c0.startswith("C")):
                continue

            name_cell = cells[1].get_text(separator=" ", strip=True)
            is_valid, _ = RecordValidator.is_valid_human_name(name_cell)
            if not is_valid:
                continue

            clean_name = Normalizer.strip_academic_titles(name_cell)
            rank, degree, title = Normalizer.parse_academic_ranks(name_cell)

            degree_cell = cells[2].get_text(strip=True) if len(cells) > 2 else ""
            if degree_cell and not degree:
                rank_2, degree_2, title_2 = Normalizer.parse_academic_ranks(degree_cell)
                degree = degree or degree_2
                rank = rank or rank_2

            unit_cell = cells[3].get_text(strip=True) if len(cells) > 3 else "Trường Đại học Cần Thơ"
            email_cell = cells[4].get_text(strip=True) if len(cells) > 4 else ""
            email = RecordValidator.validate_email(email_cell)

            # Avatar if present
            avatar = ""
            img = row.find("img")
            if img:
                src = img.get("src") or img.get("data-src")
                if src and not any(bad in src.lower() for bad in ["logo", "blank", "1x1", "icon"]):
                    avatar = urllib.parse.urljoin(url, src.strip())

            prof_id = Normalizer.make_canonical_professor_id("ctu", clean_name)
            professors.append({
                "id": prof_id,
                "name": clean_name,
                "title": f"{rank + '.' if rank else ''} {degree or 'Giảng viên'}".strip(),
                "academic_rank": rank,
                "academic_title": degree,
                "university_id": "ctu",
                "university_name": "Trường Đại học Cần Thơ",
                "university_short_name": "CTU",
                "faculty": Normalizer.normalize_department(unit_cell) or "Ban Giảng huấn",
                "department": None,
                "avatar": avatar,
                "bio": f"Giảng viên tại Trường Đại học Cần Thơ, công tác tại {unit_cell}.",
                "official_profile_urls": [url],
                "source_urls": [url],
                "source_type": "official_faculty_page",
                "verification_status": "verified",
                "confidence_score": 1.0,
                "identifiers": {"institutionalEmail": email} if email else {},
            })

        return professors
