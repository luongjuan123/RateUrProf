"""Collector for Vietnam National University, Hanoi (Đại học Quốc gia Hà Nội - VNU)."""

from __future__ import annotations
import urllib.parse
from typing import List, Dict, Any, Optional

from data_collection.collectors.base import BaseCollector
from data_collection.extractors import StructuredExtractor


class VnuCollector(BaseCollector):
    """Collector for VNU member colleges (UET, HUS, USSH, UEB, UED, UMP, LAW, IS)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "vnu.edu.vn" in domain

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        domain = urllib.parse.urlparse(url).netloc.lower()
        sub = domain.split(".")[0]

        uni_id = "vnu"
        uni_name = "Đại học Quốc gia Hà Nội"
        short_name = "VNU"

        if "uet" in sub or "uet" in url:
            uni_id = "vnu-uet"
            uni_name = "Trường Đại học Công nghệ - ĐHQG Hà Nội"
            short_name = "VNU-UET"
        elif "hus" in sub or "hus" in url:
            uni_id = "vnu-hus"
            uni_name = "Trường Đại học Khoa học Tự nhiên - ĐHQG Hà Nội"
            short_name = "VNU-HUS"
        elif "ussh" in sub:
            uni_id = "vnu-ussh"
            uni_name = "Trường Đại học Khoa học Xã hội & Nhân văn - ĐHQG Hà Nội"
            short_name = "VNU-USSH"
        elif "ueb" in sub:
            uni_id = "vnu-ueb"
            uni_name = "Trường Đại học Kinh tế - ĐHQG Hà Nội"
            short_name = "VNU-UEB"
        elif "law" in sub:
            uni_id = "vnu-law"
            uni_name = "Trường Đại học Luật - ĐHQG Hà Nội"
            short_name = "VNU-LAW"
        elif "ued" in sub:
            uni_id = "vnu-ued"
            uni_name = "Trường Đại học Giáo dục - ĐHQG Hà Nội"
            short_name = "VNU-UED"

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
