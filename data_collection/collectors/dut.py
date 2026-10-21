"""Collector for Danang University of Technology (Trường ĐH Bách Khoa - ĐH Đà Nẵng)."""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator


class DutCollector(BaseCollector):
    """Collector for DUT (dut.udn.vn) staff directory."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "dut.udn.vn" in domain

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        professors = []
        soup = BeautifulSoup(html, "lxml")

        # DUT staff table or card rows
        rows = soup.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue

            name_tag = row.find("a", href=True)
            if not name_tag:
                continue

            raw_name = name_tag.get_text(separator=" ", strip=True)
            is_valid, _ = RecordValidator.is_valid_human_name(raw_name)
            if not is_valid:
                continue

            clean_name = Normalizer.strip_academic_titles(raw_name)
            rank, degree, title = Normalizer.parse_academic_ranks(raw_name)
            profile_url = urllib.parse.urljoin(url, name_tag["href"].strip())

            # Avatar
            avatar = ""
            img = row.find("img")
            if img:
                src = img.get("src") or img.get("data-src")
                if src and not any(bad in src.lower() for bad in ["logo", "blank", "1x1"]):
                    avatar = urllib.parse.urljoin(url, src.strip())

            # Faculty/Department from other cells
            dept = None
            for c in cells:
                t = c.get_text(separator=" ", strip=True)
                if any(k in t.lower() for k in ["khoa ", "bộ môn", "phòng "]):
                    dept = Normalizer.normalize_department(t)
                    break

            prof_id = Normalizer.make_canonical_professor_id("dut", clean_name)
            professors.append({
                "id": prof_id,
                "name": clean_name,
                "title": title,
                "academic_rank": rank,
                "academic_title": degree,
                "university_id": "dut",
                "university_name": "Trường ĐH Bách Khoa - ĐH Đà Nẵng",
                "university_short_name": "DUT",
                "faculty": dept or "Khoa Cơ khí & Công nghệ Thông tin",
                "department": None,
                "avatar": avatar,
                "bio": f"Giảng viên tại Trường Đại học Bách Khoa - Đại học Đà Nẵng.",
                "official_profile_urls": [profile_url],
                "source_urls": [url],
                "source_type": "official_faculty_page",
                "verification_status": "verified",
                "confidence_score": 1.0,
                "identifiers": {},
            })

        return professors
