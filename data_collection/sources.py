"""Source Registry and Canonical Institution Management for Vietnam."""

from __future__ import annotations
import os
import json
import urllib.parse
from typing import List, Dict, Any, Optional
from data_collection.config import CONFIG


class SourceRegistry:
    """Manages verified academic sources and canonical institution directory across Vietnam."""

    def __init__(self, seed_path: Optional[str] = None):
        self.seed_path = seed_path or os.path.join(CONFIG.PROJECT_ROOT, "pipeline", "institutions_seed.json")
        self._institutions: List[Dict[str, Any]] = []
        self._load_seed()

    def _load_seed(self):
        """Loads seeded universities and colleges."""
        if os.path.exists(self.seed_path):
            try:
                with open(self.seed_path, "r", encoding="utf-8") as f:
                    self._institutions = json.load(f)
            except Exception as e:
                print(f"[SourceRegistry] Warning loading seed from {self.seed_path}: {e}")
                self._institutions = []

    def get_all_institutions(self) -> List[Dict[str, Any]]:
        """Returns canonical list of all discovered institutions."""
        return self._institutions

    def build_initial_crawl_sources(self) -> List[Dict[str, Any]]:
        """
        Builds comprehensive initial source items:
        1. Official university homepages.
        2. Known faculty directories.
        3. National Council for Professorship (HĐGSNN) multi-year archive articles (2019–2025).
        """
        sources: List[Dict[str, Any]] = []

        # 1. University sources
        for u in self._institutions:
            u_id = u["id"]
            domain = u.get("official_domain") or ""
            website = u.get("official_website") or u.get("officialWebsite")

            if website:
                sources.append({
                    "id": f"src-{u_id}-homepage",
                    "university_id": u_id,
                    "url": website,
                    "domain": domain or urllib.parse.urlparse(website).netloc,
                    "source_type": "official_homepage",
                    "crawl_policy": "allowed",
                    "priority": 15,
                })

            # Seed faculty/staff directories if configured
            fac_dirs = u.get("faculty_directory_urls") or u.get("facultyDirectoryUrls") or []
            for idx, f_url in enumerate(fac_dirs):
                f_domain = urllib.parse.urlparse(f_url).netloc or domain
                sources.append({
                    "id": f"src-{u_id}-faculty-{idx}",
                    "university_id": u_id,
                    "url": f_url,
                    "domain": f_domain,
                    "source_type": "faculty_directory",
                    "crawl_policy": "allowed",
                    "priority": 25,
                })

            staff_dirs = u.get("staff_directory_urls") or u.get("staffDirectoryUrls") or []
            for idx, s_url in enumerate(staff_dirs):
                s_domain = urllib.parse.urlparse(s_url).netloc or domain
                sources.append({
                    "id": f"src-{u_id}-staff-{idx}",
                    "university_id": u_id,
                    "url": s_url,
                    "domain": s_domain,
                    "source_type": "staff_profile",
                    "crawl_policy": "allowed",
                    "priority": 30,
                })

        # 2. Authoritative National HĐGSNN Archive Sources (2019–2025)
        hdgsnn_article_ids = [
            # 2025
            824, 823, 822, 821, 820, 819, 815, 814, 813, 812, 810,
            # 2024
            796, 795, 793, 792, 791, 789, 787, 786, 785, 780, 779, 777,
            # 2023
            764, 763, 762, 761, 760, 759,
            # 2022
            716, 715, 687, 686, 685, 684,
            # 2021
            667, 663, 659, 658, 657, 656,
            # 2020
            545, 544, 543, 542,
            # 2019
            510, 509, 508,
        ]

        for aid in hdgsnn_article_ids:
            h_url = f"https://hdgsnn.gov.vn/tin-tuc/_{aid}"
            sources.append({
                "id": f"src-hdgsnn-{aid}",
                "university_id": "hdgsnn",
                "url": h_url,
                "domain": "hdgsnn.gov.vn",
                "source_type": "official_government_gazette",
                "crawl_policy": "allowed",
                "priority": 50,  # High priority because it contains hundreds of verified GS/PGS
            })

        return sources
