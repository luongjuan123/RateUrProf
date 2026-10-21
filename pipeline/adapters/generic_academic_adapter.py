"""Generic Academic Adapter for Vietnamese Universities.
Serves as universal fallback for standard academic portals, CMSs (WordPress, Joomla, Drupal),
Schema.org JSON-LD structured data, and faculty directory tables.
"""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Optional
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.crawler import StructuredDataExtractor
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


class GenericAcademicAdapter(BaseAcademicAdapter):
    """Universal academic extractor for educational domains."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "edu.vn" in domain or "vnu.edu.vn" in domain or "udn.vn" in domain or "hueuni.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []

        # 1. Try JSON-LD Person schema first (highest quality structured data)
        json_ld_items = StructuredDataExtractor.extract_json_ld(html)
        people = StructuredDataExtractor.extract_people(json_ld_items)
        if people:
            for p in people:
                prof = self._build_from_json_ld(p, url, university)
                if prof:
                    professors.append(prof)
            if professors:
                return professors

        # 2. Try HTML Card / Member components (div, article, li)
        card_pattern = re.compile(
            r'<(?:div|article|li)[^>]*class=["\'][^"\']*(?:giang-vien|can-bo|nhan-su|faculty|member|staff|person|profile|teacher|team-box|team-item|author-item)[^"\']*["\'][^>]*>(.*?)</(?:div|article|li)>',
            re.DOTALL | re.IGNORECASE,
        )
        cards = list(card_pattern.finditer(html))

        if cards:
            for card in cards:
                card_html = card.group(1)
                name_m = re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>', card_html)
                if not name_m:
                    name_m = re.search(r'<h[2345][^>]*>([^<]+)</h[2345]>', card_html)
                    profile_link = url
                    raw_name = name_m.group(1).strip() if name_m else ""
                else:
                    profile_link = urllib.parse.urljoin(url, name_m.group(1))
                    raw_name = name_m.group(2).strip()

                if not raw_name or len(raw_name) < 3:
                    continue

                # Photo extraction with multiple attributes
                avatar_url = ""
                img_m = re.search(r'<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
                if img_m:
                    src_val = img_m.group(1).strip()
                    if src_val and not any(bad in src_val.lower() for bad in ["logo", "icon", "blank", "pixel", "1x1", "avatar-default", "default"]):
                        avatar_url = urllib.parse.urljoin(url, src_val)

                text_snippet = re.sub(r"<[^>]+>", " ", card_html)
                text_snippet = re.sub(r"\s+", " ", text_snippet).strip()

                prof = self._build_prof_record(
                    raw_name, profile_link, url, university, avatar_url, text_snippet
                )
                if prof:
                    professors.append(prof)

            if professors:
                return professors

        # 3. Try Table Rows (e.g. Danh sách cán bộ / giảng viên)
        table_row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        for row_m in table_row_pattern.finditer(html):
            row_html = row_m.group(1)
            if "<th" in row_html:
                continue
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL | re.IGNORECASE)
            if len(cells) >= 2:
                # Find cell with name vs cell with photo
                avatar_url = ""
                name_cell = ""
                profile_link = url

                for c in cells:
                    if not avatar_url:
                        c_img = re.search(r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\']', c, re.IGNORECASE)
                        if c_img:
                            src_val = c_img.group(1).strip()
                            if src_val and not any(bad in src_val.lower() for bad in ["logo", "icon", "blank", "pixel", "1x1"]):
                                avatar_url = urllib.parse.urljoin(url, src_val)

                    link_m = re.search(r'href=["\']([^"\']+)["\']', c)
                    c_clean = re.sub(r"<[^>]+>", " ", c).strip()
                    if any(t in c_clean for t in ["GS", "PGS", "TS", "ThS", "CN", "BS"]) or len(c_clean.split()) >= 2:
                        if not name_cell or len(c_clean) > len(name_cell):
                            name_cell = c_clean
                            if link_m:
                                profile_link = urllib.parse.urljoin(url, link_m.group(1))

                if not name_cell:
                    name_cell = re.sub(r"<[^>]+>", " ", cells[1] if len(cells) > 2 else cells[0]).strip()

                row_text = " ".join([re.sub(r"<[^>]+>", " ", c).strip() for c in cells])
                prof = self._build_prof_record(
                    name_cell, profile_link, url, university, avatar_url=avatar_url, snippet=row_text
                )
                if prof:
                    professors.append(prof)

        # 4. Fallback link list with academic links and photos
        if not professors:
            link_pattern = re.compile(
                r'<a[^>]+href=["\']([^"\']*(?:/can-bo/|/giang-vien/|/profile/)[^"\']*)["\'][^>]*>(.*?)</a>',
                re.DOTALL | re.IGNORECASE,
            )
            for m in link_pattern.finditer(html):
                profile_link = urllib.parse.urljoin(url, m.group(1))
                raw_name = re.sub(r"<[^>]+>", " ", m.group(2)).strip()
                raw_name = re.sub(r"\s+", " ", raw_name)
                if len(raw_name) > 3 and not raw_name.lower().startswith(("xem", "chi tiết", "đọc tiếp", "thông tin")):
                    # Search for avatar image near the link
                    pos = m.start()
                    snippet_around = html[max(0, pos - 1500) : min(len(html), pos + 1500)]
                    img_m = re.search(r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\']', snippet_around, re.I)
                    avatar_url = ""
                    if img_m:
                        src_val = img_m.group(1).strip()
                        if not any(bad in src_val.lower() for bad in ["logo", "icon", "arrow", "flag", "breadcrumb", "polylang", "1x1", "spacer", "pixel", "blank", ".svg"]):
                            avatar_url = urllib.parse.urljoin(url, src_val)

                    prof = self._build_prof_record(raw_name, profile_link, url, university, avatar_url=avatar_url)
                    if prof:
                        professors.append(prof)

        # 5. Fallback text lines with academic titles
        if not professors:
            lines = [l.strip() for l in re.sub(r'<[^>]+>', '\n', html).splitlines() if l.strip()]
            for l in lines:
                m = re.match(r'^(?:(PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s+([A-ZÀ-Ỹ][\w\sÀ-ỹ]+))$', l)
                if m:
                    academic_title = m.group(1).strip()
                    clean_name = m.group(2).strip()
                    words = clean_name.split()
                    if 2 <= len(words) <= 6 and not any(w in clean_name.lower() for w in ['khoa', 'ngành', 'học kỳ', 'thông tin', 'năm học', 'đại học', 'trường', 'phòng', 'ban', 'viện']):
                        prof = self._build_prof_record(f"{academic_title} {clean_name}", url, url, university)
                        if prof:
                            professors.append(prof)

        return professors

    def _build_from_json_ld(
        self, p_data: dict, source_page_url: str, university: UniversityRecord
    ) -> Optional[ProfessorRecord]:
        raw_name = p_data.get("name")
        if not raw_name or not isinstance(raw_name, str):
            return None

        clean_name = raw_name.strip()
        job_title = p_data.get("jobTitle", "Giảng viên")
        image = p_data.get("image", "")
        if isinstance(image, dict):
            image = image.get("url", "")
        profile_url = p_data.get("url", source_page_url)
        email = p_data.get("email", "")

        identifiers = {}
        if email and isinstance(email, str):
            identifiers["institutionalEmail"] = email.lower()

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-{university.id}-{norm_name.replace(' ', '-')}"

        return ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=None,
            title=job_title if isinstance(job_title, str) else "Giảng viên",
            position=job_title if isinstance(job_title, str) else None,
            university_id=university.id,
            university_name=university.name,
            university_short_name=university.short_name,
            faculty=university.faculties[0] if university.faculties else "Ban Giảng huấn",
            name_variants=[clean_name, norm_name],
            avatar=image if isinstance(image, str) else "",
            bio=p_data.get("description", f"Giảng viên tại {university.name}."),
            official_profile_urls=[profile_url] if profile_url else [],
            identifiers=identifiers,
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=0.98,
                    source_type="official_faculty_page",
                ),
                ProvenanceEvidence(
                    field="university",
                    source_url=source_page_url,
                    confidence=1.0,
                    source_type="official_faculty_page",
                ),
            ],
            verification_status="verified",
            confidence_score=0.94,
            source_urls=[source_page_url],
        )

    def _build_prof_record(
        self,
        raw_name: str,
        profile_url: str,
        source_page_url: str,
        university: UniversityRecord,
        avatar_url: str = "",
        snippet: str = "",
    ) -> Optional[ProfessorRecord]:
        clean_name = raw_name.strip()
        academic_title = None

        lower = clean_name.lower()
        STOP_WORDS = [
            "trường", "khoa", "viện", "bộ môn", "phòng", "ban", "trung tâm", "đoàn", "hội đồng",
            "chi bộ", "đại học", "tin tức", "thông báo", "sự kiện", "website", "cổng thông tin",
            "tuyển sinh", "đào tạo", "nghiên cứu khoa học", "hợp tác quốc tế", "liên hệ", "giới thiệu",
            "chức danh", "chức vụ", "họ và tên", "họ tên", "học hàm", "học vị", "đơn vị", "ngày sinh",
            "số thứ tự", "ghi chú", "thao tác", "chi tiết", "xem thêm", "đọc tiếp", "cán bộ", "giảng viên",
            "nhiệm vụ", "quyền hạn", "cơ cấu", "tổ chức", "lãnh đạo"
        ]
        if any(bad in lower for bad in STOP_WORDS):
            return None

        if re.search(r"\b(PGS\.?\s*TS|Phó Giáo sư)\b", clean_name, re.IGNORECASE):
            academic_title = "PGS. TS"
            clean_name = re.sub(r"^(PGS\.?\s*TS\.?|Phó Giáo sư,?\s*Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(GS\.?\s*TS|Giáo sư)\b", clean_name, re.IGNORECASE):
            academic_title = "GS. TS"
            clean_name = re.sub(r"^(GS\.?\s*TS\.?|Giáo sư,?\s*Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(TS|Tiến sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "TS"
            clean_name = re.sub(r"^(TS\.?|Tiến sĩ\.?)\s*", "", clean_name, flags=re.I).strip()
        elif re.search(r"\b(ThS|Thạc sĩ)\b", clean_name, re.IGNORECASE):
            academic_title = "ThS"
            clean_name = re.sub(r"^(ThS\.?|Thạc sĩ\.?)\s*", "", clean_name, flags=re.I).strip()

        words = clean_name.split()
        if len(words) < 2 or len(words) > 5:
            return None

        if len(clean_name) < 3:
            return None

        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
        prof_id = f"prof-{university.id}-{norm_name.replace(' ', '-')}"

        position = None
        if "trưởng khoa" in snippet.lower():
            position = "Trưởng khoa"
        elif "phó trưởng khoa" in snippet.lower():
            position = "Phó trưởng khoa"
        elif "trưởng bộ môn" in snippet.lower():
            position = "Trưởng bộ môn"

        # Email detection
        domain = university.official_domain or "edu.vn"
        email_m = re.search(rf'([a-zA-Z0-9_.+-]+@(?:[a-zA-Z0-9-]+\.)?{re.escape(domain)})', snippet)
        identifiers = {}
        if email_m:
            identifiers["institutionalEmail"] = email_m.group(1).lower()

        interests = []
        if "nghiên cứu:" in snippet.lower():
            parts = re.split(r"nghiên cứu:", snippet, flags=re.I)
            if len(parts) > 1:
                tail = parts[1].split(".")[0]
                interests = [t.strip() for t in tail.split(",") if len(t.strip()) > 2]

        record = ProfessorRecord(
            id=prof_id,
            name=clean_name,
            academic_title=academic_title,
            title=academic_title or "Giảng viên",
            position=position,
            university_id=university.id,
            university_name=university.name,
            university_short_name=university.short_name,
            faculty=university.faculties[0] if university.faculties else "Khoa Chuyên ngành",
            name_variants=[clean_name, norm_name],
            avatar=avatar_url,
            bio=snippet if len(snippet) > 20 else f"Giảng viên tại {university.name}.",
            research_interests=interests,
            official_profile_urls=[profile_url] if profile_url else [],
            identifiers=identifiers,
            provenance=[
                ProvenanceEvidence(
                    field="name",
                    source_url=source_page_url,
                    confidence=0.92,
                    source_type="official_faculty_page",
                ),
                ProvenanceEvidence(
                    field="university",
                    source_url=source_page_url,
                    confidence=1.0,
                    source_type="official_faculty_page",
                ),
            ],
            verification_status="verified",
            confidence_score=0.90,
            source_urls=[source_page_url, profile_url],
        )

        return record
