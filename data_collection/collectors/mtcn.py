"""Collector for Hanoi University of Industrial Fine Arts (Trường Đại học Mỹ thuật Công nghiệp - MTCN / UAD)."""

from __future__ import annotations
import urllib.parse
from typing import List, Dict, Any, Optional

from data_collection.collectors.base import BaseCollector
from data_collection.crawl_mtcn import build_final_roster


class MtcnCollector(BaseCollector):
    """Collector for MTCN portals: uad.edu.vn, mtud.edu.vn, and official Ba Cong Khai rosters."""

    DOMAINS = {
        "uad.edu.vn",
        "mtud.edu.vn",
        "mythuatcongnghiep.edu.vn",
    }

    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        if any(d in domain for d in self.DOMAINS):
            return True
        if "6.-Bieu-20.-Cong-khai-thong-tin-doi-ngu-giang-vien-co-huu.pdf" in url:
            return True
        return False

    def collect(
        self, html: str, url: str, university: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # Return verified roster
        return build_final_roster()
