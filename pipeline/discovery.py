"""University and Source Discovery Pipeline for RateProfCuaBan.
Discovers Vietnamese universities across North, Central, and South regions,
maintaining a verified source registry with crawl policies and robots permissions.
"""

from __future__ import annotations
import urllib.parse
import re
from typing import List, Dict, Any, Optional
from pipeline.models import UniversityRecord, SourceRegistryRecord


# Curated Nationwide Vietnamese Universities Seed Database (North, Central, South)
VIETNAMESE_UNIVERSITIES_SEED: List[Dict[str, Any]] = [
    # --- MIỀN BẮC (Northern Vietnam) ---
    {
        "id": "hust",
        "name": "Đại học Bách Khoa Hà Nội",
        "short_name": "HUST",
        "english_name": "Hanoi University of Science and Technology",
        "official_domain": "hust.edu.vn",
        "official_website": "https://hust.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Trường đại học kỹ thuật đa ngành hàng đầu Việt Nam, cái nôi đào tạo kỹ sư và nhà khoa học công nghệ cao.",
        "faculties": [
            "Trường Công nghệ Thông tin & Truyền thông (SoICT)",
            "Trường Điện - Điện tử (SEEE)",
            "Trường Cơ khí (SME)",
            "Trường Hóa & Khoa học Sự sống",
            "Trường Vật liệu",
            "Khoa Toán - Tin",
            "Khoa Vật lý Kỹ thuật",
        ],
        "faculty_directory_urls": [
            "https://soict.hust.edu.vn/can-bo",
            "https://seee.hust.edu.vn/doi-ngu-giang-vien",
            "https://sme.hust.edu.vn/giang-vien",
        ],
        "staff_directory_urls": [
            "https://soict.hust.edu.vn/can-bo",
        ],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/dhbkhanoi", "verified": True}
        ],
    },
    {
        "id": "vnu-uet",
        "name": "Trường Đại học Công nghệ - ĐHQG Hà Nội",
        "short_name": "VNU-UET",
        "english_name": "VNU University of Engineering and Technology",
        "official_domain": "uet.vnu.edu.vn",
        "official_website": "https://uet.vnu.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Thành viên nòng cốt của ĐHQG Hà Nội, trung tâm đào tạo công nghệ chất lượng cao chuẩn quốc tế.",
        "faculties": [
            "Khoa Công nghệ Thông tin",
            "Khoa Điện tử Viễn thông",
            "Khoa Cơ học Kỹ thuật & Tự động hóa",
            "Khoa Vật lý Kỹ thuật & Công nghệ Nano",
            "Khoa Công nghệ Nông nghiệp",
        ],
        "faculty_directory_urls": [
            "https://uet.vnu.edu.vn/category/can-bo-giang-vien/",
            "https://fit.uet.vnu.edu.vn/giang-vien/",
        ],
        "staff_directory_urls": [
            "https://fit.uet.vnu.edu.vn/giang-vien/",
        ],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/UET.VNUH", "verified": True}
        ],
    },
    {
        "id": "neu",
        "name": "Trường Đại học Kinh tế Quốc dân",
        "short_name": "NEU",
        "english_name": "National Economics University",
        "official_domain": "neu.edu.vn",
        "official_website": "https://neu.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Trọng điểm quốc gia về đào tạo cử nhân, thạc sĩ, tiến sĩ ngành Kinh tế, Quản lý và Quản trị kinh doanh.",
        "faculties": [
            "Khoa Quản trị Kinh doanh",
            "Khoa Tài chính - Ngân hàng",
            "Khoa Kế toán",
            "Khoa Marketing",
            "Viện Công nghệ Thông tin Kinh tế",
            "Khoa Kinh tế Quốc tế",
        ],
        "faculty_directory_urls": [
            "https://neu.edu.vn/giang-vien",
            "https://kinhtequocdan.neu.edu.vn/can-bo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/ktqdNEU", "verified": True}
        ],
    },
    {
        "id": "ftu",
        "name": "Trường Đại học Ngoại thương",
        "short_name": "FTU",
        "english_name": "Foreign Trade University",
        "official_domain": "ftu.edu.vn",
        "official_website": "https://ftu.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Thương hiệu hàng đầu về kinh tế đối ngoại, thương mại quốc tế, tài chính và logistics.",
        "faculties": [
            "Khoa Kinh tế Quốc tế",
            "Khoa Quản trị Kinh doanh",
            "Khoa Tài chính Ngân hàng",
            "Khoa Luật",
            "Khoa Tiếng Anh Thương mại",
        ],
        "faculty_directory_urls": [
            "https://ftu.edu.vn/doi-ngu-giang-vien",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/ftutimesofficial", "verified": True}
        ],
    },
    {
        "id": "vnu-ussh",
        "name": "Trường Đại học Khoa học Xã hội & Nhân văn - ĐHQG Hà Nội",
        "short_name": "VNU-USSH",
        "english_name": "VNU University of Social Sciences and Humanities",
        "official_domain": "ussh.vnu.edu.vn",
        "official_website": "https://ussh.vnu.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Trung tâm đào tạo và nghiên cứu khoa học xã hội và nhân văn hàng đầu cả nước.",
        "faculties": [
            "Khoa Báo chí & Truyền thông",
            "Khoa Quốc tế học",
            "Khoa Tâm lý học",
            "Khoa Ngôn ngữ học",
            "Khoa Lịch sử",
        ],
        "faculty_directory_urls": [
            "https://ussh.vnu.edu.vn/can-bo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/ussh.vnu", "verified": True}
        ],
    },
    {
        "id": "hmu",
        "name": "Trường Đại học Y Hà Nội",
        "short_name": "HMU",
        "english_name": "Hanoi Medical University",
        "official_domain": "hmu.edu.vn",
        "official_website": "https://hmu.edu.vn",
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "description": "Đại học y khoa lâu đời và uy tín bậc nhất Việt Nam, đào tạo bác sĩ, chuyên gia y tế đầu ngành.",
        "faculties": [
            "Khoa Y đa khoa",
            "Khoa Răng Hàm Mặt",
            "Khoa Y học Cổ truyền",
            "Viện Y học Dự phòng & Y tế Công cộng",
        ],
        "faculty_directory_urls": ["https://hmu.edu.vn/can-bo"],
        "staff_directory_urls": [],
        "verified_social_links": [],
    },
    # --- MIỀN NAM (Southern Vietnam) ---
    {
        "id": "hcmut",
        "name": "Trường ĐH Bách Khoa - ĐHQG TP.HCM",
        "short_name": "HCMUT",
        "english_name": "Ho Chi Minh City University of Technology",
        "official_domain": "hcmut.edu.vn",
        "official_website": "https://hcmut.edu.vn",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "description": "Trường đại học kỹ thuật đa ngành nòng cốt phía Nam đạt nhiều kiểm định quốc tế ABET, AUN-QA.",
        "faculties": [
            "Khoa Khoa học & Kỹ thuật Máy tính (CSE)",
            "Khoa Điện - Điện tử",
            "Khoa Cơ khí",
            "Khoa Kỹ thuật Hóa học",
            "Khoa Quản lý Công nghiệp",
            "Khoa Kỹ thuật Xây dựng",
        ],
        "faculty_directory_urls": [
            "https://cse.hcmut.edu.vn/people/faculty",
            "https://dee.hcmut.edu.vn/giang-vien",
        ],
        "staff_directory_urls": [
            "https://cse.hcmut.edu.vn/people/faculty",
        ],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/bkofficialpage", "verified": True}
        ],
    },
    {
        "id": "uit",
        "name": "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM",
        "short_name": "UIT",
        "english_name": "University of Information Technology",
        "official_domain": "uit.edu.vn",
        "official_website": "https://uit.edu.vn",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "description": "Đại học chuyên sâu hàng đầu về công nghệ thông tin, an toàn thông tin và khoa học dữ liệu phía Nam.",
        "faculties": [
            "Khoa Khoa học Máy tính",
            "Khoa Kỹ thuật Phần mềm",
            "Khoa Mạng Máy tính & Truyền thông",
            "Khoa Hệ thống Thông tin",
            "Khoa Khoa học & Kỹ thuật Thông tin",
            "Khoa An toàn Thông tin",
        ],
        "faculty_directory_urls": [
            "https://cs.uit.edu.vn/giang-vien",
            "https://se.uit.edu.vn/nhan-su",
        ],
        "staff_directory_urls": [
            "https://cs.uit.edu.vn/giang-vien",
        ],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/UIT.Fanpage", "verified": True}
        ],
    },
    {
        "id": "hcmus",
        "name": "Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM",
        "short_name": "HCMUS",
        "english_name": "VNUHCM-University of Science",
        "official_domain": "hcmus.edu.vn",
        "official_website": "https://hcmus.edu.vn",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "description": "Trung tâm đào tạo và nghiên cứu khoa học cơ bản và công nghệ mũi nhọn hàng đầu miền Nam.",
        "faculties": [
            "Khoa Công nghệ Thông tin",
            "Khoa Toán - Tin học",
            "Khoa Vật lý - Vật lý Kỹ thuật",
            "Khoa Hóa học",
            "Khoa Sinh học & Công nghệ Sinh học",
        ],
        "faculty_directory_urls": [
            "https://www.fit.hcmus.edu.vn/vn/default.aspx?tabid=461",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/us.vnuhcm", "verified": True}
        ],
    },
    {
        "id": "ueh",
        "name": "Đại học Kinh tế TP. Hồ Chí Minh",
        "short_name": "UEH",
        "english_name": "University of Economics Ho Chi Minh City",
        "official_domain": "ueh.edu.vn",
        "official_website": "https://ueh.edu.vn",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "description": "Đại học đa ngành trọng điểm quốc gia về kinh tế, tài chính, quản trị và công nghệ đổi mới sáng tạo.",
        "faculties": [
            "Trường Kinh doanh UEH",
            "Trường Kinh tế, Luật và Quản lý nhà nước",
            "Trường Công nghệ và Thiết kế UEH",
        ],
        "faculty_directory_urls": [
            "https://ueh.edu.vn/doi-ngu-giang-vien",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/DHKT.UEH", "verified": True}
        ],
    },
    {
        "id": "rmit",
        "name": "Đại học RMIT Việt Nam",
        "short_name": "RMIT",
        "english_name": "RMIT University Vietnam",
        "official_domain": "rmit.edu.vn",
        "official_website": "https://www.rmit.edu.vn",
        "city": "TP. Hồ Chí Minh",
        "region": "Miền Nam",
        "description": "Chi nhánh quốc tế của Đại học RMIT (Úc), giảng dạy hoàn toàn bằng tiếng Anh theo tiêu chuẩn giáo dục toàn cầu.",
        "faculties": [
            "Khoa Khoa học, Kỹ thuật & Công nghệ",
            "Khoa Kinh doanh",
            "Khoa Truyền thông & Thiết kế",
        ],
        "faculty_directory_urls": [
            "https://www.rmit.edu.vn/vi/ve-rmit/cac-khoa-chuyen-nganh",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/RMITUniversityVietnam", "verified": True}
        ],
    },
    # --- MIỀN TRUNG (Central Vietnam) ---
    {
        "id": "dut",
        "name": "Trường ĐH Bách Khoa - ĐH Đà Nẵng",
        "short_name": "DUT",
        "english_name": "Danang University of Science and Technology",
        "official_domain": "dut.udn.vn",
        "official_website": "http://dut.udn.vn",
        "city": "Đà Nẵng",
        "region": "Miền Trung",
        "description": "Trung tâm đào tạo cán bộ khoa học kỹ thuật và công nghệ lớn nhất miền Trung và Tây Nguyên.",
        "faculties": [
            "Khoa Công nghệ Thông tin",
            "Khoa Điện",
            "Khoa Cơ khí",
            "Khoa Xây dựng Cầu đường",
            "Khoa Hóa",
        ],
        "faculty_directory_urls": [
            "http://dut.udn.vn/KhoaCNTT/Canbo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/DUTpage", "verified": True}
        ],
    },
    {
        "id": "due",
        "name": "Trường ĐH Kinh tế - ĐH Đà Nẵng",
        "short_name": "DUE",
        "english_name": "University of Economics - The University of Danang",
        "official_domain": "due.udn.vn",
        "official_website": "http://due.udn.vn",
        "city": "Đà Nẵng",
        "region": "Miền Trung",
        "description": "Cơ sở giáo dục đại học đào tạo khối ngành kinh tế và quản trị kinh doanh hàng đầu khu vực miền Trung.",
        "faculties": [
            "Khoa Quản trị Kinh doanh",
            "Khoa Kế toán",
            "Khoa Tài chính",
            "Khoa Marketing",
            "Khoa Thương mại Điện tử",
        ],
        "faculty_directory_urls": [
            "http://due.udn.vn/can-bo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/FaceDue", "verified": True}
        ],
    },
    {
        "id": "husc",
        "name": "Trường ĐH Khoa học - Đại học Huế",
        "short_name": "HUSC",
        "english_name": "University of Sciences, Hue University",
        "official_domain": "husc.hueuni.edu.vn",
        "official_website": "http://husc.hueuni.edu.vn",
        "city": "Huế",
        "region": "Miền Trung",
        "description": "Trung tâm đào tạo khoa học cơ bản và khoa học ứng dụng trọng điểm tại Cố đô Huế.",
        "faculties": [
            "Khoa Công nghệ Thông tin",
            "Khoa Toán học",
            "Khoa Hóa học",
            "Khoa Sinh học",
            "Khoa Lịch sử",
        ],
        "faculty_directory_urls": [
            "http://husc.hueuni.edu.vn/can-bo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [],
    },
    {
        "id": "ctu",
        "name": "Trường Đại học Cần Thơ",
        "short_name": "CTU",
        "english_name": "Can Tho University",
        "official_domain": "ctu.edu.vn",
        "official_website": "https://www.ctu.edu.vn",
        "city": "Cần Thơ",
        "region": "Miền Nam",
        "description": "Trường đại học trọng điểm quốc gia, trung tâm đào tạo và chuyển giao khoa học công nghệ hàng đầu vùng Đồng bằng sông Cửu Long.",
        "faculties": [
            "Trường Công nghệ Thông tin & Truyền thông",
            "Trường Bách khoa",
            "Trường Kinh tế",
            "Trường Nông nghiệp",
            "Khoa Thủy sản",
        ],
        "faculty_directory_urls": [
            "https://cit.ctu.edu.vn/can-bo",
        ],
        "staff_directory_urls": [],
        "verified_social_links": [
            {"platform": "facebook", "url": "https://www.facebook.com/CanThoUniversity.CTU", "verified": True}
        ],
    },
]


class UniversityDiscoveryService:
    """Discovers Vietnamese universities, registers verified sources, and generates crawl queues."""

    def __init__(self, universities_data: Optional[List[Dict[str, Any]]] = None):
        self.raw_data = universities_data or VIETNAMESE_UNIVERSITIES_SEED

    def get_all_universities(self) -> List[UniversityRecord]:
        """Returns typed UniversityRecord objects for all seeded universities."""
        records: List[UniversityRecord] = []
        for d in self.raw_data:
            rec = UniversityRecord(
                id=d["id"],
                name=d["name"],
                short_name=d["short_name"],
                city=d["city"],
                region=d["region"],
                english_name=d.get("english_name"),
                official_domain=d.get("official_domain"),
                official_website=d.get("official_website"),
                description=d.get("description"),
                logo_url=d.get("logo_url"),
                cover_image=d.get("cover_image"),
                faculties=d.get("faculties", []),
                faculty_directory_urls=d.get("faculty_directory_urls", []),
                staff_directory_urls=d.get("staff_directory_urls", []),
                research_institute_urls=d.get("research_institute_urls", []),
                course_catalog_urls=d.get("course_catalog_urls", []),
                verified_social_links=d.get("verified_social_links", []),
                source_urls=[d["official_website"]] if d.get("official_website") else [],
            )
            records.append(rec)
        return records

    def build_source_registry(self) -> List[SourceRegistryRecord]:
        """Generates initial source registry items for crawler scheduling."""
        registry_items: List[SourceRegistryRecord] = []

        for d in self.raw_data:
            u_id = d["id"]
            domain = d.get("official_domain", "")

            # 1. Main Official Website
            if d.get("official_website"):
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-homepage",
                        university_id=u_id,
                        url=d["official_website"],
                        domain=domain,
                        source_type="official_homepage",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 2. Faculty Directory Pages
            for idx, f_url in enumerate(d.get("faculty_directory_urls", [])):
                f_domain = urllib.parse.urlparse(f_url).netloc or domain
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-faculty-{idx}",
                        university_id=u_id,
                        url=f_url,
                        domain=f_domain,
                        source_type="faculty_directory",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 3. Staff Directory Pages
            for idx, s_url in enumerate(d.get("staff_directory_urls", [])):
                s_domain = urllib.parse.urlparse(s_url).netloc or domain
                registry_items.append(
                    SourceRegistryRecord(
                        id=f"src-{u_id}-staff-{idx}",
                        university_id=u_id,
                        url=s_url,
                        domain=s_domain,
                        source_type="staff_profile",
                        crawl_policy="allowed",
                        status="pending_crawl",
                    )
                )

            # 4. Verified Social Links (Marked as authorized social export or lead check)
            for idx, soc in enumerate(d.get("verified_social_links", [])):
                if soc.get("platform") == "facebook" and soc.get("verified"):
                    registry_items.append(
                        SourceRegistryRecord(
                            id=f"src-{u_id}-social-fb-{idx}",
                            university_id=u_id,
                            url=soc["url"],
                            domain="facebook.com",
                            source_type="authorized_social_export",
                            crawl_policy="manual_only",  # Do not auto-scrape Facebook HTML directly
                            status="active",
                        )
                    )

        return registry_items

    @staticmethod
    def discover_links_from_html(html: str, base_url: str) -> List[str]:
        """Discovers outbound links belonging to academic/staff directories."""
        pattern = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)
        base_domain = urllib.parse.urlparse(base_url).netloc
        discovered: List[str] = []

        keywords = [
            "can-bo", "giang-vien", "faculty", "staff", "doi-ngu",
            "nhan-su", "bo-mon", "khoa", "people", "academic"
        ]

        for match in pattern.finditer(html):
            rel_or_abs = match.group(1).strip()
            if rel_or_abs.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            full_url = urllib.parse.urljoin(base_url, rel_or_abs)
            parsed = urllib.parse.urlparse(full_url)

            # Keep same root domain or university subdomains
            if parsed.netloc.endswith(base_domain) or base_domain.endswith(parsed.netloc):
                lower_path = parsed.path.lower()
                if any(kw in lower_path for kw in keywords):
                    if full_url not in discovered:
                        discovered.append(full_url)

        return discovered
