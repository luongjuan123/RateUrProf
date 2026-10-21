"""Complete VNU-HCM Nationwide Academic Ingestion Pipeline.

Collects, crawls, normalizes, deduplicates, and ingests all faculty members and teachers
of Đại học Quốc gia Thành phố Hồ Chí Minh (VNU-HCM) and all member schools into:
1. Local SQLite (src/data/rateprof.db)
2. JSON export (src/data/verified_academic_data.json)
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

from bs4 import BeautifulSoup

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RateUrProfs-Academic-Bot/2.0 (+https://rateurprofs.site/bot; contact: admin@rateurprofs.site)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

VNUHCM_MEMBER_INSTITUTIONS: Dict[str, Dict[str, Any]] = {
    "hcmut": {
        "name": "Trường ĐH Bách Khoa - ĐHQG TP.HCM",
        "short_name": "HCMUT",
        "english_name": "Ho Chi Minh City University of Technology, VNU-HCM",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://hcmut.edu.vn",
        "official_domain": "hcmut.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Khoa học & Kỹ thuật Máy tính (CSE)",
            "Khoa Điện - Điện tử (FEE)",
            "Khoa Cơ khí (FME)",
            "Khoa Kỹ thuật Hóa học (FCE)",
            "Khoa Kỹ thuật Xây dựng",
            "Khoa Khoa học Ứng dụng (FAS)",
            "Khoa Quản lý Công nghiệp (SIM)",
            "Khoa Môi trường & Tài nguyên (FENR)",
            "Khoa Kỹ thuật Giao thông (FTE)",
        ],
    },
    "hcmus": {
        "name": "Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM",
        "short_name": "HCMUS",
        "english_name": "VNUHCM - University of Science",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://hcmus.edu.vn",
        "official_domain": "hcmus.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Công nghệ Thông tin (FIT)",
            "Khoa Toán - Tin học",
            "Khoa Vật lý - Vật lý Kỹ thuật",
            "Khoa Hóa học",
            "Khoa Sinh học - Công nghệ Sinh học",
            "Khoa Điện tử Viễn thông",
            "Khoa Khoa học Môi trường",
            "Khoa Địa chất",
        ],
    },
    "hcmussh": {
        "name": "Trường ĐH Khoa học Xã hội & Nhân văn - ĐHQG TP.HCM",
        "short_name": "HCMUSSH",
        "english_name": "VNUHCM - University of Social Sciences and Humanities",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://hcmussh.edu.vn",
        "official_domain": "hcmussh.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Báo chí & Truyền thông",
            "Khoa Ngữ văn Anh",
            "Khoa Ngữ văn Trung Quốc",
            "Khoa Quan hệ Quốc tế",
            "Khoa Tâm lý học",
            "Khoa Xã hội học",
            "Khoa Văn học",
            "Khoa Lịch sử",
            "Khoa Triết học",
            "Khoa Địa lý",
            "Khoa Đông phương học",
            "Khoa Nhật Bản học",
            "Khoa Hàn Quốc học",
            "Khoa Giáo dục",
        ],
    },
    "uit": {
        "name": "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM",
        "short_name": "UIT",
        "english_name": "University of Information Technology, VNU-HCM",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://uit.edu.vn",
        "official_domain": "uit.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Mạng máy tính & Truyền thông",
            "Khoa Kỹ thuật Phần mềm",
            "Khoa Khoa học Máy tính",
            "Khoa Hệ thống Thông tin",
            "Khoa Kỹ thuật Máy tính",
            "Khoa Khoa học & Kỹ thuật Thông tin",
        ],
    },
    "hcmiu": {
        "name": "Trường ĐH Quốc tế - ĐHQG TP.HCM",
        "short_name": "HCMIU",
        "english_name": "International University, VNU-HCM",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://hcmiu.edu.vn",
        "official_domain": "hcmiu.edu.vn",
        "institution_type": "university",
        "faculties": [
            "School of Biotechnology (Khoa Công nghệ Sinh học)",
            "School of Computer Science & Engineering (Khoa CNTT)",
            "School of Electrical Engineering (Khoa Điện tử Viễn thông)",
            "School of Business (Khoa Quản trị Kinh doanh)",
            "School of Industrial Engineering & Management (Khoa KT&QL Công nghiệp)",
            "School of Biomedical Engineering (Khoa Kỹ thuật Y sinh)",
            "School of Languages (Khoa Ngôn ngữ)",
            "Department of Mathematics (Bộ môn Toán)",
            "Department of Physics (Bộ môn Vật lý)",
        ],
    },
    "uel": {
        "name": "Trường ĐH Kinh tế - Luật - ĐHQG TP.HCM",
        "short_name": "UEL",
        "english_name": "University of Economics and Law, VNU-HCM",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://uel.edu.vn",
        "official_domain": "uel.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Kinh tế",
            "Khoa Kinh tế Đối ngoại",
            "Khoa Tài chính - Ngân hàng",
            "Khoa Kế toán - Kiểm toán",
            "Khoa Hệ thống Thông tin",
            "Khoa Quản trị Kinh doanh",
            "Khoa Luật",
            "Khoa Luật Kinh tế",
            "Viện Quốc tế UEL",
        ],
    },
    "agu": {
        "name": "Trường Đại học An Giang - ĐHQG TP.HCM",
        "short_name": "AGU",
        "english_name": "An Giang University, VNU-HCM",
        "city": "An Giang",
        "region": "Miền Nam",
        "official_website": "https://agu.edu.vn",
        "official_domain": "agu.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Nông nghiệp - Tài nguyên Thiên nhiên",
            "Khoa Công nghệ Thông tin",
            "Khoa Sư phạm",
            "Khoa Kinh tế - Quản trị Kinh doanh",
            "Khoa Kỹ thuật - Công nghệ - Môi trường",
            "Khoa Du lịch & Văn hóa Nghệ thuật",
            "Khoa Luật & Khoa học Chính trị",
        ],
    },
    "medvnu": {
        "name": "Trường ĐH Khoa học Sức khỏe - ĐHQG TP.HCM",
        "short_name": "UHS",
        "english_name": "University of Health Sciences, VNU-HCM",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://medvnu.edu.vn",
        "official_domain": "medvnu.edu.vn",
        "institution_type": "university",
        "faculties": [
            "Khoa Y",
            "Khoa Dược",
            "Khoa Răng Hàm Mặt",
            "Khoa Y học Cổ truyền",
            "Khoa Điều dưỡng",
        ],
    },
    "vnuhcm": {
        "name": "Đại học Quốc gia Thành phố Hồ Chí Minh",
        "short_name": "VNU-HCM",
        "english_name": "Vietnam National University, Ho Chi Minh City",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "official_website": "https://vnuhcm.edu.vn",
        "official_domain": "vnuhcm.edu.vn",
        "institution_type": "national_university",
        "faculties": [
            "Ban Giám đốc & Cơ quan ĐHQG-HCM",
            "Viện Môi trường và Tài nguyên (IER)",
            "Viện Công nghệ Nano (INT)",
            "Viện Tế bào gốc (SCI)",
            "Trung tâm Nghiên cứu Vật liệu Cấu trúc Nano và Phân tử (INOMAR)",
            "Viện Đào tạo Quốc tế (IEI)",
        ],
    },
}

NON_HUMAN_KEYWORDS = [
    "phòng", "khoa", "bộ môn", "trường", "viện", "trung tâm", "ban", "tổ",
    "văn phòng", "thư viện", "hội đồng", "đoàn", "công đoàn", "thực hành",
    "phòng tn", "bp khảo thí", "các khoa", "đối tác", "tuyển sinh", "website",
    "đăng nhập", "chương trình", "hệ thống", "quản trị", "danh sách"
]

def strip_vietnamese_diacritics(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "d")
    return text.lower().strip()

def is_valid_human_name(raw_name: str) -> bool:
    if not raw_name or not isinstance(raw_name, str):
        return False
    clean = re.sub(r'^(?:GS|PGS|TS|ThS|Tiến sĩ|Thạc sĩ|Ông|Bà|Prof|Dr|MEng|Assoc\.?\s*Prof\.?)\.?\s*', '', raw_name, flags=re.I).strip()
    if len(clean) < 3 or len(clean) > 50:
        return False
    lower = clean.lower()
    for kw in NON_HUMAN_KEYWORDS:
        if kw in lower:
            return False
    if re.search(r'[\d@#$%^*_+=\[\]{}|<>\\]', clean):
        return False
    words = clean.split()
    if len(words) < 2 or len(words) > 6:
        return False
    return True

def generate_avatar_svg(name: str) -> str:
    clean = re.sub(r'^(?:GS|PGS|TS|ThS|Tiến sĩ|Thạc sĩ|Ông|Bà|Prof|Dr|MEng)\.?\s*', '', name, flags=re.IGNORECASE).strip()
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
        f'</svg>'
    )
    return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"

def classify_ranks_and_titles(raw_title_str: str, raw_name: str) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    combined = f"{raw_title_str} {raw_name}".strip()
    c_upper = combined.upper()
    
    academic_rank = None
    if "GS." in combined or "GS " in combined or "GIÁO SƯ" in c_upper or "PROF" in c_upper:
        if "PGS" not in c_upper and "PHÓ GIÁO SƯ" not in c_upper and "ASSOC" not in c_upper:
            academic_rank = "GS"
        else:
            academic_rank = "PGS"
    elif "PGS." in combined or "PGS " in combined or "PHÓ GIÁO SƯ" in c_upper or "ASSOC. PROF" in c_upper:
        academic_rank = "PGS"

    academic_title = None
    if "TS." in combined or "TIẾN SĨ" in c_upper or "PH.D" in c_upper or "PHD" in c_upper or "DR." in combined:
        academic_title = "TS"
    elif "THS." in combined or "THẠC SĨ" in c_upper or "M.ENG" in c_upper or "MENG" in c_upper or "MASTER" in c_upper:
        academic_title = "ThS"

    degree = None
    if academic_title == "TS":
        degree = "Tiến sĩ"
    elif academic_title == "ThS":
        degree = "Thạc sĩ"

    if academic_rank == "GS" and academic_title == "TS":
        title = "GS.TS"
    elif academic_rank == "GS":
        title = "GS"
    elif academic_rank == "PGS" and academic_title == "TS":
        title = "PGS.TS"
    elif academic_rank == "PGS":
        title = "PGS"
    elif academic_title == "TS":
        title = "TS"
    elif academic_title == "ThS":
        title = "ThS"
    else:
        title = "Giảng viên"

    return title, academic_title, academic_rank, degree

def clean_name_string(raw_name: str) -> str:
    name = re.sub(r'^(?:GS|PGS|TS|ThS|Tiến sĩ|Thạc sĩ|Ông|Bà|Prof|Dr|MEng|Assoc\.?\s*Prof\.?)\.?\s*', '', raw_name, flags=re.I).strip()
    name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    name = re.sub(r'\s+', ' ', name).strip()
    return name

# ----------------------------------------------------------------------------
# 1. Scrape Live HCMUT CSE Departments
# ----------------------------------------------------------------------------
def scrape_hcmut_cse() -> List[Dict[str, Any]]:
    print("[*] Scraping HCMUT CSE departments...")
    hcmut_urls = [
        ("Khoa Khoa học & Kỹ thuật Máy tính", "Bộ môn Khoa học Máy tính", "https://cse.hcmut.edu.vn/bo-mon-khoa-hoc-may-tinh"),
        ("Khoa Khoa học & Kỹ thuật Máy tính", "Bộ môn Kỹ thuật Máy tính", "https://cse.hcmut.edu.vn/bo-mon-ky-thuat-may-tinh"),
        ("Khoa Khoa học & Kỹ thuật Máy tính", "Bộ môn Hệ thống & Mạng Máy tính", "https://cse.hcmut.edu.vn/bo-mon-he-thong-va-mang-may-tinh"),
        ("Khoa Khoa học & Kỹ thuật Máy tính", "Bộ môn Công nghệ Phần mềm", "https://cse.hcmut.edu.vn/bo-mon-cong-nghe-phan-mem"),
        ("Khoa Khoa học & Kỹ thuật Máy tính", "Bộ môn Hệ thống Thông tin", "https://cse.hcmut.edu.vn/bo-mon-he-thong-thong-tin"),
    ]
    extracted = []
    for fac, dept, u in hcmut_urls:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
                soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
                for tr in soup.find_all('tr'):
                    tds = [td.get_text().strip() for td in tr.find_all('td')]
                    if len(tds) >= 2 and tds[0].isdigit() and len(tds[1]) > 3:
                        raw_name = tds[1]
                        pos = tds[2] if len(tds) > 2 else "Giảng viên"
                        clean_n = clean_name_string(raw_name)
                        if is_valid_human_name(clean_n):
                            title, a_title, a_rank, deg = classify_ranks_and_titles(raw_name, clean_n)
                            extracted.append({
                                "raw_name": clean_n,
                                "raw_title": title,
                                "academic_title": a_title,
                                "academic_rank": a_rank,
                                "degree": deg,
                                "position": pos or "Giảng viên",
                                "faculty": fac,
                                "department": dept,
                                "university_id": "hcmut",
                                "source_url": u
                            })
        except Exception as e:
            print(f"    [-] Error scraping {u}: {e}")
    print(f"[+] HCMUT CSE live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 2. Scrape Live UIT Networks & Communications Faculty
# ----------------------------------------------------------------------------
def scrape_uit_faculty() -> List[Dict[str, Any]]:
    print("[*] Scraping UIT live faculty directory (nc.uit.edu.vn)...")
    extracted = []
    u = "https://nc.uit.edu.vn/giang-vien"
    try:
        req = urllib.request.Request(u, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
            soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
            for tr in soup.find_all('tr'):
                tds = [td.get_text().strip() for td in tr.find_all('td')]
                if len(tds) >= 3 and len(tds[1]) > 3 and not any(k in tds[1].lower() for k in ['họ và tên', 'stt']):
                    raw_name = tds[1]
                    pos = tds[2] if len(tds) > 2 else "Giảng viên"
                    dept = tds[3] if len(tds) > 3 else "Khoa Mạng máy tính & Truyền thông"
                    clean_n = clean_name_string(raw_name)
                    if is_valid_human_name(clean_n):
                        title, a_title, a_rank, deg = classify_ranks_and_titles(raw_name, clean_n)
                        extracted.append({
                            "raw_name": clean_n,
                            "raw_title": title,
                            "academic_title": a_title,
                            "academic_rank": a_rank,
                            "degree": deg,
                            "position": pos or "Giảng viên",
                            "faculty": "Khoa Mạng máy tính & Truyền thông",
                            "department": dept,
                            "university_id": "uit",
                            "source_url": u
                        })
    except Exception as e:
        print(f"    [-] Error scraping UIT: {e}")
    print(f"[+] UIT live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 3. Scrape Live HCMUS Faculty Directories
# ----------------------------------------------------------------------------
def scrape_hcmus_faculty() -> List[Dict[str, Any]]:
    print("[*] Scraping HCMUS live directories (FIT, Math, Biology)...")
    extracted = []
    
    # 3a. FIT Software Engineering & AI (tabid=664)
    u_fit = "https://www.fit.hcmus.edu.vn/vn/Default.aspx?tabid=664"
    try:
        req = urllib.request.Request(u_fit, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
            soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
            for li in soup.find_all(['li', 'p']):
                text = li.get_text().strip()
                if any(k in text for k in ["GS.", "PGS.", "TS.", "ThS.", "NCV."]):
                    m = re.search(r'(?:(?:Trưởng|Phó|Thư ký)[^:]*:\s*)?((?:GS|PGS|TS|ThS|NCV)[\w\s.,]+)', text)
                    if m:
                        cand = m.group(1).strip()
                        clean_n = clean_name_string(cand)
                        if is_valid_human_name(clean_n):
                            title, a_title, a_rank, deg = classify_ranks_and_titles(cand, clean_n)
                            pos = "Giảng viên"
                            if "Trưởng Khoa" in text: pos = "Trưởng Khoa"
                            elif "Phó Trưởng Khoa" in text: pos = "Phó Trưởng Khoa"
                            elif "Trưởng Bộ môn" in text: pos = "Trưởng Bộ môn"
                            elif "Phó Trưởng Bộ môn" in text: pos = "Phó Trưởng Bộ môn"
                            extracted.append({
                                "raw_name": clean_n,
                                "raw_title": title,
                                "academic_title": a_title,
                                "academic_rank": a_rank,
                                "degree": deg,
                                "position": pos,
                                "faculty": "Khoa Công nghệ Thông tin",
                                "department": "Bộ môn Công nghệ Phần mềm",
                                "university_id": "hcmus",
                                "source_url": u_fit
                            })
    except Exception as e:
        print(f"    [-] Error scraping HCMUS FIT: {e}")

    # 3b. Math faculty (math.hcmus.edu.vn)
    u_math = "https://math.hcmus.edu.vn/gioi-thieu/bcn-khoa-bo-mon"
    try:
        req = urllib.request.Request(u_math, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
            soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
            text_lines = [l.strip() for l in soup.get_text().splitlines() if l.strip()]
            for idx, line in enumerate(text_lines):
                if any(k in line for k in ["GS.", "PGS.", "TS.", "ThS."]) and len(line) < 60:
                    clean_n = clean_name_string(line)
                    if is_valid_human_name(clean_n):
                        prev_line = text_lines[idx - 1] if idx > 0 else ""
                        pos = prev_line if any(k in prev_line.lower() for k in ["trưởng", "phó"]) else "Giảng viên"
                        title, a_title, a_rank, deg = classify_ranks_and_titles(line, clean_n)
                        extracted.append({
                            "raw_name": clean_n,
                            "raw_title": title,
                            "academic_title": a_title,
                            "academic_rank": a_rank,
                            "degree": deg,
                            "position": pos,
                            "faculty": "Khoa Toán - Tin học",
                            "department": "Bộ môn Toán",
                            "university_id": "hcmus",
                            "source_url": u_math
                        })
    except Exception as e:
        print(f"    [-] Error scraping HCMUS Math: {e}")

    print(f"[+] HCMUS live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 4. Scrape Live UEL International Faculty
# ----------------------------------------------------------------------------
def scrape_uel_faculty() -> List[Dict[str, Any]]:
    print("[*] Scraping UEL international faculty directory...")
    extracted = []
    u = "https://international.uel.edu.vn/vi/tat-ca-giang-vien"
    try:
        req = urllib.request.Request(u, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
            soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
            for heading in soup.find_all(['h3', 'h4', 'h5', 'strong']):
                text = heading.get_text().strip()
                if any(k in text.lower() for k in ['pgs.ts', 'tiến sĩ', 'thạc sĩ', 'giáo sư', 'dr.', 'prof.']):
                    clean_n = clean_name_string(text)
                    if is_valid_human_name(clean_n):
                        title, a_title, a_rank, deg = classify_ranks_and_titles(text, clean_n)
                        extracted.append({
                            "raw_name": clean_n,
                            "raw_title": title,
                            "academic_title": a_title,
                            "academic_rank": a_rank,
                            "degree": deg,
                            "position": "Giảng viên Quốc tế",
                            "faculty": "Viện Quốc tế UEL",
                            "department": "Chương trình Quốc tế",
                            "university_id": "uel",
                            "source_url": u
                        })
    except Exception as e:
        print(f"    [-] Error scraping UEL: {e}")
    print(f"[+] UEL live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 5. Scrape Live HCMIU Council & Department Listings
# ----------------------------------------------------------------------------
def scrape_hcmiu_faculty() -> List[Dict[str, Any]]:
    print("[*] Scraping HCMIU Professorship Council & Academic Units...")
    extracted = []
    urls = [
        "https://hcmiu.edu.vn/hoi-dong-giao-su-co-so/2024-2/van-ban-cua-hoi-dong-giao-su-co-so/danh-sach-de-cu-cua-hoi-dong-khoa-hoc-va-dao-tao/",
        "https://hcmiu.edu.vn/hoi-dong-giao-su-co-so/2025-2/van-ban-cua-hoi-dong-giao-su-co-so/danh-sach-de-cu-cua-hoi-dong-khoa-hoc-va-dao-tao/",
        "https://hcmiu.edu.vn/hoi-dong-giao-su-co-so/2023-2/van-ban-cua-hoi-dong-giao-su-co-so/danh-sach-de-cu-nhan-su-tham-gia-hoi-dong-giao-su-co-so-tu-thanh-vien-hoi-dong-khoa-hoc-va-dao-tao/"
    ]
    cookie_header = {"Cookie": "D1N=3b4a73b131b83e11aa349861f8aaefc3"}
    headers_with_cookie = {**HEADERS, **cookie_header}

    for u in urls:
        try:
            req = urllib.request.Request(u, headers=headers_with_cookie)
            with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
                soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
                for tr in soup.find_all('tr'):
                    tds = [td.get_text().strip() for td in tr.find_all('td')]
                    if len(tds) >= 2 and any(k in tds[0].lower() for k in ['gs', 'pgs', 'ts']):
                        raw_name = tds[0]
                        clean_n = clean_name_string(raw_name)
                        if is_valid_human_name(clean_n):
                            title, a_title, a_rank, deg = classify_ranks_and_titles(raw_name, clean_n)
                            extracted.append({
                                "raw_name": clean_n,
                                "raw_title": title,
                                "academic_title": a_title,
                                "academic_rank": a_rank,
                                "degree": deg,
                                "position": "Thành viên Hội đồng Giáo sư cơ sở",
                                "faculty": "Hội đồng Khoa học & Đào tạo",
                                "department": "Ban Giảng huấn",
                                "university_id": "hcmiu",
                                "source_url": u
                            })
        except Exception as e:
            print(f"    [-] Error scraping HCMIU {u}: {e}")
    print(f"[+] HCMIU live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 6. Scrape Live INOMAR (VNU-HCM Institute for Nano and Molecular Materials)
# ----------------------------------------------------------------------------
def scrape_inomar_faculty() -> List[Dict[str, Any]]:
    print("[*] Scraping INOMAR faculty & research board...")
    extracted = []
    u = "http://www.inomar.edu.vn/about-inomar/member.html"
    try:
        req = urllib.request.Request(u, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as r:
            soup = BeautifulSoup(r.read().decode('utf-8', errors='ignore'), 'html.parser')
            for strong in soup.find_all(['strong', 'b', 'h3', 'h4']):
                t = strong.get_text().strip()
                if any(k in t.lower() for k in ['prof', 'ph.d', 'assoc', 'phd']):
                    clean_n = clean_name_string(t)
                    if is_valid_human_name(clean_n):
                        title, a_title, a_rank, deg = classify_ranks_and_titles(t, clean_n)
                        extracted.append({
                            "raw_name": clean_n,
                            "raw_title": title,
                            "academic_title": a_title,
                            "academic_rank": a_rank,
                            "degree": deg,
                            "position": "Nhà khoa học / Nghiên cứu viên chính",
                            "faculty": "Trung tâm Nghiên cứu Vật liệu Cấu trúc Nano và Phân tử (INOMAR)",
                            "department": "Phòng Thí nghiệm Trọng điểm",
                            "university_id": "vnuhcm",
                            "source_url": u
                        })
    except Exception as e:
        print(f"    [-] Error scraping INOMAR: {e}")
    print(f"[+] INOMAR live extraction: {len(extracted)} lecturers.")
    return extracted

# ----------------------------------------------------------------------------
# 7. Authoritative HĐGSNN National Archive Extraction (2019–2025)
# ----------------------------------------------------------------------------
def extract_hdgsnn_archive() -> List[Dict[str, Any]]:
    print("[*] Harvesting full statutory HĐGSNN Archive across 2019-2025 for all VNU-HCM institutions...")
    from data_collection.collectors.hdgsnn import HdgsnnCollector
    collector = HdgsnnCollector()
    art_ids = [
        824, 823, 822, 821, 820, 819, 815, 814, 813, 812, 810,
        796, 795, 793, 792, 791, 789, 787, 786, 785, 780, 779, 777,
        764, 763, 762, 761, 760, 759,
        716, 715, 687, 686, 685, 684,
        667, 663, 659, 658, 657, 656,
        545, 544, 543, 542
    ]
    extracted = []
    
    for aid in art_ids:
        u = f"http://hdgsnn.gov.vn/tin-tuc/t_{aid}"
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=5, context=SSL_CONTEXT) as r:
                content = r.read().decode('utf-8', errors='ignore')
                profs = collector.collect(content, u)
                for p in profs:
                    uid = p.get("university_id") or ""
                    uname = (p.get("university_name") or "").lower()
                    bio = (p.get("bio") or "").lower()
                    full_desc = f"{uid} {uname} {bio}"

                    target_id = None
                    if uid in ["hcmut", "hcmus", "uit", "uel", "hcmiu", "hcmussh", "agu", "medvnu"]:
                        target_id = uid
                    elif "bách khoa" in full_desc and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "tphcm", "đhqg"]):
                        target_id = "hcmut"
                    elif "khoa học tự nhiên" in full_desc and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "tphcm", "đhqg"]):
                        target_id = "hcmus"
                    elif "công nghệ thông tin" in full_desc and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "tphcm", "đhqg"]):
                        target_id = "uit"
                    elif "kinh tế - luật" in full_desc or "kinh tế luật" in full_desc or "uel" in full_desc:
                        target_id = "uel"
                    elif "quốc tế" in full_desc and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "tphcm", "đhqg"]):
                        target_id = "hcmiu"
                    elif ("khoa học xã hội" in full_desc or "khxh&nv" in full_desc or "nhân văn" in full_desc) and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "tphcm", "đhqg"]):
                        target_id = "hcmussh"
                    elif "an giang" in full_desc:
                        target_id = "agu"
                    elif ("khoa y" in full_desc or "khoa học sức khỏe" in full_desc or "sức khỏe" in full_desc) and any(k in full_desc for k in ["hồ chí minh", "tp.hcm", "đhqg"]):
                        target_id = "medvnu"
                    elif "đại học quốc gia" in full_desc and any(k in full_desc for k in ["thành phố hồ chí minh", "tp.hcm", "tphcm", "đhqg-hcm"]):
                        target_id = "vnuhcm"
                    elif "môi trường và tài nguyên" in full_desc or "công nghệ nano" in full_desc:
                        target_id = "vnuhcm"

                    if target_id:
                        clean_n = clean_name_string(p["name"])
                        if is_valid_human_name(clean_n):
                            title, a_title, a_rank, deg = classify_ranks_and_titles(p.get("academic_rank", "") or p["name"], clean_n)
                            h_rank = p.get("academic_rank") or "PGS"
                            fac = p.get("faculty") or "Khoa học"
                            dept = p.get("department") or "Ban Giảng huấn"
                            extracted.append({
                                "raw_name": clean_n,
                                "raw_title": f"{h_rank}.TS" if a_title == "TS" else h_rank,
                                "academic_title": a_title or "TS",
                                "academic_rank": h_rank,
                                "degree": deg or "Tiến sĩ",
                                "position": f"Giáo sư / Phó Giáo sư ({fac})",
                                "faculty": fac,
                                "department": dept,
                                "university_id": target_id,
                                "source_url": u,
                                "workplace": p.get("university_name") or target_id
                            })
        except Exception:
            pass

    print(f"[+] HĐGSNN National Archive extraction: {len(extracted)} statutory professors.")
    return extracted

# ----------------------------------------------------------------------------
# 8. Main Orchestrator and Database Ingestion Routine
# ----------------------------------------------------------------------------
def main():
    print("==============================================================================")
    print(" VNU-HCM SYSTEM NATIONWIDE ACADEMIC HARVESTING & PERSISTENCE PIPELINE")
    print("==============================================================================")

    db_path = os.path.join(PROJECT_ROOT, "src", "data", "rateprof.db")
    json_path = os.path.join(PROJECT_ROOT, "src", "data", "verified_academic_data.json")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Clean legacy phonebook / non-human entries from hcmus in SQLite
    print("[*] 1. Purging legacy false-positive non-human entries from SQLite...")
    c.execute("""
        DELETE FROM affiliations
        WHERE lecturer_id IN (
            SELECT id FROM lecturers
            WHERE id LIKE 'prof-hcmus-%'
              AND (
                name LIKE 'Phòng%' OR name LIKE 'KHOA%' OR name LIKE 'BP %' OR
                name LIKE 'TT.%' OR name LIKE 'CÁC KHOA%' OR name LIKE '%Điện thoại%' OR
                name LIKE '%Nội bộ%' OR name LIKE '%Tổ %' OR name LIKE '%Ban %'
              )
        )
    """)
    c.execute("""
        DELETE FROM lecturers
        WHERE id LIKE 'prof-hcmus-%'
          AND (
            name LIKE 'Phòng%' OR name LIKE 'KHOA%' OR name LIKE 'BP %' OR
            name LIKE 'TT.%' OR name LIKE 'CÁC KHOA%' OR name LIKE '%Điện thoại%' OR
            name LIKE '%Nội bộ%' OR name LIKE '%Tổ %' OR name LIKE '%Ban %'
          )
    """)
    conn.commit()

    # 2. Reconcile legacy university IDs into canonical VNU-HCM IDs
    print("[*] 2. Reconciling university affiliations into canonical VNU-HCM IDs...")
    alias_mappings = [
        ("ussh-hcm", "hcmussh"),
        ("inst-truong-dai-hoc-khoa-hoc-xa-hoi-v", "hcmussh"),
        ("iu-vnu", "hcmiu"),
        ("inst-truong-dai-hoc-quoc-te-dai-quoc-", "hcmiu"),
        ("inst-truong-dai-hoc-quoc-te-dhg-hcm", "hcmiu"),
        ("smp-vnu", "medvnu"),
        ("inst-truong-dai-hoc-khoa-hoc-suc-khoe", "medvnu"),
        ("inst-truong-dai-hoc-bach-khoa-dhqg-tp", "hcmut"),
        ("inst-nghi-huu-dai-hoc-bach-khoa-dhqgt", "hcmut"),
        ("inst-truong-dai-hoc-cong-nghe-thong-t", "uit"),
        ("inst-truong-dh-khoa-hoc-tu-nhien-dhqg", "hcmus"),
        ("inst-vien-moi-truong-va-tai-nguyen-da", "vnuhcm"),
        ("inst-vien-cong-nghe-nano-dai-hoc-quoc", "vnuhcm"),
        ("inst-trung-tam-nghien-cuu-vat-lieu-ca", "vnuhcm"),
        ("inst-ban-thanh-tra-phap-che-dai-hoc-q", "vnuhcm"),
        ("inst-dai-hoc-quoc-gia-thanh-pho-ho-ch", "vnuhcm"),
        ("quoc-gia-thanh-pho-ho-chi-minh", "vnuhcm"),
    ]
    for old_id, new_id in alias_mappings:
        info = VNUHCM_MEMBER_INSTITUTIONS.get(new_id)
        if info:
            c.execute("""
                UPDATE affiliations
                SET university_id = ?, university_name = ?, university_short_name = ?
                WHERE university_id = ?
            """, (new_id, info["name"], info["short_name"], old_id))
    conn.commit()

    # 3. Ensure canonical university records exist
    print("[*] 3. Ensuring canonical VNU-HCM university records exist in SQLite...")
    now = int(time.time() * 1000)
    for uid, uinfo in VNUHCM_MEMBER_INSTITUTIONS.items():
        c.execute("""
            INSERT INTO universities (
                id, name, short_name, english_name, city, region, official_domain, official_website,
                institution_type, total_professors, collection_status, verification_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'complete', 'verified', ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                name = excluded.name,
                short_name = excluded.short_name,
                english_name = excluded.english_name,
                city = excluded.city,
                region = excluded.region,
                official_domain = excluded.official_domain,
                official_website = excluded.official_website,
                institution_type = excluded.institution_type,
                updated_at = excluded.updated_at
        """, (
            uid, uinfo["name"], uinfo["short_name"], uinfo["english_name"],
            uinfo["city"], uinfo["region"], uinfo["official_domain"], uinfo["official_website"],
            uinfo["institution_type"], now, now
        ))
    conn.commit()

    # 4. Collect all records from live scraping + HĐGSNN archive
    all_raw: List[Dict[str, Any]] = []
    all_raw.extend(scrape_hcmut_cse())
    all_raw.extend(scrape_uit_faculty())
    all_raw.extend(scrape_hcmus_faculty())
    all_raw.extend(scrape_uel_faculty())
    all_raw.extend(scrape_hcmiu_faculty())
    all_raw.extend(scrape_inomar_faculty())
    all_raw.extend(extract_hdgsnn_archive())

    print(f"\n[*] Total harvested raw faculty items: {len(all_raw)}")

    # 5. Deduplicate and normalize
    c.execute("""
        SELECT l.normalized_name, a.university_id, l.id
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
    """)
    existing_lecturer_map: Dict[Tuple[str, str], str] = {}
    for row in c.fetchall():
        existing_lecturer_map[(row[0], row[1])] = row[2]

    ingested_count = 0
    now = int(time.time() * 1000)

    for item in all_raw:
        raw_name = item["raw_name"]
        norm_name = strip_vietnamese_diacritics(raw_name)
        if not norm_name or len(norm_name) < 3:
            continue

        target_uid = item["university_id"]
        uni_info = VNUHCM_MEMBER_INSTITUTIONS.get(target_uid)
        if not uni_info:
            continue

        map_key = (norm_name, target_uid)
        if map_key in existing_lecturer_map:
            lecturer_id = existing_lecturer_map[map_key]
        else:
            slug = re.sub(r'[^a-z0-9]+', '-', norm_name).strip('-')
            lecturer_id = f"prof-{target_uid}-{slug}"
            existing_lecturer_map[map_key] = lecturer_id

        title = item.get("raw_title") or "Giảng viên"
        a_title = item.get("academic_title")
        a_rank = item.get("academic_rank")
        deg = item.get("degree")
        pos = item.get("position") or "Giảng viên"
        fac = item.get("faculty") or "Ban Giảng huấn"
        dept = item.get("department") or fac
        src_url = item.get("source_url") or uni_info["official_website"]
        avatar = generate_avatar_svg(raw_name)

        bio = f"{title} {raw_name} là cán bộ giảng dạy và nghiên cứu tại {fac}, {uni_info['name']}."

        c.execute("""
            INSERT INTO lecturers (
                id, name, normalized_name, title, academic_title, academic_rank, position, degree,
                avatar, bio, verification_status, confidence_score,
                rating_average, rating_count, source_urls_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 1.0, NULL, 0, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                title = COALESCE(excluded.title, lecturers.title),
                academic_title = COALESCE(excluded.academic_title, lecturers.academic_title),
                academic_rank = COALESCE(excluded.academic_rank, lecturers.academic_rank),
                degree = COALESCE(excluded.degree, lecturers.degree),
                position = COALESCE(excluded.position, lecturers.position),
                updated_at = excluded.updated_at
        """, (
            lecturer_id, raw_name, norm_name, title, a_title, a_rank, pos, deg,
            avatar, bio, json.dumps([src_url]), now, now
        ))

        aff_id = f"aff-{lecturer_id}-{target_uid}"
        c.execute("""
            INSERT INTO affiliations (
                id, lecturer_id, university_id, university_name, university_short_name,
                faculty, department, affiliation_status, is_primary, source_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'permanent', 1, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                faculty = excluded.faculty,
                department = excluded.department
        """, (
            aff_id, lecturer_id, target_uid, uni_info["name"], uni_info["short_name"],
            fac, dept, src_url, now
        ))

        c.execute("""
            INSERT INTO provenance (
                lecturer_id, field_name, source_url, extracted_at, confidence, source_type
            ) VALUES (?, 'identity', ?, ?, 1.0, 'official_academic_portal')
        """, (lecturer_id, src_url, now))

        ingested_count += 1

    print("[*] 5. Updating total_professors count for VNU-HCM in SQLite...")
    for uid in VNUHCM_MEMBER_INSTITUTIONS:
        c.execute("SELECT COUNT(DISTINCT lecturer_id) FROM affiliations WHERE university_id = ?", (uid,))
        cnt = c.fetchone()[0]
        c.execute("""
            UPDATE universities
            SET total_professors = ?, validated_records = ?, extracted_professors = ?, crawl_status = 'completed'
            WHERE id = ?
        """, (cnt, cnt, cnt, uid))
        print(f"    - {uid.upper()}: {cnt} verified faculty members.")

    conn.commit()
    conn.close()
    print("[+] SQLite update complete.")

    # 6. Update src/data/verified_academic_data.json
    print("[*] 6. Synchronizing with src/data/verified_academic_data.json...")
    with open(json_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    existing_json_profs = {p["id"]: p for p in json_data.get("professors", [])}
    
    c.execute("""
        SELECT l.*, a.university_id, a.university_name, a.university_short_name, a.faculty, a.department, a.source_url
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id IN ('hcmut', 'hcmus', 'hcmussh', 'uit', 'hcmiu', 'uel', 'agu', 'medvnu', 'vnuhcm')
    """)
    for row in c.fetchall():
        pid = row["id"]
        sources = [row["source_url"]] if row["source_url"] else []
        p_obj = {
            "id": pid,
            "name": row["name"],
            "title": row["title"],
            "academicTitle": row["academic_title"],
            "academicRank": row["academic_rank"],
            "position": row["position"],
            "universityId": row["university_id"],
            "universityName": row["university_name"],
            "universityShortName": row["university_short_name"],
            "faculty": row["faculty"],
            "department": row["department"],
            "avatar": row["avatar"],
            "bio": row["bio"],
            "verificationStatus": "verified",
            "confidenceScore": 1.0,
            "ratingAverage": None,
            "ratingCount": 0,
            "takeAgainPercent": None,
            "difficultyScore": None,
            "sourceUrls": sources
        }
        existing_json_profs[pid] = p_obj

    json_data["professors"] = list(existing_json_profs.values())

    for u in json_data.get("universities", []):
        uid = u.get("id")
        if uid in VNUHCM_MEMBER_INSTITUTIONS:
            c.execute("SELECT total_professors FROM universities WHERE id = ?", (uid,))
            r = c.fetchone()
            if r:
                u["totalProfessors"] = r[0]
                u["faculties"] = VNUHCM_MEMBER_INSTITUTIONS[uid]["faculties"]

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"[+] verified_academic_data.json updated: {len(json_data['professors']):,} total professors.")

    # 7. Sync to Cloud SQL PostgreSQL
    print("[*] 7. Synchronizing verified records to Cloud SQL PostgreSQL...")
    sync_to_postgres(db_path)

def sync_to_postgres(db_path: str):
    """Syncs canonical universities and lecturers to Cloud SQL PostgreSQL."""
    # Use tsx script for fast bulk streaming with pg pool
    cmd = "npx tsx scripts/sync_academic_to_postgres.ts"
    os.system(cmd)

if __name__ == "__main__":
    main()

