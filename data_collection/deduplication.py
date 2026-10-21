"""Identity Resolution and Multi-Signal Deduplication Engine for Vietnamese Professors."""

from __future__ import annotations
import difflib
import time
from typing import List, Dict, Any, Tuple, Optional, Set
from data_collection.normalization import Normalizer


class DeduplicationEngine:
    """Robust multi-signal identity resolution engine preserving data provenance and preventing false merges."""

    @classmethod
    def compute_similarity(cls, str1: str, str2: str) -> float:
        """Returns string similarity between 0.0 and 1.0."""
        return difflib.SequenceMatcher(None, str1, str2).ratio()

    @classmethod
    def compare_records(
        cls, r1: Dict[str, Any], r2: Dict[str, Any]
    ) -> Tuple[float, List[str]]:
        """
        Calculates similarity score and justification reasons between two professor records.
        Returns (score: 0.0-1.0, reasons: List[str]).
        """
        reasons = []

        # 1. Exact unique identifier match (email, orcid, staff code, etc.)
        ids1 = r1.get("identifiers", {})
        ids2 = r2.get("identifiers", {})
        for k in ["institutionalEmail", "orcid", "scopusId", "googleScholarId", "staffCode"]:
            val1 = ids1.get(k)
            val2 = ids2.get(k)
            if val1 and val2 and str(val1).lower().strip() == str(val2).lower().strip():
                reasons.append(f"Khớp chính xác định danh duy nhất ({k}: {val1})")
                return 1.0, reasons

        # 2. Check individual profile URL match (excluding generic directory URLs)
        dir_kws = ["can-bo", "giang-vien", "danhba", "unit_", "people", "faculty", "nhan-su", "doi-ngu"]
        urls1 = set(
            u.lower().rstrip("/")
            for u in (r1.get("official_profile_urls") or r1.get("officialProfileUrls") or [])
            if u and not any(kw in u.lower() for kw in dir_kws)
        )
        urls2 = set(
            u.lower().rstrip("/")
            for u in (r2.get("official_profile_urls") or r2.get("officialProfileUrls") or [])
            if u and not any(kw in u.lower() for kw in dir_kws)
        )
        shared_urls = urls1.intersection(urls2)
        if shared_urls:
            reasons.append(f"Khớp trang hồ sơ cá nhân: {list(shared_urls)[0]}")
            return 1.0, reasons

        # 3. Normalized Name Comparison
        norm1 = Normalizer.normalize_name_for_matching(r1["name"])
        norm2 = Normalizer.normalize_name_for_matching(r2["name"])
        words1 = norm1.split()
        words2 = norm2.split()

        # In Vietnamese, differing family name (first word) or given name (last word) means different people
        if words1 and words2 and (words1[-1] != words2[-1] or words1[0] != words2[0]):
            return 0.0, ["Họ hoặc tên chính khác biệt"]

        is_exact_name = (norm1 == norm2)
        name_sim = cls.compute_similarity(norm1, norm2)

        if not is_exact_name and name_sim < 0.92:
            return 0.0, ["Họ tên khác biệt"]

        if is_exact_name:
            reasons.append("Trùng khớp hoàn toàn họ tên chuẩn hóa")
        else:
            reasons.append(f"Độ tương đồng họ tên: {name_sim:.2f}")

        # 4. University Affiliation
        u1 = r1.get("university_id") or r1.get("universityId")
        u2 = r2.get("university_id") or r2.get("universityId")
        same_univ = (u1 == u2) and bool(u1)

        if same_univ:
            reasons.append(f"Cùng cơ sở đại học ({u1})")
        else:
            reasons.append(f"Khác cơ sở đại học ({u1} vs {u2})")

        # 5. Department / Faculty Overlap
        f1 = Normalizer.normalize_name_for_matching(r1.get("faculty") or "")
        f2 = Normalizer.normalize_name_for_matching(r2.get("faculty") or "")
        same_faculty = False
        if f1 and f2:
            f_sim = cls.compute_similarity(f1, f2)
            if f_sim > 0.7:
                same_faculty = True
                reasons.append("Cùng chuyên khoa/đơn vị đào tạo")

        # Score determination
        if is_exact_name:
            if same_univ:
                score = 0.98 if same_faculty else 0.92
            else:
                score = 0.75
                if same_faculty:
                    score += 0.15
        else:
            score = 0.70 if same_univ else 0.50

        return min(round(score, 2), 0.99), reasons

    @classmethod
    def merge_two_records(cls, primary: Dict[str, Any], secondary: Dict[str, Any]) -> Dict[str, Any]:
        """Merges secondary record into primary record preserving all evidence."""
        merged = dict(primary)

        # Merge source URLs
        srcs = list(dict.fromkeys(
            (primary.get("source_urls") or primary.get("sourceUrls") or [])
            + (secondary.get("source_urls") or secondary.get("sourceUrls") or [])
        ))
        merged["source_urls"] = srcs

        # Merge profile URLs
        p_urls = list(dict.fromkeys(
            (primary.get("official_profile_urls") or primary.get("officialProfileUrls") or [])
            + (secondary.get("official_profile_urls") or secondary.get("officialProfileUrls") or [])
        ))
        merged["official_profile_urls"] = p_urls

        # Prefer non-empty avatar
        if not merged.get("avatar") and secondary.get("avatar"):
            merged["avatar"] = secondary["avatar"]

        # Prefer higher rank / degree
        if not merged.get("academic_rank") and secondary.get("academic_rank"):
            merged["academic_rank"] = secondary["academic_rank"]
        if not merged.get("academic_title") and secondary.get("academic_title"):
            merged["academic_title"] = secondary["academic_title"]

        # Merge identifiers
        merged_ids = dict(primary.get("identifiers", {}))
        merged_ids.update(secondary.get("identifiers", {}))
        merged["identifiers"] = merged_ids

        return merged

    @classmethod
    def deduplicate_batch(
        cls, incoming: List[Dict[str, Any]], existing: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Deduplicates incoming records against existing records using an inverted index.
        Returns (deduped_records, cross_institution_candidates).
        """
        merged_map: Dict[str, Dict[str, Any]] = {}
        candidates: List[Dict[str, Any]] = []

        # Inverted index: (family_name, given_name) -> list of record IDs
        name_block_index: Dict[Tuple[str, str], List[str]] = {}
        # Identifier index: val -> record ID
        ident_index: Dict[str, str] = {}

        def index_record(r: Dict[str, Any]):
            rid = r["id"]
            norm = Normalizer.normalize_name_for_matching(r["name"])
            words = norm.split()
            if len(words) >= 2:
                key = (words[0], words[-1])
                name_block_index.setdefault(key, []).append(rid)
            elif len(words) == 1:
                key = (words[0], words[0])
                name_block_index.setdefault(key, []).append(rid)

            for ik in ["institutionalEmail", "orcid", "scopusId", "googleScholarId", "staffCode"]:
                val = r.get("identifiers", {}).get(ik)
                if val:
                    ident_index[str(val).lower().strip()] = rid

        for ex in existing:
            merged_map[ex["id"]] = ex
            index_record(ex)

        for new_rec in incoming:
            matched_id: Optional[str] = None
            highest_score = 0.0
            best_reasons: List[str] = []

            cand_ids: Set[str] = set()

            # 1. Identifier match candidates
            for ik in ["institutionalEmail", "orcid", "scopusId", "googleScholarId", "staffCode"]:
                val = new_rec.get("identifiers", {}).get(ik)
                if val and str(val).lower().strip() in ident_index:
                    cand_ids.add(ident_index[str(val).lower().strip()])

            # 2. Name block candidates
            norm = Normalizer.normalize_name_for_matching(new_rec["name"])
            words = norm.split()
            if len(words) >= 2:
                key = (words[0], words[-1])
                cand_ids.update(name_block_index.get(key, []))
            elif len(words) == 1:
                key = (words[0], words[0])
                cand_ids.update(name_block_index.get(key, []))

            for ex_id in cand_ids:
                if ex_id not in merged_map:
                    continue
                score, reasons = cls.compare_records(new_rec, merged_map[ex_id])
                if score > highest_score:
                    highest_score = score
                    matched_id = ex_id
                    best_reasons = reasons

            # Case A: Same record within same institution
            if highest_score >= 0.88 and matched_id:
                ex_rec = merged_map[matched_id]
                u1 = ex_rec.get("university_id") or ex_rec.get("universityId")
                u2 = new_rec.get("university_id") or new_rec.get("universityId")
                if u1 == u2:
                    merged = cls.merge_two_records(ex_rec, new_rec)
                    merged_map[matched_id] = merged
                    index_record(merged)
                    continue

            # Case B: Cross-institution candidate (similar name, different university)
            if highest_score >= 0.65 and matched_id:
                ex_rec = merged_map[matched_id]
                cand = {
                    "id": f"cand-{new_rec['id']}-{ex_rec['id']}",
                    "source_professor_id": new_rec["id"],
                    "candidate_professor_id": ex_rec["id"],
                    "source_name": new_rec["name"],
                    "candidate_name": ex_rec["name"],
                    "source_university": new_rec.get("university_name") or new_rec.get("universityId"),
                    "candidate_university": ex_rec.get("university_name") or ex_rec.get("universityId"),
                    "match_score": highest_score,
                    "match_reasons": best_reasons,
                    "status": "pending",
                    "detected_at": int(time.time() * 1000),
                }
                candidates.append(cand)
                # Keep separate
                merged_map[new_rec["id"]] = new_rec
                index_record(new_rec)
            else:
                # Case C: Distinct record
                merged_map[new_rec["id"]] = new_rec
                index_record(new_rec)

        return list(merged_map.values()), candidates
