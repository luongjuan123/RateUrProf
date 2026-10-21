"""Collector for Hanoi University of Science and Technology (Đại học Bách Khoa Hà Nội - HUST)."""

from __future__ import annotations
import urllib.parse
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from data_collection.collectors.base import BaseCollector
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator
from data_collection.extractors import StructuredExtractor


class HustCollector(BaseCollector):
    """Collector for HUST (hust.edu.vn, soict.hust.edu.vn, seee.hust.edu.vn, etc.)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hust.edu.vn" in domain

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        u_info = university or {
            "id": "hust",
            "name": "Đại học Bách Khoa Hà Nội",
            "short_name": "HUST",
            "faculties": ["Trường Công nghệ Thông tin & Truyền thông (SoICT)"],
        }

        # 1. Try card extraction
        results = StructuredExtractor.extract_from_cards(html, url, u_info)
        if results:
            return results

        # 2. Try table extraction
        results = StructuredExtractor.extract_from_tables(html, url, u_info)
        if results:
            return results

        # 3. Fallback to JSON-LD
        return StructuredExtractor.extract_from_json_ld(html, url, u_info)
