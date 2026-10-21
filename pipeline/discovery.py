"""University and Source Discovery Pipeline for RateProfCuaBan.
Discovers Vietnamese universities across North, Central, and South regions,
maintaining a verified source registry with crawl policies and robots permissions.
"""

from __future__ import annotations
import urllib.parse
import re
from typing import List, Dict, Any, Optional
from pipeline.models import UniversityRecord, SourceRegistryRecord


try:
    from pipeline.institutions_seed import VIETNAMESE_INSTITUTIONS_SEED
except ImportError:
    from pipeline.universities_seed import VIETNAMESE_UNIVERSITIES_SEED as VIETNAMESE_INSTITUTIONS_SEED


class UniversityDiscoveryService:
    """Discovers Vietnamese universities and colleges, registers verified sources, and generates crawl queues."""

    def __init__(self, universities_data: Optional[List[Dict[str, Any]]] = None):
        self.raw_data = universities_data or VIETNAMESE_INSTITUTIONS_SEED

    def get_all_universities(self) -> List[UniversityRecord]:
        """Returns typed UniversityRecord objects for all seeded universities and colleges."""
        records: List[UniversityRecord] = []
        for d in self.raw_data:
            rec = UniversityRecord(
                id=d["id"],
                name=d["name"],
                short_name=d.get("short_name") or d.get("shortName") or "INST",
                city=d["city"],
                region=d["region"],
                english_name=d.get("english_name") or d.get("englishName"),
                official_domain=d.get("official_domain") or d.get("officialDomain"),
                official_website=d.get("official_website") or d.get("officialWebsite"),
                description=d.get("description"),
                logo_url=d.get("logo_url") or d.get("logoUrl"),
                cover_image=d.get("cover_image") or d.get("coverImage"),
                faculties=d.get("faculties", []),
                faculty_directory_urls=d.get("faculty_directory_urls") or d.get("facultyDirectoryUrls") or [],
                staff_directory_urls=d.get("staff_directory_urls") or d.get("staffDirectoryUrls") or [],
                research_institute_urls=d.get("research_institute_urls") or d.get("researchInstituteUrls") or [],
                course_catalog_urls=d.get("course_catalog_urls") or d.get("courseCatalogUrls") or [],
                verified_social_links=d.get("verified_social_links") or d.get("verifiedSocialLinks") or [],
                source_urls=[d.get("official_website") or d.get("officialWebsite")] if (d.get("official_website") or d.get("officialWebsite")) else [],
                institution_type=d.get("institutionType") or d.get("institution_type") or "university",
            )
            records.append(rec)
        return records

    def build_source_registry(self) -> List[SourceRegistryRecord]:
        """Generates initial source registry items for crawler scheduling."""
        registry_items: List[SourceRegistryRecord] = []

        for d in self.raw_data:
            u_id = d["id"]
            domain = d.get("official_domain", "")

            # 1. Main Official Website
            if d.get("official_website"):
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-homepage",
                        university_id=u_id,
                        url=d["official_website"],
                        domain=domain,
                        source_type="official_homepage",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 2. Faculty Directory Pages
            for idx, f_url in enumerate(d.get("faculty_directory_urls", [])):
                f_domain = urllib.parse.urlparse(f_url).netloc or domain
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-faculty-{idx}",
                        university_id=u_id,
                        url=f_url,
                        domain=f_domain,
                        source_type="faculty_directory",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 3. Staff Directory Pages
            for idx, s_url in enumerate(d.get("staff_directory_urls", [])):
                s_domain = urllib.parse.urlparse(s_url).netloc or domain
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-staff-{idx}",
                        university_id=u_id,
                        url=s_url,
                        domain=s_domain,
                        source_type="staff_profile",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 4. Verified Social Links (Marked as authorized social export or lead check)
            for idx, soc in enumerate(d.get("verified_social_links", [])):
                if soc.get("platform") == "facebook" and soc.get("verified"):
                    registry_items.append(
                        SourceRegistryRecord(
                            id=f"src-{u_id}-social-fb-{idx}",
                            university_id=u_id,
                            url=soc["url"],
                            domain="facebook.com",
                            source_type="authorized_social_export",
                            crawl_policy="manual_only",  # Do not auto-scrape Facebook HTML directly
                            status="active",
                        )
                    )

        return registry_items

    @staticmethod
    def discover_links_from_html(html: str, base_url: str) -> List[str]:
        """Discovers outbound links belonging to academic/staff directories."""
        pattern = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
        base_domain = urllib.parse.urlparse(base_url).netloc
        discovered: List[str] = []

        keywords = [
            "can-bo", "giang-vien", "faculty", "staff", "doi-ngu",
            "nhan-su", "bo-mon", "khoa", "people", "academic"
        ]

        for match in pattern.finditer(html):
            rel_or_abs = match.group(1).strip()
            if rel_or_abs.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            full_url = urllib.parse.urljoin(base_url, rel_or_abs)
            parsed = urllib.parse.urlparse(full_url)

            # Keep same root domain or university subdomains
            if parsed.netloc.endswith(base_domain) or base_domain.endswith(parsed.netloc):
                lower_path = parsed.path.lower()
                if any(kw in lower_path for kw in keywords):
                    if full_url not in discovered:
                        discovered.append(full_url)

        return discovered
