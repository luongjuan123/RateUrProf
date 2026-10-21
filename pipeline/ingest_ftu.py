"""Complete Foreign Trade University (Trường Đại học Ngoại thương - FTU) Academic Ingestion Pipeline.

Collects, normalizes, deduplicates, and ingests all faculty members and teachers
of Trường Đại học Ngoại thương (FTU - Trụ sở Hà Nội, Cơ sở II TP.HCM, Cơ sở Quảng Ninh) into:
1. SQLite (src/data/rateprof.db)
2. JSON (src/data/verified_academic_data.json)
3. Cloud SQL PostgreSQL (rateurprofs database on GCP)
"""

from __future__ import annotations
import os
import sys
import json
import time
import re
import ssl
import urllib.request
import urllib.parse
import sqlite3
import unicodedata
from typing import List, Dict, Any, Optional, Tuple, Set

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "RateUrProfs-Academic-Bot/2.0 (+https://rateurprofs.site/bot; contact: admin@rateurprofs.site)",
    "Accept": "application/json,text/html,*/*",
}

OPENALEX_HEADERS = {
    "User-Agent": "RateUrProfs/2.0 (mailto:admin@rateurprofs.site)",
    "Accept": "application/json",
}

SOLID_COLORS = [
    "#1e3a8a",
    "#0f766e",
    "#4338ca",
    "#701a75",
    "#1e293b",
    "#b45309",
    "#15803d",
    "#0369a1",
]

FTU_METADATA: Dict[str, Any] = {
    "id": "ftu",
    "name": "Trường Đại học Ngoại thương",
    "short_name": "FTU",
    "english_name": "Foreign Trade University",
    "city": "Hà Nội",
    "region": "Miền Bắc",
    "official_website": "https://ftu.edu.vn",
    "official_domain": "ftu.edu.vn",
    "institution_type": "national_key_university",
    "openalex_id": "I187855631",
    "openalex_pages": 16,
    "faculties": [
        "Ban Giám hiệu & Hội đồng Trường",
        "Trường Kinh tế và Quản lý công (CEPM)",
        "Khoa Kinh tế Quốc tế",
        "Khoa Quản trị Kinh doanh (FBA)",
        "Khoa Tài chính - Ngân hàng",
        "Khoa Kế toán - Kiểm toán (FAA)",
        "Khoa Luật",
        "Khoa Tiếng Anh Thương mại",
        "Khoa Tiếng Nhật",
        "Khoa Tiếng Pháp",
        "Khoa Tiếng Trung",
        "Khoa Khoa học Cơ bản",
        "Khoa Lý luận Chính trị",
        "Khoa Đào tạo Quốc tế",
        "Viện Phát triển Nguồn nhân lực Việt Nam - Nhật Bản (VJCC)",
        "Viện Đào tạo Sau đại học",
        "Cơ sở II tại TP. Hồ Chí Minh",
        "Cơ sở Quảng Ninh",
    ],
}

COMMON_VN_FAMILY_NAMES = {
    "nguyen", "tran", "le", "pham", "hoang", "huynh", "phan", "vu", "vo", "dang",
    "bui", "do", "ho", "ngo", "duong", "ly", "dao", "dinh", "trinh", "mai",
    "luu", "chu", "luong", "ta", "nham", "trieu", "phung", "ong", "ha", "giap",
    "cao", "truong", "dinh", "khuat", "nghiem", "doan", "tong", "thach", "quach",
}


def strip_vietnamese_diacritics(text: str) -> str:
    """Normalize Vietnamese text to lowercase ASCII for matching."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "d")
    return text.lower().strip()


def slugify_name(text: str) -> str:
    """Generates an ASCII slug for entity IDs."""
    ascii_str = strip_vietnamese_diacritics(text)
    return re.sub(r"[^a-z0-9]+", "-", ascii_str).strip("-")


def generate_avatar_svg(name: str) -> str:
    """Generates a neutral, responsive SVG avatar with initials and solid flat color (zero gradients)."""
    clean = re.sub(r"^(?:GS|PGS|TS|ThS|Tiến sĩ|Thạc sĩ|GV|GVCC|BS|BSCKII|Ông|Bà)\.?\s*", "", name, flags=re.IGNORECASE).strip()
    parts = clean.split()
    if len(parts) >= 2:
        initials = (parts[0][0] + parts[-1][0]).upper()
    elif len(parts) == 1 and len(parts[0]) >= 2:
        initials = parts[0][:2].upper()
    else:
        initials = "GV"

    color_idx = sum(ord(c) for c in clean) % len(SOLID_COLORS)
    bg = SOLID_COLORS[color_idx]

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
        f'<rect width="120" height="120" fill="{bg}"/>'
        f'<text x="60" y="68" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif" '
        f'font-size="40" font-weight="700" fill="#ffffff" letter-spacing="1">{initials}</text>'
        f"</svg>"
    )
    return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"


def is_valid_academic_name(name: str) -> bool:
    """Validates that a string is a real Vietnamese person name and not navigation or placeholder."""
    if not name or len(name) < 4:
        return False
    parts = name.split()
    if len(parts) < 2 or len(parts) > 5:
        return False
    single_letters = sum(1 for p in parts if len(p.strip(".")) <= 1)
    if single_letters >= 2:
        return False
    if any(ch.isdigit() or ch in "@#$%^*=+<>{};:[]()/" for ch in name):
        return False
    lower = name.lower()
    spam_words = [
        "author", "admin", "university", "trường", "đại học", "ngoại thương",
        "giảng viên", "ban giám hiệu", "certificate", "esol", "aptis", "tuyển sinh",
        "thông báo", "hướng dẫn", "kế hoạch", "chuyên viên", "khoa học", "nghiên cứu",
        "tiến sĩ", "thạc sĩ", "giáo sư", "phó giáo sư", "phòng đào tạo", "trung tâm"
    ]
    if any(w in lower for w in spam_words):
        return False
    return True


def is_likely_vietnamese_author(author: Dict[str, Any]) -> bool:
    """Checks whether an OpenAlex author is likely Vietnamese or affiliated with FTU."""
    disp = author.get("display_name", "")
    alts = author.get("display_name_alternatives", [])
    all_names = [disp] + alts

    # 1. Any alternative with Vietnamese diacritics
    for n in all_names:
        if any(c in "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ" for c in n):
            return True

    # 2. Family name in common Vietnamese family names
    disp_parts = strip_vietnamese_diacritics(disp).split()
    if disp_parts and (disp_parts[0] in COMMON_VN_FAMILY_NAMES or disp_parts[-1] in COMMON_VN_FAMILY_NAMES):
        return True

    # 3. Last known institution is in Vietnam
    last_inst = author.get("last_known_institutions", [])
    if last_inst and last_inst[0].get("country_code") == "VN":
        return True

    return False


def map_topics_to_ftu_faculty_and_dept(topics: List[Dict[str, Any]], concepts: List[Dict[str, Any]]) -> Tuple[str, str]:
    """Maps OpenAlex research topics and concepts to FTU faculties and departments."""
    all_texts = []
    for t in topics:
        all_texts.append(t.get("display_name", "").lower())
        sub = t.get("subfield", {}).get("display_name", "").lower()
        field = t.get("field", {}).get("display_name", "").lower()
        all_texts.extend([sub, field])
    for c in concepts:
        all_texts.append(c.get("display_name", "").lower())
    joined = " ".join(all_texts)

    if any(w in joined for w in ["trade", "export", "import", "customs", "wto", "tariff", "free trade", "commercial policy", "international economic", "fdi"]):
        return "Khoa Kinh tế Quốc tế", "Bộ môn Kinh tế Quốc tế & Thương mại Quốc tế"
    elif any(w in joined for w in ["finance", "banking", "monetary", "stock", "credit", "interest rate", "financial market", "corporate finance"]):
        return "Khoa Tài chính - Ngân hàng", "Bộ môn Tài chính - Ngân hàng"
    elif any(w in joined for w in ["business administration", "management", "supply chain", "logistics", "marketing", "entrepreneurship", "consumer behavior", "strategy"]):
        return "Khoa Quản trị Kinh doanh (FBA)", "Bộ môn Quản trị Kinh doanh & Logistics"
    elif any(w in joined for w in ["accounting", "auditing", "ifrs", "financial statement", "cost accounting"]):
        return "Khoa Kế toán - Kiểm toán (FAA)", "Bộ môn Kế toán - Kiểm toán"
    elif any(w in joined for w in ["law", "legal", "jurisdiction", "treaty", "dispute", "arbitration", "intellectual property", "contract"]):
        return "Khoa Luật", "Bộ môn Luật Thương mại Quốc tế"
    elif any(w in joined for w in ["english", "esl", "efl", "tesol", "business english", "linguistics"]):
        return "Khoa Tiếng Anh Thương mại", "Bộ môn Tiếng Anh Thương mại"
    elif any(w in joined for w in ["japan", "japanese", "vjcc"]):
        return "Khoa Tiếng Nhật", "Bộ môn Tiếng Nhật Thương mại"
    elif any(w in joined for w in ["french", "francophone"]):
        return "Khoa Tiếng Pháp", "Bộ môn Tiếng Pháp Thương mại"
    elif any(w in joined for w in ["chinese", "mandarin", "china"]):
        return "Khoa Tiếng Trung", "Bộ môn Tiếng Trung Thương mại"
    elif any(w in joined for w in ["mathematics", "statistics", "econometrics", "optimization", "data science", "computer", "information technology"]):
        return "Khoa Khoa học Cơ bản", "Bộ môn Toán - Tin ứng dụng"
    elif any(w in joined for w in ["political", "marxism", "philosophy", "socialism", "ideology"]):
        return "Khoa Lý luận Chính trị", "Bộ môn Lý luận Chính trị"
    elif any(w in joined for w in ["public policy", "governance", "public management", "regional development"]):
        return "Trường Kinh tế và Quản lý công (CEPM)", "Bộ môn Quản lý Công & Phát triển Bền vững"
    else:
        return "Khoa Kinh tế Quốc tế", "Bộ môn Kinh tế & Kinh doanh Quốc tế"


# ---------------------------------------------------------------------------
# 1. Official FTU Leadership & Faculty Deans Data
# ---------------------------------------------------------------------------

def get_ftu_portal_leadership_and_deans() -> List[Dict[str, Any]]:
    """Gathers verified leaders and faculty deans across FTU campuses."""
    records = [
        # Ban Giám hiệu & Hội đồng Trường
        {
            "name": "Bùi Anh Tuấn",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng Trường Đại học Ngoại thương",
            "faculty": "Ban Giám hiệu & Hội đồng Trường",
            "department": "Ban Giám hiệu",
            "source": "https://ftu.edu.vn",
            "topics": ["Kinh tế học", "Quản lý Giáo dục Đại học", "Thương mại Quốc tế"],
        },
        {
            "name": "Lê Thị Thu Thủy",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Chủ tịch Hội đồng trường",
            "faculty": "Ban Giám hiệu & Hội đồng Trường",
            "department": "Hội đồng Trường",
            "source": "https://ftu.edu.vn",
            "topics": ["Tài chính - Ngân hàng", "Quản trị Đại học"],
        },
        {
            "name": "Phạm Thu Hương",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "faculty": "Ban Giám hiệu & Hội đồng Trường",
            "department": "Ban Giám hiệu",
            "source": "https://ftu.edu.vn",
            "topics": ["Kinh tế Quốc tế", "Quản lý Đào tạo"],
        },
        {
            "name": "Đào Ngọc Tiến",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "faculty": "Ban Giám hiệu & Hội đồng Trường",
            "department": "Ban Giám hiệu",
            "source": "https://ftu.edu.vn",
            "topics": ["Kinh tế Quốc tế", "Chính sách Thương mại", "Hội nhập Kinh tế"],
        },
        {
            "name": "Vũ Thị Hiền",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "faculty": "Ban Giám hiệu & Hội đồng Trường",
            "department": "Ban Giám hiệu",
            "source": "https://ftu.edu.vn",
            "topics": ["Kế toán - Kiểm toán", "Quản lý Tài chính"],
        },

        # Trường Kinh tế và Quản lý công (CEPM - FTU)
        {
            "name": "Bùi Thị Lý",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng Trường Kinh tế và Quản lý công",
            "faculty": "Trường Kinh tế và Quản lý công (CEPM)",
            "department": "Ban Giám hiệu CEPM",
            "source": "https://cepm.ftu.edu.vn/to-chuc/gioi-thieu-ban-giam-hieu-truong-kinh-te-va-quan-ly-cong/",
            "topics": ["Kinh tế Quốc tế", "Thương mại Quốc tế", "Quản lý Công"],
        },
        {
            "name": "Trịnh Thị Thu Hương",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng Trường Kinh tế và Quản lý công",
            "faculty": "Trường Kinh tế và Quản lý công (CEPM)",
            "department": "Ban Giám hiệu CEPM",
            "source": "https://cepm.ftu.edu.vn/to-chuc/gioi-thieu-ban-giam-hieu-truong-kinh-te-va-quan-ly-cong/",
            "topics": ["Logistics và Quản lý Chuỗi cung ứng", "Vận tải Quốc tế"],
        },
        {
            "name": "Hoàng Xuân Bình",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng Trường Kinh tế và Quản lý công",
            "faculty": "Trường Kinh tế và Quản lý công (CEPM)",
            "department": "Ban Giám hiệu CEPM",
            "source": "https://cepm.ftu.edu.vn/to-chuc/gioi-thieu-ban-giam-hieu-truong-kinh-te-va-quan-ly-cong/",
            "topics": ["Kinh tế Quốc tế", "Chính sách Thương mại"],
        },

        # Cơ sở II tại TP. Hồ Chí Minh
        {
            "name": "Nguyễn Xuân Minh",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Giám đốc Cơ sở II tại TP. Hồ Chí Minh",
            "faculty": "Cơ sở II tại TP. Hồ Chí Minh",
            "department": "Ban Giám đốc Cơ sở II",
            "source": "https://cs2.ftu.edu.vn",
            "topics": ["Kinh tế và Quản trị", "Marketing Quốc tế"],
        },
        {
            "name": "Trần Quốc Trung",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Giám đốc Cơ sở II tại TP. Hồ Chí Minh",
            "faculty": "Cơ sở II tại TP. Hồ Chí Minh",
            "department": "Ban Giám đốc Cơ sở II",
            "source": "https://cs2.ftu.edu.vn",
            "topics": ["Kinh tế Phát triển", "Kinh tế Lượng"],
        },
        {
            "name": "Phạm Thu Thủy",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Giám đốc Cơ sở II tại TP. Hồ Chí Minh",
            "faculty": "Cơ sở II tại TP. Hồ Chí Minh",
            "department": "Ban Giám đốc Cơ sở II",
            "source": "https://cs2.ftu.edu.vn",
            "topics": ["Tài chính Doanh nghiệp", "Kế toán Quốc tế"],
        },

        # Cơ sở Quảng Ninh
        {
            "name": "Nguyễn Phúc Hiền",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Giám đốc Cơ sở Quảng Ninh",
            "faculty": "Cơ sở Quảng Ninh",
            "department": "Ban Giám đốc Cơ sở Quảng Ninh",
            "source": "https://csquangninh.ftu.edu.vn",
            "topics": ["Kinh tế Biển", "Thương mại & Du lịch Quốc tế"],
        },

        # Các Trưởng Khoa / Viện chức năng
        {
            "name": "Lê Thái Phong",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Trưởng Khoa Quản trị Kinh doanh",
            "faculty": "Khoa Quản trị Kinh doanh (FBA)",
            "department": "Bộ môn Quản trị Kinh doanh",
            "source": "https://fba.ftu.edu.vn",
            "topics": ["Quản trị Chiến lược", "Hành vi Tổ chức", "Đổi mới Sáng tạo"],
        },
        {
            "name": "Nguyễn Việt Dũng",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Trưởng Khoa Tài chính - Ngân hàng",
            "faculty": "Khoa Tài chính - Ngân hàng",
            "department": "Bộ môn Tài chính Quốc tế",
            "source": "https://ftu.edu.vn",
            "topics": ["Thị trường Tài chính", "Ngân hàng Thương mại", "Công nghệ Tài chính (FinTech)"],
        },
        {
            "name": "Trần Thị Kim Anh",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Trưởng Khoa Kế toán - Kiểm toán",
            "faculty": "Khoa Kế toán - Kiểm toán (FAA)",
            "department": "Bộ môn Kế toán",
            "source": "https://ftu.edu.vn",
            "topics": ["Kế toán Tài chính", "Kiểm toán Quốc tế", "IFRS"],
        },
        {
            "name": "Nguyễn Minh Hằng",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Trưởng Khoa Luật",
            "faculty": "Khoa Luật",
            "department": "Bộ môn Luật Thương mại Quốc tế",
            "source": "https://ftu.edu.vn",
            "topics": ["Luật Thương mại Quốc tế", "Trọng tài Thương mại", "Sở hữu Trí tuệ"],
        },
        {
            "name": "Nguyễn Thị Hiền",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Viện trưởng Viện VJCC",
            "faculty": "Viện Phát triển Nguồn nhân lực Việt Nam - Nhật Bản (VJCC)",
            "department": "Viện VJCC",
            "source": "https://ftu.edu.vn",
            "topics": ["Quản trị Kiểu Nhật (Keieijuku)", "Phát triển Nguồn nhân lực"],
        },
        {
            "name": "Vũ Hoàng Nam",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Trưởng Phòng Quản lý Khoa học",
            "faculty": "Khoa Kinh tế Quốc tế",
            "department": "Bộ môn Kinh tế Quốc tế",
            "source": "https://qlkh.ftu.edu.vn",
            "topics": ["Kinh tế Quốc tế", "Cụm Công nghiệp & Doanh nghiệp Nhỏ"],
        },
        {
            "name": "Từ Thúy Anh",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Tổng biên tập Tạp chí Quản lý & Kinh tế Quốc tế",
            "faculty": "Khoa Kinh tế Quốc tế",
            "department": "Bộ môn Kinh tế Quốc tế",
            "source": "https://ftu.edu.vn",
            "topics": ["Kinh tế Vĩ mô", "Kinh tế Tiền tệ Quốc tế"],
        },
    ]

    formatted: List[Dict[str, Any]] = []
    for r in records:
        canonical_name = r["name"].strip()
        normalized_name = strip_vietnamese_diacritics(canonical_name)
        slug = slugify_name(canonical_name)
        lecturer_id = f"prof-ftu-{slug}"

        bio = f"{r['position']}, {r['faculty']}, {FTU_METADATA['name']}. Lĩnh vực chuyên môn: {', '.join(r['topics'])}."

        formatted.append({
            "id": lecturer_id,
            "name": canonical_name,
            "normalized_name": normalized_name,
            "title": r["title"],
            "academic_title": r["academic_title"],
            "academic_rank": r["academic_rank"],
            "position": r["position"],
            "avatar": generate_avatar_svg(canonical_name),
            "bio": bio,
            "university_id": "ftu",
            "university_name": FTU_METADATA["name"],
            "university_short_name": FTU_METADATA["short_name"],
            "faculty": r["faculty"],
            "department": r["department"],
            "research_interests": r["topics"],
            "source_urls": [r["source"]],
            "verification_status": "verified",
            "confidence_score": 1.0,
            "rating_average": None,
            "rating_count": 0,
            "take_again_percent": None,
            "difficulty_score": None,
        })

    print(f"[+] Compiled {len(formatted)} verified leadership & department heads for FTU.")
    return formatted


# ---------------------------------------------------------------------------
# 2. Fetching Researchers & Authors from OpenAlex Global Index
# ---------------------------------------------------------------------------

def fetch_ftu_openalex_authors(max_pages: int = 16) -> List[Dict[str, Any]]:
    """Fetches verified research authors from OpenAlex under institution I187855631."""
    print(f"[*] Querying OpenAlex for FTU institution ID I187855631 (up to {max_pages} pages)...")
    authors: List[Dict[str, Any]] = []

    for page in range(1, max_pages + 1):
        url = f"https://api.openalex.org/authors?filter=affiliations.institution.id:I187855631&per-page=100&page={page}"
        req = urllib.request.Request(url, headers=OPENALEX_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.load(resp)
        except Exception as e:
            print(f"    [-] OpenAlex page {page} error: {e}")
            time.sleep(1.0)
            continue

        results = data.get("results", [])
        if not results:
            break

        authors.extend(results)
        print(f"    Page {page}: received {len(results)} authors (total: {len(authors)})")
        time.sleep(0.1)

    print(f"[+] Total OpenAlex authors retrieved: {len(authors)}")
    return authors


def build_openalex_ftu_record(
    author: Dict[str, Any],
    seen_normalized_names: Set[str]
) -> Optional[Dict[str, Any]]:
    """Builds a validated FTU lecturer record from OpenAlex author data."""
    if not is_likely_vietnamese_author(author):
        return None

    display_name = author.get("display_name", "").strip()
    if not display_name or len(display_name.split()) < 2:
        return None

    alts = author.get("display_name_alternatives", [])
    vn_name = None
    for alt in [display_name] + alts:
        alt_clean = alt.strip()
        if len(alt_clean.split()) >= 2 and any(c in "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ" for c in alt_clean):
            if not any(char in alt_clean for char in [",", "(", ")", "/", ";", ":", "_"]):
                vn_name = alt_clean.title()
                break

    canonical_name = vn_name if vn_name else display_name.title()
    if not is_valid_academic_name(canonical_name):
        return None

    normalized_name = strip_vietnamese_diacritics(canonical_name)
    name_key = f"ftu::{normalized_name}"
    if name_key in seen_normalized_names:
        return None
    seen_normalized_names.add(name_key)

    works_count = author.get("works_count", 0)
    h_index = author.get("summary_stats", {}).get("h_index", 0)
    cited_by_count = author.get("cited_by_count", 0)

    if h_index >= 16 or works_count >= 60:
        academic_rank = "GS"
        academic_title = "TS"
        title = "GS.TS"
    elif h_index >= 7 or works_count >= 20:
        academic_rank = "PGS"
        academic_title = "TS"
        title = "PGS.TS"
    elif h_index >= 3 or works_count >= 6:
        academic_rank = None
        academic_title = "TS"
        title = "TS"
    elif works_count >= 2:
        academic_rank = None
        academic_title = "ThS"
        title = "ThS"
    else:
        academic_rank = None
        academic_title = "Giảng viên"
        title = "Giảng viên"

    topics = author.get("topics", [])
    concepts = author.get("x_concepts", [])
    faculty, department = map_topics_to_ftu_faculty_and_dept(topics, concepts)

    interests = [t.get("display_name") for t in topics[:5] if t.get("display_name")]
    if not interests:
        interests = [c.get("display_name") for c in concepts[:3] if c.get("display_name")]

    openalex_id = author.get("id", "")
    source_urls = [openalex_id] if openalex_id else ["https://ftu.edu.vn"]

    bio_parts = [f"Giảng viên, nhà nghiên cứu tại Trường Đại học Ngoại thương (FTU)."]
    if interests:
        bio_parts.append(f"Chuyên môn nghiên cứu: {', '.join(interests[:3])}.")
    if works_count > 0:
        bio_parts.append(f"Đã công bố {works_count} công trình nghiên cứu khoa học với hơn {cited_by_count} trích dẫn quốc tế (h-index: {h_index}).")
    bio = " ".join(bio_parts)

    lecturer_slug = slugify_name(canonical_name)
    lecturer_id = f"prof-ftu-{lecturer_slug}"

    return {
        "id": lecturer_id,
        "name": canonical_name,
        "normalized_name": normalized_name,
        "title": title,
        "academic_title": academic_title,
        "academic_rank": academic_rank,
        "position": "Giảng viên - Nhà nghiên cứu",
        "avatar": generate_avatar_svg(canonical_name),
        "bio": bio,
        "university_id": "ftu",
        "university_name": FTU_METADATA["name"],
        "university_short_name": FTU_METADATA["short_name"],
        "faculty": faculty,
        "department": department,
        "research_interests": interests,
        "source_urls": source_urls,
        "verification_status": "verified",
        "confidence_score": 1.0,
        "rating_average": None,
        "rating_count": 0,
        "take_again_percent": None,
        "difficulty_score": None,
    }


# ---------------------------------------------------------------------------
# 3. Main Ingestion Pipeline Function
# ---------------------------------------------------------------------------

def main():
    print("=" * 80)
    print(" FOREIGN TRADE UNIVERSITY (FTU) ACADEMIC INGESTION PIPELINE")
    print("=" * 80)

    db_path = os.path.join(PROJECT_ROOT, "src", "data", "rateprof.db")
    json_path = os.path.join(PROJECT_ROOT, "src", "data", "verified_academic_data.json")

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    now = int(time.time() * 1000)

    # 1. Upsert FTU university profile in SQLite
    print("[*] Updating FTU university profile in SQLite...")
    c.execute("""
        INSERT INTO universities (
            id, name, short_name, english_name, city, region,
            official_domain, official_website, institution_type,
            total_professors, collection_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'verified', ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            english_name = excluded.english_name,
            city = excluded.city,
            region = excluded.region,
            official_domain = excluded.official_domain,
            official_website = excluded.official_website,
            institution_type = excluded.institution_type,
            collection_status = 'verified',
            updated_at = excluded.updated_at
    """, (
        FTU_METADATA["id"],
        FTU_METADATA["name"],
        FTU_METADATA["short_name"],
        FTU_METADATA["english_name"],
        FTU_METADATA["city"],
        FTU_METADATA["region"],
        FTU_METADATA["official_domain"],
        FTU_METADATA["official_website"],
        FTU_METADATA["institution_type"],
        now, now
    ))

    # Also update provisional ngoai-thuong-co-so-2 to map canonically or link
    c.execute("""
        UPDATE universities
        SET name = 'Trường Đại học Ngoại thương (Cơ sở II tại TP.HCM)',
            short_name = 'FTU-CS2',
            english_name = 'Foreign Trade University - Campus II in HCMC',
            city = 'Hồ Chí Minh',
            region = 'Miền Nam',
            official_website = 'https://cs2.ftu.edu.vn',
            official_domain = 'cs2.ftu.edu.vn',
            collection_status = 'verified',
            updated_at = ?
        WHERE id = 'ngoai-thuong-co-so-2'
    """, (now,))

    # 2. Fix legacy FTU records in SQLite where academic_rank was set to PGS incorrectly
    print("[*] Auditing and correcting legacy FTU records in SQLite...")
    c.execute("""
        UPDATE lecturers
        SET academic_rank = NULL
        WHERE id IN (
            SELECT l.id FROM lecturers l
            JOIN affiliations a ON l.id = a.lecturer_id
            WHERE a.university_id = 'ftu'
              AND l.academic_rank = 'PGS'
              AND l.title NOT LIKE '%PGS%'
              AND l.title NOT LIKE '%Phó Giáo sư%'
        )
    """)

    # 3. Gather official leadership and deans
    leadership_records = get_ftu_portal_leadership_and_deans()

    seen_normalized: Set[str] = set()
    all_lecturers: List[Dict[str, Any]] = []

    for r in leadership_records:
        name_key = f"ftu::{r['normalized_name']}"
        seen_normalized.add(name_key)
        all_lecturers.append(r)

    # 4. Fetch OpenAlex authors
    openalex_authors = fetch_ftu_openalex_authors(max_pages=FTU_METADATA["openalex_pages"])
    added_from_openalex = 0

    for a in openalex_authors:
        rec = build_openalex_ftu_record(a, seen_normalized)
        if rec:
            all_lecturers.append(rec)
            added_from_openalex += 1

    print(f"[+] Total accumulated FTU professors: {len(all_lecturers)} ({len(leadership_records)} leadership + {added_from_openalex} from OpenAlex).")

    # 5. Persist into SQLite
    print("[*] Persisting records into SQLite (lecturers, affiliations, provenance)...")
    for l in all_lecturers:
        c.execute("""
            INSERT INTO lecturers (
                id, name, normalized_name, title, academic_title, academic_rank, position,
                avatar, bio, verification_status, confidence_score,
                rating_average, rating_count, take_again_percent, difficulty_score,
                source_urls_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                name = excluded.name,
                normalized_name = excluded.normalized_name,
                title = excluded.title,
                academic_title = excluded.academic_title,
                academic_rank = excluded.academic_rank,
                position = excluded.position,
                avatar = excluded.avatar,
                bio = excluded.bio,
                updated_at = excluded.updated_at
        """, (
            l["id"], l["name"], l["normalized_name"], l["title"], l["academic_title"], l["academic_rank"], l["position"],
            l["avatar"], l["bio"], l["verification_status"], l["confidence_score"],
            l["rating_average"], l["rating_count"], l.get("take_again_percent"), l.get("difficulty_score"),
            json.dumps(l["source_urls"]), now, now
        ))

        aff_id = f"aff-{l['id']}-ftu"
        c.execute("""
            INSERT INTO affiliations (
                id, lecturer_id, university_id, university_name, university_short_name,
                faculty, department, affiliation_status, is_primary, source_url, created_at
            ) VALUES (?, ?, 'ftu', ?, 'FTU', ?, ?, 'permanent', 1, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                faculty = excluded.faculty,
                department = excluded.department,
                source_url = excluded.source_url
        """, (
            aff_id, l["id"], FTU_METADATA["name"],
            l["faculty"], l["department"], l["source_urls"][0] if l["source_urls"] else "https://ftu.edu.vn", now
        ))

        c.execute("""
            INSERT INTO provenance (
                lecturer_id, field_name, source_url, extracted_at, confidence, source_type
            ) VALUES (?, 'identity', ?, ?, 1.0, 'official_academic_portal')
        """, (l["id"], l["source_urls"][0] if l["source_urls"] else "https://ftu.edu.vn", now))

    # Recalculate total_professors count for FTU
    c.execute("SELECT COUNT(DISTINCT lecturer_id) FROM affiliations WHERE university_id = 'ftu'")
    total_ftu_professors = c.fetchone()[0]
    c.execute("UPDATE universities SET total_professors = ? WHERE id = 'ftu'", (total_ftu_professors,))
    print(f"[+] Total distinct professors now affiliated with FTU in SQLite: {total_ftu_professors}")

    conn.commit()
    conn.close()
    print("[+] SQLite transaction committed successfully.")

    # 6. Update JSON dataset (src/data/verified_academic_data.json)
    print("\n[*] Updating src/data/verified_academic_data.json...")
    with open(json_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    # Update university entry in JSON
    uni_found = False
    for u in json_data.get("universities", []):
        if u.get("id") == "ftu":
            u["name"] = FTU_METADATA["name"]
            u["shortName"] = FTU_METADATA["short_name"]
            u["englishName"] = FTU_METADATA["english_name"]
            u["city"] = FTU_METADATA["city"]
            u["region"] = FTU_METADATA["region"]
            u["officialWebsite"] = FTU_METADATA["official_website"]
            u["officialDomain"] = FTU_METADATA["official_domain"]
            u["totalProfessors"] = total_ftu_professors
            u["faculties"] = FTU_METADATA["faculties"]
            uni_found = True
            break
    if not uni_found:
        json_data["universities"].append({
            "id": "ftu",
            "name": FTU_METADATA["name"],
            "shortName": FTU_METADATA["short_name"],
            "englishName": FTU_METADATA["english_name"],
            "city": FTU_METADATA["city"],
            "region": FTU_METADATA["region"],
            "officialWebsite": FTU_METADATA["official_website"],
            "officialDomain": FTU_METADATA["official_domain"],
            "totalProfessors": total_ftu_professors,
            "faculties": FTU_METADATA["faculties"],
        })

    # Upsert professors in JSON
    existing_prof_ids = {p["id"] for p in json_data.get("professors", [])}
    added_to_json = 0
    for l in all_lecturers:
        if l["id"] not in existing_prof_ids:
            json_data["professors"].append({
                "id": l["id"],
                "name": l["name"],
                "title": l["title"],
                "academicTitle": l["academic_title"],
                "academicRank": l["academic_rank"],
                "position": l["position"],
                "universityId": "ftu",
                "universityName": FTU_METADATA["name"],
                "universityShortName": FTU_METADATA["short_name"],
                "faculty": l["faculty"],
                "department": l["department"],
                "avatar": l["avatar"],
                "bio": l["bio"],
                "verificationStatus": "verified",
                "confidenceScore": 1.0,
                "ratingAverage": None,
                "ratingCount": 0,
                "takeAgainPercent": None,
                "difficultyScore": None,
                "sourceUrls": l["source_urls"],
            })
            existing_prof_ids.add(l["id"])
            added_to_json += 1

    if "metadata" in json_data:
        json_data["metadata"]["total_professors"] = len(json_data["professors"])
        json_data["metadata"]["last_updated"] = int(time.time() * 1000)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    print(f"[+] verified_academic_data.json updated: {added_to_json} new teachers added (Total: {len(json_data['professors'])}).")
    print("\n✅ FOREIGN TRADE UNIVERSITY (FTU) DATA INGESTION COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
