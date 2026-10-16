"""Authorized Social Media & External Lead Importer for RateProfCuaBan.
Complies with platform terms: operates strictly via authorized exports, official Graph API feeds,
or authenticated administrative dumps. NEVER bypasses logins or private group controls.
Treats social items as unverified leads only.
"""

from __future__ import annotations
import re
import json
import time
from typing import List, Dict, Any, Optional
from pipeline.models import ProfessorRecord, ProvenanceEvidence
from pipeline.dedup import IdentityResolutionEngine


class SocialLeadImporter:
    """Imports and parses authorized social media post exports into unverified lead records."""

    TITLE_REGEX = re.compile(
        r"\b(GS\.?\s*TS|PGS\.?\s*TS|TS|ThS|Thạc sĩ|Tiến sĩ|Phó Giáo sư|Giáo sư)\b\.?\s*([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+){1,4})",
    )

    @classmethod
    def import_authorized_export(
        cls,
        export_json: str,
        university_id: str,
        university_name: str,
        university_short_name: str,
        source_url: str,
    ) -> List[ProfessorRecord]:
        """
        Parses authorized social export (list of posts/announcements).
        Creates leads flagged with verification_status='social_lead_unverified'.
        """
        try:
            data = json.loads(export_json)
        except Exception:
            return []

        posts = data if isinstance(data, list) else data.get("posts", [data])
        leads: List[ProfessorRecord] = []

        for item in posts:
            message = item.get("message") or item.get("text") or item.get("content") or ""
            post_id = str(item.get("id") or int(time.time() * 1000))
            post_url = item.get("permalink_url") or f"{source_url}/posts/{post_id}"

            # Detect mentions of professors in post text
            matches = cls.TITLE_REGEX.findall(message)
            for title_match, name_match in matches:
                clean_name = name_match.strip()
                if len(clean_name) < 4:
                    continue

                norm_name = IdentityResolutionEngine.normalize_name(clean_name)
                lead_id = f"lead-{university_id}-{norm_name.replace(' ', '-')}"

                record = ProfessorRecord(
                    id=lead_id,
                    name=clean_name,
                    academic_title=title_match.strip(),
                    title=title_match.strip(),
                    university_id=university_id,
                    university_name=university_name,
                    university_short_name=university_short_name,
                    faculty="Chưa phân khoa (Nguồn tin mạng xã hội)",
                    name_variants=[clean_name, norm_name],
                    bio=f"Thông tin trích xuất từ thông báo mạng xã hội chính thức: {message[:160]}...",
                    verification_status="social_lead_unverified",
                    confidence_score=0.40,  # Strict low confidence
                    official_profile_urls=[],
                    source_urls=[post_url],
                    provenance=[
                        ProvenanceEvidence(
                            field="name",
                            source_url=post_url,
                            confidence=0.40,
                            source_type="authorized_social_lead",
                        ),
                        ProvenanceEvidence(
                            field="university",
                            source_url=post_url,
                            confidence=0.50,
                            source_type="authorized_social_lead",
                        ),
                    ],
                )
                leads.append(record)

        return leads

    @classmethod
    def cross_validate_lead_with_official_records(
        cls, lead: ProfessorRecord, official_records: List[ProfessorRecord]
    ) -> Optional[ProfessorRecord]:
        """
        Validates a social lead against official university records.
        Only upgrades or links if match with official record is found.
        """
        lead_norm = IdentityResolutionEngine.normalize_name(lead.name)

        for official in official_records:
            if official.university_id == lead.university_id:
                off_norm = IdentityResolutionEngine.normalize_name(official.name)
                sim = IdentityResolutionEngine.compute_similarity(lead_norm, off_norm)
                if sim >= 0.88:
                    # Verified match: link social provenance evidence to official record
                    for p in lead.provenance:
                        official.provenance.append(p)
                    for url in lead.source_urls:
                        if url not in official.source_urls:
                            official.source_urls.append(url)
                    return official

        return None
