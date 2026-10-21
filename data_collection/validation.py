"""Strict Validation and Quality Gate Module for RateUrProfs Collection Pipeline."""

from __future__ import annotations
import re
from typing import Optional, Tuple, Dict, Any, List
from data_collection.normalization import Normalizer


class RecordValidator:
    """Validates extracted professor and university records to guarantee zero fabrication."""

    NON_HUMAN_KEYWORDS = {
        "văn bản", "liên quan", "đội ngũ", "công khai", "tin tức", "thông báo",
        "chi tiết", "xem thêm", "đọc tiếp", "học kỳ", "năm học", "liên hệ",
        "giới thiệu", "chương trình", "đào tạo", "tuyển sinh", "nghiên cứu",
        "quy chế", "kế hoạch", "hoạt động", "sự kiện", "trang chủ", "menu",
        "footer", "header", "quy định", "hướng dẫn", "báo cáo", "tổ chức",
        "nhiệm vụ", "hội đồng", "phòng ban", "trung tâm", "ban giám hiệu",
        "danh sách", "bổ nhiệm", "tiêu chuẩn", "quyết định", "thông tin",
        "khen thưởng", "kỷ luật", "tài chính", "hợp tác", "quốc tế",
        "khoa học công nghệ", "nhiệm kỳ", "đảng ủy", "công đoàn", "đoàn thanh niên",
        "biểu mẫu", "tải về", "download", "click here", "read more", "view all",
        "contact us", "about us", "home", "search", "tìm kiếm", "sơ đồ",
        "chức năng", "cơ cấu tổ chức", "lịch công tác", "lịch tuần", "tin vắn",
        "bản tin", "chào mừng", "welcome", "tin nổi bật", "tin mới", "bài viết",
        "bình luận", "tag", "chuyên mục", "số trang", "chuyển trang", "page", "next", "previous",
        "cán bộ lớp", "lớp trưởng", "bí thư lớp", "chuyên ngành", "học phần", "môn học",
        "tín chỉ", "đầu sách", "giáo trình", "bài giảng", "đề cương", "tham khảo",
        "họ và tên", "số cmnd", "cccd", "thời gian", "địa điểm", "ghi chú",
        "chuẩn đầu ra", "khung chương trình", "mã ngành", "nộp hồ sơ", "xét tuyển",
        "nhập học", "hạn nộp", "lý lịch khoa học", "phiếu đăng ký", "kỳ học",
        "bulletin", "journal", "proceedings", "transactions", "reviews", "tạp chí",
        "kỷ yếu", "chuyên san", "bản tin", "kiểm nghiệm", "vận hành máy", "haccp"
    }

    # Common Vietnamese family names (representing >95% of national population)
    COMMON_VIETNAMESE_SURNAMES = {
        "nguyen", "tran", "le", "pham", "hoang", "huynh", "phan", "vu", "vo",
        "dang", "bui", "do", "ho", "ngo", "duong", "ly", "dinh", "doan", "lam",
        "mai", "trinh", "dao", "cao", "ha", "luu", "luong", "thai", "chau",
        "ta", "phung", "to", "vuong", "van", "tong", "truong", "dieu", "quach",
        "chu", "nham", "tang", "khuu", "tu", "la", "khuu", "phi", "khong"
    }

    @classmethod
    def is_valid_human_name(cls, raw_name: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if raw_name represents an authentic human name in Vietnam.
        Returns (is_valid, rejection_reason).
        """
        if not raw_name or not isinstance(raw_name, str):
            return False, "Tên rỗng hoặc không phải chuỗi ký tự"

        if re.search(r"https?://|www\.|\.vn/|\.com|\.edu", raw_name, re.I):
            return False, "Tên chứa đường dẫn URL hoặc tên miền web"

        clean_name = Normalizer.strip_academic_titles(raw_name)
        if len(clean_name) < 4:
            return False, f"Độ dài tên quá ngắn (< 4 ký tự): '{clean_name}'"

        lower_name = clean_name.lower()

        # 1. Check for navigation/document blacklist keywords
        for kw in cls.NON_HUMAN_KEYWORDS:
            if kw in lower_name:
                return False, f"Chứa từ khóa điều hướng/tài liệu phi cá nhân: '{kw}'"

        # 2. Tokenize into words
        words = clean_name.split()
        if len(words) < 2:
            return False, f"Tên quá ngắn (< 2 từ): '{clean_name}'"
        if len(words) > 6:
            return False, f"Tên quá dài (> 6 từ, nghi vấn văn bản): '{clean_name}'"

        # 3. Check for invalid symbols, digits, punctuation
        if re.search(r"[\d@#$%^*_+=\[\]{}|<>\\]", clean_name):
            return False, f"Tên chứa ký tự đặc biệt hoặc số: '{clean_name}'"

        # 4. Check that words have valid letters
        for w in words:
            if not w[0].isupper() and not w[0].isalpha():
                return False, f"Từ không viết hoa chuẩn tên người: '{w}'"

        # 5. Check surname plausibility
        norm_name = Normalizer.normalize_name_for_matching(clean_name)
        norm_words = norm_name.split()
        if not norm_words:
            return False, "Tên chuẩn hóa rỗng"

        # In Vietnamese names, the first word is the family name
        first_token = norm_words[0]
        # We permit all reasonably formed 2-6 word names, but flag obvious nonsense
        if len(first_token) < 2:
            return False, f"Họ không hợp lệ: '{first_token}'"

        return True, None

    @classmethod
    def validate_email(cls, email: Optional[str]) -> Optional[str]:
        """Validates and standardizes institutional email."""
        if not email:
            return None
        clean = email.strip().lower()
        # Basic email regex
        if re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", clean):
            return clean
        return None

    @classmethod
    def validate_url(cls, url: Optional[str]) -> Optional[str]:
        """Validates HTTP/HTTPS URL format."""
        if not url:
            return None
        clean = url.strip()
        if clean.startswith("http://") or clean.startswith("https://"):
            return clean
        return None

    @classmethod
    def validate_professor_record(cls, record_dict: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validates entire professor record dictionary before persistent storage.
        Ensures strict data integrity, zero fabrication, and mandatory provenance.
        """
        errors = []

        # Name
        name = record_dict.get("name")
        is_human, reason = cls.is_valid_human_name(name or "")
        if not is_human:
            errors.append(f"Invalid name: {reason}")

        # University ID
        uni_id = record_dict.get("university_id") or record_dict.get("universityId")
        if not uni_id:
            errors.append("Missing mandatory university_id")

        # Provenance source URLs
        sources = (
            record_dict.get("source_urls")
            or record_dict.get("sourceUrls")
            or record_dict.get("official_profile_urls")
            or record_dict.get("officialProfileUrls")
        )
        if not sources or len(sources) == 0:
            errors.append("Record has no source URL provenance")

        return len(errors) == 0, errors
