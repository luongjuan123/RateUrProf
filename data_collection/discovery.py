"""Multi-Stage Academic Directory & Subdomain Discovery Engine."""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Set, Dict, Any, Optional
from bs4 import BeautifulSoup
from data_collection.config import CONFIG


class DiscoveryEngine:
    """Discovers faculties, departments, subdomains, and staff directories across universities."""

    STAFF_KEYWORDS = [
        "can-bo", "giang-vien", "doi-ngu", "nhan-su", "nhan-luc",
        "faculty", "staff", "people", "academic", "members", "teachers",
        "danh-ba", "chuyen-gia", "giao-vien", "hoi-dong"
    ]

    FACULTY_KEYWORDS = [
        "khoa-", "/khoa/", "bo-mon", "faculty", "school", "don-vi",
        "vien-", "/vien/", "phong-ban", "trung-tam", "dao-tao"
    ]

    PAGINATION_PATTERNS = [
        re.compile(r'[?&](?:page|p|trang|curPage|start)=(\d+)', re.IGNORECASE),
        re.compile(r'/page/(\d+)/?', re.IGNORECASE),
        re.compile(r'/p/(\d+)/?', re.IGNORECASE),
    ]

    @classmethod
    def is_same_or_subdomain(cls, target_url: str, base_domain: str) -> bool:
        """Verifies if target_url belongs to the same domain or a subdomain of base_domain."""
        if not target_url or not base_domain:
            return False
        parsed_target = urllib.parse.urlparse(target_url).netloc.lower()
        base = base_domain.lower()
        if ":" in parsed_target:
            parsed_target = parsed_target.split(":")[0]
        if ":" in base:
            base = base.split(":")[0]

        # Strip 'www.'
        parsed_target = parsed_target.removeprefix("www.")
        base = base.removeprefix("www.")

        return parsed_target == base or parsed_target.endswith(f".{base}")

    @classmethod
    def discover_links_from_html(
        cls, html: str, base_url: str, base_domain: str
    ) -> Dict[str, List[str]]:
        """
        Parses page HTML and classifies discovered URLs into:
        - 'staff_directories': direct staff/faculty roster links
        - 'faculty_pages': faculty or department homepages
        - 'pagination_links': next/paginated directory pages
        """
        results: Dict[str, List[str]] = {
            "staff_directories": [],
            "faculty_pages": [],
            "pagination_links": [],
        }
        if not html:
            return results

        soup = BeautifulSoup(html, "lxml")
        seen_urls: Set[str] = set()

        for a_tag in soup.find_all("a", href=True):
            raw_href = a_tag["href"].strip()
            if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue

            full_url = urllib.parse.urljoin(base_url, raw_href)
            clean_url = full_url.split("#")[0].rstrip("/")
            if clean_url in seen_urls:
                continue

            parsed = urllib.parse.urlparse(clean_url)
            if not parsed.scheme.startswith("http"):
                continue

            # Must belong to university domain or legitimate subdomain
            if not cls.is_same_or_subdomain(clean_url, base_domain):
                continue

            seen_urls.add(clean_url)
            lower_path = parsed.path.lower()
            lower_query = parsed.query.lower()
            link_text = a_tag.get_text(separator=" ", strip=True).lower()

            # 1. Check for pagination link
            is_paginated = any(p.search(clean_url) for p in cls.PAGINATION_PATTERNS)
            if is_paginated and any(kw in lower_path or kw in link_text for kw in cls.STAFF_KEYWORDS):
                results["pagination_links"].append(clean_url)
                continue

            # 2. Check for staff directory link
            if any(kw in lower_path or kw in link_text for kw in cls.STAFF_KEYWORDS):
                results["staff_directories"].append(clean_url)
                continue

            # 3. Check for faculty or department page
            if any(kw in lower_path or kw in link_text for kw in cls.FACULTY_KEYWORDS):
                results["faculty_pages"].append(clean_url)

        return results

    @classmethod
    def generate_pagination_urls(cls, directory_url: str, max_pages: int = 15) -> List[str]:
        """Generates candidate paginated URLs for directories that use standard patterns."""
        urls = []
        parsed = urllib.parse.urlparse(directory_url)
        clean_base = directory_url.rstrip("/")

        for page in range(2, max_pages + 1):
            if "?" in directory_url:
                urls.append(f"{clean_base}&page={page}")
                urls.append(f"{clean_base}&p={page}")
            else:
                urls.append(f"{clean_base}/page/{page}")
                urls.append(f"{clean_base}?page={page}")
        return urls
