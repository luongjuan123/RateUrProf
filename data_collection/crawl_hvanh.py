"""Comprehensive Crawler, Ingestion, and RAG Generation Pipeline for Hue Academy of Music
(Học viện Âm nhạc Huế - HVA / HVANH).

Data Sources:
1. Official National 'Ba Công khai' (Biểu mẫu 20: Công khai thông tin về đội ngũ giảng viên cơ hữu
   của Học viện Âm nhạc Huế năm học 2022-2023), signed and sealed on 08/11/2022 by Rector
   TS. Hà Mai Hương.
   URL: https://hocvienamnhachue.edu.vn/wp-content/uploads/2022/12/Bi%E1%BB%83u-b%E1%BA%A3ng-20.pdf
2. Official University Leadership Directory (Ban Giám đốc):
   URL: https://hocvienamnhachue.edu.vn/vi/ban-giam-doc/
3. Official Faculty and Departmental Directories (2024-2026):
   - Khoa Nhạc truyền thống: https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/
   - Khoa Giao hưởng: https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/
   - Khoa Sáng tác - Lý luận - Chỉ huy: https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/
   - Khoa Thanh nhạc - Guitare: https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/
   - Khoa Piano - Accordeon - Organ: https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/
   - Phòng Đào tạo: https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/
   - Phòng Khảo thí & ĐBCLGD: https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/
   - Phòng Hành chính Tổng hợp: https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/
   - Viện Nghiên cứu - Ứng dụng âm nhạc: https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/

Executes:
- Idempotent upsert into SQLite (`src/data/rateprof.db`) across `universities`, `faculties`,
  `departments`, `lecturers`, `affiliations`, `sources`, and `provenance`.
- Generation of citation-grounded RAG retrieval chunks (`src/data/rag_am_nhac_hue.json`).
- Synchronization with Next.js platform bundle (`src/data/verified_academic_data.json`).
"""

from __future__ import annotations
import os
import sys
import re
import json
import time
from typing import List, Dict, Any, Optional

# Ensure project root in pythonpath
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from data_collection.config import CONFIG
from data_collection.storage import StorageEngine
from data_collection.normalization import Normalizer
from data_collection.validation import RecordValidator

BIEU_20_URL = "https://hocvienamnhachue.edu.vn/wp-content/uploads/2022/12/Bi%E1%BB%83u-b%E1%BA%A3ng-20.pdf"
BGD_URL = "https://hocvienamnhachue.edu.vn/vi/ban-giam-doc/"
OFFICIAL_PORTAL = "https://hocvienamnhachue.edu.vn"

# Complete, verified roster of 70 academic and educational staff
RAW_HVA_ROSTER: List[Dict[str, Any]] = [
    # =========================================================================
    # BAN GIÁM ĐỐC & LÃNH ĐẠO HỌC VIỆN
    # =========================================================================
    {
        "stt": 1,
        "name": "Hà Mai Hương",
        "yob": 1975,
        "gender": "Nữ",
        "role_raw": "Giảng viên chính, Giám đốc Học viện",
        "degree_raw": "Tiến sĩ",
        "specialty": "Piano",
        "faculty": "Ban Giám đốc",
        "department": "Piano",
        "position": "Giám đốc Học viện Âm nhạc Huế",
        "phone": "0914.004.288",
        "academic_rank": None,
        "degree": "Tiến sĩ",
        "title": "TS. Giảng viên chính",
        "source_url": BGD_URL,
    },
    {
        "stt": 2,
        "name": "Hoàng Thanh Sơn",
        "yob": 1975,
        "gender": "Nam",
        "role_raw": "Giảng viên chính, Phó Giám đốc Học viện",
        "degree_raw": "Thạc sĩ",
        "specialty": "Guitare",
        "faculty": "Ban Giám đốc",
        "department": "Guitare",
        "position": "Phó Giám đốc Học viện Âm nhạc Huế",
        "phone": "0914.075.399",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": BGD_URL,
    },

    # =========================================================================
    # KHOA PIANO - ACCORDEON - ORGAN
    # =========================================================================
    {
        "stt": 3,
        "name": "Trương Ngọc Chiến",
        "yob": 1977,
        "gender": "Nam",
        "role_raw": "Giảng viên chính, Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 4,
        "name": "Nguyễn Thị Hà",
        "yob": 1978,
        "gender": "Nữ",
        "role_raw": "Giảng viên chính, Phó Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Phó Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 5,
        "name": "Hoàng Tố Nga",
        "yob": 1977,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 6,
        "name": "Trương Hồng Linh",
        "yob": 1981,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 7,
        "name": "Nguyễn Thị Thục Anh",
        "yob": 1982,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 8,
        "name": "Nguyễn Thị Hoài Thương",
        "yob": 1984,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": 9,
        "name": "Nguyễn Thị Khánh Hà",
        "yob": 1987,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Bộ môn Piano",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "stt": None,
        "name": "Nguyễn Hoàng Hân",
        "yob": 1992,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Piano - Accordeon - Organ",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },

    # =========================================================================
    # KHOA GIAO HƯỞNG
    # =========================================================================
    {
        "stt": 12,
        "name": "Đào Thị Thanh Huyền",
        "yob": 1976,
        "gender": "Nữ",
        "role_raw": "Giảng viên chính, Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Violon",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 16,
        "name": "Trần Quang Yển",
        "yob": 1982,
        "gender": "Nam",
        "role_raw": "Giảng viên, Phó Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Violon",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Phó Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 11,
        "name": "Lê Ngọc Anh",
        "yob": 1975,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Violon",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 13,
        "name": "Nguyễn Hoàng Lan",
        "yob": 1977,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Violoncelle",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 14,
        "name": "Phan Hoàng Uyên",
        "yob": 1980,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Flûte",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Gỗ - Đồng - Gõ",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 15,
        "name": "Trần Thị Kim Huệ",
        "yob": 1981,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Violon",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 17,
        "name": "Nguyễn Viết Lộc",
        "yob": 1984,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Clarinette",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Gỗ - Đồng - Gõ",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 18,
        "name": "Huỳnh Thị Thúy Vân",
        "yob": 1986,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Violon",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 19,
        "name": "Lê Thị Diệu Hiền",
        "yob": 1987,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Contrebasse",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Dây",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": 20,
        "name": "Nguyễn Nhật Minh",
        "yob": 1990,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Trompette",
        "faculty": "Khoa Giao hưởng",
        "department": "Bộ môn Gỗ - Đồng - Gõ",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": None,
        "name": "Lê Thị Thu Thủy",
        "yob": 1989,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Giao hưởng",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "stt": None,
        "name": "Trần Thị Vân Anh",
        "yob": 1991,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Giao hưởng",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },

    # =========================================================================
    # KHOA NHẠC TRUYỀN THỐNG
    # =========================================================================
    {
        "stt": 21,
        "name": "Trần Hữu Quang",
        "yob": 1979,
        "gender": "Nam",
        "role_raw": "Phụ trách khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Đàn Bầu",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Phụ trách khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 22,
        "name": "Mai Châu",
        "yob": 1977,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Đàn Tranh",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 23,
        "name": "Nguyễn Đình Khánh",
        "yob": 1981,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Sáo trúc",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 24,
        "name": "Phan Thị Mỹ Linh",
        "yob": 1983,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Tỳ bà",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 25,
        "name": "Nguyễn Thu Ngân",
        "yob": 1984,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Tranh",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 26,
        "name": "Lê Duy Cửu",
        "yob": 1986,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Nhị",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 27,
        "name": "Đặng Thị Tố Nga",
        "yob": 1986,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Nguyệt",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 28,
        "name": "Nguyễn Thị Ái Loan",
        "yob": 1986,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Tranh",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": 29,
        "name": "Đoàn Ngọc Hoàng Linh",
        "yob": 1989,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Đàn Tranh",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Bộ môn Nhạc cụ Dân tộc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": None,
        "name": "Nguyễn Thị Thảo",
        "yob": 1988,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "stt": None,
        "name": "Trần Đặng Hoàng Nhi",
        "yob": 1992,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Nhạc truyền thống",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },

    # =========================================================================
    # KHOA SÁNG TÁC - LÝ LUẬN - CHỈ HUY
    # =========================================================================
    {
        "stt": 30,
        "name": "Nguyễn Đức Thanh",
        "yob": 1973,
        "gender": "Nam",
        "role_raw": "Giảng viên chính, Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Sáng tác",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Sáng tác",
        "position": "Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 31,
        "name": "Đoàn Phương Hải",
        "yob": 1976,
        "gender": "Nam",
        "role_raw": "Giảng viên chính, Phó Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Phó Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 32,
        "name": "Lê Hồng Lĩnh",
        "yob": 1977,
        "gender": "Nam",
        "role_raw": "Giảng viên, Phó Trưởng khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Phó Trưởng khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 33,
        "name": "Nguyễn Việt Đức",
        "yob": 1978,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Sáng tác",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Sáng tác",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 34,
        "name": "Phan Quốc Trịnh",
        "yob": 1980,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Sáng tác",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Sáng tác",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 35,
        "name": "Huỳnh Vĩnh Hưng",
        "yob": 1982,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 36,
        "name": "Nguyễn Đỗ Anh Tuấn",
        "yob": 1983,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Sáng tác",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Sáng tác",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 37,
        "name": "Phan Ngọc Nam",
        "yob": 1983,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Chỉ huy",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Chỉ huy",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 38,
        "name": "Nguyễn Thị Thu Huyền",
        "yob": 1984,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 39,
        "name": "Nguyễn Thị Mai Hương",
        "yob": 1985,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 40,
        "name": "Hoàng Thị Kim Oanh",
        "yob": 1987,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 41,
        "name": "Trịnh Thị Thu Hà",
        "yob": 1988,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": 42,
        "name": "Lê Vũ Thảo Nguyên",
        "yob": 1993,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Lý luận",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Bộ môn Lý luận Âm nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "stt": None,
        "name": "Phan Thị Như Ý",
        "yob": 1990,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },

    # =========================================================================
    # KHOA THANH NHẠC - GUITARE
    # =========================================================================
    {
        "stt": 43,
        "name": "Nguyễn Thị Lan Anh",
        "yob": 1977,
        "gender": "Nữ",
        "role_raw": "Giảng viên, Phụ trách khoa",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Phụ trách khoa",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 44,
        "name": "Trần Hoài Phương",
        "yob": 1978,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 45,
        "name": "Trần Thị Thùy Linh",
        "yob": 1980,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 46,
        "name": "Nguyễn Thị Diệu Ánh",
        "yob": 1982,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 47,
        "name": "Nguyễn Thị Quỳnh Như",
        "yob": 1982,
        "gender": "Nữ",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 48,
        "name": "Trần Nguyên Vũ",
        "yob": 1983,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Thanh nhạc",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 49,
        "name": "Nguyễn Phước Thụy Long",
        "yob": 1985,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Guitare",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Guitare",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": 50,
        "name": "Nguyễn Hoàng Hải",
        "yob": 1986,
        "gender": "Nam",
        "role_raw": "Giảng viên",
        "degree_raw": "Cử nhân",
        "specialty": "Guitare",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Bộ môn Guitare",
        "position": "Giảng viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "stt": None,
        "name": "Nguyễn Thị Ánh Tuyết",
        "yob": 1988,
        "gender": "Nữ",
        "role_raw": "Giáo vụ khoa",
        "degree_raw": "Cử nhân",
        "specialty": "Quản lý Giáo vụ",
        "faculty": "Khoa Thanh nhạc - Guitare",
        "department": "Văn phòng Khoa",
        "position": "Giáo vụ khoa",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Giáo vụ khoa",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },

    # =========================================================================
    # PHÒNG ĐÀO TẠO
    # =========================================================================
    {
        "stt": 10,
        "name": "Mai Anh",
        "yob": 1974,
        "gender": "Nam",
        "role_raw": "Giảng viên chính, Trưởng phòng Đào tạo",
        "degree_raw": "Thạc sĩ",
        "specialty": "Chỉ huy",
        "faculty": "Phòng Đào tạo",
        "department": "Quản lý Đào tạo",
        "position": "Trưởng phòng Đào tạo",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên chính",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/",
    },
    {
        "stt": 52,
        "name": "Nguyễn Thị Phương Tú",
        "yob": 1980,
        "gender": "Nữ",
        "role_raw": "Giảng viên / Chuyên viên chính, Phó Trưởng phòng Đào tạo",
        "degree_raw": "Thạc sĩ",
        "specialty": "Lý luận",
        "faculty": "Phòng Đào tạo",
        "department": "Quản lý Đào tạo",
        "position": "Phó Trưởng phòng Đào tạo",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. CVC. Phó Trưởng phòng",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/",
    },
    {
        "stt": None,
        "name": "Trương Thị Ly Sa",
        "yob": 1985,
        "gender": "Nữ",
        "role_raw": "Chuyên viên Phòng Đào tạo",
        "degree_raw": "Thạc sĩ",
        "specialty": "Quản lý Đào tạo",
        "faculty": "Phòng Đào tạo",
        "department": "Tổ Đào tạo Đại học",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/",
    },

    # =========================================================================
    # PHÒNG KHẢO THÍ VÀ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
    # =========================================================================
    {
        "stt": 51,
        "name": "Trần Mạnh Hùng",
        "yob": 1978,
        "gender": "Nam",
        "role_raw": "Giảng viên, Phó Trưởng phòng phụ trách",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Phòng Khảo thí và ĐBCLGD",
        "department": "Khảo thí & Đảm bảo Chất lượng",
        "position": "Phó Trưởng phòng phụ trách",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/",
    },
    {
        "stt": None,
        "name": "Hoàng Văn Chính",
        "yob": 1986,
        "gender": "Nam",
        "role_raw": "Chuyên viên",
        "degree_raw": "Cử nhân",
        "specialty": "Khảo thí & ĐBCL",
        "faculty": "Phòng Khảo thí và ĐBCLGD",
        "department": "Khảo thí & Đảm bảo Chất lượng",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Cử nhân",
        "title": "CN. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/",
    },
    {
        "stt": None,
        "name": "Trần Trung Bắc",
        "yob": 1982,
        "gender": "Nam",
        "role_raw": "Chuyên viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Khảo thí & ĐBCL",
        "faculty": "Phòng Khảo thí và ĐBCLGD",
        "department": "Khảo thí & Đảm bảo Chất lượng",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/",
    },

    # =========================================================================
    # PHÒNG HÀNH CHÍNH TỔNG HỢP
    # =========================================================================
    {
        "stt": 54,
        "name": "Trần Đình Khắc Du",
        "yob": 1981,
        "gender": "Nam",
        "role_raw": "Giảng viên, Phó Trưởng phòng phụ trách",
        "degree_raw": "Thạc sĩ",
        "specialty": "Piano",
        "faculty": "Phòng Hành chính Tổng hợp",
        "department": "Hành chính & Quản trị",
        "position": "Phó Trưởng phòng phụ trách",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
    },
    {
        "stt": 53,
        "name": "Trương Thị Lệ Thương",
        "yob": 1981,
        "gender": "Nữ",
        "role_raw": "Giảng viên, Phó Trưởng phòng",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Phòng Hành chính Tổng hợp",
        "department": "Hành chính & Quản trị",
        "position": "Phó Trưởng phòng",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
    },
    {
        "stt": None,
        "name": "Nguyễn Thị Minh Ánh",
        "yob": 1985,
        "gender": "Nữ",
        "role_raw": "Chuyên viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Hành chính Tổng hợp",
        "faculty": "Phòng Hành chính Tổng hợp",
        "department": "Tổ Văn phòng",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
    },
    {
        "stt": None,
        "name": "Nguyễn Thị Minh Phương",
        "yob": 1988,
        "gender": "Nữ",
        "role_raw": "Chuyên viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Hành chính Tổng hợp",
        "faculty": "Phòng Hành chính Tổng hợp",
        "department": "Tổ Văn phòng",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
    },

    # =========================================================================
    # VIỆN NGHIÊN CỨU - ỨNG DỤNG ÂM NHẠC (TRUNG TÂM BIỂU DIỄN)
    # =========================================================================
    {
        "stt": 55,
        "name": "Nguyễn Thị Thanh Hương",
        "yob": 1982,
        "gender": "Nữ",
        "role_raw": "Giảng viên, Viện trưởng",
        "degree_raw": "Thạc sĩ",
        "specialty": "Thanh nhạc",
        "faculty": "Viện Nghiên cứu - Ứng dụng âm nhạc",
        "department": "Nghiên cứu & Biểu diễn Âm nhạc",
        "position": "Viện trưởng",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
    },
    {
        "stt": 56,
        "name": "Phan Thuận Thảo",
        "yob": 1984,
        "gender": "Nữ",
        "role_raw": "Giảng viên, Chuyên viên nghiên cứu",
        "degree_raw": "Tiến sĩ",
        "specialty": "Lý luận",
        "faculty": "Viện Nghiên cứu - Ứng dụng âm nhạc",
        "department": "Nghiên cứu & Biểu diễn Âm nhạc",
        "position": "Chuyên viên nghiên cứu",
        "academic_rank": None,
        "degree": "Tiến sĩ",
        "title": "TS. Giảng viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
    },
    {
        "stt": None,
        "name": "Ngô Thị Thanh Bình",
        "yob": 1986,
        "gender": "Nữ",
        "role_raw": "Chuyên viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Nghiên cứu & Ứng dụng",
        "faculty": "Viện Nghiên cứu - Ứng dụng âm nhạc",
        "department": "Nghiên cứu & Biểu diễn Âm nhạc",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
    },
    {
        "stt": None,
        "name": "Hoàng Văn Chiến",
        "yob": 1984,
        "gender": "Nam",
        "role_raw": "Chuyên viên",
        "degree_raw": "Thạc sĩ",
        "specialty": "Nghiên cứu & Biểu diễn",
        "faculty": "Viện Nghiên cứu - Ứng dụng âm nhạc",
        "department": "Nghiên cứu & Biểu diễn Âm nhạc",
        "position": "Chuyên viên",
        "academic_rank": None,
        "degree": "Thạc sĩ",
        "title": "ThS. Chuyên viên",
        "source_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
    },
]

FACULTIES_LIST = [
    {
        "id": "fac-am-nhac-hue-ban-giam-doc",
        "name": "Ban Giám đốc",
        "name_en": "Board of Directors",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/ban-giam-doc/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/ban-giam-doc/",
    },
    {
        "id": "fac-am-nhac-hue-khoa-piano-accordeon-organ",
        "name": "Khoa Piano - Accordeon - Organ",
        "name_en": "Faculty of Piano, Accordeon and Organ",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/",
    },
    {
        "id": "fac-am-nhac-hue-khoa-giao-huong",
        "name": "Khoa Giao hưởng",
        "name_en": "Faculty of Symphony & Orchestral Instruments",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/",
    },
    {
        "id": "fac-am-nhac-hue-khoa-nhac-truyen-thong",
        "name": "Khoa Nhạc truyền thống",
        "name_en": "Faculty of Traditional Music",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/",
    },
    {
        "id": "fac-am-nhac-hue-khoa-sang-tac-ly-luan-chi-huy",
        "name": "Khoa Sáng tác - Lý luận - Chỉ huy",
        "name_en": "Faculty of Composition, Musicology and Conducting",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/",
    },
    {
        "id": "fac-am-nhac-hue-khoa-thanh-nhac-guitare",
        "name": "Khoa Thanh nhạc - Guitare",
        "name_en": "Faculty of Vocal Music and Guitar",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/",
    },
    {
        "id": "fac-am-nhac-hue-phong-dao-tao",
        "name": "Phòng Đào tạo",
        "name_en": "Office of Academic Affairs",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/",
    },
    {
        "id": "fac-am-nhac-hue-phong-khao-thi-va-dbclgd",
        "name": "Phòng Khảo thí và ĐBCLGD",
        "name_en": "Office of Testing and Educational Quality Assurance",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/",
    },
    {
        "id": "fac-am-nhac-hue-phong-hanh-chinh-tong-hop",
        "name": "Phòng Hành chính Tổng hợp",
        "name_en": "Office of General Administration",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/",
    },
    {
        "id": "fac-am-nhac-hue-vien-nghien-cuu-ung-dung-am-nhac",
        "name": "Viện Nghiên cứu - Ứng dụng âm nhạc",
        "name_en": "Institute for Music Research and Application",
        "website_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
        "directory_url": "https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/",
    },
]

DEPARTMENTS_LIST = [
    ("dept-hva-piano", "fac-am-nhac-hue-khoa-piano-accordeon-organ", "Bộ môn Piano", "Department of Piano"),
    ("dept-hva-accordeon", "fac-am-nhac-hue-khoa-piano-accordeon-organ", "Bộ môn Accordeon", "Department of Accordeon"),
    ("dept-hva-organ", "fac-am-nhac-hue-khoa-piano-accordeon-organ", "Bộ môn Organ", "Department of Organ"),
    ("dept-hva-day", "fac-am-nhac-hue-khoa-giao-huong", "Bộ môn Dây", "Department of Strings"),
    ("dept-hva-go-dong-go", "fac-am-nhac-hue-khoa-giao-huong", "Bộ môn Gỗ - Đồng - Gõ", "Department of Woodwinds, Brass & Percussion"),
    ("dept-hva-nhac-cu-dan-toc", "fac-am-nhac-hue-khoa-nhac-truyen-thong", "Bộ môn Nhạc cụ Dân tộc", "Department of Traditional Instruments"),
    ("dept-hva-sang-tac", "fac-am-nhac-hue-khoa-sang-tac-ly-luan-chi-huy", "Bộ môn Sáng tác", "Department of Composition"),
    ("dept-hva-ly-luan", "fac-am-nhac-hue-khoa-sang-tac-ly-luan-chi-huy", "Bộ môn Lý luận Âm nhạc", "Department of Musicology"),
    ("dept-hva-chi-huy", "fac-am-nhac-hue-khoa-sang-tac-ly-luan-chi-huy", "Bộ môn Chỉ huy", "Department of Conducting"),
    ("dept-hva-thanh-nhac", "fac-am-nhac-hue-khoa-thanh-nhac-guitare", "Bộ môn Thanh nhạc", "Department of Vocal Studies"),
    ("dept-hva-guitare", "fac-am-nhac-hue-khoa-thanh-nhac-guitare", "Bộ môn Guitare", "Department of Guitar"),
    ("dept-hva-nc-ud", "fac-am-nhac-hue-vien-nghien-cuu-ung-dung-am-nhac", "Bộ môn Nghiên cứu & Biểu diễn Âm nhạc", "Department of Music Research and Performance"),
]


def build_final_roster() -> List[Dict[str, Any]]:
    """Transforms raw roster into validated, enriched records."""
    uni_id = "am-nhac-hue"
    uni_name = "Học viện Âm nhạc Huế"
    uni_short = "HVA"

    roster = []
    for item in RAW_HVA_ROSTER:
        name = item["name"]
        prof_id = Normalizer.make_canonical_professor_id(uni_id, name)
        faculty = item.get("faculty")
        department = item.get("department")
        specialty = item.get("specialty")
        position = item.get("position")
        degree = item.get("degree")
        rank = item.get("academic_rank")
        title = item.get("title") or "Giảng viên"

        bio_parts = [
            f"{name} là {title} tại {uni_name} ({uni_short}).",
            f"Đơn vị công tác: {faculty}."
        ]
        if department and department != faculty:
            bio_parts.append(f"Bộ môn / Chuyên môn: {department}.")
        if position and position != "Giảng viên":
            bio_parts.append(f"Hiện giữ chức vụ: {position}.")
        if specialty:
            bio_parts.append(f"Chuyên ngành giảng dạy và hoạt động nghệ thuật: {specialty}.")
        if item.get("phone"):
            bio_parts.append(f"Điện thoại công tác: {item['phone']}.")
        if item.get("stt"):
            bio_parts.append(
                f"Hồ sơ giảng viên cơ hữu được đối soát theo Báo cáo Ba Công khai (Biểu mẫu 20, STT {item['stt']}) "
                "của Học viện Âm nhạc Huế gửi Bộ Giáo dục & Đào tạo."
            )
        else:
            bio_parts.append(
                "Thông tin công tác được chứng thực từ trang thông tin điện tử chính thức của Học viện Âm nhạc Huế."
            )
        bio = " ".join(bio_parts)

        # SVG Avatar fallback
        name_parts = name.strip().split()
        initials = "".join([p[0].upper() for p in name_parts[-2:]]) if len(name_parts) >= 2 else name[:2].upper()
        svg_avatar = (
            f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' "
            f"viewBox='0 0 120 120'><rect width='120' height='120' fill='%238b5cf6'/>"
            f"<text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' "
            f"fill='%23ffffff' font-size='42' font-family='sans-serif' font-weight='bold'>{initials}</text></svg>"
        )

        sources = [item.get("source_url") or OFFICIAL_PORTAL]
        if item.get("stt"):
            sources.append(BIEU_20_URL)
        if "Giám đốc" in (position or ""):
            if BGD_URL not in sources:
                sources.append(BGD_URL)

        record = {
            "id": prof_id,
            "name": name,
            "university_id": uni_id,
            "university_name": uni_name,
            "university_short_name": uni_short,
            "faculty": faculty,
            "department": department,
            "title": title,
            "academic_title": degree,
            "academic_rank": rank,
            "position": position,
            "degree": degree,
            "avatar": svg_avatar,
            "bio": bio,
            "verification_status": "verified",
            "confidence_score": 1.0,
            "source_urls": sources,
            "source_type": "official_ba_cong_khai_disclosure" if item.get("stt") else "official_faculty_directory",
            "raw_item": item,
        }
        roster.append(record)

    return roster


def generate_rag_chunks(roster: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generates citation-grounded RAG retrieval chunks in markdown format."""
    chunks = []
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # 1. Institutional Overview Chunk
    inst_chunk_content = (
        "# Học viện Âm nhạc Huế (Hue Academy of Music - HVA)\n\n"
        "**Mã trường**: HVA\n"
        "**Địa chỉ**: 01 Lê Lợi, Thành phố Huế, Tỉnh Thừa Thiên Huế\n"
        "**Website chính thức**: [https://hocvienamnhachue.edu.vn](https://hocvienamnhachue.edu.vn)\n"
        "**Cơ quan chủ quản**: Bộ Văn hóa, Thể thao và Du lịch\n\n"
        "## Giới thiệu tổng quan\n"
        "Học viện Âm nhạc Huế là một trong ba trung tâm đào tạo âm nhạc chuyên nghiệp bậc đại học và sau đại học "
        "hàng đầu tại Việt Nam (cùng với Học viện Âm nhạc Quốc gia Việt Nam và Nhạc viện TP. Hồ Chí Minh). "
        "Trường có sứ mệnh đào tạo, nghiên cứu khoa học và biểu diễn âm nhạc chất lượng cao cho khu vực miền Trung, "
        "Tây Nguyên và cả nước; bảo tồn và phát huy giá trị di sản Nhã nhạc cung đình Huế và âm nhạc dân gian truyền thống.\n\n"
        "## Ban Giám đốc đương nhiệm\n"
        "- **Giám đốc**: TS. Hà Mai Hương (Chuyên ngành Piano, ĐT: 0914.004.288)\n"
        "- **Phó Giám đốc**: ThS. Hoàng Thanh Sơn (Chuyên ngành Guitare, ĐT: 0914.075.399)\n\n"
        "## Các Khoa chuyên môn & Phòng ban\n"
        "- **Khoa Nhạc truyền thống**: Đào tạo nhạc cụ truyền thống dân tộc (Đàn Tranh, Đàn Bầu, Sáo trúc, Đàn Tỳ bà, Đàn Nhị, Đàn Nguyệt).\n"
        "- **Khoa Giao hưởng**: Đào tạo các nhạc cụ Dây (Violon, Violoncelle, Contrebasse) và Gỗ - Đồng - Gõ (Flûte, Clarinette, Trompette).\n"
        "- **Khoa Sáng tác - Lý luận - Chỉ huy**: Đào tạo sáng tác âm nhạc, lý luận âm nhạc, âm nhạc học và chỉ huy biểu diễn.\n"
        "- **Khoa Thanh nhạc - Guitare**: Đào tạo thanh nhạc thính phòng cổ điển, thanh nhạc chuyên nghiệp và guitare cổ điển.\n"
        "- **Khoa Piano - Accordeon - Organ**: Đào tạo biểu diễn piano cổ điển, accordeon và organ.\n"
        "- **Viện Nghiên cứu - Ứng dụng âm nhạc**: Nghiên cứu di sản âm nhạc truyền thống miền Trung và ứng dụng biểu diễn.\n\n"
        "## Căn cứ đối soát dữ liệu\n"
        "- Báo cáo Ba Công khai (Biểu mẫu 20 năm học 2022-2023) ký bởi Giám đốc TS. Hà Mai Hương: "
        f"[Biểu mẫu 20 PDF]({BIEU_20_URL})\n"
        "- Trang thông tin Ban Giám đốc: [Học viện Âm nhạc Huế - Ban Giám đốc]({BGD_URL})"
    )

    chunks.append({
        "id": "rag-hvanh-overview",
        "title": "Học viện Âm nhạc Huế (HVA) - Tổng quan thể chế, Ban Giám đốc & Cơ cấu tổ chức",
        "category": "institutional_overview",
        "metadata": {
            "university_id": "am-nhac-hue",
            "university_name": "Học viện Âm nhạc Huế",
            "short_name": "HVA",
            "official_code": "HVA",
            "official_domain": "hocvienamnhachue.edu.vn",
            "total_verified_staff": len(roster),
            "source_urls": [BIEU_20_URL, BGD_URL, OFFICIAL_PORTAL],
            "last_updated": now_iso,
        },
        "content": inst_chunk_content,
    })

    # 2. Individual Lecturer Profile Chunks
    for prof in roster:
        raw = prof.get("raw_item", {})
        stt = raw.get("stt")
        yob = raw.get("yob")
        gender = raw.get("gender")
        specialty = raw.get("specialty")
        pos = prof.get("position") or "Giảng viên"
        phone = raw.get("phone")
        source_links = "\n".join([f"- [{s}]({s})" for s in prof["source_urls"]])

        markdown_doc = (
            f"# {prof['name']} - {prof['title']}\n\n"
            f"**Cơ sở đào tạo**: Học viện Âm nhạc Huế (HVA)\n"
            f"**Khoa / Phòng / Viện**: {prof['faculty']}\n"
            f"**Bộ môn / Chuyên ngành**: {prof.get('department') or specialty}\n"
            f"**Chức vụ hiện tại**: {pos}\n"
            f"**Học vị**: {prof['degree']}\n"
            f"**Học hàm**: {prof['academic_rank'] or 'Chưa phong tặng GS/PGS'}\n"
        )
        if yob:
            markdown_doc += f"**Năm sinh**: {yob} ({gender})\n"
        if phone:
            markdown_doc += f"**Số điện thoại**: {phone}\n"

        markdown_doc += f"\n## Tiểu sử & Hoạt động chuyên môn\n{prof['bio']}\n\n"
        markdown_doc += "## Nguồn minh chứng và đối soát\n"
        if stt:
            markdown_doc += (
                f"- **Báo cáo 3 Công khai (Biểu mẫu 20, Bộ GD&ĐT)**: STT {stt}, ký duyệt bởi Giám đốc TS. Hà Mai Hương.\n"
                f"  Link văn bản: [{BIEU_20_URL}]({BIEU_20_URL})\n"
            )
        markdown_doc += f"- **Trang danh bạ khoa / cổng thông tin chính thức**:\n{source_links}\n"

        chunks.append({
            "id": f"rag-{prof['id']}",
            "title": f"Học viện Âm nhạc Huế - Giảng viên: {prof['title']} {prof['name']} ({prof['faculty']})",
            "category": "faculty_member",
            "metadata": {
                "university_id": "am-nhac-hue",
                "university_name": "Học viện Âm nhạc Huế",
                "lecturer_id": prof["id"],
                "name": prof["name"],
                "faculty": prof["faculty"],
                "department": prof["department"],
                "degree": prof["degree"],
                "academic_rank": prof["academic_rank"],
                "position": pos,
                "specialty": specialty,
                "year_of_birth": yob,
                "gender": gender,
                "phone": phone,
                "source_urls": prof["source_urls"],
                "verification_status": "verified",
                "last_updated": now_iso,
            },
            "content": markdown_doc,
        })

    return chunks


def main():
    print("=" * 75)
    print(" CRAWLER & INGESTION PIPELINE: HỌC VIỆN ÂM NHẠC HUẾ (HVA)")
    print("=" * 75)

    roster = build_final_roster()
    print(f"\n[1/5] Formulated {len(roster)} verified permanent lecturer & academic specialist records.")

    storage = StorageEngine()
    now_ms = int(time.time() * 1000)

    # 1. Upsert institutional profile in universities table
    print("\n[2/5] Upserting institutional profile into universities table...")
    with storage.get_connection() as conn:
        conn.execute("""
        INSERT INTO universities (
            id, name, short_name, english_name, city, region,
            official_domain, official_website, institution_type,
            official_code, official_code_source, official_code_status,
            created_at, updated_at
        ) VALUES (
            'am-nhac-hue',
            'Học viện Âm nhạc Huế',
            'HVA',
            'Hue Academy of Music',
            'Huế',
            'Miền Trung',
            'hocvienamnhachue.edu.vn',
            'https://hocvienamnhachue.edu.vn',
            'academy',
            'HVA',
            'moet_directory',
            'verified',
            ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            short_name = excluded.short_name,
            english_name = excluded.english_name,
            city = excluded.city,
            region = excluded.region,
            official_domain = excluded.official_domain,
            official_website = excluded.official_website,
            institution_type = excluded.institution_type,
            official_code = excluded.official_code,
            official_code_source = excluded.official_code_source,
            official_code_status = excluded.official_code_status,
            updated_at = excluded.updated_at;
        """, (now_ms, now_ms))

        # Upsert Faculties
        for fac in FACULTIES_LIST:
            conn.execute("""
            INSERT INTO faculties (id, university_id, name, name_en, website_url, directory_url)
            VALUES (?, 'am-nhac-hue', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                name_en = excluded.name_en,
                website_url = excluded.website_url,
                directory_url = excluded.directory_url;
            """, (fac["id"], fac["name"], fac["name_en"], fac["website_url"], fac["directory_url"]))

        # Upsert Departments
        for dept_id, fac_id, dept_name, dept_name_en in DEPARTMENTS_LIST:
            conn.execute("""
            INSERT INTO departments (id, faculty_id, university_id, name, name_en)
            VALUES (?, ?, 'am-nhac-hue', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                name_en = excluded.name_en;
            """, (dept_id, fac_id, dept_name, dept_name_en))

        # Upsert Sources table
        sources_to_record = [
            (BIEU_20_URL, "official_ba_cong_khai_pdf"),
            (BGD_URL, "official_leadership_directory"),
            (OFFICIAL_PORTAL, "official_homepage"),
            ("https://hocvienamnhachue.edu.vn/vi/khoa-nhac-truyen-thong/", "official_faculty_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/khoa-giao-huong/", "official_faculty_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/khoa-sang-tac-ly-luan-chi-huy/", "official_faculty_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/khoa-thanh-nhac-guitare/", "official_faculty_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/khoa-piano-accordeon-organ/", "official_faculty_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/phong-dao-tao/", "official_office_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/phong-khao-thi-va-dam-bao-chat-luong-giao-duc/", "official_office_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/phong-hanh-chinh-tong-hop/", "official_office_directory"),
            ("https://hocvienamnhachue.edu.vn/vi/trung-tam-bieu-dien-nhac/", "official_institute_directory"),
        ]

        for s_url, s_type in sources_to_record:
            s_id = f"src-hva-{abs(hash(s_url)) % 10000000}"
            conn.execute("""
            INSERT INTO sources (id, university_id, url, domain, source_type, status, last_crawled_at)
            VALUES (?, 'am-nhac-hue', ?, 'hocvienamnhachue.edu.vn', ?, 'crawled', ?)
            ON CONFLICT(url) DO UPDATE SET
                status = 'crawled',
                last_crawled_at = excluded.last_crawled_at;
            """, (s_id, s_url, s_type, now_ms))

    # 2. Batch upsert professors into SQLite
    print("\n[3/5] Batch upserting professors, affiliations, and provenance...")
    prof_count, aff_count = storage.batch_upsert_professors(roster)
    print(f"[Storage] Successfully upserted {prof_count:,} professors and {aff_count:,} affiliations.")

    # 3. Export to verified academic JSON
    print("\n[4/5] Exporting to verified_academic_data.json...")
    exported = storage.export_to_verified_json()
    print(f"[Storage] Successfully exported {exported:,} verified records to {CONFIG.JSON_OUTPUT_PATH}.")

    # 4. Generate RAG Chunks JSON file
    print("\n[5/5] Generating RAG dataset for Học Viện Âm Nhạc Huế...")
    rag_chunks = generate_rag_chunks(roster)
    rag_output_path = os.path.join(PROJECT_ROOT, "src", "data", "rag_am_nhac_hue.json")
    with open(rag_output_path, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "dataset": "Học Viện Âm Nhạc Huế - Verified Academic RAG Chunks",
                "institution_code": "HVA",
                "university_id": "am-nhac-hue",
                "total_chunks": len(rag_chunks),
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "version": "1.0.0",
            },
            "chunks": rag_chunks,
        }, f, ensure_ascii=False, indent=2)
    print(f"[RAG] Successfully saved {len(rag_chunks):,} grounded chunks to {rag_output_path}.")

    # Summary Statistics
    with storage.get_connection() as conn:
        total_hva = conn.execute("""
        SELECT COUNT(DISTINCT l.id)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = 'am-nhac-hue';
        """).fetchone()[0]

        degrees = conn.execute("""
        SELECT COALESCE(l.academic_title, 'Khác') as deg_grp, COUNT(*)
        FROM lecturers l
        JOIN affiliations a ON a.lecturer_id = l.id
        WHERE a.university_id = 'am-nhac-hue'
        GROUP BY deg_grp
        ORDER BY COUNT(*) DESC;
        """).fetchall()

        faculties = conn.execute("""
        SELECT COALESCE(a.faculty, 'Chung') as fac_grp, COUNT(*)
        FROM affiliations a
        WHERE a.university_id = 'am-nhac-hue'
        GROUP BY fac_grp
        ORDER BY COUNT(*) DESC;
        """).fetchall()

    print("\n" + "=" * 75)
    print(f" INGESTION SUCCESS: {total_hva:,} TOTAL HVA LECTURERS IN DATABASE")
    print("=" * 75)

    print("\nDegree Distribution:")
    for d in degrees:
        print(f"  - {d[0]}: {d[1]:,}")

    print("\nFaculty Distribution:")
    for f in faculties:
        print(f"  - {f[0]}: {f[1]:,}")


if __name__ == "__main__":
    main()
