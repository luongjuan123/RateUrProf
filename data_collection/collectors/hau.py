"""Collector for Hanoi Architectural University (Trường Đại học Kiến trúc Hà Nội - HAU)."""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator
from data_collection.extractors import StructuredExtractor


class HauCollector(BaseCollector):
    """Collector for HAU portals: hau.edu.vn, subdomains, and official Ba Cong Khai rosters."""

    DOMAINS = {
        "hau.edu.vn",
        "khoakientruc.hau.edu.vn",
        "kxd-dhkt.edu.vn",
        "khoadothi.hau.edu.vn",
        "khoaquyhoach.hau.edu.vn",
        "art.hau.edu.vn",
        "fit.hau.edu.vn",
        "khoanoithat-hau.edu.vn",
        "hau-iitc.edu.vn",
    }

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        if any(d in domain for d in self.DOMAINS):
            return True
        if "1jxKIsCfSg70vMv2HLwn6X3FeeOUBzkrv" in url:
            return True
        return False

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        u_info = university or {
            "id": "hau",
            "name": "Trường Đại học Kiến trúc Hà Nội",
            "short_name": "HAU",
            "official_website": "https://hau.edu.vn",
        }

        # 1. Check if this is the official Ba Cong Khai table (Bieu Mau 20)
        if "1jxKIsCfSg70vMv2HLwn6X3FeeOUBzkrv" in url or "BIEU MAU 20" in html:
            results = self._extract_ba_cong_khai(html, url, u_info)
            if results:
                return results

        # 2. Check if this is Khoa Xay Dung department page
        if "kxd-dhkt.edu.vn" in url:
            results = self._extract_kxd(html, url, u_info)
            if results:
                return results

        # 3. Check if this is Khoa Do Thi department/profile page
        if "khoadothi.hau.edu.vn" in url:
            results = self._extract_khoadothi(html, url, u_info)
            if results:
                return results

        # 4. Check if this is Art faculty
        if "art.hau.edu.vn" in url:
            results = self._extract_art(html, url, u_info)
            if results:
                return results

        # 5. Fallback to generic structured extractor
        results = StructuredExtractor.extract_from_cards(html, url, u_info)
        if results:
            return results

        return StructuredExtractor.extract_from_tables(html, url, u_info)

    def _extract_ba_cong_khai(
        self, html: str, url: str, u_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")
        results = []
        for table in tables:
            rows = table.find_all("tr")
            if len(rows) < 50:
                continue
            for r in rows[1:]:
                cols = [td.get_text(strip=True) for td in r.find_all(["td", "th"])]
                if len(cols) >= 6:
                    name = cols[1]
                    if not name or name == "Họ và tên":
                        continue
                    is_valid, _ = RecordValidator.is_valid_human_name(name)
                    if not is_valid:
                        continue
                    yob = cols[2] if len(cols) > 2 else ""
                    gender = cols[3] if len(cols) > 3 else ""
                    academic_rank = cols[4] if len(cols) > 4 else ""
                    degree = cols[5] if len(cols) > 5 else ""
                    field_group = cols[6] if len(cols) > 6 else ""

                    # Map field group to likely faculty if generic
                    faculty = "Trường Đại học Kiến trúc Hà Nội"
                    if "Khối ngành II" in field_group and "V" not in field_group:
                        faculty = "Khoa Thiết kế Mỹ thuật"
                    elif "Khối ngành II,V" in field_group:
                        faculty = "Khoa Nội thất & Kiến trúc"
                    elif "Môn chung" in field_group:
                        faculty = "Khoa Lý luận chính trị và Khoa học cơ bản"

                    title_str = f"{degree}, Giảng viên" if degree else "Giảng viên"
                    if academic_rank:
                        title_str = f"{academic_rank}, {title_str}"

                    bio_parts = []
                    if yob:
                        bio_parts.append(f"Năm sinh: {yob}")
                    if gender:
                        bio_parts.append(f"Giới tính: {gender}")
                    if field_group:
                        bio_parts.append(f"Khối ngành đào tạo: {field_group}")

                    results.append({
                        "name": name,
                        "title": title_str,
                        "academic_rank": "PGS" if "phó giáo sư" in academic_rank.lower() else ("GS" if "giáo sư" in academic_rank.lower() else None),
                        "academic_title": degree or None,
                        "faculty": faculty,
                        "department": field_group or "Giảng viên cơ hữu",
                        "position": "Giảng viên cơ hữu",
                        "university_id": u_info["id"],
                        "university_name": u_info["name"],
                        "university_short_name": u_info.get("short_name", "HAU"),
                        "bio": " | ".join(bio_parts),
                        "source_url": url,
                        "confidence_score": 1.0,
                    })
        return results

    def _extract_kxd(
        self, html: str, url: str, u_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        dept_tag = soup.find("h1") or soup.find("title")
        dept = dept_tag.get_text(strip=True).replace(" – KHOA XÂY DỰNG", "").replace("BỘ MÔN ", "") if dept_tag else "Khoa Xây dựng"

        content = soup.find("div", class_=lambda c: c and "entry-content" in c) or soup
        results = []
        seen_names = set()

        for p in content.find_all(["p", "div", "td"]):
            txt = p.get_text(" ", strip=True)
            m = re.search(r'(PGS\.TS|GS\.TS|TS|ThS|KS)\.?\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})', txt)
            if m:
                title_prefix, raw_name = m.groups()
                # Clean any trailing "Chức" or artifacts
                clean_name = re.sub(r'\s*Chức.*$', '', raw_name).strip()
                is_valid, _ = RecordValidator.is_valid_human_name(clean_name)
                if not is_valid or clean_name in seen_names:
                    continue
                seen_names.add(clean_name)

                email_m = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', txt)
                email = email_m.group(1) if email_m else None
                role_m = re.search(r'Kiêm nhiệm:\s*([^E\n]+)', txt)
                role = role_m.group(1).strip() if role_m else "Giảng viên"

                rank, degree, clean_title = Normalizer.parse_academic_ranks(title_prefix)

                bio_str = f"Email: {email}" if email else ""

                results.append({
                    "name": clean_name,
                    "title": f"{title_prefix}, {role}",
                    "academic_rank": rank,
                    "academic_title": degree,
                    "faculty": "Khoa Xây dựng",
                    "department": f"Bộ môn {dept}" if not dept.startswith("Bộ môn") else dept,
                    "position": role,
                    "university_id": u_info["id"],
                    "university_name": u_info["name"],
                    "university_short_name": u_info.get("short_name", "HAU"),
                    "bio": bio_str,
                    "source_url": url,
                    "confidence_score": 0.95,
                })
        return results

    def _extract_khoadothi(
        self, html: str, url: str, u_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        results = []

        # If it's a single profile
        title_str = soup.title.string.split('–')[0].split('-')[0].strip() if soup.title and soup.title.string else ""
        m = re.search(r'(PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s*(?:GVCC\.|GVC\.)?\s*([^(]+)', title_str, re.IGNORECASE)
        if m:
            title_prefix = m.group(1).upper()
            name_cand = m.group(2).strip().title()
            name_clean = re.sub(r'\(.*\)', '', name_cand).strip()
            is_valid, _ = RecordValidator.is_valid_human_name(name_clean)
            if is_valid:
                    rank, degree, _ = Normalizer.parse_academic_ranks(title_prefix)
                    email_m = re.search(r'Email:\s*([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-.]+)', html, re.IGNORECASE)
                    email = email_m.group(1) if email_m else ""
                    dept_m = re.search(r'Bộ môn:\s*([^<\n]+)', html, re.IGNORECASE)
                    dept = dept_m.group(1).strip() if dept_m else "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị"

                    results.append({
                        "name": name_clean,
                        "title": f"{title_prefix}, Giảng viên",
                        "academic_rank": rank,
                        "academic_title": degree,
                        "faculty": "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị",
                        "department": dept,
                        "position": "Giảng viên",
                        "university_id": u_info["id"],
                        "university_name": u_info["name"],
                        "university_short_name": u_info.get("short_name", "HAU"),
                        "bio": f"Email: {email}" if email else "",
                        "source_url": url,
                        "confidence_score": 0.95,
                    })
                    return results

        # If it's a category listing
        for a in soup.find_all("a", href=True):
            t = a.get_text(strip=True)
            if any(k in t for k in ["TS.", "THS.", "PGS.", "GS."]):
                m = re.search(r'(PGS\.TS|GS\.TS|TS|THS)\.?\s*(?:GVCC\.|GVC\.)?\s*([A-ZÀ-Ỹ\s]+)', t, re.IGNORECASE)
                if m:
                    title_prefix = m.group(1).upper()
                    name_cand = m.group(2).strip().title()
                    name_clean = re.sub(r'\(.*\)', '', name_cand).strip()
                    is_valid, _ = RecordValidator.is_valid_human_name(name_clean)
                    if is_valid:
                        rank, degree, _ = Normalizer.parse_academic_ranks(title_prefix)
                        results.append({
                            "name": name_clean,
                            "title": f"{title_prefix}, Giảng viên",
                            "academic_rank": rank,
                            "academic_title": degree,
                            "faculty": "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị",
                            "department": "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị",
                            "position": "Giảng viên",
                            "university_id": u_info["id"],
                            "university_name": u_info["name"],
                            "university_short_name": u_info.get("short_name", "HAU"),
                            "source_url": a["href"],
                            "confidence_score": 0.9,
                        })
        return results

    def _extract_art(
        self, html: str, url: str, u_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        dept_tag = soup.find("h1") or soup.find("title")
        dept = dept_tag.get_text(strip=True) if dept_tag else "Khoa Thiết kế Mỹ thuật"

        results = []
        for a in soup.find_all("a", href=True):
            t = a.get_text(strip=True)
            h = a["href"]
            if h.startswith("https://art.hau.edu.vn/") and not any(k in h for k in [
                "category", "tag", "danh-muc-khoa", "lien-he", "dao-tao", "sinh-vien", "tin-tuc", "chuyen-de", "dieu-khoan", "privacy", "sitemap"
            ]):
                is_valid, _ = RecordValidator.is_valid_human_name(t)
                if is_valid:
                    results.append({
                        "name": t,
                        "title": "Giảng viên, Họa sĩ/Nhà thiết kế",
                        "academic_rank": None,
                        "academic_title": "Thạc sĩ",
                        "faculty": "Khoa Thiết kế Mỹ thuật",
                        "department": dept,
                        "position": "Giảng viên",
                        "university_id": u_info["id"],
                        "university_name": u_info["name"],
                        "university_short_name": u_info.get("short_name", "HAU"),
                        "source_url": h,
                        "confidence_score": 0.9,
                    })
        return results
