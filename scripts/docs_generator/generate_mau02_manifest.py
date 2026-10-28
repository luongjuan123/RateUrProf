#!/usr/bin/env python3
"""
Generate Mau_02_Bug_Manifest.xlsx strictly following the Google Drive template structure:
- Header block with Student info, Course info, System link
- Self-check summary table with auto-calculating Excel formulas (COUNTIF, SUM, IF)
- Detailed Bug Table: 16 pre-seeded bugs covering all 5 categories (Functional, Visual, Content, Performance, Crash)
  with >= 3 Critical/Major bugs, SRS traceability, reproduction steps, expected/actual results, and evidence links.
"""

import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_mau02():
    wb = Workbook()
    ws = wb.active
    ws.title = "Bug_Manifest"
    ws.views.sheetView[0].showGridLines = True

    # Palette
    NAVY_HEADER_FILL = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    BLUE_SUB_FILL = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
    LIGHT_BLUE_FILL = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")
    YELLOW_INPUT_FILL = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    ALERT_RED_FILL = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    GRAY_ROW_FILL = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")

    FONT_TITLE = Font(name="Times New Roman", size=16, bold=True, color="1F4E79")
    FONT_SUBTITLE = Font(name="Times New Roman", size=10, italic=True, color="595959")
    FONT_SECTION = Font(name="Times New Roman", size=11, bold=True, color="1F4E79")
    FONT_HEADER = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")
    FONT_BOLD = Font(name="Times New Roman", size=10, bold=True)
    FONT_REGULAR = Font(name="Times New Roman", size=10)
    FONT_ITALIC = Font(name="Times New Roman", size=9, italic=True, color="595959")
    FONT_STATUS_OK = Font(name="Times New Roman", size=10, bold=True, color="375623")

    THIN_BORDER = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )
    HEADER_BORDER = Border(
        left=Side(style='thin', color='FFFFFF'),
        right=Side(style='thin', color='FFFFFF'),
        top=Side(style='medium', color='1F4E79'),
        bottom=Side(style='medium', color='1F4E79')
    )

    # Title & Guidelines
    ws.merge_cells("A1:M1")
    ws["A1"] = "DANH SÁCH LỖI CÀI SẴN (BUG MANIFEST)"
    ws["A1"].font = FONT_TITLE
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:M2")
    ws["A2"] = 'Nộp RIÊNG cho giảng viên cùng lúc bàn giao sản phẩm (tuần 6). KHÔNG gửi cho bạn test. Không cần sửa lỗi: giữ nguyên sản phẩm đến hết buổi demo. Mỗi lỗi phải vi phạm một yêu cầu cụ thể trong SRS.'
    ws["A2"].font = FONT_SUBTITLE
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[2].height = 20

    # Row 4 to 9: Info Block (Left: Student Info; Right: Self-check Table)
    # Left: Info Block
    info_items = [
        ("Họ và tên", "Lương Chí Dũng"),
        ("MSSV", "24110215"),
        ("Lớp", "BCSE2024 - Trường Đại học Việt Nhật (VJU)"),
        ("Tên hệ thống", "RateProfCuaBan (RateUrProf)"),
        ("Link sản phẩm", "https://rateurprofs.site"),
        ("Tester (bạn cặp)", "Nguyễn Văn A (MSSV: 24110001)"),
        ("Ngày nộp", "26/10/2026")
    ]
    for idx, (label, val) in enumerate(info_items, start=4):
        ws[f"B{idx}"] = label
        ws[f"B{idx}"].font = FONT_BOLD
        ws[f"B{idx}"].fill = LIGHT_BLUE_FILL
        ws[f"B{idx}"].border = THIN_BORDER

        ws.merge_cells(f"C{idx}:D{idx}")
        ws[f"C{idx}"] = val
        ws[f"C{idx}"].font = FONT_REGULAR
        ws[f"C{idx}"].fill = YELLOW_INPUT_FILL
        ws[f"C{idx}"].border = THIN_BORDER
        ws[f"D{idx}"].border = THIN_BORDER

    # Right: Self-check Summary Table
    ws["F4"] = "Tự kiểm tra số lượng"
    ws["F4"].font = FONT_BOLD
    ws["F4"].fill = LIGHT_BLUE_FILL
    ws["F4"].border = THIN_BORDER
    ws["G4"] = "Số lượng"
    ws["G4"].font = FONT_BOLD
    ws["G4"].fill = LIGHT_BLUE_FILL
    ws["G4"].alignment = Alignment(horizontal="center")
    ws["G4"].border = THIN_BORDER
    ws["H4"] = "Tối thiểu"
    ws["H4"].font = FONT_BOLD
    ws["H4"].fill = LIGHT_BLUE_FILL
    ws["H4"].alignment = Alignment(horizontal="center")
    ws["H4"].border = THIN_BORDER
    ws["I4"] = "Trạng thái"
    ws["I4"].font = FONT_BOLD
    ws["I4"].fill = LIGHT_BLUE_FILL
    ws["I4"].alignment = Alignment(horizontal="center")
    ws["I4"].border = THIN_BORDER

    summary_categories = [
        ("Functional", 5, '=COUNTIF(B15:B50, "Functional")'),
        ("Visual", 3, '=COUNTIF(B15:B50, "Visual")'),
        ("Content", 3, '=COUNTIF(B15:B50, "Content")'),
        ("Performance", 2, '=COUNTIF(B15:B50, "Performance")'),
        ("Crash", 2, '=COUNTIF(B15:B50, "Crash")'),
    ]

    for idx, (cat, min_val, formula) in enumerate(summary_categories, start=5):
        ws[f"F{idx}"] = cat
        ws[f"F{idx}"].font = FONT_REGULAR
        ws[f"F{idx}"].border = THIN_BORDER

        ws[f"G{idx}"] = formula
        ws[f"G{idx}"].font = FONT_BOLD
        ws[f"G{idx}"].alignment = Alignment(horizontal="center")
        ws[f"G{idx}"].border = THIN_BORDER

        ws[f"H{idx}"] = min_val
        ws[f"H{idx}"].font = FONT_REGULAR
        ws[f"H{idx}"].alignment = Alignment(horizontal="center")
        ws[f"H{idx}"].border = THIN_BORDER

        ws[f"I{idx}"] = f'=IF(G{idx}>=H{idx}, "Đạt", "Chưa đạt")'
        ws[f"I{idx}"].font = FONT_STATUS_OK
        ws[f"I{idx}"].alignment = Alignment(horizontal="center")
        ws[f"I{idx}"].border = THIN_BORDER

    # Row 10: Total bugs
    ws["F10"] = "Tổng số lỗi"
    ws["F10"].font = FONT_BOLD
    ws["F10"].fill = LIGHT_BLUE_FILL
    ws["F10"].border = THIN_BORDER

    ws["G10"] = "=SUM(G5:G9)"
    ws["G10"].font = FONT_BOLD
    ws["G10"].fill = LIGHT_BLUE_FILL
    ws["G10"].alignment = Alignment(horizontal="center")
    ws["G10"].border = THIN_BORDER

    ws["H10"] = 15
    ws["H10"].font = FONT_BOLD
    ws["H10"].fill = LIGHT_BLUE_FILL
    ws["H10"].alignment = Alignment(horizontal="center")
    ws["H10"].border = THIN_BORDER

    ws["I10"] = '=IF(G10>=H10, "Đạt", "Chưa đạt")'
    ws["I10"].font = FONT_STATUS_OK
    ws["I10"].fill = LIGHT_BLUE_FILL
    ws["I10"].alignment = Alignment(horizontal="center")
    ws["I10"].border = THIN_BORDER

    # Row 11: Critical + Major count
    ws["F11"] = "Mức Critical + Major"
    ws["F11"].font = FONT_BOLD
    ws["F11"].fill = LIGHT_BLUE_FILL
    ws["F11"].border = THIN_BORDER

    ws["G11"] = '=COUNTIF(C15:C50, "Critical") + COUNTIF(C15:C50, "Major")'
    ws["G11"].font = FONT_BOLD
    ws["G11"].fill = LIGHT_BLUE_FILL
    ws["G11"].alignment = Alignment(horizontal="center")
    ws["G11"].border = THIN_BORDER

    ws["H11"] = 3
    ws["H11"].font = FONT_BOLD
    ws["H11"].fill = LIGHT_BLUE_FILL
    ws["H11"].alignment = Alignment(horizontal="center")
    ws["H11"].border = THIN_BORDER

    ws["I11"] = '=IF(G11>=H11, "Đạt", "Chưa đạt")'
    ws["I11"].font = FONT_STATUS_OK
    ws["I11"].fill = LIGHT_BLUE_FILL
    ws["I11"].alignment = Alignment(horizontal="center")
    ws["I11"].border = THIN_BORDER

    ws.merge_cells("F12:I12")
    ws["F12"] = "Bảng tự đếm theo cột Loại lỗi và Mức nghiêm trọng bên dưới."
    ws["F12"].font = FONT_ITALIC
    ws["F12"].alignment = Alignment(horizontal="center")

    # Row 13: Note
    ws.merge_cells("A13:M13")
    ws["A13"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws["A13"].font = FONT_ITALIC

    # Row 14: Table Headers
    headers = [
        "Mã lỗi", "Loại lỗi", "Mức nghiêm trọng", "Chức năng / Luồng",
        "Vị trí (màn hình, URL, API)", "Yêu cầu SRS bị vi phạm (mã + trích nội dung)",
        "Mô tả lỗi", "Các bước tái hiện", "Kết quả mong đợi (theo SRS)",
        "Kết quả thực tế", "Bằng chứng (link ảnh / video lỗi trên sản phẩm)",
        "File chứa lỗi", "Ghi chú"
    ]

    ws.row_dimensions[14].height = 26
    for col_idx, header_title in enumerate(headers, start=1):
        cell = ws.cell(row=14, column=col_idx, value=header_title)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    # The 16 Pre-seeded Bugs
    bugs_data = [
        (
            "SEED-01", "Functional", "Major", "FR-06 / FLOW-01",
            "Màn hình Đánh giá giảng viên (/professors/[id]/rate); API POST /api/lecturers/[id]/reviews",
            'FR-06: "Điểm đánh giá (pedagogy, difficulty, workEffort, gradingFairness) là số nguyên từ 1 đến 5; cấm điểm ngoài thang đo"',
            "Hệ thống cho phép gửi và lưu đánh giá với điểm = 0 hoặc điểm = 6 (vượt thang đo 1-5), làm sai lệch điểm trung bình của giảng viên.",
            "1. Mở trang /professors/[id]/rate\n2. Dùng Postman hoặc DevTools gửi request POST /api/lecturers/[id]/reviews với body {\"pedagogy\": 0, \"difficulty\": 6, ...}\n3. Kiểm tra response và trang chi tiết giảng viên.",
            'API trả về HTTP 400 Bad Request kèm thông báo "Điểm đánh giá phải từ 1 đến 5", từ chối lưu vào CSDL.',
            "API trả về HTTP 201 Created, lưu thành công điểm 0 và 6 vào CSDL, điểm tổng thể hiển thị bị sai lệch.",
            "screenshots/bugs/SEED-01_invalid_rating.png",
            "src/app/api/lecturers/[id]/reviews/route.ts",
            "Pre-seeded bug phục vụ kiểm thử giá trị biên (BVA) và kiểm thử API"
        ),
        (
            "SEED-02", "Functional", "Major", "FR-08 / FLOW-01",
            "Màn hình Chi tiết giảng viên (/professors/[id]); API POST /api/reviews/[id]/upvote",
            'FR-08: "Mỗi người dùng / phiên chỉ được upvote một lần cho mỗi đánh giá; không được spam upvote"',
            "Hệ thống cho phép upvote vô hạn lần khi gửi nhiều request liên tục mà không kiểm tra trùng lặp session/IP.",
            "1. Mở trang /professors/[id]\n2. Bấm nút Hữu ích (Upvote) nhiều lần liên tiếp hoặc gửi liên tục POST /api/reviews/[id]/upvote\n3. Quan sát số lượt vote.",
            "Chỉ tăng 1 lượt upvote, nút chuyển sang trạng thái đã vote và disable hoặc toggle downvote khi bấm lại.",
            "Số lượt upvote tăng liên tục mỗi lần click/request (ví dụ từ 5 lên 12 lượt), không có cơ chế chặn spam.",
            "screenshots/bugs/SEED-02_infinite_upvote.png",
            "src/app/api/reviews/[id]/upvote/route.ts",
            "Pre-seeded bug kiểm thử tính toàn vẹn dữ liệu và concurrency"
        ),
        (
            "SEED-03", "Functional", "Medium", "FR-02",
            "Bộ lọc tìm kiếm giảng viên theo trường (/professors?university=...)",
            'FR-02: "Bộ lọc theo Trường đại học phải trả về chính xác danh sách giảng viên thuộc trường đã chọn"',
            "Khi chọn bộ lọc trường Đại học Việt Nhật (VJU), kết quả trả về cả giảng viên thuộc Đại học Bách Khoa Hà Nội (HUST).",
            "1. Truy cập /professors\n2. Tại dropdown \"Trường đại học\", chọn \"Trường Đại học Việt Nhật (VJU)\"\n3. Quan sát danh sách giảng viên trả về.",
            "Chỉ hiển thị các giảng viên có thuộc tính universityId tương ứng VJU.",
            "Hiển thị lẫn lộn giảng viên của VJU và HUST do logic query SQL dùng OR lỏng lẻo thay vì AND.",
            "screenshots/bugs/SEED-03_filter_university.png",
            "src/lib/search/searchEngine.ts",
            "Pre-seeded bug kiểm thử logic lọc và phân hoạch tương đương (EP)"
        ),
        (
            "SEED-04", "Functional", "Major", "FR-01",
            "Thanh tìm kiếm toàn cục (Global Search Bar trên trang chủ và trang kết quả)",
            'FR-01: "Tìm kiếm hỗ trợ tiếng Việt không dấu (accent-insensitive) và trả về kết quả tương đương tiếng Việt có dấu"',
            'Khi gõ từ khóa không dấu (ví dụ "Nguyen Van A"), hệ thống trả về 0 kết quả mặc dù có giảng viên "Nguyễn Văn A".',
            "1. Mở trang chủ\n2. Nhập vào ô tìm kiếm: \"Nguyen Van\"\n3. Nhấn Enter hoặc nút Tìm kiếm.",
            'Hiển thị danh sách giảng viên mang họ "Nguyễn Văn" tương đương khi gõ "Nguyễn Văn".',
            'Báo "Không tìm thấy giảng viên phù hợp" (0 kết quả) do hàm chuẩn hóa tiếng Việt bị bypass.',
            "screenshots/bugs/SEED-04_accent_insensitive_search.png",
            "src/lib/search/vietnameseNormalizer.ts",
            "Pre-seeded bug ảnh hưởng nghiêm trọng đến trải nghiệm tìm kiếm"
        ),
        (
            "SEED-05", "Functional", "Medium", "FR-04",
            "Nút Lưu giảng viên (Bookmark) và Trang hồ sơ cá nhân / danh sách đã lưu",
            'FR-04: "Giảng viên được lưu (Bookmark) phải được lưu trữ bền vững trong LocalStorage/Database và tồn tại sau khi tải lại trang (F5)"',
            "Bấm Lưu giảng viên hiển thị badge đã lưu, nhưng khi nhấn F5 tải lại trang thì trạng thái lưu bị mất.",
            "1. Truy cập trang chi tiết một giảng viên\n2. Bấm nút \"Lưu giảng viên\" (icon bookmark)\n3. Tải lại trang (F5).",
            "Nút bookmark vẫn ở trạng thái \"Đã lưu\" và giảng viên hiển thị trong danh sách đã lưu.",
            "Nút bookmark quay về trạng thái chưa lưu, LocalStorage không được ghi dữ liệu do thiếu hàm persist.",
            "screenshots/bugs/SEED-05_bookmark_lost_on_reload.png",
            "src/lib/bookmarks.ts",
            "Pre-seeded bug kiểm thử State Transition (Chuyển trạng thái)"
        ),
        (
            "SEED-06", "Functional", "Critical", "FR-07 / FLOW-03",
            "Màn hình Admin (/admin) và API /api/correction-requests",
            'FR-07, SRS-SEC-01: "Chỉ tài khoản có vai trò Quản trị viên (Admin) mới có quyền truy cập /admin và phê duyệt yêu cầu sửa đổi"',
            "Khách (Guest / Unauthenticated) có thể truy cập trực tiếp URL /admin và thực hiện thao tác duyệt yêu cầu sửa đổi mà không bị chặn đăng nhập.",
            "1. Mở trình duyệt ở chế độ ẩn danh (chưa đăng nhập)\n2. Truy cập trực tiếp link https://rateurprofs.site/admin\n3. Thử bấm nút \"Duyệt\" một yêu cầu.",
            "Hệ thống chuyển hướng (redirect) về trang đăng nhập hoặc trả về HTTP 401/403 Forbidden.",
            "Giao diện /admin mở ra đầy đủ và API xử lý thao tác duyệt do thiếu middleware xác thực vai trò.",
            "screenshots/bugs/SEED-06_admin_auth_bypass.png",
            "src/app/admin/page.tsx",
            "Pre-seeded bug kiểm thử Phân quyền (RBAC) và Bảo mật hệ thống"
        ),
        (
            "SEED-07", "Visual", "Minor", "FR-05",
            "Danh sách đánh giá trên trang Chi tiết giảng viên (/professors/[id])",
            'FR-05, SRS-VIS-01: "Giao diện thẻ đánh giá hiển thị đơn nhất, không bị nhân bản hay giật layout khi tương tác"',
            "Sau khi bấm nút Upvote hoặc tương tác với card đánh giá, thẻ đánh giá đó bị nhân đôi hiển thị trên giao diện (duplicated card).",
            "1. Mở trang /professors/[id] có ít nhất 2 đánh giá\n2. Bấm Upvote tại đánh giá đầu tiên\n3. Cuộn nhẹ danh sách.",
            "Thẻ đánh giá giữ nguyên cấu trúc DOM, chỉ cập nhật số vote.",
            "Xuất hiện 2 thẻ đánh giá giống hệt nhau do lỗi key rendering trong React list.",
            "screenshots/bugs/SEED-07_duplicated_review_card.png",
            "src/components/ProfessorCard.tsx",
            "Pre-seeded bug kiểm thử UI/UX giao diện"
        ),
        (
            "SEED-08", "Visual", "Medium", "NFR-04",
            "Trang chủ và Trang danh sách trường (/universities) trên màn hình mobile 375px",
            'NFR-04: "Giao diện responsive hoàn chỉnh từ màn hình 375px đến 1920px, không xuất hiện thanh cuộn ngang (horizontal scrollbar)"',
            "Trên viewport 375px (iPhone SE / iPhone 12 mini), banner hoặc bảng dữ liệu tràn viền 45px gây thanh cuộn ngang khó chịu.",
            "1. Bật F12 DevTools chọn chế độ thiết bị Mobile viewport 375x667\n2. Truy cập trang chủ và trang /universities\n3. Vuốt sang phải.",
            "Tất cả nội dung nằm trọn trong chiều rộng 375px, không có thanh cuộn ngang.",
            "Thanh cuộn ngang xuất hiện, trang bị lệch sang phải do class w-full kèm min-w-[420px] cố định.",
            "screenshots/bugs/SEED-08_mobile_overflow_375px.png",
            "src/components/home/CampusIllustrationBanner.tsx",
            "Pre-seeded bug kiểm thử Responsive trên thiết bị di động"
        ),
        (
            "SEED-09", "Visual", "Minor", "FR-03",
            "Trang Chi tiết giảng viên (/professors/[id]) và Thẻ kết quả tìm kiếm",
            'FR-03, SRS-VIS-02: "Ảnh đại diện giảng viên phải giữ tỷ lệ khung hình chuẩn 1:1, không bị méo mó, co giãn bất thường"',
            "Avatar giảng viên bị co giãn méo hình (aspect ratio distortion) khi ảnh gốc có tỷ lệ không vuông (ví dụ 16:9 hoặc 3:4).",
            "1. Mở trang giảng viên có avatar dạng chữ nhật\n2. Quan sát khung ảnh avatar.",
            "Ảnh được cắt cúp tròn đều hoặc vuông đều với object-fit: cover, không biến dạng khuôn mặt.",
            "Ảnh bị dẹt ngang hoặc kéo dài dọc do thiếu thuộc tính object-cover và cố định width/height không đồng nhất.",
            "screenshots/bugs/SEED-09_avatar_aspect_distortion.png",
            "src/components/ProfessorRow.tsx",
            "Pre-seeded bug thẩm mỹ giao diện người dùng"
        ),
        (
            "SEED-10", "Content", "Major", "FR-04",
            "Trang Giảng viên đã lưu (/saved-professors hoặc Drawer danh sách đã lưu)",
            'FR-04: "Danh sách giảng viên đã lưu phải hiển thị chính xác tên, học hàm, đơn vị công tác của từng giảng viên tương ứng"',
            "Khi lưu 2 giảng viên trở lên, thông tin trường/khoa của giảng viên thứ nhất bị hoán đổi (cross-swapped) sang giảng viên thứ hai.",
            "1. Lưu Giảng viên A (Đại học Quốc gia Hà Nội)\n2. Lưu Giảng viên B (Trường ĐH Bách Khoa)\n3. Mở danh sách đã lưu.",
            "Giảng viên A hiển thị trường ĐHQGHN, Giảng viên B hiển thị trường ĐHBK.",
            "Giảng viên A bị gán nhãn trường ĐHBK và ngược lại do nhầm lẫn chỉ mục index trong mảng lưu trữ.",
            "screenshots/bugs/SEED-10_saved_professors_cross_swapped.png",
            "src/lib/bookmarks.ts",
            "Pre-seeded bug sai lệch nội dung dữ liệu quan trọng"
        ),
        (
            "SEED-11", "Content", "Medium", "FR-11",
            "Thanh chuyển đổi ngôn ngữ (Language Switcher: VI / EN)",
            'FR-11: "Chuyển đổi ngôn ngữ phải bảo toàn nguyên vẹn tham số tìm kiếm, từ khóa và bộ lọc hiện tại trên URL"',
            "Khi đang ở trang kết quả tìm kiếm /professors?q=Hoa&dept=IT, bấm chuyển sang EN thì URL bị reset về /en/professors và mất sạch từ khóa lẫn bộ lọc.",
            "1. Tìm kiếm với từ khóa \"Hóa\" tại /professors?q=Hoa\n2. Bấm nút chuyển ngôn ngữ \"EN\" trên Header.",
            "Chuyển sang /en/professors?q=Hoa, giữ nguyên kết quả tìm kiếm với giao diện tiếng Anh.",
            "URL chuyển thành /en/professors, mất param ?q=Hoa, danh sách tải lại từ đầu.",
            "screenshots/bugs/SEED-11_lang_switch_resets_params.png",
            "src/components/LanguageSwitcher.tsx",
            "Pre-seeded bug kiểm thử đa ngôn ngữ (i18n)"
        ),
        (
            "SEED-12", "Content", "Minor", "FR-11",
            "Form Đánh giá giảng viên trên giao diện Tiếng Anh (/en/professors/[id]/rate)",
            'FR-11: "Toàn bộ nhãn, thông báo và tiêu đề trên giao diện tiếng Anh phải được bản địa hóa 100% sang tiếng Anh"',
            'Trên giao diện tiếng Anh, nhãn tiêu chí "Tính công bằng khi chấm điểm" và nút "Gửi đánh giá" vẫn hiển thị tiếng Việt thô.',
            "1. Chuyển sang ngôn ngữ EN\n2. Truy cập form đánh giá một giảng viên\n3. Kiểm tra các trường nhãn.",
            'Hiển thị "Grading Fairness" và "Submit Review".',
            'Hiển thị "Tính công bằng khi chấm điểm" và "Gửi đánh giá" do hardcode chuỗi text trong component.',
            "screenshots/bugs/SEED-12_hardcoded_vietnamese_labels.png",
            "src/app/professors/[id]/rate/RateProfessorClient.tsx",
            "Pre-seeded bug kiểm thử tính nhất quán nội dung"
        ),
        (
            "SEED-13", "Performance", "Major", "NFR-01",
            "API tìm kiếm giảng viên: GET /api/search",
            'NFR-01: "Thời gian phản hồi P90 của API tìm kiếm ≤ 2.0 giây với 20 người dùng đồng thời (20 concurrent threads)"',
            "Khi chạy tải với 20 concurrent threads bằng JMeter, thời gian phản hồi P90 của API tìm kiếm tăng vọt lên 4.82 giây, vượt ngưỡng cho phép 2.0s.",
            "1. Mở JMeter, cấu hình Thread Group: 20 threads, ramp-up 30s, loop 10\n2. Gửi request GET /api/search?q=Nguyen\n3. Xuất HTML dashboard.",
            "Response time P90 ≤ 2.0s, Error Rate = 0%.",
            "Response time P90 = 4.82s, P95 = 5.31s do query full-table scan thiếu chỉ mục index trên cột normalized_name.",
            "screenshots/bugs/SEED-13_jmeter_search_p90_bottleneck.png",
            "src/lib/server/sqliteClient.ts",
            "Pre-seeded bug kiểm thử hiệu năng tải JMeter"
        ),
        (
            "SEED-14", "Performance", "Medium", "NFR-02",
            "Trang chủ (Homepage: /)",
            'NFR-02: "Chỉ số Largest Contentful Paint (LCP) trên mạng 4G tiêu chuẩn phải ≤ 2.5 giây theo chuẩn Web Vitals"',
            "Chỉ số LCP đo được bằng Lighthouse / DevTools Performance lên tới 5.4 giây do ảnh banner chưa tối ưu kích thước (3.8MB PNG không nén).",
            "1. Mở Chrome DevTools tab Lighthouse hoặc Network (Throttling: Fast 4G)\n2. Tải trang chủ https://rateurprofs.site\n3. Đọc chỉ số LCP.",
            "LCP ≤ 2.5s, Performance Score ≥ 80.",
            "LCP = 5.4s do file ảnh banner dung lượng quá lớn tải chậm, chặn quá trình render chính.",
            "screenshots/bugs/SEED-14_lcp_lighthouse_slow.png",
            "src/components/home/CampusIllustrationBanner.tsx",
            "Pre-seeded bug kiểm thử hiệu năng tải trang Web Vitals"
        ),
        (
            "SEED-15", "Crash", "Critical", "FR-06 / NFR-05",
            "API gửi đánh giá: POST /api/lecturers/[id]/reviews",
            'NFR-05: "Hệ thống phải xử lý an toàn mọi payload không hợp lệ, không bao giờ sập unhandled exception hoặc trả HTTP 500 Internal Server Error"',
            "Gửi body JSON thiếu thuộc tính cơ bản hoặc payload rỗng khiến server crash unhandled exception và trả về HTTP 500 Internal Server Error.",
            "1. Gửi request POST /api/lecturers/lec_001/reviews với body rỗng {} hoặc rỗng Content-Type\n2. Quan sát response của server.",
            'API bắt lỗi và trả về HTTP 400 Bad Request kèm message "Dữ liệu yêu cầu không hợp lệ".',
            "Server trả về HTTP 500 Internal Server Error kèm log TypeError: Cannot read properties of undefined (reading 'pedagogy').",
            "screenshots/bugs/SEED-15_crash_http_500.png",
            "src/app/api/lecturers/[id]/reviews/route.ts",
            "Pre-seeded bug kiểm thử tính chịu lỗi (Fault tolerance) & Negative test"
        ),
        (
            "SEED-16", "Crash", "Major", "FR-01 / NFR-06",
            "Màn hình Tìm kiếm (/professors)",
            'NFR-06: "Ứng dụng phải có cơ chế ngắt timeout và hiển thị thông báo lỗi thân thiện khi mất kết nối mạng, không được đóng băng giao diện (freeze/infinite loading)"',
            "Khi client mất kết nối mạng đột ngột trong lúc gửi request tìm kiếm, giao diện xoay vòng loading mãi mãi và treo đơ trình duyệt.",
            "1. Nhập từ khóa tìm kiếm\n2. Trong DevTools Network tab chọn \"Offline\"\n3. Bấm Tìm kiếm.",
            'Sau 5 giây timeout, spinner dừng lại, hiển thị toast/banner "Không thể kết nối máy chủ, vui lòng kiểm tra đường truyền".',
            "Spinner quay vô hạn, nút tìm kiếm bị disable vĩnh viễn, người dùng không thể thao tác tiếp nếu không F5.",
            "screenshots/bugs/SEED-16_infinite_spinner_freeze.png",
            "src/components/search/SearchBar.tsx",
            "Pre-seeded bug kiểm thử khả năng xử lý ngoại lệ mạng"
        ),
    ]

    for row_idx, bug in enumerate(bugs_data, start=15):
        ws.row_dimensions[row_idx].height = 40
        row_fill = GRAY_ROW_FILL if row_idx % 2 == 0 else PatternFill(fill_type=None)
        for col_idx, val in enumerate(bug, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if col_idx in [1, 2, 3]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if col_idx == 3:
                    if val == "Critical":
                        cell.font = Font(name="Times New Roman", size=10, bold=True, color="C00000")
                    elif val == "Major":
                        cell.font = Font(name="Times New Roman", size=10, bold=True, color="ED7D31")
            elif col_idx in [4, 11, 12]:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    # Set Column Widths
    col_widths = {
        "A": 12,  # Mã lỗi
        "B": 14,  # Loại lỗi
        "C": 16,  # Mức nghiêm trọng
        "D": 18,  # Chức năng / Luồng
        "E": 28,  # Vị trí
        "F": 32,  # Yêu cầu SRS vi phạm
        "G": 32,  # Mô tả lỗi
        "H": 30,  # Các bước tái hiện
        "I": 30,  # Kết quả mong đợi
        "J": 30,  # Kết quả thực tế
        "K": 26,  # Bằng chứng
        "L": 26,  # File chứa lỗi
        "M": 24   # Ghi chú
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    out_path = "docs/Mau_02_Bug_Manifest.xlsx"
    wb.save(out_path)
    print(f"Generated {out_path} successfully!")

if __name__ == "__main__":
    build_mau02()
