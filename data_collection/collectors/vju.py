"""Collector for Vietnam Japan University (Trường Đại học Việt Nhật - ĐHQG Hà Nội / VJU-VNU)."""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator


class VjuCollector(BaseCollector):
    """Collector for Vietnam Japan University (VJU - VNU)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "vju.ac.vn" in domain or "vju.vnu.edu.vn" in domain

    @staticmethod
    def decode_cf_email(cf_hex: str) -> str:
        """Decodes Cloudflare data-cfemail XOR-encoded email string."""
        try:
            r = int(cf_hex[:2], 16)
            return "".join([chr(int(cf_hex[i:i + 2], 16) ^ r) for i in range(2, len(cf_hex), 2)])
        except Exception:
            return ""

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        professors: List[Dict[str, Any]] = []
        soup = BeautifulSoup(html, "lxml")

        uni_id = "vnu-vju"
        uni_name = "Trường Đại học Việt Nhật - ĐHQG Hà Nội"
        uni_short = "VNU-VJU"

        tables = soup.find_all("table")
        for t_idx, tbl in enumerate(tables):
            rows = tbl.find_all("tr")
            if not rows:
                continue

            prev_h = tbl.find_previous(["h1", "h2", "h3", "h4", "h5", "h6"])
            section_title = prev_h.get_text(strip=True) if prev_h else ""

            # Determine faculty from section
            faculty = "Ban Giảng huấn"
            if "Công nghệ" in section_title or "Khoa Công nghệ" in section_title:
                faculty = "Khoa Công nghệ và Kỹ thuật tiên tiến"
            elif "Khoa học xã hội" in section_title:
                faculty = "Khoa Khoa học xã hội liên ngành"
            elif "Hành chính" in section_title or "Quản trị" in section_title:
                faculty = "Ban Giám hiệu và Các Phòng ban"

            header_cells = rows[0].find_all(["th", "td"])
            department_name = header_cells[0].get_text(strip=True) if header_cells else ""

            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if len(cells) < 3:
                    continue

                raw_name = cells[2].get_text(strip=True)
                if not raw_name:
                    continue

                clean_name = Normalizer.strip_academic_titles(raw_name)
                is_valid, _ = RecordValidator.is_valid_human_name(clean_name)
                if not is_valid:
                    continue

                rank, degree, title = Normalizer.parse_academic_ranks(raw_name)

                # Avatar
                avatar = ""
                img = cells[1].find("img") if len(cells) > 1 else None
                if img:
                    src = img.get("data-src") or img.get("src") or ""
                    if src and not src.startswith("data:image"):
                        avatar = urllib.parse.urljoin(url, src.strip())

                # Position
                pos = cells[3].get_text(separator=" - ", strip=True) if len(cells) > 3 else ""

                # Emails
                emails = []
                if len(cells) > 4:
                    for cf in cells[4].find_all(attrs={"data-cfemail": True}):
                        dec = self.decode_cf_email(cf["data-cfemail"])
                        if dec and dec not in emails:
                            emails.append(dec)
                    if not emails:
                        txt = cells[4].get_text(strip=True)
                        found = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", txt)
                        for em in found:
                            if em not in emails:
                                emails.append(em)

                primary_email = emails[0] if emails else None
                prof_id = Normalizer.make_canonical_professor_id(uni_id, clean_name)

                bio_parts = [f"Giảng viên / Cán bộ tại {uni_name}."]
                if pos:
                    bio_parts.append(f"Vị trí: {pos}.")
                if department_name:
                    bio_parts.append(f"Đơn vị / Chương trình: {department_name}.")
                if emails:
                    bio_parts.append(f"Email: {', '.join(emails)}.")

                professors.append({
                    "id": prof_id,
                    "name": clean_name,
                    "title": title or "Giảng viên",
                    "academic_rank": rank,
                    "academic_title": degree,
                    "position": pos or "Giảng viên",
                    "university_id": uni_id,
                    "university_name": uni_name,
                    "university_short_name": uni_short,
                    "faculty": Normalizer.normalize_department(faculty) or "Ban Giảng huấn",
                    "department": Normalizer.normalize_department(department_name),
                    "avatar": avatar,
                    "bio": " ".join(bio_parts),
                    "official_profile_urls": [url],
                    "source_urls": [url],
                    "source_type": "official_faculty_page",
                    "verification_status": "verified",
                    "confidence_score": 1.0,
                    "identifiers": {
                        "institutionalEmail": primary_email,
                        "additionalEmails": emails[1:] if len(emails) > 1 else [],
                    } if primary_email else {},
                })

        return professors
