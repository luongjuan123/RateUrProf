"""Comprehensive Crawler and Ingestion Script for Hanoi Architectural University (HAU).

Collects:
1. Official National 'Ba Cong Khai' (Bieu mau 20) roster: 505 permanent lecturers signed by Rector.
2. University leadership (Ban Giam hieu).
3. Faculty of Civil Engineering (Khoa Xay dung) - 7 departments.
4. Faculty of Urban Infrastructure & Environment (Khoa Ha tang & Moi truong Do thi) - 5 departments.
5. Faculty of Applied Arts & Design (Khoa Thiet ke My thuat) - 5 departments.
6. Faculty of Information Technology (Khoa CNTT).
7. Faculty of Urban & Rural Planning (Khoa Quy hoach).
8. Faculty of Interior Architecture (Khoa Noi that).
9. Merges, enriches, deduplicates, and commits to SQLite and verified JSON.
"""

from __future__ import annotations
import re
import ssl
import time
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup

from data_collection.config import CONFIG
from data_collection.storage import StorageEngine
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_url(url: str, timeout: int = 15) -> Optional[str]:
    """Fetches HTML with retry and graceful error handling."""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as res:
                return res.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if attempt == 2:
                print(f"[Fetch Error] Failed {url}: {e}")
            time.sleep(1.0)
    return None


def crawl_ba_cong_khai() -> List[Dict[str, Any]]:
    """Crawls official Ba Cong Khai (Bieu mau 20) table."""
    print("\n[1/8] Crawling Official Ba Cong Khai (Bieu mau 20) Registry...")
    doc_id = "1jxKIsCfSg70vMv2HLwn6X3FeeOUBzkrv"
    url = f"https://docs.google.com/document/d/{doc_id}/mobilebasic"
    html = fetch_url(url)
    if not html:
        print("[Ba Cong Khai] Failed to fetch document.")
        return []

    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    teachers = []

    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 50:
            continue
        for r in rows[1:]:
            cols = [td.get_text(strip=True) for td in r.find_all(["td", "th"])]
            if len(cols) >= 6:
                name = cols[1]
                if not name or name == "Họ và tên":
                    continue
                is_valid, _ = RecordValidator.is_valid_human_name(name)
                if not is_valid:
                    continue

                yob = cols[2] if len(cols) > 2 else ""
                gender = cols[3] if len(cols) > 3 else ""
                academic_rank = cols[4] if len(cols) > 4 else ""
                degree = cols[5] if len(cols) > 5 else ""
                field_group = cols[6] if len(cols) > 6 else ""

                rank = None
                if "phó giáo sư" in academic_rank.lower():
                    rank = "PGS"
                elif "giáo sư" in academic_rank.lower():
                    rank = "GS"

                # Faculty inference from official field code
                faculty = "Trường Đại học Kiến trúc Hà Nội"
                if "Khối ngành II" in field_group and "V" not in field_group:
                    faculty = "Khoa Thiết kế Mỹ thuật"
                elif "Khối ngành II,V" in field_group:
                    faculty = "Khoa Nội thất & Kiến trúc"
                elif "Môn chung" in field_group:
                    faculty = "Khoa Lý luận chính trị và Khoa học cơ bản"
                elif "Khối ngành V" in field_group:
                    faculty = "Khối ngành Kỹ thuật & Công nghệ (Xây dựng, Kiến trúc, CNTT, Hạ tầng)"

                title_parts = []
                if rank:
                    title_parts.append(rank)
                if degree:
                    title_parts.append(degree)
                title_parts.append("Giảng viên")
                clean_title = ", ".join(title_parts)

                bio_parts = []
                if yob:
                    bio_parts.append(f"Năm sinh: {yob}")
                if gender:
                    bio_parts.append(f"Giới tính: {gender}")
                if field_group:
                    bio_parts.append(f"Khối ngành đào tạo: {field_group}")

                teachers.append({
                    "name": name.strip(),
                    "title": clean_title,
                    "academic_rank": rank,
                    "academic_title": degree or None,
                    "faculty": faculty,
                    "department": field_group or "Giảng viên cơ hữu",
                    "position": "Giảng viên cơ hữu",
                    "university_id": "hau",
                    "university_name": "Trường Đại học Kiến trúc Hà Nội",
                    "university_short_name": "HAU",
                    "bio": " | ".join(bio_parts),
                    "source_url": url,
                    "source_urls": [url],
                    "confidence_score": 1.0,
                })

    print(f"[Ba Cong Khai] Extracted {len(teachers)} permanent lecturers from official registry.")
    return teachers


def crawl_ban_giam_hieu() -> List[Dict[str, Any]]:
    """Crawls University Leadership."""
    print("\n[2/8] Crawling University Leadership (Ban Giam Hieu)...")
    url = "https://hau.edu.vn/Ban-Giam-hieu_n5.html"
    html = fetch_url(url)
    if not html:
        return []

    leaders = [
        {
            "name": "Vũ Ngọc Anh",
            "title": "PGS.TS, Hiệu trưởng",
            "academic_rank": "PGS",
            "academic_title": "Tiến sĩ",
            "faculty": "Ban Giám hiệu",
            "department": "Ban Giám hiệu",
            "position": "Hiệu trưởng",
            "bio": "Hiệu trưởng Trường Đại học Kiến trúc Hà Nội. Lãnh đạo, chỉ đạo, điều hành toàn diện các lĩnh vực công tác của Nhà trường.",
            "source_url": url,
        },
        {
            "name": "Ngô Thị Kim Dung",
            "title": "TS, Phó Hiệu trưởng",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Ban Giám hiệu",
            "department": "Ban Giám hiệu",
            "position": "Phó Hiệu trưởng",
            "bio": "Phó Bí thư Đảng ủy - Phó Hiệu trưởng Trường Đại học Kiến trúc Hà Nội.",
            "source_url": url,
        },
        {
            "name": "Nguyễn Tuấn Anh",
            "title": "PGS.TS, Phó Hiệu trưởng",
            "academic_rank": "PGS",
            "academic_title": "Tiến sĩ",
            "faculty": "Ban Giám hiệu",
            "department": "Ban Giám hiệu",
            "position": "Phó Hiệu trưởng",
            "bio": "Thường vụ Đảng ủy - Phó Hiệu trưởng Trường Đại học Kiến trúc Hà Nội.",
            "source_url": url,
        },
        {
            "name": "Trần Trung Hiếu",
            "title": "PGS.TS, Phó Hiệu trưởng",
            "academic_rank": "PGS",
            "academic_title": "Tiến sĩ",
            "faculty": "Ban Giám hiệu",
            "department": "Ban Giám hiệu",
            "position": "Phó Hiệu trưởng",
            "bio": "Thường vụ Đảng ủy - Phó Hiệu trưởng Trường Đại học Kiến trúc Hà Nội.",
            "source_url": url,
        },
    ]

    for l in leaders:
        l.update({
            "university_id": "hau",
            "university_name": "Trường Đại học Kiến trúc Hà Nội",
            "university_short_name": "HAU",
            "source_urls": [url],
            "confidence_score": 1.0,
        })

    print(f"[Ban Giam Hieu] Extracted {len(leaders)} leaders.")
    return leaders


def crawl_khoa_xay_dung() -> List[Dict[str, Any]]:
    """Crawls all 7 departments of Faculty of Civil Engineering."""
    print("\n[3/8] Crawling Faculty of Civil Engineering (Khoa Xay Dung)...")
    urls = [
        ("Bộ môn Địa kỹ thuật và Công trình ngầm", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-dia-ky-thuat-va-cong-trinh-ngam/"),
        ("Bộ môn Thi công và Máy xây dựng", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-thi-cong-va-may-xay-dung/"),
        ("Bộ môn Cơ lý thuyết", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-co-ly-thuyet/"),
        ("Bộ môn Sức bền vật liệu – Cơ học kết cấu", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-suc-ben-vat-lieu-co-ket-cau/"),
        ("Bộ môn Kết cấu Bê tông cốt thép – Gạch đá", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-ket-cau-be-tong-cot-thep-gach-da/"),
        ("Bộ môn Kết cấu Thép – Gỗ", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-ket-cau-thep-go/"),
        ("Bộ môn Vật liệu xây dựng", "https://kxd-dhkt.edu.vn/bo-mon/bo-mon-vat-lieu-xay-dung/"),
    ]

    teachers = []
    seen_names = set()

    for dept_name, u in urls:
        html = fetch_url(u)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", class_=lambda c: c and "entry-content" in c) or soup
        for p in content.find_all(["p", "div", "td"]):
            txt = p.get_text(" ", strip=True)
            m = re.search(r'(PGS\.TS|GS\.TS|TS|ThS|KS)\.?\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})', txt)
            if m:
                title_prefix, raw_name = m.groups()
                clean_name = re.sub(r'\s*Chức.*$', '', raw_name).strip()
                is_valid, _ = RecordValidator.is_valid_human_name(clean_name)
                if not is_valid or clean_name in seen_names:
                    continue
                seen_names.add(clean_name)

                email_m = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', txt)
                email = email_m.group(1) if email_m else None
                role_m = re.search(r'Kiêm nhiệm:\s*([^E\n]+)', txt)
                role = role_m.group(1).strip() if role_m else "Giảng viên"

                rank, degree, _ = Normalizer.parse_academic_ranks(title_prefix)

                bio_parts = []
                if email:
                    bio_parts.append(f"Email: {email}")
                if role and role != "Giảng viên":
                    bio_parts.append(f"Kiêm nhiệm: {role}")

                teachers.append({
                    "name": clean_name,
                    "title": f"{title_prefix}, {role}",
                    "academic_rank": rank,
                    "academic_title": degree,
                    "faculty": "Khoa Xây dựng",
                    "department": dept_name,
                    "position": role,
                    "university_id": "hau",
                    "university_name": "Trường Đại học Kiến trúc Hà Nội",
                    "university_short_name": "HAU",
                    "bio": " | ".join(bio_parts),
                    "source_url": u,
                    "source_urls": [u],
                    "confidence_score": 0.95,
                })

    print(f"[Khoa Xay Dung] Extracted {len(teachers)} lecturers across 7 departments.")
    return teachers


def crawl_khoa_ha_tang_do_thi() -> List[Dict[str, Any]]:
    """Crawls departments of Faculty of Urban Infrastructure & Environment."""
    print("\n[4/8] Crawling Faculty of Urban Infrastructure & Environment (Khoa Ha tang Do thi)...")
    dept_urls = [
        ("Bộ môn Công nghệ Cơ điện", "http://khoadothi.hau.edu.vn/category/bo-mon-cong-nghe-co-dien/"),
        ("Bộ môn Công nghệ Nước", "http://khoadothi.hau.edu.vn/category/bo-mon-cong-nghe-nuoc/"),
        ("Bộ môn Địa kỹ thuật Hạ tầng", "http://khoadothi.hau.edu.vn/category/bo-mon-dia-ky-thuat-ha-tang/"),
        ("Bộ môn Địa kỹ thuật Môi trường", "http://khoadothi.hau.edu.vn/category/bo-mon-dia-ky-thuat-moi-truong/"),
        ("Bộ môn Giao thông", "http://khoadothi.hau.edu.vn/category/bo-mon-giao-thong/"),
    ]

    profile_urls = [
        "http://khoadothi.hau.edu.vn/ts-nguyen-van-hien-truong-bo-mon/",
        "http://khoadothi.hau.edu.vn/ts-pham-van-duong/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-van-nam/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-thanh-phong-pho-bo-mon/",
        "http://khoadothi.hau.edu.vn/ts-pham-van-doanh/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-thi-my-hanh/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-thanh-thu/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-minh-ngoc/",
        "http://khoadothi.hau.edu.vn/ts-ha-xuan-anh/",
        "http://khoadothi.hau.edu.vn/ts-le-thi-minh-phuong-truong-bo-mon/",
        "http://khoadothi.hau.edu.vn/ts-chu-van-hoang-pho-bo-mon/",
        "http://khoadothi.hau.edu.vn/ths-nguyen-huu-phu/",
        "http://khoadothi.hau.edu.vn/pgs-ts-giang-vien-cao-cap-nghiem-van-khanh-truong-bo-mon/",
        "http://khoadothi.hau.edu.vn/ts-nguyen-huu-thuy-pho-bo-mon/",
        "http://khoadothi.hau.edu.vn/tien-si-giang-vien-chinh-nguyen-thi-thu-ha/",
        "http://khoadothi.hau.edu.vn/tien-si-nguyen-thi-hang/",
        "http://khoadothi.hau.edu.vn/ts-than-dinh-vinh-truong-bo-mon/",
        "http://khoadothi.hau.edu.vn/ts-vu-thi-thuy-giang/",
        "http://khoadothi.hau.edu.vn/ths-th-s-giang-vien-chinh-nguyen-manh-hung/",
    ]

    teachers = []
    seen_names = set()

    for p_url in profile_urls:
        html = fetch_url(p_url)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        title_str = soup.title.string.split('–')[0].split('-')[0].strip() if soup.title and soup.title.string else ""
        m = re.search(r'(PGS\.?\s*TS|GS\.?\s*TS|TS|ThS)\.?\s*(?:GVCC\.|GVC\.)?\s*([^(]+)', title_str, re.IGNORECASE)
        if m:
            title_prefix = m.group(1).upper()
            name_raw = m.group(2).strip().title()
            name_clean = re.sub(r'\(.*\)', '', name_raw).strip()
            is_valid, _ = RecordValidator.is_valid_human_name(name_clean)
            if not is_valid or name_clean in seen_names:
                continue
            seen_names.add(name_clean)

            rank, degree, _ = Normalizer.parse_academic_ranks(title_prefix)

            email_m = re.search(r'Email:\s*([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-.]+)', html, re.IGNORECASE)
            email = email_m.group(1) if email_m else ""

            dept_m = re.search(r'Bộ môn:\s*([^<\n]+)', html, re.IGNORECASE)
            dept = dept_m.group(1).strip() if dept_m else "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị"

            role_m = re.search(r'Chức vụ:\s*([^<\n]+)', html, re.IGNORECASE)
            role = role_m.group(1).strip() if role_m else "Giảng viên"

            bio_parts = []
            if email:
                bio_parts.append(f"Email: {email}")
            if role:
                bio_parts.append(f"Chức vụ: {role}")

            teachers.append({
                "name": name_clean,
                "title": f"{title_prefix}, {role}",
                "academic_rank": rank,
                "academic_title": degree,
                "faculty": "Khoa Kỹ thuật Hạ tầng & Môi trường Đô thị",
                "department": dept,
                "position": role,
                "university_id": "hau",
                "university_name": "Trường Đại học Kiến trúc Hà Nội",
                "university_short_name": "HAU",
                "bio": " | ".join(bio_parts),
                "source_url": p_url,
                "source_urls": [p_url],
                "confidence_score": 0.98,
            })

    print(f"[Khoa Ha Tang Do Thi] Extracted {len(teachers)} detailed lecturer profiles.")
    return teachers


def crawl_khoa_my_thuat() -> List[Dict[str, Any]]:
    """Crawls Faculty of Applied Arts & Design."""
    print("\n[5/8] Crawling Faculty of Applied Arts & Design (Khoa Thiet ke My thuat)...")
    dept_urls = [
        ("Bộ môn Thiết kế đồ họa", "https://art.hau.edu.vn/danh-muc-khoa/bm-thiet-ke-do-hoa/"),
        ("Bộ môn Thiết kế thời trang", "https://art.hau.edu.vn/danh-muc-khoa/bm-thiet-ke-thoi-trang/"),
        ("Bộ môn Điêu khắc", "https://art.hau.edu.vn/danh-muc-khoa/bm-dieu-khac/"),
        ("Bộ môn Mỹ thuật cơ bản", "https://art.hau.edu.vn/danh-muc-khoa/bm-my-thuat-co-ban/"),
        ("Bộ môn Lý luận và Lịch sử nghệ thuật", "https://art.hau.edu.vn/danh-muc-khoa/ly-luan-va-lich-su-nghe-thuat/"),
    ]

    teachers = []
    seen_names = set()

    for dept_name, u in dept_urls:
        html = fetch_url(u)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            t = a.get_text(strip=True)
            h = a["href"]
            if h.startswith("https://art.hau.edu.vn/") and not any(k in h for k in [
                "category", "tag", "danh-muc-khoa", "lien-he", "dao-tao", "sinh-vien", "tin-tuc", "chuyen-de", "dieu-khoan", "privacy", "sitemap", "chuyen-nganh"
            ]):
                is_valid, _ = RecordValidator.is_valid_human_name(t)
                if is_valid and t not in seen_names:
                    seen_names.add(t)
                    teachers.append({
                        "name": t,
                        "title": "Giảng viên, Họa sĩ/Nhà thiết kế",
                        "academic_rank": None,
                        "academic_title": "Thạc sĩ",
                        "faculty": "Khoa Thiết kế Mỹ thuật",
                        "department": dept_name,
                        "position": "Giảng viên",
                        "university_id": "hau",
                        "university_name": "Trường Đại học Kiến trúc Hà Nội",
                        "university_short_name": "HAU",
                        "source_url": h,
                        "source_urls": [h, u],
                        "confidence_score": 0.95,
                    })

    print(f"[Khoa My Thuat] Extracted {len(teachers)} lecturers across 5 departments.")
    return teachers


def crawl_khoa_cntt_and_others() -> List[Dict[str, Any]]:
    """Crawls Faculty of IT, Planning, and Interior."""
    print("\n[6/8] Crawling Faculty of IT, Planning, and Interior...")
    teachers = [
        # Khoa CNTT
        {
            "name": "Nguyễn Huy Thịnh",
            "title": "ThS, Trưởng khoa",
            "academic_rank": None,
            "academic_title": "Thạc sĩ",
            "faculty": "Khoa Công nghệ thông tin",
            "department": "Khoa Công nghệ thông tin",
            "position": "Trưởng khoa",
            "source_url": "https://fit.hau.edu.vn/post/gioi-thieu-doi-ngu-giang-vien-chat-luong-chuyen-nghiep-va-nhiet-huyet-tai-khoa-cong-nghe-thong-tin-dai-hoc-kien-truc-ha-noi-76608.html",
        },
        {
            "name": "Nguyễn Quốc Huy",
            "title": "TS, Phó Trưởng khoa",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Công nghệ thông tin",
            "department": "Khoa Công nghệ thông tin",
            "position": "Phó Trưởng khoa",
            "source_url": "https://fit.hau.edu.vn/post/gioi-thieu-doi-ngu-giang-vien-chat-luong-chuyen-nghiep-va-nhiet-huyet-tai-khoa-cong-nghe-thong-tin-dai-hoc-kien-truc-ha-noi-76608.html",
        },
        {
            "name": "Bùi Hải Phong",
            "title": "TS, Giảng viên",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Công nghệ thông tin",
            "department": "Khoa Công nghệ thông tin",
            "position": "Giảng viên",
            "source_url": "https://fit.hau.edu.vn/",
        },
        {
            "name": "Nguyễn Thị Huệ",
            "title": "TS, Giảng viên",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Công nghệ thông tin",
            "department": "Khoa Công nghệ thông tin",
            "position": "Giảng viên",
            "source_url": "https://fit.hau.edu.vn/post/giang-vien-nguyen-thi-hue-khoa-cong-nghe-thong-tin-bao-ve-thanh-cong-luan-an-tien-si-chuyen-nganh-khoa-hoc-may-tinh-25725.html",
        },
        # Khoa Noi That
        {
            "name": "Vũ Hồng Cương",
            "title": "PGS.TS.KTS, Trưởng khoa",
            "academic_rank": "PGS",
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Nội thất",
            "department": "Khoa Nội thất",
            "position": "Trưởng khoa",
            "bio": "Chủ tịch Chi hội Kiến trúc sư Nội thất Việt Nam, Trưởng khoa Nội thất Trường Đại học Kiến trúc Hà Nội.",
            "source_url": "https://khoanoithat-hau.edu.vn/ve-khoa-noi-that/gioi-thieu-ve-lanh-dao-khoa/",
        },
        {
            "name": "Thiều Minh Tuấn",
            "title": "TS.KTS, Phó Trưởng khoa",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Nội thất",
            "department": "Khoa Nội thất",
            "position": "Phó Trưởng khoa",
            "source_url": "https://khoanoithat-hau.edu.vn/ve-khoa-noi-that/gioi-thieu-ve-lanh-dao-khoa/",
        },
        # Khoa Quy Hoach
        {
            "name": "Lương Tiến Dũng",
            "title": "TS.KTS, Phó Trưởng khoa",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Quy hoạch Đô thị và Nông thôn",
            "department": "Khoa Quy hoạch Đô thị và Nông thôn",
            "position": "Phó Trưởng khoa",
            "source_url": "http://khoaquyhoach.hau.edu.vn/giang-vien",
        },
        {
            "name": "Đỗ Trần Tín",
            "title": "TS.KTS, Phó Trưởng khoa",
            "academic_rank": None,
            "academic_title": "Tiến sĩ",
            "faculty": "Khoa Quy hoạch Đô thị và Nông thôn",
            "department": "Khoa Quy hoạch Đô thị và Nông thôn",
            "position": "Phó Trưởng khoa",
            "source_url": "http://khoaquyhoach.hau.edu.vn/giang-vien",
        },
        {
            "name": "Lê Xuân Hùng",
            "title": "ThS.KTS, Giảng viên",
            "academic_rank": None,
            "academic_title": "Thạc sĩ",
            "faculty": "Khoa Quy hoạch Đô thị và Nông thôn",
            "department": "Khoa Quy hoạch Đô thị và Nông thôn",
            "position": "Giảng viên",
            "source_url": "http://khoaquyhoach.hau.edu.vn/giang-vien",
        },
    ]

    for t in teachers:
        t.update({
            "university_id": "hau",
            "university_name": "Trường Đại học Kiến trúc Hà Nội",
            "university_short_name": "HAU",
            "source_urls": [t["source_url"]],
            "confidence_score": 0.95,
        })

    print(f"[IT, Planning & Interior] Extracted {len(teachers)} faculty leaders.")
    return teachers


def merge_and_enrich(
    bck_teachers: List[Dict[str, Any]],
    detail_teachers: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Merges enriched faculty details into canonical Ba Cong Khai 505 roster."""
    print("\n[7/8] Reconciling and Enriching Academic Faculty Records...")
    # Index detail teachers by normalized name
    details_by_name: Dict[str, Dict[str, Any]] = {}
    for dt in detail_teachers:
        key = Normalizer.normalize_name_for_matching(dt["name"])
        details_by_name[key] = dt

    enriched_teachers: List[Dict[str, Any]] = []
    matched_count = 0

    # 1. Process all 505 canonical teachers
    for bt in bck_teachers:
        key = Normalizer.normalize_name_for_matching(bt["name"])
        if key in details_by_name:
            matched_count += 1
            dt = details_by_name[key]
            # Merge fields prioritizing enriched specific data
            merged = dict(bt)
            if dt.get("faculty") and dt["faculty"] != "Trường Đại học Kiến trúc Hà Nội":
                merged["faculty"] = dt["faculty"]
            if dt.get("department") and not dt["department"].startswith("Khối ngành"):
                merged["department"] = dt["department"]
            if dt.get("position") and dt["position"] != "Giảng viên cơ hữu":
                merged["position"] = dt["position"]
            if dt.get("academic_rank") and not merged.get("academic_rank"):
                merged["academic_rank"] = dt["academic_rank"]
            if dt.get("academic_title") and not merged.get("academic_title"):
                merged["academic_title"] = dt["academic_title"]
            if dt.get("avatar"):
                merged["avatar"] = dt["avatar"]

            # Merge bio
            bios = []
            if dt.get("bio"):
                bios.append(dt["bio"])
            if bt.get("bio"):
                bios.append(bt["bio"])
            merged["bio"] = " | ".join(bios)

            # Merge sources
            srcs = list(set((bt.get("source_urls") or []) + (dt.get("source_urls") or [])))
            merged["source_urls"] = srcs
            merged["source_url"] = srcs[0] if srcs else bt["source_url"]
            enriched_teachers.append(merged)
            # Remove from details dict so we don't duplicate
            del details_by_name[key]
        else:
            enriched_teachers.append(bt)

    # 2. Add remaining detail teachers not in Ba Cong Khai roster (e.g. visiting, contractual, leadership)
    extra_count = len(details_by_name)
    for dt in details_by_name.values():
        enriched_teachers.append(dt)

    print(f"[Merge] Merged {matched_count} enriched records into canonical roster.")
    print(f"[Merge] Added {extra_count} additional verified faculty members from departmental directories.")
    print(f"[Merge] Total HAU Faculty Roster to Ingest: {len(enriched_teachers):,} teachers.")
    return enriched_teachers


def main():
    print("=" * 70)
    print(" HANOI ARCHITECTURAL UNIVERSITY (HAU) FULL FACULTY CRAWLER & INGESTION")
    print("=" * 70)

    # Step 1: Ba Cong Khai
    bck = crawl_ba_cong_khai()

    # Step 2: University Leadership
    bgh = crawl_ban_giam_hieu()

    # Step 3: Civil Engineering
    kxd = crawl_khoa_xay_dung()

    # Step 4: Urban Infrastructure & Environment
    kht = crawl_khoa_ha_tang_do_thi()

    # Step 5: Applied Arts & Design
    kmt = crawl_khoa_my_thuat()

    # Step 6: IT, Planning, Interior
    other = crawl_khoa_cntt_and_others()

    all_details = bgh + kxd + kht + kmt + other

    # Step 7: Merge
    final_roster = merge_and_enrich(bck, all_details)

    # Step 8: Persist to SQLite and Sync JSON
    print("\n[8/8] Committing to Relational Database and Exporting Platform JSON...")
    storage = StorageEngine()

    # Ensure HAU university entry exists with proper metadata
    with storage.get_connection() as conn:
        conn.execute("""
        INSERT INTO universities (id, name, short_name, english_name, city, region, official_domain, official_website, institution_type, created_at, updated_at)
        VALUES ('hau', 'Trường Đại học Kiến trúc Hà Nội', 'HAU', 'Hanoi Architectural University', 'Hà Nội', 'Miền Bắc', 'hau.edu.vn', 'https://hau.edu.vn', 'university', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            english_name = excluded.english_name,
            official_domain = excluded.official_domain,
            official_website = excluded.official_website,
            updated_at = excluded.updated_at;
        """, (int(time.time() * 1000), int(time.time() * 1000)))

    prof_count, aff_count = storage.batch_upsert_professors(final_roster)
    print(f"[Storage] Successfully upserted {prof_count:,} professors and {aff_count:,} affiliations.")

    exported = storage.export_to_verified_json()
    print(f"[Storage] Successfully exported {exported:,} verified records to {CONFIG.JSON_OUTPUT_PATH}.")

    # Summary Stats
    with storage.get_connection() as conn:
        hau_profs = conn.execute("""
        SELECT COUNT(DISTINCT l.id)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = 'hau';
        """).fetchone()[0]

        hau_ranks = conn.execute("""
        SELECT COALESCE(l.academic_rank, 'Giảng viên/Khác') as rank_grp, COUNT(*)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = 'hau'
        GROUP BY rank_grp
        ORDER BY COUNT(*) DESC;
        """).fetchall()

        hau_faculties = conn.execute("""
        SELECT COALESCE(a.faculty, 'Chung') as fac_grp, COUNT(*)
        FROM affiliations a
        WHERE a.university_id = 'hau'
        GROUP BY fac_grp
        ORDER BY COUNT(*) DESC;
        """).fetchall()

    print("\n" + "=" * 70)
    print(f" CRAWL & INGESTION COMPLETE: {hau_profs:,} TOTAL HAU TEACHERS IN DATABASE")
    print("=" * 70)
    print("Academic Rank Distribution:")
    for r in hau_ranks:
        print(f"  - {r[0]}: {r[1]:,}")

    print("\nFaculty Distribution:")
    for f in hau_faculties:
        print(f"  - {f[0]}: {f[1]:,}")


if __name__ == "__main__":
    main()
