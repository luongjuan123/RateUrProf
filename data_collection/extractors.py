"""Structured Information Extractors for Vietnamese Academic Portals."""

from __future__ import annotations
import re
import json
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator


class StructuredExtractor:
    """Extracts structured professor/lecturer entities from academic HTML pages."""

    CARD_CLASS_REGEX = re.compile(
        r"(?:can-bo|giang-vien|nhan-su|faculty|member|staff|person|profile|teacher|team-box|team-item|author-item|user-card)",
        re.IGNORECASE,
    )

    AVATAR_ATTRS = ["src", "data-src", "data-lazy-src", "data-original", "data-url"]

    BAD_IMAGE_KEYWORDS = [
        "logo", "icon", "blank", "pixel", "1x1", "avatar-default", "default",
        "spacer", "arrow", "flag", "breadcrumb", "polylang", ".svg", "bg-", "banner"
    ]

    @classmethod
    def extract_from_json_ld(cls, html: str, page_url: str, university: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses Schema.org Person entities from JSON-LD blocks."""
        results = []
        soup = BeautifulSoup(html, "lxml")
        scripts = soup.find_all("script", type=re.compile(r"application/ld\+json", re.I))

        for script in scripts:
            raw_text = script.string
            if not raw_text:
                continue
            try:
                data = json.loads(raw_text.strip())
                items = []
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    if "@graph" in data and isinstance(data["@graph"], list):
                        items = data["@graph"]
                    else:
                        items = [data]

                for item in items:
                    itype = item.get("@type")
                    if itype == "Person" or (isinstance(itype, list) and "Person" in itype):
                        raw_name = item.get("name")
                        is_valid, _ = RecordValidator.is_valid_human_name(raw_name or "")
                        if not is_valid:
                            continue

                        clean_name = Normalizer.strip_academic_titles(raw_name)
                        rank, degree, title = Normalizer.parse_academic_ranks(raw_name)
                        job_title = item.get("jobTitle") or title

                        prof_id = Normalizer.make_canonical_professor_id(university["id"], clean_name)
                        email = RecordValidator.validate_email(item.get("email"))
                        img = item.get("image")
                        if isinstance(img, dict):
                            img = img.get("url")

                        results.append({
                            "id": prof_id,
                            "name": clean_name,
                            "title": job_title,
                            "academic_rank": rank,
                            "academic_title": degree,
                            "university_id": university["id"],
                            "university_name": university["name"],
                            "university_short_name": university.get("short_name") or university.get("shortName") or university["id"].upper(),
                            "faculty": Normalizer.normalize_department(item.get("department")) or university.get("faculties", ["Ban Giảng huấn"])[0],
                            "avatar": img if isinstance(img, str) else "",
                            "bio": item.get("description"),
                            "official_profile_urls": [item.get("url") or page_url],
                            "source_urls": [page_url],
                            "source_type": "official_faculty_page",
                            "identifiers": {"institutionalEmail": email} if email else {},
                        })
            except Exception:
                continue

        return results

    @classmethod
    def extract_from_cards(cls, html: str, page_url: str, university: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses staff card/box elements from HTML."""
        results = []
        soup = BeautifulSoup(html, "lxml")

        # Find elements matching member card classes
        cards = soup.find_all(
            ["div", "article", "li"],
            class_=cls.CARD_CLASS_REGEX,
        )

        for card in cards:
            # 1. Name extraction
            name_tag = (
                card.find(["h2", "h3", "h4", "h5", "strong"])
                or card.find("a", href=True)
            )
            if not name_tag:
                continue

            raw_name = name_tag.get_text(separator=" ", strip=True)
            is_valid, _ = RecordValidator.is_valid_human_name(raw_name)
            if not is_valid:
                continue

            clean_name = Normalizer.strip_academic_titles(raw_name)
            rank, degree, title = Normalizer.parse_academic_ranks(raw_name)

            # Profile link
            a_link = card.find("a", href=True)
            profile_url = urllib.parse.urljoin(page_url, a_link["href"].strip()) if a_link else page_url

            # Avatar image
            avatar_url = ""
            img_tag = card.find("img")
            if img_tag:
                for attr in cls.AVATAR_ATTRS:
                    val = img_tag.get(attr)
                    if val and not any(bad in val.lower() for bad in cls.BAD_IMAGE_KEYWORDS):
                        avatar_url = urllib.parse.urljoin(page_url, val.strip())
                        break

            # Text snippet / Department
            card_text = card.get_text(separator=" | ", strip=True)
            dept = None
            for part in card_text.split(" | "):
                if any(k in part.lower() for k in ["khoa ", "bộ môn", "viện ", "phòng "]):
                    dept = Normalizer.normalize_department(part)
                    break

            prof_id = Normalizer.make_canonical_professor_id(university["id"], clean_name)
            results.append({
                "id": prof_id,
                "name": clean_name,
                "title": title,
                "academic_rank": rank,
                "academic_title": degree,
                "university_id": university["id"],
                "university_name": university["name"],
                "university_short_name": university.get("short_name") or university.get("shortName") or university["id"].upper(),
                "faculty": dept or university.get("faculties", ["Ban Giảng huấn"])[0],
                "avatar": avatar_url,
                "bio": None,
                "official_profile_urls": [profile_url],
                "source_urls": [page_url],
                "source_type": "official_faculty_page",
                "identifiers": {},
            })

        return results

    @classmethod
    def extract_from_tables(cls, html: str, page_url: str, university: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parses staff tables (e.g. Danh sách giảng viên / cán bộ)."""
        results = []
        soup = BeautifulSoup(html, "lxml")

        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            for row in rows:
                cells = row.find_all(["td", "th"])
                if not cells or cells[0].name == "th":
                    continue

                row_text = [c.get_text(separator=" ", strip=True) for c in cells]
                name_cell = ""
                profile_link = page_url
                avatar_url = ""

                # Look for name and avatar in cells
                for c in cells:
                    c_text = c.get_text(separator=" ", strip=True)
                    # Check for avatar image
                    img = c.find("img")
                    if img and not avatar_url:
                        for attr in cls.AVATAR_ATTRS:
                            val = img.get(attr)
                            if val and not any(bad in val.lower() for bad in cls.BAD_IMAGE_KEYWORDS):
                                avatar_url = urllib.parse.urljoin(page_url, val.strip())
                                break

                    # Check for name link
                    a_tag = c.find("a", href=True)
                    if a_tag:
                        a_text = a_tag.get_text(separator=" ", strip=True)
                        is_valid, _ = RecordValidator.is_valid_human_name(a_text)
                        if is_valid:
                            name_cell = a_text
                            profile_link = urllib.parse.urljoin(page_url, a_tag["href"].strip())

                    if not name_cell:
                        is_valid, _ = RecordValidator.is_valid_human_name(c_text)
                        if is_valid:
                            name_cell = c_text

                if not name_cell:
                    continue

                clean_name = Normalizer.strip_academic_titles(name_cell)
                rank, degree, title = Normalizer.parse_academic_ranks(name_cell)

                # Department detection from remaining cells
                dept = None
                for t in row_text:
                    if t != name_cell and any(k in t.lower() for k in ["khoa ", "bộ môn", "viện "]):
                        dept = Normalizer.normalize_department(t)
                        break

                prof_id = Normalizer.make_canonical_professor_id(university["id"], clean_name)
                results.append({
                    "id": prof_id,
                    "name": clean_name,
                    "title": title,
                    "academic_rank": rank,
                    "academic_title": degree,
                    "university_id": university["id"],
                    "university_name": university["name"],
                    "university_short_name": university.get("short_name") or university.get("shortName") or university["id"].upper(),
                    "faculty": dept or university.get("faculties", ["Ban Giảng huấn"])[0],
                    "avatar": avatar_url,
                    "bio": None,
                    "official_profile_urls": [profile_link],
                    "source_urls": [page_url],
                    "source_type": "official_faculty_page",
                    "identifiers": {},
                })

        return results
