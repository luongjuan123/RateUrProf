"""Identity Resolution, Deduplication Engine, and Vietnamese Name Normalization.
Handles conservative matching, cross-university entity candidate queue, and provenance preservation.
"""

from __future__ import annotations
import unicodedata
import re
import difflib
import time
from typing import List, Dict, Any, Optional, Tuple
from pipeline.models import (
    ProfessorRecord,
    EntityMatchCandidateRecord,
    ProvenanceEvidence,
)


class IdentityResolutionEngine:
    """Multi-tier identity resolution engine for Vietnamese professors and researchers."""

    TITLES_PATTERN = re.compile(
        r"^(gs\.?\s*ts\.?|pgs\.?\s*ts\.?|ts\.?|ths\.?|ks\.?|cn\.?|dr\.?|prof\.?|assoc\.?\s*prof\.?|"
        r"giáo sư,?\s*tiến sĩ\.?|phó giáo sư,?\s*tiến sĩ\.?|tiến sĩ\.?|thạc sĩ\.?|kỹ sư\.?|cử nhân\.?)\s*",
        re.IGNORECASE,
    )

    @classmethod
    def strip_academic_titles(cls, name: str) -> str:
        """Strips academic prefixes from a full name."""
        clean = name.strip()
        cleaned = cls.TITLES_PATTERN.sub("", clean).strip()
        while cleaned != clean:
            clean = cleaned
            cleaned = cls.TITLES_PATTERN.sub("", clean).strip()
        return clean

    @classmethod
    def normalize_name(cls, name: str) -> str:
        """
        Converts Vietnamese full names into normalized lowercase ASCII string.
        E.g. 'PGS. TS. Nguyễn Văn A' -> 'nguyen van a'
             'Trần Thị Thu Thảo' -> 'tran thi thu thao'
             'Đỗ Đình Đạt' -> 'do dinh dat'
        """
        clean = cls.strip_academic_titles(name)
        # Custom replace for Vietnamese 'đ', 'Đ'
        clean = clean.replace("đ", "d").replace("Đ", "D")
        # Unicode NFD decomposition to separate base letters and accents
        nfd = unicodedata.normalize("NFD", clean)
        # Filter out non-spacing diacritical marks
        ascii_chars = [c for c in nfd if unicodedata.category(c) != "Mn"]
        ascii_str = "".join(ascii_chars)
        # Lowercase, strip punctuation and extra spaces
        ascii_str = re.sub(r"[^\w\s]", " ", ascii_str)
        ascii_str = re.sub(r"\s+", " ", ascii_str).strip().lower()
        return ascii_str

    @classmethod
    def compute_similarity(cls, str1: str, str2: str) -> float:
        """Returns sequence similarity score between 0.0 and 1.0."""
        return difflib.SequenceMatcher(None, str1, str2).ratio()

    @classmethod
    def find_identifier_match(
        cls, prof1: ProfessorRecord, prof2: ProfessorRecord
    ) -> Optional[Tuple[str, str]]:
        """Checks for exact matching on persistent identifiers (ORCID, email, Scopus, Google Scholar)."""
        id_keys = ["orcid", "institutionalEmail", "scopusId", "googleScholarId"]
        for key in id_keys:
            val1 = prof1.identifiers.get(key)
            val2 = prof2.identifiers.get(key)
            if val1 and val2 and val1.lower() == val2.lower():
                return key, val1

        # Check exact official profile url match
        urls1 = set(u.lower().rstrip("/") for u in prof1.official_profile_urls)
        urls2 = set(u.lower().rstrip("/") for u in prof2.official_profile_urls)
        shared_urls = urls1.intersection(urls2)
        if shared_urls:
            return "official_profile_url", list(shared_urls)[0]

        return None

    @classmethod
    def compare_professors(
        cls, p1: ProfessorRecord, p2: ProfessorRecord
    ) -> Tuple[float, List[str]]:
        """
        Evaluates similarity between two professor records.
        Returns (match_score: 0.0-1.0, reasons: List[str]).
        """
        reasons: List[str] = []

        # 1. Exact persistent identifier match
        id_match = cls.find_identifier_match(p1, p2)
        if id_match:
            reasons.append(f"Khớp chính xác định danh duy nhất ({id_match[0]}: {id_match[1]})")
            return 1.0, reasons

        # 2. Normalized name comparison
        norm1 = cls.normalize_name(p1.name)
        norm2 = cls.normalize_name(p2.name)
        name_sim = cls.compute_similarity(norm1, norm2)

        if name_sim < 0.75:
            return 0.0, ["Họ tên khác biệt rõ rệt"]

        reasons.append(f"Độ tương đồng họ tên chuẩn hóa: {name_sim:.2f}")

        # 3. University affiliation
        same_univ = p1.university_id == p2.university_id
        if same_univ:
            reasons.append("Cùng cơ sở đại học")
        else:
            reasons.append(f"Khác cơ sở đại học ({p1.university_short_name} vs {p2.university_short_name})")

        # 4. Faculty / Department overlap
        same_faculty = False
        if p1.faculty and p2.faculty:
            f_sim = cls.compute_similarity(
                cls.normalize_name(p1.faculty), cls.normalize_name(p2.faculty)
            )
            if f_sim > 0.7:
                same_faculty = True
                reasons.append("Cùng chuyên khoa/đơn vị đào tạo")

        # 5. Research interests overlap
        interests1 = set(cls.normalize_name(i) for i in p1.research_interests)
        interests2 = set(cls.normalize_name(i) for i in p2.research_interests)
        shared_interests = interests1.intersection(interests2)
        if shared_interests:
            reasons.append(f"Chung hướng nghiên cứu: {', '.join(list(shared_interests)[:3])}")

        # Score computation
        score = name_sim * 0.5
        if same_univ:
            score += 0.35
            if same_faculty:
                score += 0.15
        else:
            # Different universities
            if name_sim >= 0.9:
                score += 0.25
            if shared_interests:
                score += 0.25
            if p1.academic_title == p2.academic_title and p1.academic_title:
                score += 0.1

        return min(round(score, 2), 0.99 if not id_match else 1.0), reasons

    @classmethod
    def deduplicate_batch(
        cls,
        incoming: List[ProfessorRecord],
        existing: List[ProfessorRecord],
    ) -> Tuple[List[ProfessorRecord], List[EntityMatchCandidateRecord]]:
        """
        Deduplicates incoming professors against existing ones.
        - Exact/Safe matches within the same university are merged.
        - High-similarity matches across different universities are added to candidates queue.
        - Distinct records are added as new.
        """
        merged_or_new: Dict[str, ProfessorRecord] = {p.id: p for p in existing}
        candidates: List[EntityMatchCandidateRecord] = []

        for new_prof in incoming:
            matched_id: Optional[str] = None
            highest_score = 0.0
            best_reasons: List[str] = []

            for ex_id, ex_prof in merged_or_new.items():
                score, reasons = cls.compare_professors(new_prof, ex_prof)
                if score > highest_score:
                    highest_score = score
                    matched_id = ex_id
                    best_reasons = reasons

            # Case A: Same record or definite duplicate within the same university
            if highest_score >= 0.88 and matched_id:
                ex_prof = merged_or_new[matched_id]
                if ex_prof.university_id == new_prof.university_id:
                    # Safe to merge
                    merged = cls.merge_records(ex_prof, new_prof)
                    merged_or_new[matched_id] = merged
                    continue

            # Case B: Potential duplicate across different universities (homonym or job transfer)
            if highest_score >= 0.65 and matched_id:
                ex_prof = merged_or_new[matched_id]
                cand = EntityMatchCandidateRecord(
                    id=f"cand-{new_prof.id}-{ex_prof.id}",
                    source_professor_id=new_prof.id,
                    candidate_professor_id=ex_prof.id,
                    source_name=new_prof.name,
                    candidate_name=ex_prof.name,
                    source_university=new_prof.university_name,
                    candidate_university=ex_prof.university_name,
                    match_score=highest_score,
                    match_reasons=best_reasons,
                    status="pending",
                )
                candidates.append(cand)
                # Keep new record separate until reviewed by admin
                merged_or_new[new_prof.id] = new_prof
            else:
                # Case C: Distinct new professor
                merged_or_new[new_prof.id] = new_prof

        return list(merged_or_new.values()), candidates

    @classmethod
    def merge_records(
        cls, primary: ProfessorRecord, secondary: ProfessorRecord
    ) -> ProfessorRecord:
        """Merges two records preserving provenance, citations, and newest verified info."""
        # Merge name variants
        variants = set(primary.name_variants + secondary.name_variants)
        variants.add(primary.name)
        variants.add(secondary.name)

        # Merge research interests
        interests = list(dict.fromkeys(primary.research_interests + secondary.research_interests))

        # Merge profile URLs and source URLs
        official_urls = list(dict.fromkeys(primary.official_profile_urls + secondary.official_profile_urls))
        source_urls = list(dict.fromkeys(primary.source_urls + secondary.source_urls))

        # Merge identifiers
        merged_ids = dict(primary.identifiers)
        for k, v in secondary.identifiers.items():
            if k not in merged_ids or not merged_ids[k]:
                merged_ids[k] = v

        # Merge provenance evidence
        prov = list(primary.provenance)
        existing_prov_keys = {(p.field, p.source_url) for p in prov}
        for p in secondary.provenance:
            if (p.field, p.source_url) not in existing_prov_keys:
                prov.append(p)

        # Avatar: prefer non-empty avatar
        avatar = primary.avatar if primary.avatar else secondary.avatar

        # Bio: prefer longest informative bio
        bio = primary.bio
        if not bio or (secondary.bio and len(secondary.bio) > len(bio)):
            bio = secondary.bio

        # Academic title: prefer higher rank
        academic_title = primary.academic_title or secondary.academic_title
        if secondary.academic_title and ("GS" in secondary.academic_title or "PGS" in secondary.academic_title):
            academic_title = secondary.academic_title

        primary.name_variants = list(variants)
        primary.research_interests = interests
        primary.official_profile_urls = official_urls
        primary.source_urls = source_urls
        primary.identifiers = merged_ids
        primary.provenance = prov
        primary.avatar = avatar
        primary.bio = bio
        primary.academic_title = academic_title
        primary.last_verified_at = int(time.time() * 1000)
        primary.confidence_score = max(primary.confidence_score, secondary.confidence_score)

        return primary
