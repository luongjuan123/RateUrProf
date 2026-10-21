"""Universal Adaptive Collector for Vietnamese Higher Education Portals."""

from __future__ import annotations
import urllib.parse
from typing import List, Dict, Any, Optional

from data_collection.collectors.base import BaseCollector
from data_collection.extractors import StructuredExtractor


class GenericAcademicCollector(BaseCollector):
    """Universal adaptive collector for Vietnamese academic portals and CMSs (WordPress, Joomla, Drupal)."""

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "edu.vn" in domain or "udn.vn" in domain or "hueuni.edu.vn" in domain or "ac.vn" in domain

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        u_info = university or {
            "id": "institution",
            "name": "Cơ sở Giáo dục Đại học",
            "short_name": "INST",
            "faculties": ["Ban Giảng huấn"],
        }

        # 1. Try JSON-LD Person schema first (highest fidelity structured data)
        results = StructuredExtractor.extract_from_json_ld(html, url, u_info)
        if results:
            return results

        # 2. Try HTML Card / Member components
        results = StructuredExtractor.extract_from_cards(html, url, u_info)
        if results:
            return results

        # 3. Try HTML Tables (staff listings)
        results = StructuredExtractor.extract_from_tables(html, url, u_info)
        if results:
            return results

        return []
