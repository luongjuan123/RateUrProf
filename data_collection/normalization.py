"""Vietnamese Academic Name, Institution, and Title Normalization Module."""

from __future__ import annotations
import re
import unicodedata
from typing import Tuple, Optional


class Normalizer:
    """Robust normalizer for Vietnamese personal names, academic titles, and institutions."""

    TITLES_REGEX = re.compile(
        r"^(?:(?:gs|pgs|tskh|ts|ths|dr|prof|assoc\.?\s*prof|assos\.?\s*prof|giáo\s*sư|phó\s*giáo\s*sư|tiến\s*sĩ\s*khoa\s*học|tiến\s*sĩ|thạc\s*sĩ|kỹ\s*sư|cử\s*nhân|bác\s*sĩ|kiến\s*trúc\s*sư|kts|bs|ks|cn|ông|bà|mr|ms|mrs|m\.a)(?:\.|\b)\s*[,/]?\s*)+",
        re.IGNORECASE,
    )

    DEGREE_EXTRACTION_REGEX = re.compile(
        r"\b(GS\.?\s*TSKH|PGS\.?\s*TSKH|GS\.?\s*TS|PGS\.?\s*TS|GS|PGS|TSKH|TS\.?\s*BS|TS|ThS|BS\.?\s*CKII|BS\.?\s*CKI|BS|KS|CN)\b",
        re.IGNORECASE,
    )

    VIETNAMESE_VOWELS = "aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵ"

    @classmethod
    def strip_academic_titles(cls, name: str) -> str:
        """Strips academic prefixes (GS, PGS, TS, ThS, etc.) from a full name."""
        if not name:
            return ""
        clean = name.strip()
        cleaned = cls.TITLES_REGEX.sub("", clean).strip()
        while cleaned != clean and cleaned:
            clean = cleaned
            cleaned = cls.TITLES_REGEX.sub("", clean).strip()
        return clean.strip(" ,.-:")

    @classmethod
    def normalize_name_for_matching(cls, name: str) -> str:
        """
        Converts a Vietnamese personal name into a clean, lowercased ASCII token sequence for matching.
        E.g.: 'PGS. TS. Nguyễn Văn A' -> 'nguyen van a'
              'Đỗ Đình Đạt' -> 'do dinh dat'
        """
        clean = cls.strip_academic_titles(name)
        if not clean:
            return ""

        # Handle Vietnamese 'đ', 'Đ'
        clean = clean.replace("đ", "d").replace("Đ", "d")

        # NFD decomposition
        nfd = unicodedata.normalize("NFD", clean)
        ascii_chars = [c for c in nfd if unicodedata.category(c) != "Mn"]
        ascii_str = "".join(ascii_chars)

        # Normalize whitespace and symbols
        ascii_str = re.sub(r"[^\w\s]", " ", ascii_str)
        ascii_str = re.sub(r"\s+", " ", ascii_str).strip().lower()
        return ascii_str

    @classmethod
    def parse_academic_ranks(cls, raw_title_or_name: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Extracts (academic_rank, degree, clean_title) strictly respecting statutory ranks.
        Rank: 'GS' or 'PGS' (Instructional ranks granted by State Council).
        Degree: 'TS', 'ThS', 'BS', 'KS', 'CN'.
        """
        if not raw_title_or_name:
            return None, None, "Giảng viên"

        text = raw_title_or_name.upper()

        rank = None
        if "GS" in text or "GIÁO SƯ" in text:
            if "PGS" in text or "PHÓ GIÁO SƯ" in text:
                rank = "PGS"
            else:
                rank = "GS"

        degree = None
        if "TS" in text or "TIẾN SĨ" in text:
            degree = "TS"
        elif "THS" in text or "THẠC SĨ" in text:
            degree = "ThS"
        elif "BS" in text or "BÁC SĨ" in text:
            degree = "BS"
        elif "KS" in text or "KỸ SƯ" in text:
            degree = "KS"
        elif "CN" in text or "CỬ NHÂN" in text:
            degree = "CN"

        # Construct standard title
        parts = []
        if rank:
            parts.append(rank)
        if degree:
            parts.append(degree)

        title = ".".join(parts) if parts else "Giảng viên"
        return rank, degree, title

    @classmethod
    def normalize_department(cls, department: Optional[str]) -> Optional[str]:
        """Cleans and standardizes department/faculty name."""
        if not department:
            return None
        clean = department.strip()
        clean = re.sub(r"^(?:Khoa|Bộ môn|Bộ Môn|Ban|Viện|Phòng|Trung tâm)\s*[:\-]\s*", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean or None

    @classmethod
    def make_canonical_professor_id(cls, university_id: str, clean_name: str) -> str:
        """Generates a stable, unique professor ID from university and normalized name."""
        norm = cls.normalize_name_for_matching(clean_name)
        slug = re.sub(r"\s+", "-", norm)
        return f"prof-{university_id}-{slug}"
