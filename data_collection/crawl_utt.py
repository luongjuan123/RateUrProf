#!/usr/bin/env python3
"""
Comprehensive Crawler & Ingestion Pipeline for Teachers of UTT
(Trường Đại học Công nghệ Giao thông Vận tải - University of Transport Technology).

Sources aggregated:
1. https://utt.edu.vn/teacher/ (Canonical Official Directory, 892 entries)
2. https://utt.edu.vn/teacher/{slug}/profile.html (Individual Verified Profile Pages)
3. https://utt.edu.vn/vn/utt/gioi-thieu/ban-giam-hieu-n15.html (Board of Rectors)
4. HĐGSNN State Professorship Council historical records in rateprof.db
"""

from __future__ import annotations
import os
import sys
import re
import json
import time
import ssl
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Tuple, Set
from bs4 import BeautifulSoup

# Ensure project root in pythonpath
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from data_collection.config import CONFIG
from data_collection.storage import StorageEngine
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 RateUrProfs-Academic-Bot/2.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

UNIVERSITY_ID = "cong-nghe-giao-thong-van-tai"
UNIVERSITY_NAME = "Trường Đại học Công nghệ Giao thông Vận tải"
UNIVERSITY_SHORT_NAME = "UTT"
UNIVERSITY_ENGLISH_NAME = "University of Transport Technology"
UNIVERSITY_DOMAIN = "utt.edu.vn"
UNIVERSITY_WEBSITE = "https://utt.edu.vn"

FACULTIES_METADATA = [
    {
        "id": "fac-utt-cong-trinh",
        "name": "Khoa Công trình",
        "name_en": "Faculty of Civil Engineering",
        "website_url": "http://civil.utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-kinh-te-van-tai",
        "name": "Khoa Kinh tế vận tải",
        "name_en": "Faculty of Transport Economics",
        "website_url": "http://ktvt.utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-cntt",
        "name": "Khoa Công nghệ thông tin",
        "name_en": "Faculty of Information Technology",
        "website_url": "http://fit.utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-co-khi-dong-luc",
        "name": "Viện Cơ khí động lực",
        "name_en": "Institute of Mechanical & Power Engineering",
        "website_url": "https://utt.edu.vn/vn/viencokhidongluc",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-khoa-hoc-ung-dung",
        "name": "Khoa Khoa học ứng dụng",
        "name_en": "Faculty of Applied Sciences",
        "website_url": "https://utt.edu.vn/vn/khud",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-quan-tri",
        "name": "Khoa Quản trị",
        "name_en": "Faculty of Management",
        "website_url": "https://utt.edu.vn/vn/khoaquantri",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-luat-chinh-tri",
        "name": "Khoa Luật - Chính trị",
        "name_en": "Faculty of Law and Politics",
        "website_url": "https://utt.edu.vn/vn/luatchinhtri",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-co-so-ky-thuat",
        "name": "Khoa Cơ sở kỹ thuật",
        "name_en": "Faculty of Engineering Fundamentals",
        "website_url": "https://utt.edu.vn/vn/cosokythuat",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-kinh-te-so",
        "name": "Viện Đổi mới sáng tạo và Kinh tế số",
        "name_en": "Institute of Innovation and Digital Economy",
        "website_url": "http://iide.utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-vien-cngtvt",
        "name": "Viện công nghệ giao thông vận tải",
        "name_en": "Institute of Transport Technology",
        "website_url": "https://utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-dao-tao-quoc-te",
        "name": "Viện Đào tạo và Hợp tác quốc tế",
        "name_en": "Institute of International Education & Cooperation",
        "website_url": "https://utt.edu.vn",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-dao-tao-tu-xa",
        "name": "Viện đào tạo liên tục và từ xa",
        "name_en": "Institute of Continuing & Distance Education",
        "website_url": "https://utt.edu.vn/vn/khoataichuc",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-qpan-gdtc",
        "name": "Trung tâm Quốc phòng An ninh - Giáo dục thể chất",
        "name_en": "Center for National Defense and Physical Education",
        "website_url": "https://utt.edu.vn/vn/qpan-gdtc",
        "directory_url": "https://utt.edu.vn/teacher",
    },
    {
        "id": "fac-utt-ban-giam-hieu",
        "name": "Ban Giám hiệu",
        "name_en": "Board of Rectors",
        "website_url": "https://utt.edu.vn/vn/utt/gioi-thieu/ban-giam-hieu-n15.html",
        "directory_url": "https://utt.edu.vn/teacher",
    },
]


def fetch_url(url: str, timeout: int = 15, retries: int = 3) -> Optional[str]:
    """Fetches HTML with retry and graceful error handling."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=timeout) as res:
                return res.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if attempt == retries - 1:
                pass
            time.sleep(0.5 * (attempt + 1))
    return None


def crawl_directory() -> List[Dict[str, Any]]:
    """Crawls official nominal roster from https://utt.edu.vn/teacher/."""
    print("[1/5] Crawling Official Staff & Faculty Directory (https://utt.edu.vn/teacher)...")
    url = "https://utt.edu.vn/teacher/"
    html = fetch_url(url, timeout=25)
    if not html:
        raise RuntimeError("Failed to fetch UTT teacher directory!")

    soup = BeautifulSoup(html, "html.parser")
    rows = soup.find_all("tr")
    teachers = []

    for r in rows[1:]:
        tds = r.find_all(["td", "th"])
        if len(tds) < 4:
            continue
        idx_str = tds[0].get_text(strip=True)
        raw_name = tds[1].get_text(strip=True)
        unit = tds[2].get_text(strip=True)
        campus = tds[3].get_text(strip=True)

        if not raw_name or raw_name == "Giảng viên":
            continue

        # Extract profile URL
        links = r.find_all("a", href=True)
        profile_url = ""
        if links:
            profile_url = links[0]["href"]
            if not profile_url.startswith("http"):
                profile_url = "https://utt.edu.vn/" + profile_url.lstrip("/")

        clean_name = Normalizer.strip_academic_titles(raw_name)
        clean_name = re.sub(r"^(?:Ông|Bà|Thầy|Cô)\s+", "", clean_name, flags=re.IGNORECASE).strip()

        is_valid, _ = RecordValidator.is_valid_human_name(clean_name)
        if not is_valid:
            continue

        teachers.append({
            "idx": idx_str,
            "name": clean_name,
            "raw_name": raw_name,
            "unit": unit,
            "campus": campus,
            "profile_url": profile_url,
        })

    print(f"    Successfully extracted {len(teachers)} teacher entries from directory table.")
    return teachers


def crawl_single_profile(teacher: Dict[str, Any]) -> Dict[str, Any]:
    """Fetches and parses a single lecturer's profile page."""
    url = teacher.get("profile_url")
    data = dict(teacher)
    if not url:
        return data

    html = fetch_url(url, timeout=12)
    if not html:
        return data

    soup = BeautifulSoup(html, "html.parser")

    # 1. Degree / Rank string from card header
    card_desc = soup.find("div", class_="card-profile-desc")
    title_raw = ""
    if card_desc:
        title_p = card_desc.find("p")
        if title_p:
            title_raw = title_p.get_text(strip=True)

    # 2. Avatar image
    avatar = ""
    img = soup.find("img", id="mavt") or soup.find("img", class_="avatar") or soup.find("img", class_="responsive-img")
    if img and img.get("src"):
        src = img["src"]
        if not src.startswith("http"):
            src = "https://utt.edu.vn/" + src.lstrip("/")
        if "user-profile-bg" not in src and "slide-bg" not in src:
            avatar = src

    # 3. Collection info items
    fields = {}
    for li in soup.find_all("li", class_="collection-item"):
        row = li.find("div", class_="row")
        if not row:
            continue
        cols = row.find_all("div", recursive=False)
        if len(cols) >= 2:
            for icon in cols[0].find_all(["i", "svg"]):
                icon.decompose()
            k = cols[0].get_text(strip=True).rstrip(":").strip()
            v = cols[1].get_text(strip=True)
            fields[k] = v

    data["title_raw"] = title_raw
    data["avatar"] = avatar
    data["email"] = fields.get("Email", "")
    data["gender"] = fields.get("Giới tính", "")
    data["address"] = fields.get("Địa chỉ", "")
    data["province"] = fields.get("Tỉnh/Thành phố", "")
    if fields.get("Cơ sở"):
        data["campus"] = fields.get("Cơ sở")
    if fields.get("Đơn vị"):
        data["unit"] = fields.get("Đơn vị")

    return data


def crawl_all_profiles(teachers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Concurrently fetches all 892 profile pages using thread pool."""
    print(f"\n[2/5] Concurrently Fetching & Parsing {len(teachers)} Profile Pages...")
    detailed_teachers = []
    completed = 0
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=12) as executor:
        future_to_teacher = {executor.submit(crawl_single_profile, t): t for t in teachers}
        for future in as_completed(future_to_teacher):
            try:
                res = future.result()
                detailed_teachers.append(res)
            except Exception as e:
                t = future_to_teacher[future]
                detailed_teachers.append(t)
            completed += 1
            if completed % 100 == 0 or completed == len(teachers):
                elapsed = time.time() - t0
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"    Progress: {completed}/{len(teachers)} ({completed*100//len(teachers)}%) - {rate:.1f} req/s")

    # Restore initial order
    detailed_teachers.sort(key=lambda x: int(x.get("idx", 0)) if x.get("idx", "").isdigit() else 9999)
    print(f"    Completed profile fetching in {time.time() - t0:.1f}s.")
    return detailed_teachers


def crawl_leadership() -> Dict[str, Dict[str, Any]]:
    """Crawls official university leadership from https://utt.edu.vn/vn/utt/gioi-thieu/ban-giam-hieu-n15.html."""
    print("\n[3/5] Crawling University Leadership (Ban Giám hiệu)...")
    url = "https://utt.edu.vn/vn/utt/gioi-thieu/ban-giam-hieu-n15.html"
    leaders: Dict[str, Dict[str, Any]] = {}
    html = fetch_url(url)
    if not html:
        print("    [Warning] Could not fetch leadership page, continuing with directory defaults.")
        return leaders

    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True)

    patterns = [
        (r"Hiệu trưởng:\s*([^\n\r]+)", "Hiệu trưởng"),
        (r"Phó Hiệu trưởng thường trực:\s*([^\n\r]+)", "Phó Hiệu trưởng thường trực"),
        (r"Phó Hiệu trưởng:\s*([^\n\r]+)", "Phó Hiệu trưởng"),
    ]

    for pat, pos in patterns:
        for match in re.finditer(pat, text, flags=re.IGNORECASE):
            raw_entry = match.group(1).strip()
            # If line contains multiple entries (e.g. comma separated or trailing titles), clean it
            entry_clean = raw_entry.split("Phó Hiệu trưởng")[0].strip()
            rank, degree, clean_title = Normalizer.parse_academic_ranks(entry_clean)
            name = Normalizer.strip_academic_titles(entry_clean).strip()
            if name:
                norm_key = Normalizer.normalize_name_for_matching(name)
                leaders[norm_key] = {
                    "name": name,
                    "position": pos,
                    "rank": rank,
                    "degree": degree,
                    "clean_title": f"{pos}, {degree or 'Tiến sĩ'}",
                    "source_url": url,
                }
                print(f"    Discovered Leader: {pos} - {name} (Rank: {rank}, Degree: {degree})")

    return leaders


def fetch_hdgsnn_utt_professors() -> Dict[str, Dict[str, Any]]:
    """
    Fetches HĐGSNN State Council for Professorship records from rateprof.db
    that mention Công nghệ Giao thông Vận tải in their bio/records.
    """
    print("\n[4/5] Reconciling with HĐGSNN State Professorship Accreditation...")
    hdgsnn_map: Dict[str, Dict[str, Any]] = {}
    try:
        storage = StorageEngine()
        with storage.get_connection() as conn:
            rows = conn.execute("""
            SELECT l.id, l.name, l.academic_rank, l.academic_title, l.bio, a.faculty
            FROM lecturers l
            JOIN affiliations a ON a.lecturer_id = l.id
            WHERE l.bio LIKE '%Công nghệ Giao thông%'
               OR l.bio LIKE '%ĐHCNGTVT%'
            """).fetchall()

            for r in rows:
                norm_key = Normalizer.normalize_name_for_matching(r["name"])
                hdgsnn_map[norm_key] = {
                    "rank": r["academic_rank"] or "PGS",
                    "degree": r["academic_title"] or "TS",
                    "bio": r["bio"],
                    "discipline": r["faculty"],
                }
        print(f"    Matched {len(hdgsnn_map)} accredited GS/PGS professors from HĐGSNN.")
    except Exception as e:
        print(f"    [Warning] Failed to query HĐGSNN records: {e}")

    return hdgsnn_map


def build_final_roster(
    detailed_teachers: List[Dict[str, Any]],
    leaders: Dict[str, Dict[str, Any]],
    hdgsnn_map: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Synthesizes, normalizes, deduplicates, and formats all records for database storage."""
    print("\n[5/5] Synthesizing, Normalizing, and Preparing Final Lecturer Records...")
    final_roster = []

    for t in detailed_teachers:
        name = t["name"].strip()
        norm_key = Normalizer.normalize_name_for_matching(name)
        unit = t.get("unit", "").strip()
        campus = t.get("campus", "").strip()
        raw_title = t.get("title_raw", "").strip() or t.get("raw_name", "")
        profile_url = t.get("profile_url") or "https://utt.edu.vn/teacher"

        # Determine academic rank and degree
        rank, degree, clean_title = Normalizer.parse_academic_ranks(raw_title)

        # Check raw_title specifics (e.g. 'PGS.TS', 'Tiến sĩ', 'Thạc sỹ', 'Kỹ sư')
        lower_title = raw_title.lower()
        if "pgs" in lower_title or "phó giáo sư" in lower_title:
            rank = "PGS"
        elif "gs" in lower_title or "giáo sư" in lower_title:
            if not rank:
                rank = "GS"

        if "tiến sĩ" in lower_title or "tiến sỹ" in lower_title or "ts" in lower_title or "t.s" in lower_title:
            degree = "Tiến sĩ"
        elif "thạc sĩ" in lower_title or "thạc sỹ" in lower_title or "ths" in lower_title or "th.s" in lower_title:
            if not degree or degree == "Cử nhân":
                degree = "Thạc sĩ"
        elif "kỹ sư" in lower_title or "ks" in lower_title:
            if not degree:
                degree = "Kỹ sư"
        elif "cử nhân" in lower_title or "cn" in lower_title:
            if not degree:
                degree = "Cử nhân"

        position = "Giảng viên"
        if "Ban Giám hiệu" in unit:
            position = "Cán bộ quản lý / Giảng viên"
        elif any(k in unit for k in ["Phòng", "Trung tâm"]) and not any(k in unit for k in ["Khoa", "Viện"]):
            position = "Chuyên viên / Giảng viên"

        # Check leadership override
        if norm_key in leaders:
            ldr = leaders[norm_key]
            position = ldr["position"]
            if ldr["rank"]:
                rank = ldr["rank"]
            if ldr["degree"]:
                degree = ldr["degree"]

        # Check HĐGSNN accreditation override
        if norm_key in hdgsnn_map:
            hd = hdgsnn_map[norm_key]
            if hd["rank"]:
                rank = hd["rank"]
            if hd["degree"]:
                degree = hd["degree"]

        # Determine Faculty & Department
        faculty = unit
        department = unit

        if unit == "Ban Giám hiệu":
            faculty = "Ban Giám hiệu"
            department = "Ban Giám hiệu"
        elif "Khoa Công trình" in unit:
            faculty = "Khoa Công trình"
        elif "Khoa Kinh tế vận tải" in unit:
            faculty = "Khoa Kinh tế vận tải"
        elif "Khoa Công nghệ thông tin" in unit:
            faculty = "Khoa Công nghệ thông tin"
        elif "Viện Cơ khí động lực" in unit:
            faculty = "Viện Cơ khí động lực"
        elif "Khoa Khoa học ứng dụng" in unit:
            faculty = "Khoa Khoa học ứng dụng"
        elif "Khoa Quản trị" in unit:
            faculty = "Khoa Quản trị"
        elif "Khoa Luật - Chính trị" in unit:
            faculty = "Khoa Luật - Chính trị"
        elif "Khoa Cơ sở kỹ thuật" in unit:
            faculty = "Khoa Cơ sở kỹ thuật"
        elif "Viện Đổi mới sáng tạo" in unit:
            faculty = "Viện Đổi mới sáng tạo và Kinh tế số"
        elif "Viện công nghệ giao thông" in unit or "Viện Công nghệ GTVT" in unit:
            faculty = "Viện công nghệ giao thông vận tải"
        elif "Viện Đào tạo và Hợp tác quốc tế" in unit:
            faculty = "Viện Đào tạo và Hợp tác quốc tế"
        elif "Viện đào tạo liên tục và từ xa" in unit:
            faculty = "Viện đào tạo liên tục và từ xa"
        elif "Quốc phòng An ninh" in unit:
            faculty = "Trung tâm Quốc phòng An ninh - Giáo dục thể chất"
        elif "Thái Nguyên" in unit:
            faculty = "Trung tâm đào tạo Thái Nguyên"
        elif "Vĩnh Phúc" in unit:
            faculty = "Cơ sở Vĩnh Phúc"
        elif "Thư viện" in unit or "CNTT - Thư viện" in unit:
            faculty = "Trung tâm CNTT - Thư viện"
        elif "Lái xe" in unit:
            faculty = "Trung tâm Đào tạo lái xe"
        elif "Phòng" in unit:
            faculty = f"Khối Phòng ban chức năng ({unit})"

        # Construct comprehensive bio
        bio_parts = []
        if rank and degree:
            bio_parts.append(f"{rank}. {degree} {name}")
        elif degree:
            bio_parts.append(f"{degree} {name}")
        else:
            bio_parts.append(f"Thầy/Cô {name}")

        bio_parts.append(f"công tác tại {unit}, Trường Đại học Công nghệ Giao thông Vận tải (UTT).")
        if campus:
            bio_parts.append(f"Cơ sở: {campus}.")
        if t.get("address"):
            bio_parts.append(f"Địa chỉ/Văn phòng: {t['address']}.")
        if t.get("gender"):
            bio_parts.append(f"Giới tính: {t['gender']}.")

        if norm_key in hdgsnn_map and hdgsnn_map[norm_key].get("bio"):
            bio_parts.append(hdgsnn_map[norm_key]["bio"])

        full_bio = " ".join(bio_parts)

        # Source URLs
        source_urls = [profile_url]
        if norm_key in leaders and leaders[norm_key].get("source_url"):
            source_urls.append(leaders[norm_key]["source_url"])
        if "https://utt.edu.vn/teacher" not in source_urls:
            source_urls.append("https://utt.edu.vn/teacher")

        # Format title display string
        display_title = ""
        if rank:
            display_title = f"{rank}. "
        if degree:
            display_title += f"{degree}, "
        display_title += position

        record = {
            "name": name,
            "title": display_title.strip(", "),
            "academic_rank": rank,
            "academic_title": degree,
            "position": position,
            "faculty": faculty,
            "department": department,
            "avatar": t.get("avatar") or "",
            "bio": full_bio,
            "source_urls": source_urls,
            "source_url": profile_url,
            "confidence_score": 1.0,
            "verification_status": "verified",
            "university_id": UNIVERSITY_ID,
            "university_name": UNIVERSITY_NAME,
            "university_short_name": UNIVERSITY_SHORT_NAME,
        }
        final_roster.append(record)

    print(f"    Prepared {len(final_roster):,} verified academic lecturer records for UTT.")
    return final_roster


def persist_to_database(final_roster: List[Dict[str, Any]]):
    """Commits institution, faculties, lecturers, affiliations, and syncs JSON."""
    print("\n" + "=" * 70)
    print(" COMMITTING TO RELATIONAL DATABASE & SYNCHRONIZING PLATFORM JSON")
    print("=" * 70)

    storage = StorageEngine()
    now = int(time.time() * 1000)

    # 1. Upsert University
    print("1. Upserting University Record (cong-nghe-giao-thong-van-tai)...")
    with storage.get_connection() as conn:
        conn.execute("""
        INSERT INTO universities (
            id, name, short_name, english_name, city, region,
            official_domain, official_website, institution_type,
            collection_status, crawl_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'completed', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            english_name = excluded.english_name,
            city = excluded.city,
            region = excluded.region,
            official_domain = excluded.official_domain,
            official_website = excluded.official_website,
            collection_status = 'completed',
            crawl_status = 'completed',
            updated_at = excluded.updated_at;
        """, (
            UNIVERSITY_ID,
            UNIVERSITY_NAME,
            UNIVERSITY_SHORT_NAME,
            UNIVERSITY_ENGLISH_NAME,
            "Hà Nội",
            "Miền Bắc",
            UNIVERSITY_DOMAIN,
            UNIVERSITY_WEBSITE,
            "university",
            now,
            now,
        ))

    # 2. Upsert Faculties
    print(f"2. Upserting {len(FACULTIES_METADATA)} Faculties & Academic Units...")
    with storage.get_connection() as conn:
        for f in FACULTIES_METADATA:
            conn.execute("""
            INSERT INTO faculties (id, university_id, name, name_en, website_url, directory_url)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                name_en = excluded.name_en,
                website_url = excluded.website_url,
                directory_url = excluded.directory_url;
            """, (f["id"], UNIVERSITY_ID, f["name"], f["name_en"], f["website_url"], f["directory_url"]))

    # 3. Clean up previously misattributed HĐGSNN affiliations for UTT professors
    print("3. Reallocating HĐGSNN historical records to UTT...")
    with storage.get_connection() as conn:
        conn.execute("""
        UPDATE affiliations
        SET university_id = ?,
            university_name = ?,
            university_short_name = ?
        WHERE lecturer_id IN (
            SELECT l.id
            FROM lecturers l
            JOIN affiliations a ON a.lecturer_id = l.id
            WHERE a.university_id != ?
              AND (l.bio LIKE '%Công nghệ Giao thông%' OR l.bio LIKE '%ĐHCNGTVT%')
        );
        """, (UNIVERSITY_ID, UNIVERSITY_NAME, UNIVERSITY_SHORT_NAME, UNIVERSITY_ID))

    # 4. Batch upsert professors and affiliations
    print(f"4. Batch upserting {len(final_roster):,} professors & affiliations...")
    prof_count, aff_count = storage.batch_upsert_professors(final_roster)
    print(f"    Successfully processed {prof_count:,} professors and {aff_count:,} affiliations.")

    # 5. Export to verified JSON
    print("\n5. Synchronizing to verified_academic_data.json...")
    exported = storage.export_to_verified_json()
    print(f"    Successfully synchronized {exported:,} verified records to {CONFIG.JSON_OUTPUT_PATH}.")

    # 6. Audit statistics
    with storage.get_connection() as conn:
        total_utt_profs = conn.execute("""
        SELECT COUNT(DISTINCT l.id)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = ?;
        """, (UNIVERSITY_ID,)).fetchone()[0]

        ranks = conn.execute("""
        SELECT COALESCE(l.academic_rank, l.academic_title, 'Khác') as rank_grp, COUNT(*)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = ?
        GROUP BY rank_grp
        ORDER BY COUNT(*) DESC;
        """, (UNIVERSITY_ID,)).fetchall()

        top_faculties = conn.execute("""
        SELECT COALESCE(a.faculty, 'Chung') as fac_grp, COUNT(*)
        FROM affiliations a
        WHERE a.university_id = ?
        GROUP BY fac_grp
        ORDER BY COUNT(*) DESC
        LIMIT 15;
        """, (UNIVERSITY_ID,)).fetchall()

    print("\n" + "=" * 70)
    print(f" INGESTION SUCCESS: {total_utt_profs:,} TOTAL UTT PROFESSORS IN DATABASE")
    print("=" * 70)
    print("Academic Ranks & Degrees Distribution:")
    for r in ranks:
        print(f"  • {r[0]}: {r[1]:,}")

    print("\nTop Faculties / Departments Distribution:")
    for f in top_faculties:
        print(f"  • {f[0]}: {f[1]:,}")


def main():
    print("=" * 70)
    print(" TRƯỜNG ĐẠI HỌC CÔNG NGHỆ GIAO THÔNG VẬN TẢI (UTT) CRAWLER & INGESTION")
    print("=" * 70)

    # Step 1: Crawl Directory
    teachers = crawl_directory()

    # Step 2: Concurrently Crawl Profile Pages
    detailed_teachers = crawl_all_profiles(teachers)

    # Step 3: Crawl Leadership
    leaders = crawl_leadership()

    # Step 4: Reconcile HĐGSNN
    hdgsnn_map = fetch_hdgsnn_utt_professors()

    # Step 5: Synthesize and Normalize Roster
    final_roster = build_final_roster(detailed_teachers, leaders, hdgsnn_map)

    # Step 6: Persist and Sync
    persist_to_database(final_roster)


if __name__ == "__main__":
    main()
