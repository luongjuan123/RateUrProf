"""Collector for Vietnam National University, Ho Chi Minh City (ĐHQG-HCM)."""

from __future__ import annotations
import urllib.parse
from typing import List, Dict, Any, Optional

from data_collection.collectors.base import BaseCollector
from data_collection.extractors import StructuredExtractor


class VnuHcmCollector(BaseCollector):
    """Collector for VNU-HCM member colleges (HCMUT, UIT, HCMUS, UEL, HCMUSSH, HCMIU)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return any(
            d in domain
            for d in ["vnuhcm.edu.vn", "hcmut.edu.vn", "uit.edu.vn", "hcmus.edu.vn", "uel.edu.vn"]
        )

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        domain = urllib.parse.urlparse(url).netloc.lower()

        uni_id = "vnuhcm"
        uni_name = "Đại học Quốc gia TP. Hồ Chí Minh"
        short_name = "VNU-HCM"

        if "hcmut" in domain:
            uni_id = "hcmut"
            uni_name = "Trường ĐH Bách Khoa - ĐHQG TP.HCM"
            short_name = "HCMUT"
        elif "uit" in domain:
            uni_id = "uit"
            uni_name = "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM"
            short_name = "UIT"
        elif "hcmus" in domain:
            uni_id = "hcmus"
            uni_name = "Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM"
            short_name = "HCMUS"
        elif "uel" in domain:
            uni_id = "uel"
            uni_name = "Trường ĐH Kinh tế - Luật - ĐHQG TP.HCM"
            short_name = "UEL"

        u_info = university or {
            "id": uni_id,
            "name": uni_name,
            "short_name": short_name,
            "faculties": ["Ban Giảng huấn"],
        }

        # 1. Cards
        results = StructuredExtractor.extract_from_cards(html, url, u_info)
        if results:
            return results

        # 2. Tables
        results = StructuredExtractor.extract_from_tables(html, url, u_info)
        if results:
            return results

        # 3. JSON-LD
        return StructuredExtractor.extract_from_json_ld(html, url, u_info)
