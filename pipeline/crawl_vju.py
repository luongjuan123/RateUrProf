#!/usr/bin/env python3
"""
Comprehensive Crawler & Ingestion Pipeline for Teachers of VJU-VNU
(Trường Đại học Việt Nhật - Đại học Quốc gia Hà Nội).

Sources aggregated:
1. https://vju.ac.vn/doi-ngu-can-bo/ (Vietnamese Canonical Directory, 30 Tables)
2. https://vju.ac.vn/en/staff/ (English Canonical Directory, 30 Tables)
3. 1227-PL-4 Official MOET Permanent Lecturer Disclosure PDF (84 Lecturers with Birth Year, Gender, Rank)
4. HĐGSNN State Professorship Council historical records in rateprof.db
"""

from __future__ import annotations
import os
import sys
import re
import json
import time
import ssl
import subprocess
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def decode_cf_email(cf_hex: str) -> str:
    """Decodes Cloudflare XOR obfuscated email string."""
    try:
        r = int(cf_hex[:2], 16)
        return "".join([chr(int(cf_hex[i:i + 2], 16) ^ r) for i in range(2, len(cf_hex), 2)])
    except Exception:
        return ""


def clean_person_name(raw_name: str) -> str:
    """Strips academic prefixes, titles, and gender honorifics."""
    clean = Normalizer.strip_academic_titles(raw_name)
    # Strip any residual honorifics
    clean = re.sub(r"^(?:Ông|Bà|Mr\.?|Ms\.?|Mrs\.?)\s+", "", clean, flags=re.IGNORECASE).strip()
    return clean


def parse_web_directory(url: str, is_english: bool = False) -> List[Dict[str, Any]]:
    """Parses all 30 Elementor/JetEngine tables from VJU staff directory."""
    print(f"[*] Fetching directory from: {url}")
    req = urllib.request.Request(url, headers=HEADERS)
    html = urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=20).read().decode("utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")

    records = []
    tables = soup.find_all("table")
    print(f"    Found {len(tables)} tables on {url}")

    for t_idx, tbl in enumerate(tables):
        rows = tbl.find_all("tr")
        if not rows:
            continue

        prev_h = tbl.find_previous(["h1", "h2", "h3", "h4", "h5", "h6"])
        section = prev_h.get_text(strip=True) if prev_h else ""

        # Determine faculty category
        faculty = "Ban Giảng huấn"
        if any(k in section.lower() for k in ["công nghệ", "advanced technology", "kỹ thuật tiên tiến"]):
            faculty = "Khoa Công nghệ và Kỹ thuật tiên tiến"
        elif any(k in section.lower() for k in ["xã hội", "social sciences", "liên ngành"]):
            faculty = "Khoa Khoa học xã hội liên ngành"
        elif any(k in section.lower() for k in ["quản trị", "hành chính", "administration", "management"]):
            faculty = "Ban Giám hiệu và Các Phòng ban"

        header_cells = rows[0].find_all(["th", "td"])
        dept_name = header_cells[0].get_text(strip=True) if header_cells else f"Đơn vị {t_idx+1}"

        for r_idx, row in enumerate(rows[1:], start=1):
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue

            # Column 1: Image / Avatar
            avatar = ""
            img = cells[1].find("img") if len(cells) > 1 else None
            if img:
                src = img.get("data-src") or img.get("src") or ""
                if src and not src.startswith("data:image"):
                    avatar = urllib.parse.urljoin(url, src.strip())

            # Column 2: Name & Title
            raw_name = cells[2].get_text(strip=True) if len(cells) > 2 else ""
            if not raw_name:
                continue

            clean_name = clean_person_name(raw_name)
            is_valid, reason = RecordValidator.is_valid_human_name(clean_name)
            if not is_valid:
                print(f"    [Skip] Invalid name: '{raw_name}' ({reason})")
                continue

            rank, degree, title = Normalizer.parse_academic_ranks(raw_name)

            # Column 3: Position
            pos = cells[3].get_text(separator=" - ", strip=True) if len(cells) > 3 else ""

            # Column 4: Email(s)
            emails = []
            if len(cells) > 4:
                for cf in cells[4].find_all(attrs={"data-cfemail": True}):
                    dec = decode_cf_email(cf["data-cfemail"])
                    if dec and dec not in emails:
                        emails.append(dec)
                if not emails:
                    txt = cells[4].get_text(strip=True)
                    found = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", txt)
                    for em in found:
                        if em not in emails:
                            emails.append(em)

            records.append({
                "raw_name": raw_name,
                "clean_name": clean_name,
                "norm_name": Normalizer.normalize_name_for_matching(clean_name),
                "is_english": is_english,
                "rank": rank,
                "degree": degree,
                "title": title or "Giảng viên",
                "position": pos,
                "faculty": faculty,
                "department": dept_name,
                "avatar": avatar,
                "emails": emails,
                "source_url": url,
            })

    print(f"    -> Extracted {len(records)} entries from {url}")
    return records


def parse_moet_disclosure_pdf() -> List[Dict[str, Any]]:
    """Downloads and extracts the 84 permanent lecturers from the official MOET public disclosure PDF."""
    pdf_url = "https://vju.ac.vn/wp-content/uploads/2024/11/1227-PL-4-Cong-khai-thong-tin-ve-doi-ngu-giang-vien-co-huu-cua-Nha-truong-nam-hoc-2023-2024.pdf"
    cache_dir = "/tmp/vju_pdf"
    os.makedirs(cache_dir, exist_ok=True)
    pdf_path = os.path.join(cache_dir, "doc_moet_pl4.pdf")
    layout_txt = os.path.join(cache_dir, "doc_moet_layout.txt")

    if not os.path.exists(pdf_path):
        print(f"[*] Downloading MOET disclosure PDF from {pdf_url}...")
        req = urllib.request.Request(pdf_url, headers=HEADERS)
        data = urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=30).read()
        with open(pdf_path, "wb") as f:
            f.write(data)

    if not os.path.exists(layout_txt):
        print("[*] Running pdftotext -layout...")
        subprocess.run(["pdftotext", "-layout", pdf_path, layout_txt], check=True)

    with open(layout_txt, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    records = []
    start = False
    current = None

    for line in lines:
        if "B. Công khai" in line:
            start = True
            continue
        if not start:
            continue
        if "C. Công khai" in line or "K.T HIỆU TRƯỞNG" in line:
            break

        l_strip = line.strip()
        if not l_strip or l_strip.startswith("STT") or "Khối ngành" in l_strip or l_strip == "\x0c":
            continue

        # Match row with STT and metadata
        m = re.match(
            r"^\s*(\d+)\s+([A-Za-zÀ-ỹ\s]+?)\s{2,}(?:(\d{4})\s+)?(Nam|Nữ)\s+(GS|PGS|Giảng viên)\s+(TS|ThS|CN|ĐH)(?:\s+(.+))?$",
            line,
        )
        if m:
            if current:
                records.append(current)
            stt, name, year, gender, rank, degree, disc = m.groups()
            c_name = clean_person_name(name)
            current = {
                "stt": int(stt),
                "name": c_name,
                "norm_name": Normalizer.normalize_name_for_matching(c_name),
                "birth_year": int(year) if year else None,
                "gender": gender,
                "rank": rank if rank in ("GS", "PGS") else None,
                "degree": degree,
                "discipline": disc.strip() if disc else "",
                "source_url": pdf_url,
            }
        else:
            if current and l_strip:
                if not re.match(r"^\d+\s+", line):
                    current["discipline"] = (current["discipline"] + " " + l_strip).strip()

    if current:
        records.append(current)

    print(f"[*] Extracted {len(records)} permanent lecturers from MOET public disclosure PDF")
    return records


def crawl_and_ingest():
    print("=" * 70)
    print("RateUrProfs VJU-VNU (Trường Đại học Việt Nhật) Full Ingestion")
    print("=" * 70)

    storage = StorageEngine()

    # 1. Ensure University record exists
    now = int(time.time() * 1000)
    uni_data = [{
        "id": "vnu-vju",
        "name": "Trường Đại học Việt Nhật - ĐHQG Hà Nội",
        "short_name": "VNU-VJU",
        "english_name": "Vietnam Japan University",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "official_domain": "vju.ac.vn",
        "official_website": "https://vju.ac.vn",
        "institution_type": "university",
    }]
    storage.batch_upsert_universities(uni_data)
    print("[+] Upserted university record for vnu-vju.")

    # 2. Parse sources
    vn_records = parse_web_directory("https://vju.ac.vn/doi-ngu-can-bo/", is_english=False)
    en_records = parse_web_directory("https://vju.ac.vn/en/staff/", is_english=True)
    moet_records = parse_moet_disclosure_pdf()

    # 3. Build unified dictionary keyed by normalized name or email
    teachers_by_key: Dict[str, Dict[str, Any]] = {}

    def get_key(record: Dict[str, Any]) -> str:
        # If emails exist, use primary email domain prefix or normalized name
        norm = record.get("norm_name") or Normalizer.normalize_name_for_matching(record["clean_name"])
        return norm

    # Phase A: Ingest Vietnamese web records
    for r in vn_records:
        k = get_key(r)
        if k not in teachers_by_key:
            teachers_by_key[k] = {
                "name": r["clean_name"],
                "norm_name": k,
                "academic_rank": r["rank"],
                "academic_title": r["degree"],
                "title": r["title"],
                "positions": [r["position"]] if r["position"] else [],
                "faculties": [r["faculty"]] if r["faculty"] else [],
                "departments": [r["department"]] if r["department"] else [],
                "avatar": r["avatar"],
                "emails": list(r["emails"]),
                "birth_year": None,
                "gender": None,
                "disciplines": [],
                "source_urls": [r["source_url"]],
            }
        else:
            cur = teachers_by_key[k]
            if r["position"] and r["position"] not in cur["positions"]:
                cur["positions"].append(r["position"])
            if r["faculty"] and r["faculty"] not in cur["faculties"]:
                cur["faculties"].append(r["faculty"])
            if r["department"] and r["department"] not in cur["departments"]:
                cur["departments"].append(r["department"])
            if r["avatar"] and not cur["avatar"]:
                cur["avatar"] = r["avatar"]
            for em in r["emails"]:
                if em not in cur["emails"]:
                    cur["emails"].append(em)
            if r["source_url"] not in cur["source_urls"]:
                cur["source_urls"].append(r["source_url"])
            if r["rank"] and not cur["academic_rank"]:
                cur["academic_rank"] = r["rank"]
            if r["degree"] and not cur["academic_title"]:
                cur["academic_title"] = r["degree"]

    # Phase B: Merge English web records
    for r in en_records:
        k = get_key(r)
        # Check matching by key or matching by email
        matched_k = None
        if k in teachers_by_key:
            matched_k = k
        else:
            # check email match
            for em in r["emails"]:
                for ex_k, ex_val in teachers_by_key.items():
                    if em in ex_val["emails"]:
                        matched_k = ex_k
                        break
                if matched_k:
                    break

        if matched_k:
            cur = teachers_by_key[matched_k]
            if r["position"] and r["position"] not in cur["positions"]:
                cur["positions"].append(r["position"])
            if r["avatar"] and not cur["avatar"]:
                cur["avatar"] = r["avatar"]
            for em in r["emails"]:
                if em not in cur["emails"]:
                    cur["emails"].append(em)
            if r["source_url"] not in cur["source_urls"]:
                cur["source_urls"].append(r["source_url"])
        else:
            # New person appearing only in English directory
            teachers_by_key[k] = {
                "name": r["clean_name"],
                "norm_name": k,
                "academic_rank": r["rank"],
                "academic_title": r["degree"],
                "title": r["title"],
                "positions": [r["position"]] if r["position"] else [],
                "faculties": [r["faculty"]] if r["faculty"] else [],
                "departments": [r["department"]] if r["department"] else [],
                "avatar": r["avatar"],
                "emails": list(r["emails"]),
                "birth_year": None,
                "gender": None,
                "disciplines": [],
                "source_urls": [r["source_url"]],
            }

    # Phase C: Merge MOET Public Disclosure Data
    for r in moet_records:
        k = get_key(r)
        matched_k = None
        if k in teachers_by_key:
            matched_k = k
        else:
            # Fuzzy match on last 2-3 tokens
            tokens = k.split()
            if len(tokens) >= 2:
                for ex_k in teachers_by_key.keys():
                    ex_tokens = ex_k.split()
                    if len(ex_tokens) >= 2 and tokens[-2:] == ex_tokens[-2:]:
                        matched_k = ex_k
                        break

        if matched_k:
            cur = teachers_by_key[matched_k]
            cur["birth_year"] = r["birth_year"]
            cur["gender"] = r["gender"]
            if r["discipline"] and r["discipline"] not in cur["disciplines"]:
                cur["disciplines"].append(r["discipline"])
            if r["rank"] and not cur["academic_rank"]:
                cur["academic_rank"] = r["rank"]
            if r["degree"] and not cur["academic_title"]:
                cur["academic_title"] = r["degree"]
            if r["source_url"] not in cur["source_urls"]:
                cur["source_urls"].append(r["source_url"])
        else:
            # Add permanent lecturer from MOET report
            title_parts = []
            if r["rank"]:
                title_parts.append(r["rank"])
            if r["degree"]:
                title_parts.append(r["degree"])
            title_str = ".".join(title_parts) if title_parts else "Giảng viên"

            teachers_by_key[k] = {
                "name": r["name"],
                "norm_name": k,
                "academic_rank": r["rank"],
                "academic_title": r["degree"],
                "title": title_str,
                "positions": ["Giảng viên cơ hữu"],
                "faculties": ["Ban Giảng huấn"],
                "departments": [r["discipline"]] if r["discipline"] else [],
                "avatar": "",
                "emails": [],
                "birth_year": r["birth_year"],
                "gender": r["gender"],
                "disciplines": [r["discipline"]] if r["discipline"] else [],
                "source_urls": [r["source_url"]],
            }

    # Phase D: Check State Council (HĐGSNN) records in rateprof.db
    with storage.get_connection() as conn:
        hd_rows = conn.execute(
            "SELECT l.id, l.name, l.academic_rank, l.academic_title, l.bio, a.university_id "
            "FROM lecturers l JOIN affiliations a ON l.id = a.lecturer_id "
            "WHERE a.university_name LIKE '%Việt Nhật%';"
        ).fetchall()
        for hr in hd_rows:
            hd_norm = Normalizer.normalize_name_for_matching(hr["name"])
            if hd_norm in teachers_by_key:
                cur = teachers_by_key[hd_norm]
                cur["academic_rank"] = cur["academic_rank"] or hr["academic_rank"]
                cur["academic_title"] = cur["academic_title"] or hr["academic_title"]
                print(f"[+] Linked HĐGSNN State Council credentials for: {hr['name']} ({cur['academic_rank']})")

    # 4. Convert to canonical professor objects for Batch Upsert
    professors_to_upsert: List[Dict[str, Any]] = []

    for k, t in teachers_by_key.items():
        name = t["name"]
        uni_id = "vnu-vju"
        prof_id = Normalizer.make_canonical_professor_id(uni_id, name)

        # Primary faculty
        faculty = "Ban Giảng huấn"
        for f in t["faculties"]:
            if "Công nghệ" in f:
                faculty = "Khoa Công nghệ và Kỹ thuật tiên tiến"
                break
            elif "Khoa học xã hội" in f:
                faculty = "Khoa Khoa học xã hội liên ngành"
                break
            elif "Phòng ban" in f or "Giám hiệu" in f:
                faculty = "Ban Giám hiệu và Các Phòng ban"

        # Primary department / program
        department = None
        if t["departments"]:
            department = t["departments"][0]
        elif t["disciplines"]:
            department = t["disciplines"][0]

        # Construct title string
        parts = []
        if t["academic_rank"]:
            parts.append(t["academic_rank"])
        if t["academic_title"]:
            parts.append(t["academic_title"])
        elif not parts:
            parts.append("Giảng viên")
        final_title = ".".join(parts)

        # Construct comprehensive bio
        bio_items = [f"Giảng viên / Nhà khoa học tại Trường Đại học Việt Nhật (ĐHQG Hà Nội - VJU)."]
        if t["positions"]:
            pos_str = " | ".join(t["positions"])
            bio_items.append(f"Vị trí công tác: {pos_str}.")
        if department:
            bio_items.append(f"Chương trình / Đơn vị chuyên môn: {department}.")
        if t["disciplines"] and t["disciplines"] != [department]:
            bio_items.append(f"Chuyên ngành giảng dạy: {', '.join(t['disciplines'])}.")
        if t["birth_year"]:
            bio_items.append(f"Năm sinh: {t['birth_year']}.")
        if t["emails"]:
            bio_items.append(f"Email liên hệ: {', '.join(t['emails'])}.")

        primary_email = t["emails"][0] if t["emails"] else None

        professors_to_upsert.append({
            "id": prof_id,
            "name": name,
            "title": final_title,
            "academic_rank": t["academic_rank"],
            "academic_title": t["academic_title"],
            "position": " - ".join(t["positions"][:2]) if t["positions"] else "Giảng viên",
            "university_id": uni_id,
            "university_name": "Trường Đại học Việt Nhật - ĐHQG Hà Nội",
            "university_short_name": "VNU-VJU",
            "faculty": faculty,
            "department": department,
            "avatar": t["avatar"],
            "bio": " ".join(bio_items),
            "official_profile_urls": t["source_urls"],
            "source_urls": t["source_urls"],
            "source_type": "official_faculty_page",
            "verification_status": "verified",
            "confidence_score": 1.0,
            "identifiers": {
                "institutionalEmail": primary_email,
                "additionalEmails": t["emails"][1:] if len(t["emails"]) > 1 else [],
                "birthYear": t["birth_year"],
                "gender": t["gender"],
            } if primary_email or t["birth_year"] else {},
        })

    print(f"\n[*] Total unified VJU professors prepared: {len(professors_to_upsert)}")

    # 5. Batch Upsert to Storage Engine
    p_upserted, a_upserted = storage.batch_upsert_professors(professors_to_upsert)
    print(f"[+] Successfully upserted to SQLite: {p_upserted} lecturers, {a_upserted} affiliations.")

    # 6. Re-export verified academic data JSON
    print("[*] Re-exporting full database to verified_academic_data.json...")
    exported_count = storage.export_to_verified_json()
    print(f"[+] Export complete: {exported_count:,} total lecturers nationwide exported.")

    # 7. Print summary report for VJU
    with storage.get_connection() as conn:
        vju_count = conn.execute(
            "SELECT count(*) FROM affiliations WHERE university_id = 'vnu-vju';"
        ).fetchone()[0]
        vju_gs = conn.execute(
            "SELECT count(*) FROM lecturers l JOIN affiliations a ON l.id = a.lecturer_id "
            "WHERE a.university_id = 'vnu-vju' AND l.academic_rank = 'GS';"
        ).fetchone()[0]
        vju_pgs = conn.execute(
            "SELECT count(*) FROM lecturers l JOIN affiliations a ON l.id = a.lecturer_id "
            "WHERE a.university_id = 'vnu-vju' AND l.academic_rank = 'PGS';"
        ).fetchone()[0]
        vju_ts = conn.execute(
            "SELECT count(*) FROM lecturers l JOIN affiliations a ON l.id = a.lecturer_id "
            "WHERE a.university_id = 'vnu-vju' AND l.academic_title = 'TS';"
        ).fetchone()[0]
        vju_avatars = conn.execute(
            "SELECT count(*) FROM lecturers l JOIN affiliations a ON l.id = a.lecturer_id "
            "WHERE a.university_id = 'vnu-vju' AND l.avatar IS NOT NULL AND l.avatar != '';"
        ).fetchone()[0]

    print("\n" + "=" * 50)
    print("VJU-VNU CRAWL & INGESTION RESULTS:")
    print("=" * 50)
    print(f"Total VJU Teachers in Database:    {vju_count}")
    print(f"Professors (GS):                    {vju_gs}")
    print(f"Associate Professors (PGS):         {vju_pgs}")
    print(f"Doctors / PhD (TS):                 {vju_ts}")
    print(f"With Photos/Avatars:                {vju_avatars}")
    print("=" * 50)


if __name__ == "__main__":
    crawl_and_ingest()
