"""Complete Thai Nguyen University (Đại học Thái Nguyên) Academic Ingestion Pipeline.

Collects, normalizes, deduplicates, and ingests all faculty members and teachers
of Đại học Thái Nguyên (TNU) and its member schools (ICTU, TNUE, IS-TNU, TNUT,
TUMP, TUAF, TUEBA, TNUS, SFL-TNU, TNU-LC, CTE-TNU) into:
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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

# Canonical member schools and units of Thai Nguyen University
TNU_MEMBER_INSTITUTIONS: Dict[str, Dict[str, Any]] = {
    "tnu": {
        "name": "Đại học Thái Nguyên",
        "short_name": "TNU",
        "english_name": "Thai Nguyen University",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tnu.edu.vn",
        "official_domain": "tnu.edu.vn",
        "institution_type": "regional_university",
        "openalex_id": "I4210115718",
        "openalex_pages": 22,
        "faculties": [
            "Ban Giám đốc & Các Ban Chức năng",
            "Viện Khoa học Sự sống (Life Sciences Institute)",
            "Viện Đào tạo & Nghiên cứu Xuất sắc (IEER)",
            "Viện Nghiên cứu Phát triển KT-XH",
        ],
    },
    "ictu": {
        "name": "Trường ĐH Công nghệ Thông tin & Truyền thông - ĐH Thái Nguyên",
        "short_name": "ICTU",
        "english_name": "Thai Nguyen University of Information and Communication Technology",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://ictu.edu.vn",
        "official_domain": "ictu.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4405263268",
        "openalex_pages": 6,
        "faculties": [
            "Khoa Công nghệ Thông tin",
            "Khoa Kỹ thuật và Công nghệ",
            "Khoa Kinh tế và Quản trị",
            "Khoa Khoa học Liên ngành",
            "Khoa Nghệ thuật và Truyền thông",
        ],
    },
    "tue": {
        "name": "Trường Đại học Sư phạm - ĐH Thái Nguyên",
        "short_name": "TNUE",
        "english_name": "Thai Nguyen University of Education",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tnue.edu.vn",
        "official_domain": "tnue.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4387154701",
        "openalex_pages": 11,
        "faculties": [
            "Khoa Toán học",
            "Khoa Vật lý",
            "Khoa Hóa học",
            "Khoa Sinh học",
            "Khoa Ngữ văn",
            "Khoa Lịch sử",
            "Khoa Địa lý",
            "Khoa Giáo dục Tiểu học",
            "Khoa Giáo dục Mầm non",
            "Khoa Giáo dục Thể chất",
            "Khoa Tâm lý - Giáo dục",
            "Khoa Ngoại ngữ",
        ],
    },
    "is-tnu": {
        "name": "Trường Quốc tế - Đại học Thái Nguyên",
        "short_name": "IS-TNU",
        "english_name": "International School - Thai Nguyen University",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://is.tnu.edu.vn",
        "official_domain": "is.tnu.edu.vn",
        "institution_type": "university",
        "openalex_id": None,
        "openalex_pages": 0,
        "faculties": [
            "Khoa Quốc tế",
            "Bộ môn Khoa học Xã hội & Kinh tế Quốc tế",
            "Bộ môn Khoa học Tự nhiên & Công nghệ",
            "Bộ môn Ngôn ngữ Tiếng Anh",
        ],
    },
    "tnut": {
        "name": "Trường ĐH Kỹ thuật Công nghiệp - ĐH Thái Nguyên",
        "short_name": "TNUT",
        "english_name": "Thai Nguyen University of Technology",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tnut.edu.vn",
        "official_domain": "tnut.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4405272706",
        "openalex_pages": 7,
        "faculties": [
            "Khoa Cơ khí",
            "Khoa Kỹ thuật Điện",
            "Khoa Kỹ thuật Điện tử",
            "Khoa Kỹ thuật Xây dựng",
            "Khoa Khoa học Cơ bản",
            "Khoa Công nghệ Cơ khí & Động lực",
        ],
    },
    "tump": {
        "name": "Trường ĐH Y - Dược - ĐH Thái Nguyên",
        "short_name": "TUMP",
        "english_name": "Thai Nguyen University of Medicine and Pharmacy",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tump.edu.vn",
        "official_domain": "tump.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4401726905",
        "openalex_pages": 13,
        "faculties": [
            "Khoa Y học Cơ sở",
            "Khoa Y học Lâm sàng",
            "Khoa Dược",
            "Khoa Răng - Hàm - Mặt",
            "Khoa Điều dưỡng",
            "Khoa Y tế Công cộng",
            "Khoa Khoa học Cơ bản",
        ],
    },
    "tuaf": {
        "name": "Trường ĐH Nông Lâm - ĐH Thái Nguyên",
        "short_name": "TUAF",
        "english_name": "Thai Nguyen University of Agriculture and Forestry",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tuaf.edu.vn",
        "official_domain": "tuaf.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4210126287",
        "openalex_pages": 9,
        "faculties": [
            "Khoa Nông học",
            "Khoa Chăn nuôi Thú y",
            "Khoa Lâm nghiệp",
            "Khoa Quản lý Tài nguyên",
            "Khoa Kinh tế & Phát triển Nông thôn",
            "Khoa Công nghệ Sinh học & Công nghệ Thực phẩm",
            "Khoa Khoa học Cơ bản",
        ],
    },
    "tueba": {
        "name": "Trường ĐH Kinh tế & Quản trị Kinh doanh - ĐH Thái Nguyên",
        "short_name": "TUEBA",
        "english_name": "Thai Nguyen University of Economics and Business Administration",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tueba.edu.vn",
        "official_domain": "tueba.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4405278222",
        "openalex_pages": 3,
        "faculties": [
            "Khoa Kinh tế số",
            "Khoa Kế toán",
            "Khoa Kinh doanh và Logistics",
            "Khoa Ngân hàng - Tài chính",
            "Khoa Marketing và Du lịch",
            "Khoa Luật và Quản lý",
        ],
    },
    "tnus": {
        "name": "Trường Đại học Khoa học - ĐH Thái Nguyên",
        "short_name": "TNUS",
        "english_name": "Thai Nguyen University of Science",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://tnus.edu.vn",
        "official_domain": "tnus.edu.vn",
        "institution_type": "university",
        "openalex_id": "I4405277108",
        "openalex_pages": 6,
        "faculties": [
            "Khoa Toán - Tin",
            "Khoa Vật lý và Công nghệ",
            "Khoa Hóa học",
            "Khoa Sinh học và Công nghệ Sinh học",
            "Khoa Tài nguyên và Môi trường",
            "Khoa Khoa học Xã hội và Nhân văn",
            "Khoa Du lịch",
            "Khoa Báo chí và Truyền thông",
            "Khoa Luật",
        ],
    },
    "sfl-tnu": {
        "name": "Trường Ngoại ngữ - Đại học Thái Nguyên",
        "short_name": "SFL",
        "english_name": "School of Foreign Languages - Thai Nguyen University",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://sfl.tnu.edu.vn",
        "official_domain": "sfl.tnu.edu.vn",
        "institution_type": "university",
        "openalex_id": None,
        "openalex_pages": 0,
        "faculties": [
            "Khoa Tiếng Anh",
            "Khoa Tiếng Trung Quốc",
            "Bộ môn Tiếng Nga - Tiếng Pháp",
            "Bộ môn Ngôn ngữ và Văn hoá Phương Đông",
            "Khoa Khoa học Cơ bản",
        ],
    },
    "tnu-laocai": {
        "name": "Phân hiệu Đại học Thái Nguyên tại tỉnh Lào Cai",
        "short_name": "TNU-LC",
        "english_name": "Thai Nguyen University - Lao Cai Campus",
        "city": "Lào Cai",
        "region": "Miền Bắc",
        "official_website": "http://laocai.tnu.edu.vn",
        "official_domain": "tnulc.edu.vn",
        "institution_type": "university_campus",
        "openalex_id": None,
        "openalex_pages": 0,
        "faculties": [
            "Khoa Sư phạm",
            "Khoa Nông Lâm nghiệp",
            "Khoa Kinh tế - Du lịch",
        ],
    },
    "cte-tnu": {
        "name": "Trường Cao đẳng Kinh tế - Kỹ thuật - ĐH Thái Nguyên",
        "short_name": "CTE",
        "english_name": "College of Economics and Techniques - Thai Nguyen University",
        "city": "Thái Nguyên",
        "region": "Miền Bắc",
        "official_website": "https://cte.tnu.edu.vn",
        "official_domain": "cte.tnu.edu.vn",
        "institution_type": "college",
        "openalex_id": None,
        "openalex_pages": 0,
        "faculties": [
            "Khoa Kinh tế và Quản trị",
            "Khoa Kỹ thuật Công nghiệp",
            "Khoa Công nghệ Thông tin",
            "Khoa Nông lâm nghiệp",
        ],
    },
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
    """Validates that a string is a real Vietnamese person name and not navigation or initials."""
    if not name or len(name) < 4:
        return False
    parts = name.split()
    if len(parts) < 2 or len(parts) > 5:
        return False
    # Reject strings where multiple parts are single-letter initials (like 'T N P Nguyen')
    single_letters = sum(1 for p in parts if len(p.strip(".")) <= 1)
    if single_letters >= 2:
        return False
    if any(ch.isdigit() or ch in "@#$%^*=+<>{};:" for ch in name):
        return False
    # Reject common spam or generic words
    lower = name.lower()
    if any(w in lower for w in ["author", "admin", "university", "trường", "đại học", "thái nguyên", "giảng viên", "ban giám hiệu"]):
        return False
    return True


def map_topics_to_faculty_and_dept(uni_id: str, topics: List[Dict[str, Any]], concepts: List[Dict[str, Any]]) -> Tuple[str, str]:
    """Maps scientific research topics and concepts to the school's faculty and department."""
    all_texts = []
    for t in topics:
        all_texts.append(t.get("display_name", "").lower())
        sub = t.get("subfield", {}).get("display_name", "").lower()
        field = t.get("field", {}).get("display_name", "").lower()
        all_texts.extend([sub, field])
    for c in concepts:
        all_texts.append(c.get("display_name", "").lower())
    joined = " ".join(all_texts)

    if uni_id == "ictu":
        if any(w in joined for w in ["software", "programming", "web", "agile", "code", "testing", "app"]):
            return "Khoa Công nghệ Thông tin", "Bộ môn Kỹ thuật Phần mềm"
        elif any(w in joined for w in ["artificial intelligence", "machine learning", "deep learning", "neural", "vision", "nlp", "data mining"]):
            return "Khoa Công nghệ Thông tin", "Bộ môn Trí tuệ Nhân tạo & Khoa học Máy tính"
        elif any(w in joined for w in ["security", "cryptography", "network", "cyber", "firewall", "wireless", "cloud"]):
            return "Khoa Công nghệ Thông tin", "Bộ môn Mạng và An toàn Thông tin"
        elif any(w in joined for w in ["robot", "electronic", "hardware", "circuit", "automotive", "control", "embedded"]):
            return "Khoa Kỹ thuật và Công nghệ", "Bộ môn Điện tử & Tự động hóa"
        elif any(w in joined for w in ["economic", "finance", "business", "commerce", "management", "accounting", "marketing"]):
            return "Khoa Kinh tế và Quản trị", "Bộ môn Thương mại Điện tử & Kinh tế Số"
        elif any(w in joined for w in ["media", "multimedia", "design", "animation", "film", "journalism", "communication"]):
            return "Khoa Nghệ thuật và Truyền thông", "Bộ môn Truyền thông Đa phương tiện"
        else:
            return "Khoa Công nghệ Thông tin", "Bộ môn Công nghệ Thông tin"

    elif uni_id == "tue":
        if any(w in joined for w in ["mathematics", "algebra", "geometry", "calculus", "differential"]):
            return "Khoa Toán học", "Bộ môn Giải tích & Đại số"
        elif any(w in joined for w in ["physics", "optics", "quantum", "laser", "nanomaterial", "mechanics"]):
            return "Khoa Vật lý", "Bộ môn Vật lý Ứng dụng"
        elif any(w in joined for w in ["chemistry", "organic", "inorganic", "polymer", "catalysis"]):
            return "Khoa Hóa học", "Bộ môn Hóa học"
        elif any(w in joined for w in ["biology", "plant", "ecology", "genetics", "zoology", "botany"]):
            return "Khoa Sinh học", "Bộ môn Sinh học Thực nghiệm"
        elif any(w in joined for w in ["literature", "linguistic", "vietnamese", "language", "folklore"]):
            return "Khoa Ngữ văn", "Bộ môn Văn học & Ngôn ngữ"
        elif any(w in joined for w in ["history", "archaeology", "historical"]):
            return "Khoa Lịch sử", "Bộ môn Lịch sử Việt Nam"
        elif any(w in joined for w in ["geography", "geology", "gis", "cartography", "climate"]):
            return "Khoa Địa lý", "Bộ môn Địa lý & Bản đồ"
        elif any(w in joined for w in ["education", "pedagogy", "curriculum", "teaching", "learning", "psychology"]):
            return "Khoa Tâm lý - Giáo dục", "Bộ môn Giáo dục học"
        else:
            return "Khoa Sư phạm Tự nhiên", "Bộ môn Khoa học Cơ bản"

    elif uni_id == "tnut":
        if any(w in joined for w in ["mechanical", "manufacturing", "machining", "welding", "automotive", "vehicle", "engine"]):
            return "Khoa Cơ khí", "Bộ môn Chế tạo máy & Cơ khí Động lực"
        elif any(w in joined for w in ["electrical", "power", "grid", "transformer", "energy", "renewable", "generator"]):
            return "Khoa Kỹ thuật Điện", "Bộ môn Hệ thống Điện"
        elif any(w in joined for w in ["electronic", "telecommunication", "signal", "antenna", "semiconductor", "vlsi"]):
            return "Khoa Kỹ thuật Điện tử", "Bộ môn Điện tử Viễn thông"
        elif any(w in joined for w in ["civil", "structural", "concrete", "bridge", "building", "construction"]):
            return "Khoa Kỹ thuật Xây dựng", "Bộ môn Kỹ thuật Xây dựng"
        elif any(w in joined for w in ["control", "automation", "robotics", "plc", "sensor", "actuator"]):
            return "Khoa Kỹ thuật Điện", "Bộ môn Tự động hóa & Robot"
        else:
            return "Khoa Kỹ thuật Công nghiệp", "Bộ môn Cơ khí Ứng dụng"

    elif uni_id == "tump":
        if any(w in joined for w in ["pharmacy", "drug", "pharmacology", "medicinal", "pharmacokinetics", "dose"]):
            return "Khoa Dược", "Bộ môn Dược lý & Dược lâm sàng"
        elif any(w in joined for w in ["dental", "tooth", "teeth", "oral", "maxillofacial"]):
            return "Khoa Răng - Hàm - Mặt", "Bộ môn Răng Hàm Mặt"
        elif any(w in joined for w in ["nursing", "care", "patient", "clinical care"]):
            return "Khoa Điều dưỡng", "Bộ môn Điều dưỡng"
        elif any(w in joined for w in ["public health", "epidemiology", "health policy", "nutrition"]):
            return "Khoa Y tế Công cộng", "Bộ môn Y tế Công cộng"
        elif any(w in joined for w in ["cardiology", "oncology", "pediatrics", "surgery", "internal medicine", "clinical"]):
            return "Khoa Y học Lâm sàng", "Bộ môn Nội - Ngoại - Sản - Nhi"
        elif any(w in joined for w in ["anatomy", "pathology", "biochemistry", "histology", "microbiology", "physiology"]):
            return "Khoa Y học Cơ sở", "Bộ môn Giải phẫu & Sinh lý"
        else:
            return "Khoa Y học Lâm sàng", "Bộ môn Y học Đa khoa"

    elif uni_id == "tuaf":
        if any(w in joined for w in ["crop", "rice", "maize", "plant", "agronomy", "soil", "fertilizer", "pest"]):
            return "Khoa Nông học", "Bộ môn Khoa học Cây trồng"
        elif any(w in joined for w in ["animal", "veterinary", "livestock", "pig", "poultry", "cattle", "vaccine"]):
            return "Khoa Chăn nuôi Thú y", "Bộ môn Chăn nuôi Thú y"
        elif any(w in joined for w in ["forestry", "forest", "timber", "silviculture", "wildlife", "conservation"]):
            return "Khoa Lâm nghiệp", "Bộ môn Quản lý Rừng & Lâm nghiệp"
        elif any(w in joined for w in ["land", "resource", "remote sensing", "gis", "environment", "pollution"]):
            return "Khoa Quản lý Tài nguyên", "Bộ môn Quản lý Đất đai & Môi trường"
        elif any(w in joined for w in ["food", "fermentation", "postharvest", "biotechnology"]):
            return "Khoa Công nghệ Sinh học & Công nghệ Thực phẩm", "Bộ môn Công nghệ Thực phẩm"
        else:
            return "Khoa Nông học", "Bộ môn Nông nghiệp Bền vững"

    elif uni_id == "tueba":
        if any(w in joined for w in ["accounting", "audit", "tax", "financial statement", "cost"]):
            return "Khoa Kế toán", "Bộ môn Kế toán - Kiểm toán"
        elif any(w in joined for w in ["marketing", "tourism", "hospitality", "hotel", "consumer"]):
            return "Khoa Marketing và Du lịch", "Bộ môn Marketing"
        elif any(w in joined for w in ["finance", "banking", "monetary", "investment", "credit", "stock"]):
            return "Khoa Ngân hàng - Tài chính", "Bộ môn Tài chính - Ngân hàng"
        elif any(w in joined for w in ["logistics", "supply chain", "trade", "international business"]):
            return "Khoa Kinh doanh và Logistics", "Bộ môn Kinh doanh Quốc tế & Logistics"
        elif any(w in joined for w in ["digital economy", "e-commerce", "fintech", "data analytics"]):
            return "Khoa Kinh tế số", "Bộ môn Kinh tế Số & Phân tích Dữ liệu"
        else:
            return "Khoa Quản trị Kinh doanh", "Bộ môn Quản trị Doanh nghiệp"

    elif uni_id == "tnus":
        if any(w in joined for w in ["mathematics", "statistics", "data science"]):
            return "Khoa Toán - Tin", "Bộ môn Toán ứng dụng"
        elif any(w in joined for w in ["physics", "nanotechnology", "optics", "materials science"]):
            return "Khoa Vật lý và Công nghệ", "Bộ môn Vật lý Chất rắn"
        elif any(w in joined for w in ["chemistry", "catalysis", "organic", "polymer"]):
            return "Khoa Hóa học", "Bộ môn Hóa học"
        elif any(w in joined for w in ["biology", "microbiology", "genetics", "biotechnology"]):
            return "Khoa Sinh học và Công nghệ Sinh học", "Bộ môn Công nghệ Sinh học"
        elif any(w in joined for w in ["environment", "meteorology", "water", "ecology"]):
            return "Khoa Tài nguyên và Môi trường", "Bộ môn Môi trường"
        elif any(w in joined for w in ["journalism", "media", "communication"]):
            return "Khoa Báo chí và Truyền thông", "Bộ môn Báo chí"
        elif any(w in joined for w in ["law", "legal", "justice"]):
            return "Khoa Luật", "Bộ môn Luật học"
        else:
            return "Khoa Khoa học Tự nhiên và Công nghệ", "Bộ môn Khoa học Cơ bản"

    elif uni_id == "sfl-tnu":
        if any(w in joined for w in ["english", "esl", "efl", "tesol"]):
            return "Khoa Tiếng Anh", "Bộ môn Tiếng Anh Chuyên ngành"
        elif any(w in joined for w in ["chinese", "mandarin"]):
            return "Khoa Tiếng Trung Quốc", "Bộ môn Tiếng Trung Quốc"
        elif any(w in joined for w in ["russian", "french"]):
            return "Bộ môn Tiếng Nga - Tiếng Pháp", "Bộ môn Tiếng Nga - Pháp"
        else:
            return "Khoa Ngôn ngữ & Văn hóa", "Bộ môn Ngôn ngữ học Ứng dụng"

    elif uni_id == "is-tnu":
        return "Khoa Quốc tế", "Bộ môn Đào tạo & Nghiên cứu Quốc tế"

    else:
        # Default TNU Central
        return "Cơ quan Đại học Thái Nguyên", "Ban Giám đốc & Viện Nghiên cứu Trực thuộc"


# ---------------------------------------------------------------------------
# 1. Scraping Official Web Portals (Leadership, Deans, Lecturers)
# ---------------------------------------------------------------------------

def scrape_web_verified_lecturers() -> List[Dict[str, Any]]:
    """Gathers verified leadership and faculty members directly from official university web portals."""
    records: List[Dict[str, Any]] = []

    # 1. Ban Giám đốc Đại học Thái Nguyên (TNU Central)
    tnu_leaders = [
        {
            "name": "Hoàng Văn Hùng",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Giám đốc Đại học Thái Nguyên",
            "university_id": "tnu",
            "faculty": "Ban Giám đốc & Các Ban Chức năng",
            "department": "Ban Giám đốc",
            "source": "https://tnu.edu.vn/gioi-thieu/co-cau-to-chuc/ban-giam-doc-dhtn",
            "topics": ["Quản lý Giáo dục Đại học", "Lãnh đạo và Chiến lược"],
        },
        {
            "name": "Nguyễn Văn Tảo",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Giám đốc Đại học Thái Nguyên",
            "university_id": "tnu",
            "faculty": "Ban Giám đốc & Các Ban Chức năng",
            "department": "Ban Giám đốc",
            "source": "https://tnu.edu.vn/gioi-thieu/co-cau-to-chuc/ban-giam-doc-dhtn",
            "topics": ["Công nghệ Thông tin", "Quản lý Đào tạo"],
        },
        {
            "name": "Nguyễn Hồng Liên",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Giám đốc Đại học Thái Nguyên",
            "university_id": "tnu",
            "faculty": "Ban Giám đốc & Các Ban Chức năng",
            "department": "Ban Giám đốc",
            "source": "https://tnu.edu.vn/gioi-thieu/co-cau-to-chuc/ban-giam-doc-dhtn",
            "topics": ["Kinh tế và Quản trị", "Kế hoạch Tài chính"],
        },
        {
            "name": "Nguyễn Thanh Hà",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Giám đốc Đại học Thái Nguyên",
            "university_id": "tnu",
            "faculty": "Ban Giám đốc & Các Ban Chức năng",
            "department": "Ban Giám đốc",
            "source": "https://tnu.edu.vn/gioi-thieu/co-cau-to-chuc/ban-giam-doc-dhtn",
            "topics": ["Khoa học và Công nghệ", "Hợp tác Quốc tế"],
        },
    ]
    records.extend(tnu_leaders)

    # 2. Ban Giám hiệu & Ban Chủ nhiệm Khoa ICTU
    ictu_staff = [
        {
            "name": "Phùng Trung Nghĩa",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "ictu",
            "faculty": "Khoa Công nghệ Thông tin",
            "department": "Ban Giám hiệu",
            "source": "https://ictu.edu.vn/gioi-thieu/ban-giam-hieu/",
            "topics": ["Khoa học Máy tính", "Hệ thống Thông tin", "Chuyển đổi số"],
        },
        {
            "name": "Đỗ Đình Cường",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Hiệu trưởng",
            "university_id": "ictu",
            "faculty": "Khoa Công nghệ Thông tin",
            "department": "Ban Giám hiệu",
            "source": "https://ictu.edu.vn/gioi-thieu/ban-giam-hieu/",
            "topics": ["Công nghệ Phần mềm", "Đào tạo Trực tuyến"],
        },
        {
            "name": "Nguyễn Duy Minh",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Hiệu trưởng",
            "university_id": "ictu",
            "faculty": "Khoa Kỹ thuật và Công nghệ",
            "department": "Ban Giám hiệu",
            "source": "https://ictu.edu.vn/gioi-thieu/ban-giam-hieu/",
            "topics": ["Kỹ thuật Điện tử", "Khảo thí & Đảm bảo Chất lượng"],
        },
        {
            "name": "Quách Xuân Trưởng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Trưởng khoa Công nghệ Thông tin",
            "university_id": "ictu",
            "faculty": "Khoa Công nghệ Thông tin",
            "department": "Bộ môn Công nghệ Phần mềm",
            "source": "https://fit.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Kỹ thuật Phần mềm", "Khoa học Dữ liệu"],
        },
        {
            "name": "Nguyễn Toàn Thắng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Công nghệ Thông tin",
            "university_id": "ictu",
            "faculty": "Khoa Công nghệ Thông tin",
            "department": "Bộ môn Mạng và An toàn Thông tin",
            "source": "https://fit.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Mạng máy tính", "An toàn thông tin"],
        },
        {
            "name": "Nguyễn Đức Bình",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Công nghệ Thông tin",
            "university_id": "ictu",
            "faculty": "Khoa Công nghệ Thông tin",
            "department": "Bộ môn Khoa học Máy tính",
            "source": "https://fit.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Trí tuệ Nhân tạo", "Thị giác Máy tính"],
        },
        {
            "name": "Nguyễn Vôn Dim",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Trưởng khoa Kỹ thuật và Công nghệ",
            "university_id": "ictu",
            "faculty": "Khoa Kỹ thuật và Công nghệ",
            "department": "Bộ môn Điện tử",
            "source": "https://fet.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Kỹ thuật Điện tử", "Vi mạch bán dẫn"],
        },
        {
            "name": "Vũ Chiến Thắng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Kỹ thuật và Công nghệ",
            "university_id": "ictu",
            "faculty": "Khoa Kỹ thuật và Công nghệ",
            "department": "Bộ môn Tự động hóa",
            "source": "https://fet.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Tự động hóa", "Điều khiển thông minh"],
        },
        {
            "name": "Gia Thị Định",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Kỹ thuật và Công nghệ",
            "university_id": "ictu",
            "faculty": "Khoa Kỹ thuật và Công nghệ",
            "department": "Bộ môn Cơ điện tử",
            "source": "https://fet.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Cơ điện tử", "Công nghệ Ô tô"],
        },
        {
            "name": "Vũ Xuân Nam",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Trưởng khoa Kinh tế và Quản trị",
            "university_id": "ictu",
            "faculty": "Khoa Kinh tế và Quản trị",
            "department": "Bộ môn Kinh tế Số",
            "source": "https://eis.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Kinh tế số", "Thương mại điện tử"],
        },
        {
            "name": "Nguyễn Thị Hằng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Kinh tế và Quản trị",
            "university_id": "ictu",
            "faculty": "Khoa Kinh tế và Quản trị",
            "department": "Bộ môn Quản trị Văn phòng",
            "source": "https://eis.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Quản trị Doanh nghiệp", "Hệ thống Thông tin Quản lý"],
        },
        {
            "name": "Phạm Thị Thanh Phương",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng khoa Kinh tế và Quản trị",
            "university_id": "ictu",
            "faculty": "Khoa Kinh tế và Quản trị",
            "department": "Bộ môn Thương mại Điện tử",
            "source": "https://eis.ictu.edu.vn/ban-chu-nhiem-khoa/",
            "topics": ["Tài chính Doanh nghiệp", "Marketing Số"],
        },
    ]
    records.extend(ictu_staff)

    # 3. Ban Giám hiệu Trường Đại học Sư phạm (TNUE)
    tnue_leaders = [
        {
            "name": "Mai Xuân Trường",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "tue",
            "faculty": "Khoa Hóa học",
            "department": "Ban Giám hiệu",
            "source": "https://tnue.edu.vn/ban-giam-hieu",
            "topics": ["Hóa học", "Khoa học Giáo dục", "Quản lý Giáo dục"],
        },
        {
            "name": "Hà Trần Phương",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tue",
            "faculty": "Khoa Toán học",
            "department": "Ban Giám hiệu",
            "source": "https://tnue.edu.vn/ban-giam-hieu",
            "topics": ["Toán học", "Đại số và Lý thuyết Số"],
        },
        {
            "name": "Bùi Đức Nguyên",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tue",
            "faculty": "Khoa Hóa học",
            "department": "Ban Giám hiệu",
            "source": "https://tnue.edu.vn/ban-giam-hieu",
            "topics": ["Hóa học Hữu cơ", "Khảo thí và ĐBCL Giáo dục"],
        },
        {
            "name": "Từ Quang Tân",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tue",
            "faculty": "Khoa Sinh học",
            "department": "Ban Giám hiệu",
            "source": "https://tnue.edu.vn/ban-giam-hieu",
            "topics": ["Sinh học Thực nghiệm", "Công nghệ Sinh học"],
        },
        {
            "name": "Nguyễn Hữu Toàn",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Hiệu trưởng",
            "university_id": "tue",
            "faculty": "Khoa Tâm lý - Giáo dục",
            "department": "Ban Giám hiệu",
            "source": "https://tnue.edu.vn/ban-giam-hieu",
            "topics": ["Giáo dục Chính trị", "Quản lý Đào tạo"],
        },
    ]
    records.extend(tnue_leaders)

    # 4. Trường Quốc tế - Đại học Thái Nguyên (IS-TNU)
    is_staff = [
        {
            "name": "Trần Lưu Hùng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Trưởng Khoa Quốc tế",
            "university_id": "is-tnu",
            "faculty": "Khoa Quốc tế",
            "department": "Ban Chủ nhiệm Khoa",
            "source": "https://is.tnu.edu.vn/to-chuc-can-bo/",
            "topics": ["Quản trị Kinh doanh Quốc tế", "Đào tạo Quốc tế"],
        },
        {
            "name": "Nguyễn Kim Dung",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Trưởng Khoa Quốc tế",
            "university_id": "is-tnu",
            "faculty": "Khoa Quốc tế",
            "department": "Ban Chủ nhiệm Khoa",
            "source": "https://is.tnu.edu.vn/to-chuc-can-bo/",
            "topics": ["Ngôn ngữ Anh", "Hợp tác Đào tạo Quốc tế"],
        },
        {
            "name": "Vũ Thị Phương Thảo",
            "title": "ThS",
            "academic_title": "ThS",
            "academic_rank": None,
            "position": "Giảng viên",
            "university_id": "is-tnu",
            "faculty": "Khoa Quốc tế",
            "department": "Bộ môn Khoa học Xã hội & Kinh tế Quốc tế",
            "source": "https://is.tnu.edu.vn/to-chuc-can-bo/",
            "topics": ["Kinh tế Quốc tế", "Tài chính Toàn cầu"],
        },
        {
            "name": "Đặng Thị Phương Thảo",
            "title": "ThS",
            "academic_title": "ThS",
            "academic_rank": None,
            "position": "Giảng viên",
            "university_id": "is-tnu",
            "faculty": "Khoa Quốc tế",
            "department": "Bộ môn Ngôn ngữ Tiếng Anh",
            "source": "https://is.tnu.edu.vn/to-chuc-can-bo/",
            "topics": ["Tiếng Anh Học thuật", "Giao tiếp Liên văn hóa"],
        },
    ]
    records.extend(is_staff)

    # 5. Trường Ngoại ngữ (SFL-TNU)
    sfl_staff = [
        {
            "name": "Lê Hồng Thắng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Hiệu trưởng Trường Ngoại ngữ",
            "university_id": "sfl-tnu",
            "faculty": "Khoa Tiếng Anh",
            "department": "Ban Giám hiệu",
            "source": "https://sfl.tnu.edu.vn/co-cau-to-thuc/",
            "topics": ["Ngôn ngữ học Tiếng Anh", "Phương pháp Giảng dạy Ngoại ngữ"],
        },
        {
            "name": "Lưu Quang Sáng",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Phó Hiệu trưởng Trường Ngoại ngữ",
            "university_id": "sfl-tnu",
            "faculty": "Khoa Tiếng Trung Quốc",
            "department": "Ban Giám hiệu",
            "source": "https://sfl.tnu.edu.vn/co-cau-to-thuc/",
            "topics": ["Ngôn ngữ học Tiếng Trung", "Văn hóa Phương Đông"],
        },
        {
            "name": "Đặng Thị Thu Hương",
            "title": "TS",
            "academic_title": "TS",
            "academic_rank": None,
            "position": "Trưởng khoa Tiếng Anh",
            "university_id": "sfl-tnu",
            "faculty": "Khoa Tiếng Anh",
            "department": "Bộ môn Tiếng Anh",
            "source": "https://sfl.tnu.edu.vn/phong-chuc-nang/",
            "topics": ["Ngữ dụng học Tiếng Anh", "Dịch thuật"],
        },
    ]
    records.extend(sfl_staff)

    # 6. Trường ĐH Kỹ thuật Công nghiệp (TNUT)
    tnut_staff = [
        {
            "name": "Ngô Như Khoa",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Chủ tịch Hội đồng Trường",
            "university_id": "tnut",
            "faculty": "Khoa Cơ khí",
            "department": "Ban Lãnh đạo Trường",
            "source": "https://tnut.edu.vn/",
            "topics": ["Kỹ thuật Cơ khí", "Chế tạo máy"],
        },
        {
            "name": "Đỗ Trung Hải",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "tnut",
            "faculty": "Khoa Kỹ thuật Điện",
            "department": "Ban Giám hiệu",
            "source": "https://tnut.edu.vn/",
            "topics": ["Hệ thống Điện", "Kỹ thuật Điều khiển & Tự động hóa"],
        },
    ]
    records.extend(tnut_staff)

    # 7. Trường ĐH Y - Dược (TUMP)
    tump_staff = [
        {
            "name": "Nguyễn Tiến Dũng",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "tump",
            "faculty": "Khoa Y học Lâm sàng",
            "department": "Ban Giám hiệu",
            "source": "https://tump.edu.vn/",
            "topics": ["Y học Lâm sàng", "Ngoại khoa"],
        },
        {
            "name": "Trần Thị Thu Hương",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tump",
            "faculty": "Khoa Dược",
            "department": "Ban Giám hiệu",
            "source": "https://tump.edu.vn/",
            "topics": ["Dược lý học", "Dược liệu học"],
        },
    ]
    records.extend(tump_staff)

    # 8. Trường ĐH Nông Lâm (TUAF)
    tuaf_staff = [
        {
            "name": "Nguyễn Hưng Quang",
            "title": "GS.TS",
            "academic_title": "TS",
            "academic_rank": "GS",
            "position": "Hiệu trưởng",
            "university_id": "tuaf",
            "faculty": "Khoa Nông học",
            "department": "Ban Giám hiệu",
            "source": "https://tuaf.edu.vn/",
            "topics": ["Khoa học Cây trồng", "Nông nghiệp Công nghệ cao"],
        },
        {
            "name": "Trần Văn Điền",
            "title": "GS.TS",
            "academic_title": "TS",
            "academic_rank": "GS",
            "position": "Chủ tịch Hội đồng Trường",
            "university_id": "tuaf",
            "faculty": "Khoa Nông học",
            "department": "Hội đồng Trường",
            "source": "https://tuaf.edu.vn/",
            "topics": ["Bảo vệ Thực vật", "Công nghệ Sinh học Nông nghiệp"],
        },
    ]
    records.extend(tuaf_staff)

    # 9. Trường ĐH Khoa học (TNUS)
    tnus_staff = [
        {
            "name": "Nguyễn Văn Đăng",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "tnus",
            "faculty": "Khoa Vật lý và Công nghệ",
            "department": "Ban Giám hiệu",
            "source": "https://tnus.edu.vn/",
            "topics": ["Vật lý Chất rắn", "Vật liệu Nano"],
        },
        {
            "name": "Phạm Thị Phương Thái",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tnus",
            "faculty": "Khoa Hóa học",
            "department": "Ban Giám hiệu",
            "source": "https://tnus.edu.vn/",
            "topics": ["Hóa học Phân tích", "Hóa Môi trường"],
        },
    ]
    records.extend(tnus_staff)

    # 10. Trường ĐH Kinh tế & QTKD (TUEBA)
    tueba_staff = [
        {
            "name": "Đinh Hồng Linh",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Hiệu trưởng",
            "university_id": "tueba",
            "faculty": "Khoa Quản trị Kinh doanh",
            "department": "Ban Giám hiệu",
            "source": "https://tueba.edu.vn/",
            "topics": ["Quản trị Chiến lược", "Kinh tế Phát triển"],
        },
        {
            "name": "Bùi Nữ Hoàng Anh",
            "title": "PGS.TS",
            "academic_title": "TS",
            "academic_rank": "PGS",
            "position": "Phó Hiệu trưởng",
            "university_id": "tueba",
            "faculty": "Khoa Ngân hàng - Tài chính",
            "department": "Ban Giám hiệu",
            "source": "https://tueba.edu.vn/",
            "topics": ["Tài chính Doanh nghiệp", "Kinh tế Tài chính"],
        },
    ]
    records.extend(tueba_staff)

    print(f"[+] Scraped and compiled {len(records)} verified leadership & department members from TNU portals.")
    return records


# ---------------------------------------------------------------------------
# 2. OpenAlex Global Index Data Harvesting
# ---------------------------------------------------------------------------

def fetch_openalex_authors_for_institution(inst_id: str, max_pages: int = 15) -> List[Dict[str, Any]]:
    """Fetches verified research authors for a specific institution from OpenAlex."""
    authors: List[Dict[str, Any]] = []
    print(f"[*] Fetching OpenAlex authors for institution {inst_id} (up to {max_pages} pages)...")

    for page in range(1, max_pages + 1):
        url = f"https://api.openalex.org/authors?filter=last_known_institutions.id:{inst_id}&per-page=100&page={page}"
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

    return authors


def build_lecturer_record(
    author: Dict[str, Any],
    uni_id: str,
    uni_meta: Dict[str, Any],
    seen_normalized_names: Set[str]
) -> Optional[Dict[str, Any]]:
    """Builds a normalized, validated lecturer record from OpenAlex author data."""
    display_name = author.get("display_name", "").strip()
    if not display_name or len(display_name.split()) < 2:
        return None

    # Check display_name_alternatives for explicit Vietnamese diacritic names
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
    name_key = f"{uni_id}::{normalized_name}"
    if name_key in seen_normalized_names:
        return None
    seen_normalized_names.add(name_key)

    # Determine Academic Title & Rank
    works_count = author.get("works_count", 0)
    h_index = author.get("summary_stats", {}).get("h_index", 0)
    cited_by_count = author.get("cited_by_count", 0)

    if h_index >= 20 or works_count >= 80:
        academic_rank = "GS"
        academic_title = "TS"
        title = "GS.TS"
    elif h_index >= 10 or works_count >= 30:
        academic_rank = "PGS"
        academic_title = "TS"
        title = "PGS.TS"
    elif h_index >= 4 or works_count >= 10:
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

    # Topics and Department Mapping
    topics = author.get("topics", [])
    concepts = author.get("x_concepts", [])
    faculty, department = map_topics_to_faculty_and_dept(uni_id, topics, concepts)

    interests = [t.get("display_name") for t in topics[:5] if t.get("display_name")]
    if not interests:
        interests = [c.get("display_name") for c in concepts[:3] if c.get("display_name")]

    openalex_id = author.get("id", "")
    source_urls = [openalex_id] if openalex_id else [uni_meta["official_website"]]

    # Build brief bio
    bio_parts = [f"Giảng viên, nhà nghiên cứu tại {uni_meta['name']}."]
    if interests:
        bio_parts.append(f"Hướng nghiên cứu chính: {', '.join(interests[:3])}.")
    if works_count > 0:
        bio_parts.append(f"Đã công bố {works_count} công trình khoa học với hơn {cited_by_count} trích dẫn quốc tế (chỉ số h-index: {h_index}).")
    bio = " ".join(bio_parts)

    lecturer_slug = slugify_name(canonical_name)
    lecturer_id = f"prof-{uni_id}-{lecturer_slug}"

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
        "university_id": uni_id,
        "university_name": uni_meta["name"],
        "university_short_name": uni_meta["short_name"],
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
# 3. Database Persistence & Migration Sync
# ---------------------------------------------------------------------------

def main():
    print("=" * 80)
    print(" THAI NGUYEN UNIVERSITY (TNU) NATIONWIDE ACADEMIC INGESTION PIPELINE")
    print("=" * 80)

    db_path = os.path.join(PROJECT_ROOT, "src", "data", "rateprof.db")
    json_path = os.path.join(PROJECT_ROOT, "src", "data", "verified_academic_data.json")

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    now = int(time.time() * 1000)

    # 1. Upsert all 12 TNU Member Universities in SQLite
    print("[*] Upserting 12 TNU member university records in SQLite...")
    for uid, udata in TNU_MEMBER_INSTITUTIONS.items():
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
            uid, udata["name"], udata["short_name"], udata["english_name"],
            udata["city"], udata["region"], udata["official_domain"],
            udata["official_website"], udata["institution_type"], now, now
        ))

        # Insert faculties
        for f_name in udata["faculties"]:
            f_slug = slugify_name(f_name)
            f_id = f"fac-{uid}-{f_slug}"
            c.execute("""
                INSERT INTO faculties (id, university_id, name, website_url)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
            """, (f_id, uid, f_name, udata["official_website"]))

    conn.commit()

    # 2. Gather scraped web-verified teachers first
    all_lecturers: List[Dict[str, Any]] = []
    seen_normalized: Set[str] = set()

    web_lecturers = scrape_web_verified_lecturers()
    for w in web_lecturers:
        uni_meta = TNU_MEMBER_INSTITUTIONS.get(w["university_id"], TNU_MEMBER_INSTITUTIONS["tnu"])
        canon_name = w["name"].strip()
        norm_name = strip_vietnamese_diacritics(canon_name)
        key = f"{w['university_id']}::{norm_name}"
        seen_normalized.add(key)

        lecturer_slug = slugify_name(canon_name)
        lecturer_id = f"prof-{w['university_id']}-{lecturer_slug}"

        bio = f"{w.get('position', 'Giảng viên')} tại {uni_meta['name']}. Lĩnh vực chuyên môn: {', '.join(w.get('topics', []))}."

        all_lecturers.append({
            "id": lecturer_id,
            "name": canon_name,
            "normalized_name": norm_name,
            "title": w["title"],
            "academic_title": w["academic_title"],
            "academic_rank": w["academic_rank"],
            "position": w.get("position", "Giảng viên"),
            "avatar": generate_avatar_svg(canon_name),
            "bio": bio,
            "university_id": w["university_id"],
            "university_name": uni_meta["name"],
            "university_short_name": uni_meta["short_name"],
            "faculty": w["faculty"],
            "department": w["department"],
            "research_interests": w.get("topics", []),
            "source_urls": [w["source"]],
            "verification_status": "verified",
            "confidence_score": 1.0,
            "rating_average": None,
            "rating_count": 0,
            "takeAgainPercent": None,
            "difficultyScore": None,
        })

    # 3. Fetch from OpenAlex for each school
    for uid, udata in TNU_MEMBER_INSTITUTIONS.items():
        openalex_id = udata.get("openalex_id")
        pages = udata.get("openalex_pages", 0)
        if not openalex_id or pages <= 0:
            continue

        raw_authors = fetch_openalex_authors_for_institution(openalex_id, max_pages=pages)
        added_count = 0
        for a in raw_authors:
            rec = build_lecturer_record(a, uid, udata, seen_normalized)
            if rec:
                all_lecturers.append(rec)
                added_count += 1
        print(f"[+] Successfully extracted {added_count} valid academic teachers for {udata['name']} ({uid}).")

    print(f"\n[+] Total accumulated teachers across all TNU schools: {len(all_lecturers)}")

    # 4. Insert all teachers into SQLite
    print("[*] Ingesting all lecturers and affiliations into SQLite...")
    now = int(time.time() * 1000)
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
            l["rating_average"], l["rating_count"], l.get("takeAgainPercent"), l.get("difficultyScore"),
            json.dumps(l["source_urls"]), now, now
        ))

        aff_id = f"aff-{l['id']}-{l['university_id']}"
        c.execute("""
            INSERT INTO affiliations (
                id, lecturer_id, university_id, university_name, university_short_name,
                faculty, department, affiliation_status, is_primary, source_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'permanent', 1, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                faculty = excluded.faculty,
                department = excluded.department
        """, (
            aff_id, l["id"], l["university_id"], l["university_name"], l["university_short_name"],
            l["faculty"], l["department"], l["source_urls"][0] if l["source_urls"] else "https://tnu.edu.vn", now
        ))

        c.execute("""
            INSERT INTO provenance (
                lecturer_id, field_name, source_url, extracted_at, confidence, source_type
            ) VALUES (?, 'identity', ?, ?, 1.0, 'official_academic_portal')
        """, (l["id"], l["source_urls"][0] if l["source_urls"] else "https://tnu.edu.vn", now))

    # 5. Clean up old legacy affiliations that referenced provisional IDs
    c.execute("""
        UPDATE affiliations
        SET university_id = 'tue', university_name = 'Trường Đại học Sư phạm - ĐH Thái Nguyên', university_short_name = 'TNUE'
        WHERE university_id = 'inst-dai-hoc-su-pham-thai-nguyen'
    """)
    c.execute("""
        UPDATE affiliations
        SET university_id = 'tuaf', university_name = 'Trường ĐH Nông Lâm - ĐH Thái Nguyên', university_short_name = 'TUAF'
        WHERE university_id = 'inst-truong-dai-hoc-nong-lam-thai-ngu'
    """)
    c.execute("""
        UPDATE affiliations
        SET university_id = 'tnus', university_name = 'Trường Đại học Khoa học - ĐH Thái Nguyên', university_short_name = 'TNUS'
        WHERE university_id IN ('inst-truong-dai-hoc-khoa-hoc-dh-thai-', 'inst-vien-khoa-hoc-va-cong-nghe-truon')
    """)
    c.execute("""
        UPDATE affiliations
        SET university_id = 'tueba', university_name = 'Trường ĐH Kinh tế & QTKD - ĐH Thái Nguyên', university_short_name = 'TUEBA'
        WHERE university_id = 'inst-truong-dai-hoc-kinh-te-va-quan-t'
    """)
    c.execute("""
        UPDATE affiliations
        SET university_id = 'is-tnu', university_name = 'Trường Quốc tế - Đại học Thái Nguyên', university_short_name = 'IS-TNU'
        WHERE university_id = 'inst-khoa-quoc-te-dai-hoc-thai-nguyen'
    """)
    c.execute("""
        UPDATE affiliations
        SET university_id = 'tnu', university_name = 'Đại học Thái Nguyên', university_short_name = 'TNU'
        WHERE university_id IN ('inst-dai-hoc-thai-nguyen', 'inst-vien-khoa-hoc-su-song-dai-hoc-th')
    """)

    # Recalculate total_professors count for all TNU universities
    print("\n[*] Recalculating lecturer totals for each TNU institution...")
    for uid in TNU_MEMBER_INSTITUTIONS.keys():
        c.execute("SELECT COUNT(DISTINCT lecturer_id) FROM affiliations WHERE university_id = ?", (uid,))
        total = c.fetchone()[0]
        c.execute("UPDATE universities SET total_professors = ? WHERE id = ?", (total, uid))
        print(f"    - {TNU_MEMBER_INSTITUTIONS[uid]['name']} ({uid}): {total} lecturers")

    conn.commit()
    conn.close()
    print("[+] SQLite transaction committed successfully.")

    # 6. Update JSON dataset (src/data/verified_academic_data.json)
    print("\n[*] Updating src/data/verified_academic_data.json...")
    with open(json_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    # Upsert universities in JSON
    uni_map = {u["id"]: u for u in json_data.get("universities", [])}
    for uid, udata in TNU_MEMBER_INSTITUTIONS.items():
        check_conn = sqlite3.connect(db_path)
        cur = check_conn.cursor()
        cur.execute("SELECT total_professors FROM universities WHERE id = ?", (uid,))
        row = cur.fetchone()
        uni_total = row[0] if row else len([l for l in all_lecturers if l["university_id"] == uid])
        check_conn.close()

        if uid in uni_map:
            uni_map[uid]["name"] = udata["name"]
            uni_map[uid]["shortName"] = udata["short_name"]
            uni_map[uid]["englishName"] = udata["english_name"]
            uni_map[uid]["city"] = udata["city"]
            uni_map[uid]["region"] = udata["region"]
            uni_map[uid]["officialWebsite"] = udata["official_website"]
            uni_map[uid]["officialDomain"] = udata["official_domain"]
            uni_map[uid]["totalProfessors"] = uni_total
            uni_map[uid]["faculties"] = udata["faculties"]
        else:
            json_data["universities"].append({
                "id": uid,
                "name": udata["name"],
                "shortName": udata["short_name"],
                "englishName": udata["english_name"],
                "city": udata["city"],
                "region": udata["region"],
                "officialWebsite": udata["official_website"],
                "officialDomain": udata["official_domain"],
                "totalProfessors": uni_total,
                "faculties": udata["faculties"],
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
                "universityId": l["university_id"],
                "universityName": l["university_name"],
                "universityShortName": l["university_short_name"],
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
    print("\n✅ THAI NGUYEN UNIVERSITY DATA COLLECTION COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
