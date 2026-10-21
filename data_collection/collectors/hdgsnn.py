"""Collector for the State Council for Professorship (Hội đồng Giáo sư Nhà nước - HĐGSNN)."""

from __future__ import annotations
import re
import html
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator

# Import institution keyword mapping from pipeline if available or define it
try:
    from pipeline.adapters.hdgsnn_adapter import INSTITUTION_KEYWORDS_MAP
except ImportError:
    INSTITUTION_KEYWORDS_MAP = [
        (["bách khoa hà nội", "đhbk hà nội", "hust"], "hust", "Đại học Bách Khoa Hà Nội", "HUST", "Hà Nội", "Miền Bắc"),
        (["kinh tế quốc dân", "neu"], "neu", "Trường Đại học Kinh tế Quốc dân", "NEU", "Hà Nội", "Miền Bắc"),
        (["ngoại thương", "ftu"], "ftu", "Trường Đại học Ngoại thương", "FTU", "Hà Nội", "Miền Bắc"),
        (["công nghệ, đại học quốc gia hà nội", "vnu-uet"], "vnu-uet", "Trường Đại học Công nghệ - ĐHQG Hà Nội", "VNU-UET", "Hà Nội", "Miền Bắc"),
        (["khoa học tự nhiên, đại học quốc gia hà nội", "vnu-hus"], "vnu-hus", "Trường Đại học Khoa học Tự nhiên - ĐHQG Hà Nội", "VNU-HUS", "Hà Nội", "Miền Bắc"),
        (["bách khoa, đại học quốc gia thành phố hồ chí minh", "hcmut"], "hcmut", "Trường ĐH Bách Khoa - ĐHQG TP.HCM", "HCMUT", "TP. Hồ Chí Minh", "Miền Nam"),
        (["khoa học tự nhiên, đại học quốc gia thành phố hồ chí minh", "hcmus"], "hcmus", "Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM", "HCMUS", "TP. Hồ Chí Minh", "Miền Nam"),
        (["công nghệ thông tin, đại học quốc gia thành phố hồ chí minh", "uit"], "uit", "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM", "UIT", "TP. Hồ Chí Minh", "Miền Nam"),
        (["bách khoa, đại học đà nẵng", "dut"], "dut", "Trường ĐH Bách Khoa - ĐH Đà Nẵng", "DUT", "Đà Nẵng", "Miền Trung"),
        (["đại học cần thơ", "ctu"], "ctu", "Trường Đại học Cần Thơ", "CTU", "Cần Thơ", "Miền Nam"),
        (["y hà nội", "hmu"], "hmu", "Trường Đại học Y Hà Nội", "HMU", "Hà Nội", "Miền Bắc"),
        (["y dược thành phố hồ chí minh", "ump"], "ump", "Đại học Y Dược TP. Hồ Chí Minh", "UMP", "TP. Hồ Chí Minh", "Miền Nam"),
    ]


class HdgsnnCollector(BaseCollector):
    """Extracts authoritative, statutory nationwide rosters of verified Professors (GS) and Associate Professors (PGS)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hdgsnn.gov.vn" in domain

    @classmethod
    def resolve_institution(cls, workplace_raw: str) -> Tuple[str, str, str, str, str]:
        """Maps a raw workplace string from HĐGSNN table into (uni_id, uni_name, short_name, city, region)."""
        w_norm = Normalizer.normalize_name_for_matching(workplace_raw)
        w_clean = workplace_raw.strip()

        for aliases, uid, uname, sname, city, reg in INSTITUTION_KEYWORDS_MAP:
            for alias in aliases:
                a_norm = Normalizer.normalize_name_for_matching(alias)
                if a_norm in w_norm:
                    return uid, uname, sname, city, reg

        # Fallback slug
        clean_slug = w_norm.replace(" ", "-")[:32]
        return f"inst-{clean_slug}", w_clean, w_clean[:12].upper(), "Việt Nam", "national"

    def collect(
        self, html_content: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        professors: List[Dict[str, Any]] = []
        seen_keys = set()

        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html_content, re.DOTALL | re.I)
        current_rank = "PGS"
        current_discipline = "Khoa học"

        col_name = 1
        col_dob = 2
        col_gender = 3
        col_discipline = 4
        col_workplace = 5
        col_rank = 7

        for r in rows:
            cells = re.findall(r'<(?:td|th)[^>]*>(.*?)</(?:td|th)>', r, re.DOTALL | re.I)
            tds = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
            tds = [html.unescape(c).strip() for c in tds]

            if not tds:
                continue

            row_text = " ".join(tds).lower()
            if "họ" in row_text and "tên" in row_text:
                for idx, text in enumerate(tds):
                    t_low = text.lower()
                    if "họ" in t_low and "tên" in t_low:
                        col_name = idx
                    elif any(k in t_low for k in ["nơi làm việc", "cơ quan", "cơ sở", "đơn vị"]):
                        col_workplace = idx
                    elif "ngành" in t_low and "chuyên" not in t_low and "liên" not in t_low:
                        col_discipline = idx
                    elif "chức danh" in t_low or "đtccd" in t_low:
                        col_rank = idx
                    elif "ngày" in t_low or "năm sinh" in t_low:
                        col_dob = idx
                    elif "giới tính" in t_low:
                        col_gender = idx
                continue

            first_clean = tds[0].replace(".", "").replace(",", "").strip()
            if not first_clean.isdigit():
                text = " ".join(tds)
                if "hội đồng" in text.lower() or "ngành" in text.lower():
                    m_nganh = re.search(r'(?:ngành|liên ngành)\s+([^<\n-]+)', text, re.I)
                    if m_nganh:
                        current_discipline = m_nganh.group(1).strip()
                    elif len(text) < 100:
                        current_discipline = text.strip()
                if "giáo sư" in text.lower() and "phó" not in text.lower():
                    current_rank = "GS"
                elif "phó giáo sư" in text.lower() or "pgs" in text.lower():
                    current_rank = "PGS"
                continue

            if first_clean.isdigit() and len(tds) > max(col_name, col_workplace):
                raw_name = tds[col_name] if col_name < len(tds) else ""
                workplace = tds[col_workplace] if col_workplace < len(tds) else "Trường Đại học tại Việt Nam"
                discipline = tds[col_discipline] if col_discipline < len(tds) and tds[col_discipline] else current_discipline

                rank = current_rank
                if col_rank < len(tds) and tds[col_rank]:
                    r_text = tds[col_rank].lower()
                    if "phó" in r_text or "pgs" in r_text:
                        rank = "PGS"
                    elif "giáo sư" in r_text or "gs" in tds[col_rank].upper():
                        rank = "GS"

                is_valid, _ = RecordValidator.is_valid_human_name(raw_name)
                if not is_valid:
                    continue

                clean_name = Normalizer.strip_academic_titles(raw_name).title()
                uni_id, uni_name, short_name, city, reg = self.resolve_institution(workplace)

                prof_key = (clean_name, uni_id)
                if prof_key in seen_keys:
                    continue
                seen_keys.add(prof_key)

                prof_id = Normalizer.make_canonical_professor_id(uni_id, clean_name)
                bio_vi = f"{rank}. TS {clean_name} công tác tại {workplace}. Chức danh đạt chuẩn do Hội đồng Giáo sư Nhà nước công nhận thuộc ngành/liên ngành {discipline}."

                professors.append({
                    "id": prof_id,
                    "name": clean_name,
                    "title": f"{rank}. TS",
                    "academic_title": "TS",
                    "academic_rank": rank,
                    "position": f"Giảng viên cao cấp ({rank})",
                    "university_id": uni_id,
                    "university_name": uni_name,
                    "university_short_name": short_name,
                    "faculty": f"Khoa / Ngành {discipline}",
                    "department": f"Bộ môn {discipline}",
                    "avatar": "",
                    "bio": bio_vi,
                    "official_profile_urls": [url],
                    "source_urls": [url],
                    "source_type": "official_government_gazette",
                    "verification_status": "verified",
                    "confidence_score": 1.0,
                    "identifiers": {"hdgsnn_gazette": url.split("_")[-1]},
                })

        return professors
