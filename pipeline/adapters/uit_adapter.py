"""Adapter for University of Information Technology - VNUHCM (UIT).
Handles CS, SE, CE, IS, and Information Security faculties.
"""

from __future__ import annotations
import re
import urllib.parse
from typing import List, Optional
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


class UitAdapter(BaseAcademicAdapter):
    """Adapter for UIT faculties and directories."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "uit.edu.vn" in domain

    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        professors: List[ProfessorRecord] = []
        seen_names = set()

        faculty = "Khoa chuyên môn"
        if "nc.uit.edu.vn" in url:
            faculty = "Khoa Mạng máy tính & Truyền thông"
        elif "httt.uit.edu.vn" in url:
            faculty = "Khoa Hệ thống Thông tin"
        elif "cs.uit.edu.vn" in url:
            faculty = "Khoa Khoa học Máy tính"
        elif "se.uit.edu.vn" in url:
            faculty = "Khoa Kỹ thuật Phần mềm"
        elif "fce.uit.edu.vn" in url:
            faculty = "Khoa Kỹ thuật Máy tính"

        # 1. Parse table rows (e.g. Ninja Tables or standard faculty tables)
        table_rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
        for r in table_rows:
            tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.DOTALL | re.IGNORECASE)
            if len(tds) >= 4:
                # Avatar detection
                c0 = tds[0]
                img_url = ""
                lazy_m = re.search(r'data-lazy-src=[\"\']([^\"\']+)[\"\']', c0)
                if lazy_m:
                    img_url = lazy_m.group(1).strip()
                if not img_url:
                    src_m = re.search(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', c0)
                    if src_m and not src_m.group(1).startswith("data:"):
                        img_url = src_m.group(1).strip()
                if not img_url:
                    json_m = re.search(r'\"image_thumb\":\"([^\"]+)\"', c0)
                    if json_m:
                        img_url = json_m.group(1).replace(r'\/', '/').strip()

                if img_url:
                    img_url = urllib.parse.urljoin(url, img_url)

                raw_name = re.sub(r'<[^>]+>', '', tds[1]).strip()
                if not raw_name or len(raw_name) < 3 or raw_name.lower().startswith(("họ và tên", "giảng viên", "stt")):
                    continue

                pos = re.sub(r'<[^>]+>', '', tds[2]).strip() if len(tds) > 2 else ""
                dept = re.sub(r'<[^>]+>', '', tds[3]).strip() if len(tds) > 3 else ""
                
                # Email detection
                email_text = tds[4] if len(tds) > 4 else ""
                email_m = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', email_text)
                inst_email = email_m.group(0) if email_m else ""

                # Website
                web_text = tds[5] if len(tds) > 5 else ""
                web_m = re.search(r'href=[\"\']([^\"\']+)[\"\']', web_text)
                web_url = web_m.group(1).strip() if web_m else url

                # Academic title extraction
                acad_m = re.match(r'^(PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s*(.+)$', raw_name, flags=re.I)
                if acad_m:
                    academic_title = acad_m.group(1).strip()
                    clean_name = acad_m.group(2).strip().title()
                else:
                    academic_title = "ThS"
                    clean_name = raw_name.title()

                clean_name = re.sub(r'^(?:PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s*', '', clean_name, flags=re.I).strip()

                if clean_name not in seen_names and len(clean_name) >= 3:
                    seen_names.add(clean_name)
                    norm_name = IdentityResolutionEngine.normalize_name(clean_name)
                    prof_id = f"prof-uit-{norm_name.replace(' ', '-')}"

                    identifiers = {}
                    if inst_email:
                        identifiers["institutionalEmail"] = inst_email

                    professors.append(
                        ProfessorRecord(
                            id=prof_id,
                            name=clean_name,
                            academic_title=academic_title,
                            title=pos if pos else "Giảng viên",
                            position=pos if pos else None,
                            university_id="uit",
                            university_name="Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
                            university_short_name="UIT",
                            faculty=dept if dept else faculty,
                            department=dept if dept else faculty,
                            name_variants=[clean_name, norm_name],
                            avatar=img_url,
                            official_profile_urls=[web_url] if web_url != url else [url],
                            identifiers=identifiers,
                            provenance=[
                                ProvenanceEvidence(field="name", source_url=url, confidence=1.0, source_type="official_faculty_page"),
                                ProvenanceEvidence(field="university", source_url=url, confidence=1.0, source_type="official_faculty_page"),
                            ],
                            verification_status="verified",
                            confidence_score=1.0,
                            rating_average=None,
                            rating_count=0,
                        )
                    )

        # 2. Parse cards with avatar images
        card_pattern = re.compile(
            r'<(?:div|li|article)[^>]*class=["\'][^"\']*(?:views-row|member|can-bo|giang-vien|staff|profile|person|team)[^"\']*["\'][^>]*>(.*?)</(?:div|li|article)>',
            re.DOTALL | re.IGNORECASE,
        )
        for card in card_pattern.finditer(html):
            card_html = card.group(1)
            name_m = re.search(r'<(?:a|h[2345])[^>]*>([^<]+)</(?:a|h[2345])>', card_html)
            if not name_m:
                continue
            raw_name = name_m.group(1).strip()
            if any(t in raw_name for t in ["PGS", "GS", "TS", "ThS"]):
                img_m = re.search(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', card_html, re.IGNORECASE)
                avatar_url = ""
                if img_m:
                    s_val = img_m.group(1).strip()
                    if s_val and not any(bad in s_val.lower() for bad in ["logo", "icon", "blank", "default"]):
                        avatar_url = urllib.parse.urljoin(url, s_val)

                clean_name = re.sub(r'^(?:PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s*', '', raw_name, flags=re.I).strip().title()
                if clean_name not in seen_names and len(clean_name) >= 3:
                    seen_names.add(clean_name)
                    norm_name = IdentityResolutionEngine.normalize_name(clean_name)
                    prof_id = f"prof-uit-{norm_name.replace(' ', '-')}"
                    professors.append(
                        ProfessorRecord(
                            id=prof_id,
                            name=clean_name,
                            academic_title="TS",
                            title="Giảng viên",
                            position=None,
                            university_id="uit",
                            university_name="Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
                            university_short_name="UIT",
                            faculty=faculty,
                            department=faculty,
                            name_variants=[clean_name, norm_name],
                            avatar=avatar_url,
                            official_profile_urls=[url],
                            identifiers={},
                            provenance=[
                                ProvenanceEvidence(field="name", source_url=url, confidence=1.0, source_type="official_faculty_page"),
                                ProvenanceEvidence(field="university", source_url=url, confidence=1.0, source_type="official_faculty_page"),
                            ],
                            verification_status="verified",
                            confidence_score=1.0,
                            rating_average=None,
                            rating_count=0,
                        )
                    )

        # 2. Parse text lines cleanly stripped of HTML tags
        lines = [l.strip() for l in re.sub(r'<[^>]+>', '\n', html).splitlines() if l.strip()]
        for l in lines:
            m = re.match(r'^(?:(PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s+([A-ZÀ-Ỹ][\w\sÀ-ỹ]+))$', l)
            if m:
                academic_title = m.group(1).strip()
                clean_name = m.group(2).strip()
                words = clean_name.split()
                if 2 <= len(words) <= 6 and not any(w in clean_name.lower() for w in ['khoa', 'ngành', 'học kỳ', 'thông tin', 'năm học', 'đại học', 'trường']):
                    clean_name = clean_name.title()
                    if clean_name not in seen_names:
                        seen_names.add(clean_name)
                        norm_name = IdentityResolutionEngine.normalize_name(clean_name)
                        prof_id = f"prof-uit-{norm_name.replace(' ', '-')}"

                        record = ProfessorRecord(
                            id=prof_id,
                            name=clean_name,
                            academic_title=academic_title,
                            title=academic_title or "Giảng viên",
                            position=None,
                            university_id="uit",
                            university_name="Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
                            university_short_name="UIT",
                            faculty=faculty,
                            department=faculty,
                            name_variants=[clean_name, norm_name],
                            avatar="",
                            official_profile_urls=[],
                            identifiers={},
                            provenance=[
                                ProvenanceEvidence(
                                    field="name",
                                    source_url=url,
                                    confidence=1.0,
                                    source_type="official_faculty_page",
                                ),
                                ProvenanceEvidence(
                                    field="university",
                                    source_url=url,
                                    confidence=1.0,
                                    source_type="official_faculty_page",
                                ),
                            ],
                            verification_status="verified",
                            confidence_score=1.0,
                            rating_average=None,
                            rating_count=0,
                            criteria_averages=None,
                        )
                        professors.append(record)

        return professors
