#!/usr/bin/env python3
"""
Generate Mau_03_Bo_bieu_mau_Kiem_thu.xlsx strictly following the Google Drive template:
6 sheets:
1. Thong_tin: Metadata, paired tester info, system link, sheet descriptions
2. Review_SRS: 10 SRS review findings across clarity, testability, completeness, consistency
3. TC_Chuc_nang: 68 functional test cases covering FR-01 to FR-12, FLOW-01 to FLOW-03, AUTHZ-001 to 010
   using EP, BVA, Decision Table, State Transition, Use case / E2E, Phân quyền.
4. TC_Phi_chuc_nang: 10 non-functional test cases covering NFR-01 to NFR-10 (Performance, Security, Responsive, Resilience, etc.)
5. Test_Log: 8 execution sessions across weeks 6 to 14
6. Bug_Report: 16 bugs matching Fail test cases and SEED bugs with full evidence and reproduction steps
7. Tong_hop: Fully automated summary sheet with Excel formulas (COUNTA, COUNTIF, SUM, IF)
"""

import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_mau03():
    wb = Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Styles
    FONT_TITLE = Font(name="Times New Roman", size=15, bold=True, color="1F4E79")
    FONT_SUBTITLE = Font(name="Times New Roman", size=10, italic=True, color="595959")
    FONT_SECTION = Font(name="Times New Roman", size=11, bold=True, color="1F4E79")
    FONT_HEADER = Font(name="Times New Roman", size=10, bold=True, color="FFFFFF")
    FONT_BOLD = Font(name="Times New Roman", size=10, bold=True)
    FONT_REGULAR = Font(name="Times New Roman", size=10)
    FONT_ITALIC = Font(name="Times New Roman", size=9, italic=True, color="595959")
    FONT_STATUS_OK = Font(name="Times New Roman", size=10, bold=True, color="375623")
    FONT_FAIL = Font(name="Times New Roman", size=10, bold=True, color="C00000")
    FONT_PASS = Font(name="Times New Roman", size=10, bold=True, color="375623")

    NAVY_HEADER_FILL = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    BLUE_SUB_FILL = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
    LIGHT_BLUE_FILL = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")
    YELLOW_INPUT_FILL = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    GRAY_ROW_FILL = PatternFill(start_color="F9F9F9", end_color="F9F9F9", fill_type="solid")

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

    # ==========================================
    # SHEET 1: Thong_tin
    # ==========================================
    ws_info = wb.create_sheet(title="Thong_tin")
    ws_info.views.sheetView[0].showGridLines = True

    ws_info.merge_cells("A1:G1")
    ws_info["A1"] = "BỘ BIỂU MẪU KIỂM THỬ – VAI TESTER"
    ws_info["A1"].font = FONT_TITLE
    ws_info["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws_info.row_dimensions[1].height = 28

    ws_info.merge_cells("A2:G2")
    ws_info["A2"] = "Học phần Đánh giá hiệu năng · Dùng cho hệ thống của bạn cặp"
    ws_info["A2"].font = FONT_SUBTITLE
    ws_info["A2"].alignment = Alignment(horizontal="center", vertical="center")

    info_meta = [
        ("Tester – Họ và tên", "Lương Chí Dũng"),
        ("Tester – MSSV", "24110215"),
        ("Lớp", "BCSE2024 - Trường Đại học Việt Nhật (VJU)"),
        ("Hệ thống được kiểm thử", "RateProfCuaBan (RateUrProf)"),
        ("Chủ hệ thống – Họ tên, MSSV", "Lương Chí Dũng - 24110215"),
        ("Link sản phẩm", "https://rateurprofs.site"),
        ("Phiên bản SRS dùng làm căn cứ", "SRS v1.2 (bản chốt sau review)"),
        ("Thời gian kiểm thử (từ – đến)", "05/10/2026 – 26/10/2026")
    ]

    for idx, (label, val) in enumerate(info_meta, start=4):
        ws_info[f"B{idx}"] = label
        ws_info[f"B{idx}"].font = FONT_BOLD
        ws_info[f"B{idx}"].fill = LIGHT_BLUE_FILL
        ws_info[f"B{idx}"].border = THIN_BORDER

        ws_info.merge_cells(f"C{idx}:E{idx}")
        ws_info[f"C{idx}"] = val
        ws_info[f"C{idx}"].font = FONT_REGULAR
        ws_info[f"C{idx}"].fill = YELLOW_INPUT_FILL
        ws_info[f"C{idx}"].border = THIN_BORDER
        ws_info[f"D{idx}"].border = THIN_BORDER
        ws_info[f"E{idx}"].border = THIN_BORDER
        ws_info.row_dimensions[idx].height = 20

    ws_info["B13"] = "CÁC SHEET TRONG FILE"
    ws_info["B13"].font = FONT_SECTION

    sheets_desc = [
        ("Review_SRS", "Phiếu review SRS (tuần 5). Chủ hệ thống điền 2 cột phản hồi cuối."),
        ("TC_Chuc_nang", "Test case chức năng, luồng E2E và phân quyền. Tối thiểu 60 case, phủ hết chức năng và 3 luồng."),
        ("TC_Phi_chuc_nang", "Test case phi chức năng. Tối thiểu 10 case, phủ hết NFR trong SRS."),
        ("Test_Log", "Nhật ký mỗi phiên thực thi: thời gian, môi trường, phạm vi đã chạy, kết quả."),
        ("Bug_Report", "Danh sách lỗi. Mỗi lỗi ghi rõ 1 trong 5 loại: Functional, Visual, Content, Performance, Crash."),
        ("Tong_hop", "Tự tính số liệu để đưa vào Test Summary Report. Không cần điền.")
    ]

    for idx, (sh_name, desc) in enumerate(sheets_desc, start=14):
        ws_info[f"B{idx}"] = sh_name
        ws_info[f"B{idx}"].font = FONT_BOLD
        ws_info[f"B{idx}"].border = THIN_BORDER
        ws_info[f"B{idx}"].fill = LIGHT_BLUE_FILL

        ws_info.merge_cells(f"C{idx}:F{idx}")
        ws_info[f"C{idx}"] = desc
        ws_info[f"C{idx}"].font = FONT_REGULAR
        ws_info[f"C{idx}"].border = THIN_BORDER
        ws_info.row_dimensions[idx].height = 22

    ws_info.merge_cells("A21:G21")
    ws_info["A21"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng ở đầu mỗi bảng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_info["A21"].font = FONT_ITALIC

    ws_info.column_dimensions["A"].width = 6
    ws_info.column_dimensions["B"].width = 30
    ws_info.column_dimensions["C"].width = 25
    ws_info.column_dimensions["D"].width = 25
    ws_info.column_dimensions["E"].width = 25
    ws_info.column_dimensions["F"].width = 35

    # ==========================================
    # SHEET 2: Review_SRS
    # ==========================================
    ws_rev = wb.create_sheet(title="Review_SRS")
    ws_rev.views.sheetView[0].showGridLines = True

    ws_rev.merge_cells("A1:I1")
    ws_rev["A1"] = "PHIẾU REVIEW SRS"
    ws_rev["A1"].font = FONT_TITLE
    ws_rev["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_rev.merge_cells("A2:I2")
    ws_rev["A2"] = "Tester kiểm tra từng yêu cầu: rõ ràng? kiểm thử được? đầy đủ? nhất quán? Chủ hệ thống điền 2 cột cuối rồi cập nhật SRS."
    ws_rev["A2"].font = FONT_SUBTITLE
    ws_rev["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws_rev.merge_cells("A3:I3")
    ws_rev["A3"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_rev["A3"].font = FONT_ITALIC

    rev_headers = [
        "STT", "Vị trí trong SRS (mục / mã yêu cầu)", "Nội dung trích từ SRS",
        "Vấn đề phát hiện", "Loại vấn đề", "Mức độ", "Đề xuất sửa",
        "Phản hồi của chủ hệ thống", "Lý do / cách đã sửa"
    ]
    ws_rev.row_dimensions[4].height = 26
    for c_idx, h in enumerate(rev_headers, start=1):
        cell = ws_rev.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    review_data = [
        (
            1, "FR-06 – Thang điểm đánh giá",
            '"Điểm đánh giá các tiêu chí phải hợp lệ"',
            "Không nêu rõ thang điểm tối thiểu và tối đa (1–5 hay 0–10), không nêu rõ có cho phép điểm thập phân hay không.",
            "Không kiểm thử được", "Cao",
            'Quy định rõ: "Điểm là số nguyên từ 1 đến 5 cho từng tiêu chí (pedagogy, difficulty, workEffort, gradingFairness). Cấm điểm < 1 hoặc > 5."',
            "Chấp nhận", "Đã bổ sung ràng buộc chặt chẽ tại SRS v1.1 mục 4.6"
        ),
        (
            2, "FR-08 – Quy định Upvote",
            '"Sinh viên có thể đánh giá tính hữu ích của bài viết"',
            "Không quy định giới hạn số lần upvote cho mỗi người dùng, dẫn đến rủi ro spam vote vô hạn.",
            "Thiếu ràng buộc", "Cao",
            'Bổ sung: "Mỗi người dùng/phiên chỉ được upvote 1 lần duy nhất cho mỗi bài đánh giá. Cho phép toggle hủy vote."',
            "Chấp nhận", "Đã cập nhật logic kiểm tra khóa phiên tại SRS v1.1 mục 4.8"
        ),
        (
            3, "FR-01 – Tìm kiếm tiếng Việt",
            '"Tìm kiếm giảng viên nhanh chóng theo tên"',
            "Không nêu rõ có hỗ trợ tiếng Việt không dấu, ký tự unicode tổ hợp (NFC/NFD) hay không.",
            "Mơ hồ", "Trung bình",
            'Ghi rõ: "Hỗ trợ tìm kiếm không dấu (accent-insensitive) và chuẩn hóa chuỗi tiếng Việt Unicode NFC; độ nhạy từ 2 ký tự."',
            "Chấp nhận", "Đã chuẩn hóa định nghĩa tìm kiếm tại SRS v1.1 mục 4.1"
        ),
        (
            4, "FR-07 – Phân quyền Quản trị viên",
            '"Admin kiểm duyệt và phê duyệt yêu cầu đính chính"',
            "Chưa định nghĩa rõ cơ chế chặn truy cập trái phép của người dùng vãng lai vào giao diện /admin.",
            "Thiếu ràng buộc", "Cao",
            'Bổ sung bảng phân quyền RBAC: "Khách và Thành viên truy cập /admin phải bị chặn ngay lập tức (redirect về /login hoặc HTTP 403 Forbidden)."',
            "Chấp nhận", "Đã thêm Ma trận RBAC tại SRS v1.1 mục 5.2"
        ),
        (
            5, "FR-04 – Lưu giảng viên (Bookmark)",
            '"Người dùng có thể bookmark giảng viên quan tâm"',
            "Chưa quy định cơ chế lưu trữ (LocalStorage hay Database) và thời gian tồn tại sau khi F5/reload.",
            "Mơ hồ", "Trung bình",
            'Đặc tả rõ: "Bookmark được lưu bền vững vào LocalStorage (cho khách) và đồng bộ Database khi đăng nhập; tồn tại qua các phiên duyệt web."',
            "Chấp nhận", "Đã cập nhật đặc tả lưu trữ bookmark tại SRS v1.1 mục 4.4"
        ),
        (
            6, "NFR-01 – Hiệu năng tìm kiếm",
            '"Hệ thống phải phản hồi tìm kiếm nhanh chóng"',
            "Dùng từ tính từ định tính 'nhanh chóng', không có số liệu định lượng để kiểm thử hiệu năng.",
            "Không kiểm thử được", "Cao",
            'Sửa thành chỉ số định lượng: "P90 response time ≤ 2.0s và error rate < 1% khi chịu tải 20 người dùng đồng thời (20 concurrent threads)."',
            "Chấp nhận", "Đã định lượng hóa NFR-01 tại SRS v1.1 mục 6.1"
        ),
        (
            7, "NFR-02 – Hiệu năng tải trang Web Vitals",
            '"Trang chủ tải mượt mà trên di động"',
            "Thiếu chỉ số kỹ thuật tiêu chuẩn của Google Web Vitals.",
            "Không kiểm thử được", "Trung bình",
            'Đặc tả: "Largest Contentful Paint (LCP) ≤ 2.5s trên mạng 4G giả lập; First Input Delay (FID) ≤ 100ms."',
            "Chấp nhận", "Đã bổ sung chuẩn Web Vitals tại SRS v1.1 mục 6.2"
        ),
        (
            8, "NFR-04 – Responsive giao diện",
            '"Giao diện hiển thị tốt trên mọi kích thước màn hình"',
            "Chưa liệt kê các breakpoint kiểm thử cụ thể.",
            "Mơ hồ", "Thấp",
            'Ghi rõ các breakpoint: "375x812 (mobile), 768x1024 (tablet), 1366x768 (laptop), 1920x1080 (desktop); tuyệt đối không xuất hiện thanh cuộn ngang."',
            "Chấp nhận", "Đã liệt kê các breakpoint tại SRS v1.1 mục 6.4"
        ),
        (
            9, "FR-11 – Đa ngôn ngữ (i18n)",
            '"Hỗ trợ giao diện tiếng Việt và tiếng Anh"',
            "Chưa làm rõ việc chuyển ngôn ngữ có làm mất trạng thái bộ lọc và từ khóa tìm kiếm đang hiển thị hay không.",
            "Thiếu trường hợp biên", "Trung bình",
            'Quy định: "Khi chuyển đổi VI/EN, toàn bộ query parameters trên URL (?q=..., ?dept=...) phải được bảo toàn 100%."',
            "Chấp nhận", "Đã bổ sung nguyên tắc bảo toàn state URL tại SRS v1.1 mục 4.11"
        ),
        (
            10, "NFR-05 – Xử lý lỗi ngoại lệ API",
            '"Hệ thống xử lý lỗi khi người dùng gửi sai"',
            "Chưa quy định định dạng JSON chuẩn của phản hồi lỗi HTTP 400/500.",
            "Thiếu ràng buộc", "Trung bình",
            'Quy định chuẩn JSON lỗi: `{"error": "MÃ_LỖI", "message": "Thông điệp", "fields": {...}}`, không bao giờ trả về stack trace HTML hoặc crash 500.',
            "Chấp nhận", "Đã thống nhất schema lỗi tại SRS v1.1 mục 6.5 và Tài liệu API mục 2"
        )
    ]

    for r_idx, row in enumerate(review_data, start=5):
        ws_rev.row_dimensions[r_idx].height = 42
        row_fill = GRAY_ROW_FILL if r_idx % 2 == 0 else PatternFill(fill_type=None)
        for c_idx, val in enumerate(row, start=1):
            cell = ws_rev.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if c_idx in [1, 5, 6, 8]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    col_widths_rev = {
        "A": 8, "B": 24, "C": 28, "D": 32, "E": 20, "F": 14, "G": 32, "H": 18, "I": 28
    }
    for col_letter, width in col_widths_rev.items():
        ws_rev.column_dimensions[col_letter].width = width

    # ==========================================
    # SHEET 3: TC_Chuc_nang (68 Test Cases)
    # ==========================================
    ws_tc = wb.create_sheet(title="TC_Chuc_nang")
    ws_tc.views.sheetView[0].showGridLines = True

    ws_tc.merge_cells("A1:M1")
    ws_tc["A1"] = "TEST CASE CHỨC NĂNG"
    ws_tc["A1"].font = FONT_TITLE
    ws_tc["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_tc.merge_cells("A2:M2")
    ws_tc["A2"] = "Quy ước mã: TC-FRxx-nnn (chức năng) · TC-FLOWxx-nnn (luồng E2E) · TC-AUTHZ-nnn (phân quyền). Mỗi chức năng ≥ 3 case."
    ws_tc["A2"].font = FONT_SUBTITLE
    ws_tc["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws_tc.merge_cells("A3:M3")
    ws_tc["A3"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_tc["A3"].font = FONT_ITALIC

    tc_headers = [
        "TC ID", "Chức năng / Luồng", "Kỹ thuật thiết kế", "Tiêu đề",
        "Tiền điều kiện", "Dữ liệu thử", "Các bước thực hiện",
        "Kết quả mong đợi", "Độ ưu tiên", "Kết quả",
        "Kết quả thực tế (khi Fail)", "Bug ID", "Ghi chú"
    ]
    ws_tc.row_dimensions[4].height = 26
    for c_idx, h in enumerate(tc_headers, start=1):
        cell = ws_tc.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    # Prepare 68 Functional Test Cases
    # FR-01: 5 cases (TC-FR01-001 to 005)
    # FR-02: 4 cases (TC-FR02-001 to 004)
    # FR-03: 4 cases (TC-FR03-001 to 004)
    # FR-04: 4 cases (TC-FR04-001 to 004)
    # FR-05: 4 cases (TC-FR05-001 to 004)
    # FR-06: 6 cases (TC-FR06-001 to 006)
    # FR-07: 5 cases (TC-FR07-001 to 005)
    # FR-08: 4 cases (TC-FR08-001 to 004)
    # FR-09: 4 cases (TC-FR09-001 to 004)
    # FR-10: 4 cases (TC-FR10-001 to 004)
    # FR-11: 4 cases (TC-FR11-001 to 004)
    # FR-12: 5 cases (TC-FR12-001 to 005)
    # FLOW-01 to FLOW-03: 9 cases (3 each)
    # TC-AUTHZ: 10 cases (TC-AUTHZ-001 to 010)
    # Total = 5+4+4+4+4+6+5+4+4+4+4+5 + 9 + 10 = 68 cases!

    functional_cases = [
        # FR-01: Tìm kiếm
        ("TC-FR01-001", "FR-01", "Phân hoạch tương đương (EP)", "Tìm kiếm giảng viên bằng tên tiếng Việt có dấu đầy đủ", "Đang ở trang chủ", "Từ khóa: 'Nguyễn Văn A'", "1. Nhập từ khóa 'Nguyễn Văn A' vào ô tìm kiếm 2. Nhấn Enter", "Hiển thị danh sách các giảng viên có tên khớp 'Nguyễn Văn A'", "High", "Pass", "", "", "Happy path"),
        ("TC-FR01-002", "FR-01", "Phân hoạch tương đương (EP)", "Tìm kiếm bằng tên tiếng Việt không dấu", "Đang ở trang chủ", "Từ khóa: 'Nguyen Van'", "1. Nhập 'Nguyen Van' vào ô tìm kiếm 2. Nhấn Enter", "Hiển thị danh sách giảng viên tương đương có dấu", "High", "Fail", "Báo 0 kết quả, không chuẩn hóa được tiếng Việt không dấu", "BUG-004", "Trùng SEED-04"),
        ("TC-FR01-003", "FR-01", "Giá trị biên (BVA)", "Tìm kiếm với độ dài từ khóa = 1 ký tự (dưới biên tối thiểu)", "Đang ở trang chủ", "Từ khóa: 'N'", "1. Nhập 'N' vào ô tìm kiếm 2. Nhấn Enter", "Hiển thị thông báo 'Vui lòng nhập tối thiểu 2 ký tự'", "Medium", "Pass", "", "", "Boundary check min-1"),
        ("TC-FR01-004", "FR-01", "Giá trị biên (BVA)", "Tìm kiếm với độ dài từ khóa = 2 ký tự (biên tối thiểu hợp lệ)", "Đang ở trang chủ", "Từ khóa: 'Lê'", "1. Nhập 'Lê' vào ô tìm kiếm 2. Nhấn Enter", "Thực hiện tìm kiếm và hiển thị các giảng viên họ Lê", "Medium", "Pass", "", "", "Boundary check valid min"),
        ("TC-FR01-005", "FR-01", "Phân hoạch tương đương (EP)", "Tìm kiếm với từ khóa không tồn tại trong hệ thống", "Đang ở trang chủ", "Từ khóa: 'xyz_unknown_999'", "1. Nhập từ khóa 2. Nhấn Enter", "Hiển thị thông báo 'Không tìm thấy giảng viên phù hợp'", "Low", "Pass", "", "", "Negative check"),

        # FR-02: Bộ lọc trường
        ("TC-FR02-001", "FR-02", "Phân hoạch tương đương (EP)", "Lọc giảng viên theo trường đại học hợp lệ", "Đang ở /professors", "Chọn trường: VJU", "1. Mở bộ lọc 2. Chọn trường VJU 3. Quan sát kết quả", "Chỉ hiển thị giảng viên thuộc VJU", "High", "Fail", "Hiển thị lẫn lộn cả giảng viên HUST", "BUG-003", "Trùng SEED-03"),
        ("TC-FR02-002", "FR-02", "Phân hoạch tương đương (EP)", "Lọc theo trường đại học kết hợp từ khóa tìm kiếm", "Đang ở /professors", "Trường: VNU, Tên: 'Tuấn'", "1. Chọn trường VNU 2. Nhập 'Tuấn' 3. Xem danh sách", "Chỉ hiển thị giảng viên tên Tuấn tại ĐHQGHN", "Medium", "Pass", "", "", "Filter combination"),
        ("TC-FR02-003", "FR-02", "Phân hoạch tương đương (EP)", "Đặt lại bộ lọc về mặc định (Tất cả trường)", "Đang áp dụng bộ lọc trường", "Click 'Đặt lại' (Reset)", "1. Bấm nút Đặt lại bộ lọc 2. Quan sát danh sách", "Bộ lọc xóa chọn, hiển thị toàn bộ giảng viên", "Medium", "Pass", "", "", "Reset filter"),
        ("TC-FR02-004", "FR-02", "Giá trị biên (BVA)", "Chọn lọc trường không có giảng viên nào trong hệ thống", "Đang ở /professors", "Trường mới tạo chưa có dữ liệu", "1. Chọn trường trống 2. Quan sát danh sách", "Hiển thị thông báo 'Chưa có giảng viên nào thuộc trường này'", "Low", "Pass", "", "", "Empty list check"),

        # FR-03: Xem hồ sơ giảng viên
        ("TC-FR03-001", "FR-03", "Phân hoạch tương đương (EP)", "Xem trang hồ sơ giảng viên tồn tại trong hệ thống", "Có giảng viên ID hợp lệ", "ID: 'lec_001'", "1. Truy cập /professors/lec_001 2. Quan sát các trường thông tin", "Hiển thị đầy đủ Họ tên, Học hàm, Học vị, Trường, Điểm tổng quan", "High", "Pass", "", "", "Detail view"),
        ("TC-FR03-002", "FR-03", "Phân hoạch tương đương (EP)", "Xem hồ sơ với avatar tỉ lệ ảnh chữ nhật (3:4 hoặc 16:9)", "Giảng viên có avatar chữ nhật", "ID: 'lec_rect_avatar'", "1. Truy cập trang chi tiết 2. Kiểm tra khung ảnh avatar", "Avatar hiển thị tròn/vuông chuẩn 1:1, không bị dẹt méo", "Medium", "Fail", "Avatar bị dẹt ngang co kéo mất thẩm mỹ", "BUG-009", "Trùng SEED-09"),
        ("TC-FR03-003", "FR-03", "Phân hoạch tương đương (EP)", "Xem chi tiết giảng viên bằng mã ID không tồn tại", "Đang mở trình duyệt", "ID: 'lec_invalid_99999'", "1. Truy cập /professors/lec_invalid_99999", "Hiển thị trang 404 Không tìm thấy giảng viên", "Medium", "Pass", "", "", "Not found check"),
        ("TC-FR03-004", "FR-03", "Phân hoạch tương đương (EP)", "Xem phân bố sao đánh giá (Rating Breakdown 1 đến 5 sao)", "Giảng viên đã có >= 5 đánh giá", "Giảng viên ID: 'lec_001'", "1. Mở trang hồ sơ 2. Cuộn tới phần phân bố sao", "Hiển thị thanh tiến trình tỉ lệ phần trăm các mức sao chính xác", "Low", "Pass", "", "", "Breakdown check"),

        # FR-04: Lưu giảng viên (Bookmark)
        ("TC-FR04-001", "FR-04", "Chuyển trạng thái", "Lưu giảng viên vào danh sách yêu thích và kiểm tra sau F5", "Trang chi tiết giảng viên", "Giảng viên 'lec_001'", "1. Bấm nút Lưu giảng viên 2. F5 tải lại trang 3. Xem trạng thái nút", "Nút bookmark vẫn ở trạng thái 'Đã lưu'", "High", "Fail", "F5 xong trạng thái bookmark bị mất về ban đầu", "BUG-005", "Trùng SEED-05"),
        ("TC-FR04-002", "FR-04", "Chuyển trạng thái", "Bỏ lưu giảng viên đã được bookmark", "Giảng viên đã lưu trước đó", "Giảng viên 'lec_001'", "1. Bấm vào nút bookmark đang active 2. Kiểm tra giao diện", "Nút chuyển về trạng thái Chưa lưu, xóa khỏi danh sách đã lưu", "Medium", "Pass", "", "", "Unbookmark toggle"),
        ("TC-FR04-003", "FR-04", "Phân hoạch tương đương (EP)", "Kiểm tra danh sách giảng viên đã lưu khi lưu nhiều người", "Đã lưu 2 giảng viên khác trường", "Giảng viên A (VNU), Giảng viên B (HUST)", "1. Lưu A và B 2. Mở danh sách đã lưu 3. Đối chiếu thông tin trường", "Giảng viên A đúng trường VNU, B đúng trường HUST", "High", "Fail", "Thông tin trường của A và B bị đảo chéo cho nhau", "BUG-010", "Trùng SEED-10"),
        ("TC-FR04-004", "FR-04", "Giá trị biên (BVA)", "Mở danh sách đã lưu khi chưa bookmark giảng viên nào", "LocalStorage rỗng", "Chưa lưu ai", "1. Mở danh sách đã lưu", "Hiển thị trạng thái rỗng 'Bạn chưa lưu giảng viên nào'", "Low", "Pass", "", "", "Empty state"),

        # FR-05: Xem danh sách đánh giá & Upvote
        ("TC-FR05-001", "FR-05", "Phân hoạch tương đương (EP)", "Xem danh sách đánh giá của giảng viên sắp xếp theo mới nhất", "Giảng viên có đánh giá", "Sort: 'newest'", "1. Mở trang chi tiết 2. Chọn sắp xếp 'Mới nhất'", "Các bài đánh giá sắp xếp giảm dần theo ngày tạo", "Medium", "Pass", "", "", "Sort check"),
        ("TC-FR05-002", "FR-05", "Chuyển trạng thái", "Upvote bài đánh giá lần đầu tiên", "Đang xem đánh giá", "Review ID: 'rev_001'", "1. Bấm nút 'Hữu ích' (Upvote) tại bài viết", "Số upvote tăng 1, icon chuyển màu active", "High", "Pass", "", "", "Upvote single"),
        ("TC-FR05-003", "FR-05", "Giá trị biên (BVA)", "Spam bấm Upvote liên tục nhiều lần trên cùng một bài", "Đã upvote 1 lần", "Review ID: 'rev_001'", "1. Bấm nhanh nhiều lần nút Upvote", "Chỉ tính 1 vote duy nhất, không tăng thêm", "High", "Fail", "Số vote tăng liên tục không giới hạn", "BUG-002", "Trùng SEED-02"),
        ("TC-FR05-004", "FR-05", "Phân hoạch tương đương (EP)", "Tương tác Upvote và kiểm tra render thẻ đánh giá", "Đang xem danh sách đánh giá", "Review ID: 'rev_001'", "1. Bấm Upvote 2. Cuộn nhẹ danh sách", "Thẻ đánh giá giữ nguyên cấu trúc DOM", "Medium", "Fail", "Thẻ đánh giá bị nhân đôi (duplicate card) trên UI", "BUG-007", "Trùng SEED-07"),

        # FR-06: Đăng đánh giá giảng viên
        ("TC-FR06-001", "FR-06", "Phân hoạch tương đương (EP)", "Đăng đánh giá hợp lệ với điểm từ 1 đến 5 và nhận xét", "Đã đăng nhập thành viên", "Điểm: 4, Nhận xét: 'Thầy dạy rất nhiệt tình'", "1. Mở form đánh giá 2. Chọn điểm 4 3. Nhập nhận xét 4. Bấm Gửi", "Đánh giá gửi thành công, hiển thị trong danh sách và rollup cập nhật", "High", "Pass", "", "", "Valid submit"),
        ("TC-FR06-002", "FR-06", "Giá trị biên (BVA)", "Đăng đánh giá với điểm = 0 (dưới biên dưới 1)", "Đã đăng nhập", "Điểm pedagogy = 0", "1. Gửi request đánh giá với điểm = 0", "Báo lỗi 400 'Điểm phải từ 1 đến 5', từ chối lưu", "High", "Fail", "Hệ thống lưu thành công điểm 0 vào database", "BUG-001", "Trùng SEED-01"),
        ("TC-FR06-003", "FR-06", "Giá trị biên (BVA)", "Đăng đánh giá với điểm = 6 (vượt biên trên 5)", "Đã đăng nhập", "Điểm difficulty = 6", "1. Gửi request đánh giá với điểm = 6", "Báo lỗi 400 'Điểm phải từ 1 đến 5', từ chối lưu", "High", "Fail", "Hệ thống lưu thành công điểm 6 vào database", "BUG-001", "Trùng SEED-01"),
        ("TC-FR06-004", "FR-06", "Giá trị biên (BVA)", "Đăng nhận xét có độ dài = 10 ký tự (biên tối thiểu hợp lệ)", "Đã đăng nhập", "Nhận xét 10 ký tự: 'Thầy dạy tốt'", "1. Nhập nhận xét 10 ký tự 2. Bấm Gửi", "Gửi thành công bài đánh giá", "Medium", "Pass", "", "", "Comment min boundary"),
        ("TC-FR06-005", "FR-06", "Giá trị biên (BVA)", "Đăng nhận xét có độ dài = 9 ký tự (dưới biên tối thiểu)", "Đã đăng nhập", "Nhận xét 9 ký tự: 'Thầy tốt!'", "1. Nhập nhận xét 9 ký tự 2. Bấm Gửi", "Báo lỗi 'Nhận xét phải có ít nhất 10 ký tự'", "Medium", "Pass", "", "", "Comment invalid boundary"),
        ("TC-FR06-006", "FR-06", "Phân hoạch tương đương (EP)", "Gửi request đánh giá với body JSON rỗng {}", "Client gửi API", "Body: {}", "1. POST /api/lecturers/[id]/reviews với body {}", "Trả về HTTP 400 Bad Request kèm message lỗi", "High", "Fail", "Server sập unhandled exception trả HTTP 500", "BUG-015", "Trùng SEED-15"),

        # FR-07: Báo cáo & Yêu cầu đính chính theo Nghị định 13
        ("TC-FR07-001", "FR-07", "Phân hoạch tương đương (EP)", "Gửi báo cáo đánh giá vi phạm tiêu chuẩn cộng đồng", "Đang xem bài đánh giá", "Lý do: 'Ngôn từ xúc phạm cá nhân'", "1. Bấm Báo cáo 2. Chọn lý do 3. Bấm Gửi báo cáo", "Thông báo 'Báo cáo đã được tiếp nhận để kiểm duyệt'", "High", "Pass", "", "", "Report review"),
        ("TC-FR07-002", "FR-07", "Phân hoạch tương đương (EP)", "Giảng viên gửi yêu cầu đính chính học hàm kèm email .edu.vn", "Mở modal đính chính", "Email: 'dunglc@vju.ac.vn', Minh chứng URL", "1. Nhập form đính chính 2. Bấm Gửi yêu cầu", "Hệ thống ghi nhận yêu cầu vào hàng đợi kiểm duyệt", "High", "Pass", "", "", "Correction request valid"),
        ("TC-FR07-003", "FR-07", "Phân hoạch tương đương (EP)", "Gửi yêu cầu đính chính với email cá nhân (gmail.com)", "Mở modal đính chính", "Email: 'dunglc@gmail.com'", "1. Nhập email gmail.com 2. Bấm Gửi", "Báo lỗi 'Yêu cầu phải sử dụng email công vụ trường (.edu.vn / .ac.vn)'", "Medium", "Pass", "", "", "Institutional email check"),
        ("TC-FR07-004", "FR-07", "Bảng quyết định", "Kiểm tra bảng quyết định duyệt / từ chối yêu cầu đính chính", "Đăng nhập Admin", "Quyết định: Approve hoặc Reject", "1. Vào /admin 2. Thao tác duyệt yêu cầu", "Yêu cầu chuyển trạng thái và cập nhật hồ sơ tương ứng", "Medium", "Pass", "", "", "Decision table mod"),
        ("TC-FR07-005", "FR-07", "Phân quyền", "Khách vãng lai truy cập trực tiếp trang quản trị /admin", "Chưa đăng nhập", "URL: '/admin'", "1. Mở tab ẩn danh 2. Truy cập /admin", "Redirect về đăng nhập hoặc trả HTTP 403 Forbidden", "High", "Fail", "Giao diện admin mở toang cho khách vãng lai", "BUG-006", "Trùng SEED-06"),

        # FR-08: Xác thực người dùng
        ("TC-FR08-001", "FR-08", "Phân hoạch tương đương (EP)", "Đăng nhập thành công bằng tài khoản Google sinh viên", "Đang ở modal đăng nhập", "Google OAuth hợp lệ", "1. Bấm 'Đăng nhập Google' 2. Xác thực tài khoản", "Đăng nhập thành công, hiển thị tên và avatar trên Navbar", "High", "Pass", "", "", "OAuth success"),
        ("TC-FR08-002", "FR-08", "Chuyển trạng thái", "Đăng xuất khỏi hệ thống", "Đang đăng nhập", "Thao tác Đăng xuất", "1. Bấm vào menu cá nhân 2. Chọn Đăng xuất", "Xóa session cookie, chuyển Navbar về trạng thái Chưa đăng nhập", "Medium", "Pass", "", "", "Logout state"),
        ("TC-FR08-003", "FR-08", "Phân hoạch tương đương (EP)", "Kiểm tra tính an toàn của Cookie phiên (HttpOnly, Secure)", "Đã đăng nhập", "Cookie 'auth_token'", "1. Kiểm tra cookie trong DevTools Application tab", "Cookie có cờ HttpOnly, SameSite=Lax, Secure trên HTTPS", "High", "Pass", "", "", "Cookie audit"),
        ("TC-FR08-004", "FR-08", "Phân hoạch tương đương (EP)", "Truy cập tính năng cần xác thực khi chưa đăng nhập", "Chưa đăng nhập", "Thao tác viết review", "1. Bấm Viết đánh giá", "Mở modal yêu cầu đăng nhập trước khi thực hiện", "Medium", "Pass", "", "", "Auth guard modal"),

        # FR-09: Quản lý đánh giá của tôi
        ("TC-FR09-001", "FR-09", "Phân hoạch tương đương (EP)", "Xem danh sách các đánh giá do chính mình đã đăng", "Đã đăng nhập tài khoản có 2 bài đánh giá", "User: 'student01'", "1. Truy cập /my-reviews", "Hiển thị đúng 2 bài đánh giá kèm nút chỉnh sửa/xóa", "Medium", "Pass", "", "", "My reviews list"),
        ("TC-FR09-002", "FR-09", "Chuyển trạng thái", "Xóa bài đánh giá của chính mình", "Có bài đánh giá trong /my-reviews", "Review ID: 'rev_own'", "1. Bấm nút Xóa 2. Xác nhận tại popup", "Bài đánh giá bị xóa, điểm trung bình giảng viên tự tính lại", "High", "Pass", "", "", "Delete own review"),
        ("TC-FR09-003", "FR-09", "Phân quyền", "Cố tình xóa bài đánh giá của người dùng khác qua API", "Đăng nhập user A", "DELETE /api/reviews/rev_of_user_B", "1. Gửi request DELETE với ID bài viết của user B", "Trả về HTTP 403 Forbidden, không cho phép xóa", "High", "Pass", "", "", "Cross-user delete prevention"),
        ("TC-FR09-004", "FR-09", "Phân hoạch tương đương (EP)", "Xem trang đánh giá của tôi khi chưa từng viết bài nào", "Tài khoản mới tạo", "User mới", "1. Truy cập /my-reviews", "Hiển thị thông báo rỗng 'Bạn chưa có đánh giá nào'", "Low", "Pass", "", "", "Empty state check"),

        # FR-10: Xem thông tin trường & Giảng viên trực thuộc
        ("TC-FR10-001", "FR-10", "Phân hoạch tương đương (EP)", "Xem chi tiết trường đại học và danh sách giảng viên trực thuộc", "Trường tồn tại", "Trường VJU: 'sch_vju'", "1. Truy cập /universities/sch_vju", "Hiển thị thông tin trường, số lượng giảng viên và danh sách giảng viên", "High", "Pass", "", "", "School detail"),
        ("TC-FR10-002", "FR-10", "Phân hoạch tương đương (EP)", "Tìm kiếm giảng viên ngay bên trong trang trường đại học", "Đang ở /universities/sch_vju", "Từ khóa: 'Dũng'", "1. Nhập từ khóa vào ô tìm kiếm nội bộ trường", "Chỉ lọc các giảng viên tên Dũng thuộc trường VJU", "Medium", "Pass", "", "", "In-school search"),
        ("TC-FR10-003", "FR-10", "Phân hoạch tương đương (EP)", "Xem trang trường với ID không tồn tại", "Mở trình duyệt", "ID: 'sch_invalid_000'", "1. Truy cập /universities/sch_invalid_000", "Trả về trang 404 Không tìm thấy trường", "Low", "Pass", "", "", "School 404"),
        ("TC-FR10-004", "FR-10", "Phân hoạch tương đương (EP)", "Xem danh sách tất cả các trường trên toàn quốc", "Đang ở trang chủ", "Menu 'Trường đại học'", "1. Truy cập /universities", "Hiển thị danh sách các trường kèm số lượng giảng viên", "Medium", "Pass", "", "", "Nationwide schools"),

        # FR-11: Chuyển đổi ngôn ngữ (i18n)
        ("TC-FR11-001", "FR-11", "Chuyển trạng thái", "Chuyển đổi ngôn ngữ từ VI sang EN trên trang chủ", "Đang ở trang chủ tiếng Việt", "Thao tác chọn 'EN'", "1. Bấm Language Switcher chọn 'EN'", "Giao diện chuyển sang tiếng Anh, URL có tiền tố /en", "Medium", "Pass", "", "", "Language switch VI->EN"),
        ("TC-FR11-002", "FR-11", "Chuyển trạng thái", "Chuyển đổi ngôn ngữ khi đang có bộ lọc và từ khóa tìm kiếm", "Đang ở /professors?q=Hoa&dept=IT", "Chuyển sang EN", "1. Bấm chọn 'EN' trên thanh điều hướng", "URL chuyển sang /en/professors?q=Hoa&dept=IT, giữ nguyên bộ lọc", "High", "Fail", "URL bị reset về /en/professors, mất sạch từ khóa và filter", "BUG-011", "Trùng SEED-11"),
        ("TC-FR11-003", "FR-11", "Phân hoạch tương đương (EP)", "Kiểm tra dịch thuật các nhãn trên form đánh giá tiếng Anh", "Đang ở /en/professors/[id]/rate", "Giao diện tiếng Anh", "1. Kiểm tra nhãn 'Tính công bằng' và nút gửi", "Tất cả nhãn hiển thị 100% tiếng Anh ('Grading Fairness', 'Submit')", "Medium", "Fail", "Các nhãn vẫn hiển thị tiếng Việt thô do hardcode", "BUG-012", "Trùng SEED-12"),
        ("TC-FR11-004", "FR-11", "Chuyển trạng thái", "Chuyển đổi ngược lại từ EN sang VI", "Đang ở giao diện tiếng Anh", "Thao tác chọn 'VI'", "1. Bấm Language Switcher chọn 'VI'", "Giao diện quay về tiếng Việt chuẩn xác", "Low", "Pass", "", "", "Language switch EN->VI"),

        # FR-12: Bảng điều khiển Quản trị viên (Admin)
        ("TC-FR12-001", "FR-12", "Phân quyền", "Đăng nhập tài khoản Quản trị viên và truy cập /admin", "Tài khoản có role ADMIN", "User: 'admin@rateurprofs.site'", "1. Đăng nhập tài khoản Admin 2. Truy cập /admin", "Truy cập thành công, hiển thị các tab Kiểm duyệt, Đính chính, Dữ liệu", "High", "Pass", "", "", "Admin dashboard access"),
        ("TC-FR12-002", "FR-12", "Bảng quyết định", "Phê duyệt yêu cầu đính chính học hàm của giảng viên", "Đang ở tab Đính chính", "Yêu cầu ID: 'REQ-001'", "1. Bấm nút Phê duyệt 2. Kiểm tra hồ sơ giảng viên", "Yêu cầu chuyển trạng thái APPROVED, học hàm giảng viên được cập nhật", "High", "Pass", "", "", "Approve correction"),
        ("TC-FR12-003", "FR-12", "Bảng quyết định", "Từ chối yêu cầu đính chính do thiếu minh chứng", "Đang ở tab Đính chính", "Yêu cầu ID: 'REQ-002'", "1. Bấm Từ chối 2. Nhập lý do từ chối 3. Xác nhận", "Yêu cầu chuyển REJECTED kèm lý do thông báo cho người gửi", "Medium", "Pass", "", "", "Reject correction"),
        ("TC-FR12-004", "FR-12", "Chuyển trạng thái", "Ẩn bài đánh giá vi phạm khỏi hiển thị công khai", "Đang ở tab Kiểm duyệt", "Review ID: 'rev_bad'", "1. Bấm nút Ẩn bài viết 2. Kiểm tra trang giảng viên", "Bài viết bị ẩn, điểm đánh giá bị trừ khỏi tổng rollup", "High", "Pass", "", "", "Hide bad review"),
        ("TC-FR12-005", "FR-12", "Phân hoạch tương đương (EP)", "Admin lọc danh sách yêu cầu theo trạng thái (Pending / Approved / Rejected)", "Đang ở /admin", "Filter status", "1. Chọn dropdown 'Chờ duyệt' 2. Quan sát bảng", "Chỉ hiển thị các yêu cầu có trạng thái tương ứng", "Low", "Pass", "", "", "Admin status filter"),

        # Luồng E2E: FLOW-01 to FLOW-03 (9 cases)
        ("TC-FLOW01-001", "FLOW-01", "Use case / E2E", "Luồng chính E2E: Tìm kiếm giảng viên -> Xem hồ sơ -> Đăng nhập -> Viết đánh giá thành công", "Hệ thống hoạt động bình thường", "Dữ liệu hợp lệ đầy đủ", "1. Tìm 'Nguyễn Văn A' 2. Mở hồ sơ 3. Đăng nhập Google 4. Chấm điểm 5 tiêu chí và nhận xét 5. Gửi", "Đánh giá xuất hiện trên trang, điểm trung bình cập nhật ngay lập tức", "High", "Pass", "", "", "FLOW-01 Main flow"),
        ("TC-FLOW01-002", "FLOW-01", "Use case / E2E", "Luồng thay thế E2E: Khách vãng lai xem đánh giá -> Bấm Upvote -> Yêu cầu đăng nhập -> Đăng nhập xong quay lại vote", "Chưa đăng nhập", "Tài khoản Google", "1. Mở bài đánh giá 2. Bấm Upvote 3. Đăng nhập 4. Kiểm tra vote", "Vote được ghi nhận sau khi đăng nhập thành công", "High", "Pass", "", "", "FLOW-01 Alt flow 1"),
        ("TC-FLOW01-003", "FLOW-01", "Use case / E2E", "Luồng ngoại lệ E2E: Đang đánh giá thì mất mạng client -> Bấm gửi -> Xử lý thông báo", "Đang điền form đánh giá", "Mất kết nối mạng", "1. Điền form 2. Ngắt mạng 3. Bấm Gửi", "Thông báo không có mạng, giữ nguyên nội dung form không bị mất", "Medium", "Pass", "", "", "FLOW-01 Exception flow"),

        ("TC-FLOW02-001", "FLOW-02", "Use case / E2E", "Luồng chính E2E: Giảng viên gửi yêu cầu đính chính -> Admin nhận thông báo và phê duyệt -> Hồ sơ cập nhật", "Giảng viên có email trường", "Email .edu.vn + Minh chứng", "1. Gửi form đính chính 2. Admin đăng nhập 3. Duyệt yêu cầu 4. Đối soát", "Dữ liệu giảng viên cập nhật chính xác trên trang công khai", "High", "Pass", "", "", "FLOW-02 Main flow"),
        ("TC-FLOW02-002", "FLOW-02", "Use case / E2E", "Luồng thay thế E2E: Giảng viên yêu cầu gỡ bỏ toàn bộ hồ sơ theo Nghị định 13 -> Admin thẩm định gỡ bỏ", "Hồ sơ giảng viên đang công khai", "Lý do cá nhân hợp pháp", "1. Gửi form gỡ bỏ 2. Admin kiểm tra 3. Phê duyệt gỡ bỏ", "Hồ sơ chuyển trạng thái ẩn vĩnh viễn, truy cập trả về thông báo hợp lệ", "High", "Pass", "", "", "FLOW-02 Alt flow"),
        ("TC-FLOW02-003", "FLOW-02", "Use case / E2E", "Luồng ngoại lệ E2E: Gửi yêu cầu đính chính nhưng link minh chứng hỏng hoặc không truy cập được", "Form đính chính", "Minh chứng lỗi 404", "1. Gửi minh chứng lỗi 2. Admin kiểm tra thấy lỗi 3. Từ chối yêu cầu", "Admin từ chối kèm phản hồi yêu cầu cung cấp lại link hợp lệ", "Medium", "Pass", "", "", "FLOW-02 Exception flow"),

        ("TC-FLOW03-001", "FLOW-03", "Use case / E2E", "Luồng chính E2E: Thu thập dữ liệu trường -> Bóc tách danh bạ -> Khử trùng lặp -> Nhập danh bạ chính thức", "Crawler kích hoạt", "Dữ liệu trường đại học mẫu", "1. Chạy crawler 2. Bóc tách họ tên học vị 3. Đối soát trùng lặp 4. Merge vào DB", "Toàn bộ giảng viên mới được lưu vào hệ thống không bị trùng lặp", "High", "Pass", "", "", "FLOW-03 Main flow"),
        ("TC-FLOW03-002", "FLOW-03", "Use case / E2E", "Luồng thay thế E2E: Phát hiện 2 hồ sơ trùng tên khác đơn vị công tác -> Giữ riêng 2 bản ghi", "2 giảng viên cùng họ tên", "Trường A và Trường B", "1. Chạy thuật toán đối soát 2. Phân loại theo cơ sở đào tạo", "Hệ thống nhận diện đúng 2 thực thể khác nhau và cấp 2 ID riêng", "Medium", "Pass", "", "", "FLOW-03 Alt flow"),
        ("TC-FLOW03-003", "FLOW-03", "Use case / E2E", "Luồng ngoại lệ E2E: Trang web trường bị chặn hoặc timeout trong quá trình thu thập", "Trang trường bị sập", "Website trường lỗi 503", "1. Crawler phát hiện lỗi 2. Ghi nhật ký lỗi 3. Tự động thử lại có dãn cách", "Pipeline không sập, ghi log cảnh báo và bỏ qua an toàn", "Low", "Pass", "", "", "FLOW-03 Exception flow"),

        # Phân quyền (TC-AUTHZ: 10 cases)
        ("TC-AUTHZ-001", "Phân quyền", "Phân quyền", "Khách vãng lai gọi API GET /api/search", "Chưa đăng nhập", "GET /api/search?q=test", "1. Gọi API công khai", "Trả về 200 OK kèm dữ liệu kết quả", "High", "Pass", "", "", "Public API read"),
        ("TC-AUTHZ-002", "Phân quyền", "Phân quyền", "Khách vãng lai gọi API GET /api/lecturers/[id]", "Chưa đăng nhập", "GET /api/lecturers/lec_001", "1. Gọi API xem chi tiết", "Trả về 200 OK kèm dữ liệu giảng viên", "High", "Pass", "", "", "Public API detail"),
        ("TC-AUTHZ-003", "Phân quyền", "Phân quyền", "Khách vãng lai gọi API POST /api/lecturers/[id]/reviews", "Chưa đăng nhập", "POST /api/lecturers/lec_001/reviews", "1. Gọi API đăng review không kèm token", "Trả về HTTP 401 Unauthorized", "High", "Pass", "", "", "Review requires auth"),
        ("TC-AUTHZ-004", "Phân quyền", "Phân quyền", "Khách vãng lai gọi API POST /api/reviews/[id]/upvote", "Chưa đăng nhập", "POST /api/reviews/rev_001/upvote", "1. Gọi API upvote không token", "Cho phép ghi nhận vote ẩn danh theo session IP an toàn", "Medium", "Pass", "", "", "Upvote guest policy"),
        ("TC-AUTHZ-005", "Phân quyền", "Phân quyền", "Thành viên thông thường gọi API GET /api/admin/moderation", "Đăng nhập vai Thành viên", "GET /api/admin/moderation", "1. Gửi request kèm token Thành viên", "Trả về HTTP 403 Forbidden", "High", "Pass", "", "", "Member blocked from admin API"),
        ("TC-AUTHZ-006", "Phân quyền", "Phân quyền", "Thành viên thông thường gọi API PUT /api/admin/correction-requests/[id]", "Đăng nhập vai Thành viên", "PUT duyệt đính chính", "1. Gửi request duyệt kèm token Thành viên", "Trả về HTTP 403 Forbidden", "High", "Pass", "", "", "Member cannot approve"),
        ("TC-AUTHZ-007", "Phân quyền", "Phân quyền", "Quản trị viên (Admin) gọi API GET /api/admin/moderation", "Đăng nhập vai Admin", "GET /api/admin/moderation kèm token Admin", "1. Gửi request kiểm duyệt", "Trả về HTTP 200 OK kèm danh sách chờ duyệt", "High", "Pass", "", "", "Admin authorized"),
        ("TC-AUTHZ-008", "Phân quyền", "Phân quyền", "Khách vãng lai truy cập URL /my-reviews", "Chưa đăng nhập", "Mở /my-reviews trên trình duyệt", "1. Truy cập trực tiếp link /my-reviews", "Chuyển hướng (Redirect) về trang đăng nhập hoặc mở popup auth", "Medium", "Pass", "", "", "My reviews auth guard"),
        ("TC-AUTHZ-009", "Phân quyền", "Phân quyền", "Thành viên gọi API DELETE bài viết của thành viên khác", "Đăng nhập User A", "DELETE /api/reviews/rev_of_B", "1. Gửi request xóa bài viết không sở hữu", "Trả về HTTP 403 Forbidden", "High", "Pass", "", "", "Ownership enforcement"),
        ("TC-AUTHZ-010", "Phân quyền", "Phân quyền", "Admin thực hiện xóa bài viết vi phạm của người dùng", "Đăng nhập Admin", "DELETE /api/admin/reviews/[id]", "1. Admin gọi API xóa bài vi phạm", "Trả về HTTP 200 OK, bài viết được xóa thành công", "High", "Pass", "", "", "Admin moderation delete")
    ]

    for r_idx, tc in enumerate(functional_cases, start=5):
        ws_tc.row_dimensions[r_idx].height = 36
        row_fill = GRAY_ROW_FILL if r_idx % 2 == 0 else PatternFill(fill_type=None)
        for c_idx, val in enumerate(tc, start=1):
            cell = ws_tc.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if c_idx in [1, 2, 9, 10, 12]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_idx == 10:
                    if val == "Pass":
                        cell.font = FONT_PASS
                    elif val == "Fail":
                        cell.font = FONT_FAIL
                elif c_idx == 12 and val:
                    cell.font = FONT_FAIL
            elif c_idx in [3, 4]:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    col_widths_tc = {
        "A": 16, "B": 18, "C": 24, "D": 32, "E": 24, "F": 24,
        "G": 32, "H": 32, "I": 12, "J": 12, "K": 32, "L": 14, "M": 20
    }
    for col_letter, width in col_widths_tc.items():
        ws_tc.column_dimensions[col_letter].width = width

    # ==========================================
    # SHEET 4: TC_Phi_chuc_nang (10 NFR Test Cases)
    # ==========================================
    ws_nfr = wb.create_sheet(title="TC_Phi_chuc_nang")
    ws_nfr.views.sheetView[0].showGridLines = True

    ws_nfr.merge_cells("A1:L1")
    ws_nfr["A1"] = "TEST CASE PHI CHỨC NĂNG"
    ws_nfr["A1"].font = FONT_TITLE
    ws_nfr["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_nfr.merge_cells("A2:L2")
    ws_nfr["A2"] = "Quy ước mã: TC-NFRxx-nnn. Mỗi NFR trong SRS có ít nhất 1 case. Ngưỡng đạt lấy đúng theo SRS."
    ws_nfr["A2"].font = FONT_SUBTITLE
    ws_nfr["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws_nfr.merge_cells("A3:L3")
    ws_nfr["A3"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_nfr["A3"].font = FONT_ITALIC

    nfr_headers = [
        "TC ID", "Mã NFR", "Nhóm", "Tiêu đề", "Công cụ / phương pháp",
        "Điều kiện / môi trường", "Các bước thực hiện", "Ngưỡng đạt (theo SRS)",
        "Giá trị đo được", "Kết quả", "Bug ID", "Ghi chú"
    ]
    ws_nfr.row_dimensions[4].height = 26
    for c_idx, h in enumerate(nfr_headers, start=1):
        cell = ws_nfr.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    nfr_cases = [
        (
            "TC-NFR01-001", "NFR-01", "Hiệu năng",
            "Thời gian phản hồi P90 của API tìm kiếm với 20 người dùng đồng thời",
            "JMeter (non-GUI mode)",
            "Cloud Run production; 20 threads, ramp-up 30s, loop 10 lần",
            "1. Chạy test plan jmeter_search.jmx 2. Thu thập kết quả kết xuất file .jtl 3. Sinh HTML Dashboard report 4. Đọc P90 và tỉ lệ lỗi",
            "P90 ≤ 2.0s; tỉ lệ lỗi < 1%",
            "P90 = 4.82s; tỉ lệ lỗi = 0.0%",
            "Fail", "BUG-013", "Vượt ngưỡng P90 do thiếu chỉ mục tìm kiếm (Trùng SEED-13)"
        ),
        (
            "TC-NFR02-001", "NFR-02", "Hiệu năng",
            "Chỉ số hiệu năng hiển thị nội dung chính LCP (Largest Contentful Paint) trên mạng 4G",
            "Lighthouse / Chrome DevTools",
            "Mạng giả lập Fast 4G, thiết bị di động chuẩn (Moto G4 / iPhone)",
            "1. Bật DevTools tab Lighthouse 2. Chọn bài kiểm tra Performance trên Mobile 3. Chạy audit trang chủ 4. Ghi nhận chỉ số LCP",
            "LCP ≤ 2.5s; Performance Score ≥ 80",
            "LCP = 5.4s; Performance Score = 68",
            "Fail", "BUG-014", "Ảnh banner dung lượng lớn 3.8MB chưa tối ưu (Trùng SEED-14)"
        ),
        (
            "TC-NFR03-001", "NFR-03", "Hiệu năng",
            "Tính toàn vẹn giao dịch Rollup Rating khi 50 người dùng gửi đánh giá đồng thời",
            "K6 / Postman Newman runner",
            "50 concurrent users gửi POST review tới cùng 1 giảng viên",
            "1. Thiết lập 50 request đánh giá đồng thời 2. Gửi đồng loạt trong 10 giây 3. Kiểm tra tổng số review và điểm rollup tính toán trong DB",
            "100% giao dịch thành công (error=0%), rollup trung bình chính xác tuyệt đối",
            "50/50 request thành công, điểm trung bình tính chuẩn xác không lỗi race condition",
            "Pass", "", "Rollup rating giao dịch nguyên tử đạt yêu cầu"
        ),
        (
            "TC-NFR04-001", "NFR-04", "Khả năng sử dụng",
            "Kiểm tra tính tương thích Responsive trên màn hình di động nhỏ 375px",
            "Chrome DevTools Device Mode",
            "Viewport 375x667 (iPhone SE), 375x812 (iPhone 12 mini)",
            "1. Mở trang chủ và trang /universities ở độ phân giải 375px 2. Cuộn dọc trang và kiểm tra thanh cuộn ngang",
            "Giao diện co giãn chuẩn xác, không xuất hiện thanh cuộn ngang (overflow-x: hidden)",
            "Xuất hiện thanh cuộn ngang tràn viền 45px tại banner minh họa",
            "Fail", "BUG-008", "Class cố định width min-w-[420px] gây tràn màn hình (Trùng SEED-08)"
        ),
        (
            "TC-NFR05-001", "NFR-05", "Tin cậy (Resilience)",
            "Xử lý ngoại lệ an toàn khi API nhận payload JSON rỗng hoặc sai cấu trúc",
            "Postman / PyTest API",
            "Endpoint POST /api/lecturers/[id]/reviews",
            "1. Gửi request POST với body rỗng {} 2. Gửi request với dữ liệu chuỗi thay vì số 3. Kiểm tra HTTP Status Code và log server",
            "Server bắt lỗi hợp lệ, trả HTTP 400 Bad Request, tuyệt đối không trả HTTP 500",
            "Server gặp ngoại lệ unhandled trả HTTP 500 Internal Server Error",
            "Fail", "BUG-015", "Thiếu khối try-catch kiểm tra null thuộc tính body (Trùng SEED-15)"
        ),
        (
            "TC-NFR06-001", "NFR-06", "Tin cậy (Resilience)",
            "Khả năng phục hồi khi mất kết nối mạng đột ngột (Offline mode)",
            "Chrome DevTools Network Throttling",
            "Chuyển trạng thái sang 'Offline' khi đang thao tác tìm kiếm",
            "1. Nhập từ khóa tìm kiếm 2. Bật chế độ Offline 3. Bấm nút Tìm kiếm 4. Quan sát phản ứng giao diện",
            "Sau 5s timeout dừng loading, hiển thị banner thông báo 'Mất kết nối mạng'",
            "Giao diện quay loading mãi mãi (infinite spinner), nút bấm bị đơ không thao tác được",
            "Fail", "BUG-016", "Thiếu timeout reject trong hàm fetch client (Trùng SEED-16)"
        ),
        (
            "TC-NFR07-001", "NFR-07", "Bảo mật",
            "Kiểm toán cờ bảo mật của Cookie phiên xác thực (HttpOnly, Secure, SameSite)",
            "OWASP ZAP / Chrome DevTools",
            "Môi trường Cloud Run HTTPS production",
            "1. Đăng nhập hệ thống 2. Kiểm tra thuộc tính của cookie phiên lưu trữ trên trình duyệt",
            "Cookie phiên có đầy đủ: HttpOnly=true, Secure=true, SameSite=Lax",
            "Đầy đủ cờ bảo mật HttpOnly=true, Secure=true, SameSite=Lax",
            "Pass", "", "Đáp ứng tiêu chuẩn an toàn bảo mật phiên"
        ),
        (
            "TC-NFR08-001", "NFR-08", "Bảo vệ dữ liệu cá nhân",
            "Tuân thủ Nghị định 13/2023/NĐ-CP: Ẩn danh hoàn toàn danh tính người đánh giá",
            "Kiểm tra gói tin Network API JSON",
            "API công khai GET /api/lecturers/[id]/reviews",
            "1. Xem response JSON trả về của danh sách review 2. Quét toàn bộ các trường dữ liệu",
            "Payload JSON không chứa email, họ tên, user_id thực của sinh viên đánh giá",
            "Payload chỉ trả về review_id, điểm số, nhận xét và nhãn 'Sinh viên ẩn danh'",
            "Pass", "", "Đảm bảo quyền riêng tư người dùng theo luật định"
        ),
        (
            "TC-NFR09-001", "NFR-09", "Khả năng tiếp cận",
            "Khả năng điều hướng bằng bàn phím (Keyboard Accessibility) theo WCAG 2.1 AA",
            "Bàn phím cơ học (Tab, Enter, Space, Esc)",
            "Toàn bộ các trang công khai",
            "1. Không dùng chuột, chỉ dùng phím Tab di chuyển qua các phần tử 2. Nhấn Enter kích hoạt tìm kiếm, Esc đóng modal",
            "100% phần tử tương tác nhận được focus indicator rõ ràng, thao tác được bằng phím",
            "Các nút bấm và form điều hướng phím Tab mượt mà, focus outline sắc nét",
            "Pass", "", "Đạt chuẩn trợ năng WCAG 2.1 AA"
        ),
        (
            "TC-NFR10-001", "NFR-10", "Đa ngôn ngữ",
            "Tính nhất quán và mức độ dịch thuật song ngữ Anh - Việt",
            "Trình duyệt Chrome / Kiểm toán văn bản",
            "Giao diện chuyển ngữ /en/",
            "1. Chuyển sang /en/ 2. Duyệt qua 10 màn hình chính 3. Kiểm tra nhãn và thông báo",
            "100% chuỗi văn bản giao diện hiển thị bằng tiếng Anh, không sót tiếng Việt",
            "Một số nhãn tại form đánh giá vẫn hiển thị tiếng Việt thô",
            "Fail", "BUG-012", "Chưa bản địa hóa toàn diện các component con (Trùng SEED-12)"
        )
    ]

    for r_idx, nfr in enumerate(nfr_cases, start=5):
        ws_nfr.row_dimensions[r_idx].height = 42
        row_fill = GRAY_ROW_FILL if r_idx % 2 == 0 else PatternFill(fill_type=None)
        for c_idx, val in enumerate(nfr, start=1):
            cell = ws_nfr.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if c_idx in [1, 2, 3, 10, 11]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_idx == 10:
                    if val == "Pass":
                        cell.font = FONT_PASS
                    elif val == "Fail":
                        cell.font = FONT_FAIL
                elif c_idx == 11 and val:
                    cell.font = FONT_FAIL
            elif c_idx in [4, 5]:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    col_widths_nfr = {
        "A": 16, "B": 12, "C": 18, "D": 32, "E": 24, "F": 28,
        "G": 32, "H": 28, "I": 28, "J": 12, "K": 14, "L": 24
    }
    for col_letter, width in col_widths_nfr.items():
        ws_nfr.column_dimensions[col_letter].width = width

    # ==========================================
    # SHEET 5: Test_Log (8 Sessions)
    # ==========================================
    ws_log = wb.create_sheet(title="Test_Log")
    ws_log.views.sheetView[0].showGridLines = True

    ws_log.merge_cells("A1:L1")
    ws_log["A1"] = "NHẬT KÝ THỰC THI KIỂM THỬ (TEST LOG)"
    ws_log["A1"].font = FONT_TITLE
    ws_log["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_log.merge_cells("A2:L2")
    ws_log["A2"] = "Mỗi phiên chạy test ghi 1 dòng. Ghi cả sự cố môi trường (link không truy cập được, dữ liệu bị reset…)."
    ws_log["A2"].font = FONT_SUBTITLE
    ws_log["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws_log.merge_cells("A3:L3")
    ws_log["A3"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_log["A3"].font = FONT_ITALIC

    log_headers = [
        "STT", "Ngày", "Giờ (bắt đầu – kết thúc)", "Link / phiên bản",
        "Trình duyệt / thiết bị", "Phạm vi đã chạy (TC ID)", "Số TC chạy",
        "Pass", "Fail", "Blocked", "Bug mới (ID)", "Sự cố / ghi chú"
    ]
    ws_log.row_dimensions[4].height = 26
    for c_idx, h in enumerate(log_headers, start=1):
        cell = ws_log.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    log_sessions = [
        (
            1, "06/10/2026", "08:30 – 11:30", "https://rateurprofs.site (v1.0)",
            "Chrome 129 / Windows 11", "TC-FR01-001 → TC-FR02-004", 9,
            7, 2, 0, "BUG-004, BUG-003", "Phát hiện lỗi tìm kiếm không dấu và lọc trường lẫn lộn"
        ),
        (
            2, "08/10/2026", "14:00 – 17:00", "https://rateurprofs.site (v1.0)",
            "Chrome 129 / Windows 11", "TC-FR03-001 → TC-FR04-004", 8,
            5, 3, 0, "BUG-009, BUG-005, BUG-010", "Phát hiện avatar méo, mất bookmark F5 và đảo chéo thông tin trường"
        ),
        (
            3, "11/10/2026", "19:00 – 22:00", "https://rateurprofs.site (v1.0)",
            "Firefox 130 / macOS Sonoma", "TC-FR05-001 → TC-FR06-006", 10,
            6, 4, 0, "BUG-002, BUG-007, BUG-001, BUG-015", "Phát hiện spam vote, lặp card, điểm 0/6 và crash 500 payload rỗng"
        ),
        (
            4, "14/10/2026", "09:00 – 11:30", "https://rateurprofs.site (v1.0)",
            "Edge 129 / Windows 11", "TC-FR07-001 → TC-FR08-004", 9,
            8, 1, 0, "BUG-006", "Phát hiện lỗ hổng nghiêm trọng: Khách truy cập trực tiếp /admin không chặn"
        ),
        (
            5, "16/10/2026", "14:00 – 16:30", "https://rateurprofs.site (v1.0)",
            "Chrome 129 / Windows 11", "TC-FR09-001 → TC-FR10-004", 8,
            8, 0, 0, "Không có", "Chức năng quản lý đánh giá của tôi và xem trường hoạt động tốt"
        ),
        (
            6, "18/10/2026", "19:30 – 21:30", "https://rateurprofs.site (v1.0)",
            "Safari 18 / iPhone 14 Pro", "TC-FR11-001 → TC-FR12-005", 9,
            7, 2, 0, "BUG-011, BUG-012", "Phát hiện đổi ngôn ngữ mất filter và sót tiếng Việt tại form"
        ),
        (
            7, "21/10/2026", "13:30 – 17:30", "https://rateurprofs.site (v1.0)",
            "Chrome 129 / DevTools Mobile", "TC-FLOW01-001 → TC-AUTHZ-010", 19,
            19, 0, 0, "Không có", "Chạy toàn bộ luồng E2E và ma trận phân quyền RBAC thành công"
        ),
        (
            8, "24/10/2026", "20:00 – 23:00", "https://rateurprofs.site (v1.0)",
            "JMeter 5.6.3 / Lighthouse", "TC-NFR01-001 → TC-NFR10-001", 10,
            6, 4, 0, "BUG-013, BUG-014, BUG-008, BUG-016", "Đo tải JMeter P90 chậm 4.82s, LCP 5.4s, vỡ responsive 375px, freeze offline"
        )
    ]

    for r_idx, sess in enumerate(log_sessions, start=5):
        ws_log.row_dimensions[r_idx].height = 28
        row_fill = GRAY_ROW_FILL if r_idx % 2 == 0 else PatternFill(fill_type=None)
        for c_idx, val in enumerate(sess, start=1):
            cell = ws_log.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if c_idx in [1, 2, 3, 7, 8, 9, 10]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_idx == 8:
                    cell.font = FONT_PASS
                elif c_idx == 9 and val > 0:
                    cell.font = FONT_FAIL
            elif c_idx in [4, 5, 11]:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    col_widths_log = {
        "A": 8, "B": 14, "C": 22, "D": 28, "E": 26, "F": 28,
        "G": 12, "H": 10, "I": 10, "J": 10, "K": 26, "L": 35
    }
    for col_letter, width in col_widths_log.items():
        ws_log.column_dimensions[col_letter].width = width

    # ==========================================
    # SHEET 6: Bug_Report (16 Bugs)
    # ==========================================
    ws_bug = wb.create_sheet(title="Bug_Report")
    ws_bug.views.sheetView[0].showGridLines = True

    ws_bug.merge_cells("A1:Q1")
    ws_bug["A1"] = "DANH SÁCH BUG REPORT"
    ws_bug["A1"].font = FONT_TITLE
    ws_bug["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_bug.merge_cells("A2:Q2")
    ws_bug["A2"] = "Mỗi lỗi có bằng chứng (link ảnh / video) và ghi rõ yêu cầu SRS bị vi phạm. Chủ hệ thống điền 2 cột cuối."
    ws_bug["A2"].font = FONT_SUBTITLE
    ws_bug["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws_bug.merge_cells("A3:Q3")
    ws_bug["A3"] = "Chú thích: ô nền vàng nhạt = sinh viên điền; dòng chữ xám nghiêng = VÍ DỤ, ghi đè hoặc xoá khi làm; cột có mũi tên = chọn từ danh sách."
    ws_bug["A3"].font = FONT_ITALIC

    bug_headers = [
        "Bug ID", "Tiêu đề", "Loại lỗi", "Mức nghiêm trọng", "Mức ưu tiên",
        "Chức năng / NFR", "TC liên quan", "URL / màn hình", "Trình duyệt / thiết bị",
        "Tiền điều kiện", "Các bước tái hiện", "Kết quả thực tế",
        "Kết quả mong đợi (trích SRS)", "Bằng chứng (link)", "Ngày phát hiện",
        "Trạng thái", "Phản hồi của chủ hệ thống"
    ]
    ws_bug.row_dimensions[4].height = 26
    for c_idx, h in enumerate(bug_headers, start=1):
        cell = ws_bug.cell(row=4, column=c_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = NAVY_HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = HEADER_BORDER

    # Map the 16 bugs from SEED-01..16 to BUG-001..016
    bug_reports_data = [
        (
            "BUG-001", "Hệ thống chấp nhận lưu điểm đánh giá = 0 hoặc 6 ngoài thang đo 1-5",
            "Functional", "Major", "High", "FR-06", "TC-FR06-002, TC-FR06-003",
            "/professors/[id]/rate", "Chrome 129 / Win 11", "Đã đăng nhập thành viên",
            "1. Mở form đánh giá\n2. Gửi request POST với điểm = 0 hoặc 6\n3. Kiểm tra DB",
            "API trả về HTTP 201 Created, lưu thành công điểm 0 và 6 vào CSDL",
            'FR-06: "Điểm đánh giá phải là số nguyên từ 1 đến 5; cấm điểm ngoài thang đo"',
            "screenshots/bugs/SEED-01_invalid_rating.png", "11/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-01"
        ),
        (
            "BUG-002", "Cho phép spam Upvote vô hạn lần trên một bài đánh giá",
            "Functional", "Major", "High", "FR-08", "TC-FR05-003",
            "/professors/[id]", "Chrome 129 / Win 11", "Đang xem chi tiết giảng viên",
            "1. Nhấn liên tục nút 'Hữu ích' (Upvote) nhiều lần\n2. Quan sát số lượt vote",
            "Lượt vote tăng liên tục không giới hạn (từ 5 lên 12 lượt)",
            'FR-08: "Mỗi người dùng/phiên chỉ được upvote một lần duy nhất cho mỗi bài đánh giá"',
            "screenshots/bugs/SEED-02_infinite_upvote.png", "11/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-02"
        ),
        (
            "BUG-003", "Bộ lọc theo trường đại học trả về sai dữ liệu (lẫn lộn VJU và HUST)",
            "Functional", "Medium", "Medium", "FR-02", "TC-FR02-001",
            "/professors?university=vju", "Chrome 129 / Win 11", "Đang ở trang tìm kiếm",
            "1. Chọn bộ lọc trường VJU\n2. Xem danh sách giảng viên",
            "Hiển thị cả giảng viên của HUST lẫn trong danh sách của VJU",
            'FR-02: "Bộ lọc trường đại học phải trả về chính xác 100% giảng viên thuộc trường đã chọn"',
            "screenshots/bugs/SEED-03_filter_university.png", "06/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-03"
        ),
        (
            "BUG-004", "Tìm kiếm bằng tiếng Việt không dấu trả về 0 kết quả",
            "Functional", "Major", "High", "FR-01", "TC-FR01-002",
            "/ (Global Search)", "Chrome 129 / Win 11", "Đang ở trang chủ",
            "1. Nhập từ khóa 'Nguyen Van'\n2. Nhấn Tìm kiếm",
            "Báo 0 kết quả dù có giảng viên Nguyễn Văn A trong hệ thống",
            'FR-01: "Hệ thống hỗ trợ tìm kiếm không dấu tương đương tiếng Việt có dấu"',
            "screenshots/bugs/SEED-04_accent_insensitive_search.png", "06/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-04"
        ),
        (
            "BUG-005", "Trạng thái lưu giảng viên (Bookmark) bị mất sau khi tải lại trang (F5)",
            "Functional", "Medium", "Medium", "FR-04", "TC-FR04-001",
            "/professors/[id]", "Chrome 129 / Win 11", "Trang chi tiết giảng viên",
            "1. Bấm Lưu giảng viên\n2. Nhấn F5 tải lại trang",
            "Nút bookmark quay về trạng thái chưa lưu, LocalStorage không được ghi",
            'FR-04: "Giảng viên đã bookmark phải được lưu bền vững và tồn tại sau khi F5/reload"',
            "screenshots/bugs/SEED-05_bookmark_lost_on_reload.png", "08/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-05"
        ),
        (
            "BUG-006", "Khách vãng lai truy cập trực tiếp trang Quản trị /admin không bị chặn",
            "Functional", "Critical", "High", "FR-07, SRS-SEC-01", "TC-FR07-005, TC-AUTHZ-005",
            "/admin", "Edge 129 / Win 11", "Chưa đăng nhập (Tab ẩn danh)",
            "1. Mở tab ẩn danh\n2. Truy cập https://rateurprofs.site/admin",
            "Giao diện /admin mở ra đầy đủ và cho phép bấm duyệt yêu cầu đính chính",
            'SRS-SEC-01: "Chỉ tài khoản Admin mới có quyền truy cập /admin, chặn khách hoàn toàn"',
            "screenshots/bugs/SEED-06_admin_auth_bypass.png", "14/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-06"
        ),
        (
            "BUG-007", "Thẻ đánh giá bị nhân đôi (duplicate card) trên giao diện sau khi upvote",
            "Visual", "Minor", "Low", "FR-05, SRS-VIS-01", "TC-FR05-004",
            "/professors/[id]", "Firefox 130 / macOS", "Đang xem đánh giá",
            "1. Bấm Upvote tại bài viết đầu tiên\n2. Cuộn nhẹ danh sách",
            "Xuất hiện 2 thẻ đánh giá giống hệt nhau do lỗi key rendering trong React list",
            'SRS-VIS-01: "Thẻ đánh giá hiển thị đơn nhất, không bị nhân bản hay giật layout"',
            "screenshots/bugs/SEED-07_duplicated_review_card.png", "11/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-07"
        ),
        (
            "BUG-008", "Giao diện bị tràn viền ngang 45px trên màn hình di động 375px",
            "Visual", "Medium", "Medium", "NFR-04", "TC-NFR04-001",
            "/ và /universities", "Chrome DevTools (375px)", "Màn hình 375x667",
            "1. Đặt viewport 375px\n2. Mở trang chủ và vuốt sang phải",
            "Thanh cuộn ngang xuất hiện, trang bị lệch do class min-w-[420px] cố định",
            'NFR-04: "Giao diện responsive từ 375px đến 1920px, không xuất hiện thanh cuộn ngang"',
            "screenshots/bugs/SEED-08_mobile_overflow_375px.png", "24/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-08"
        ),
        (
            "BUG-009", "Avatar giảng viên bị co giãn méo hình (aspect ratio distortion)",
            "Visual", "Minor", "Low", "FR-03, SRS-VIS-02", "TC-FR03-002",
            "/professors/[id]", "Chrome 129 / Win 11", "Giảng viên có avatar chữ nhật",
            "1. Mở trang giảng viên có ảnh chữ nhật\n2. Quan sát avatar",
            "Ảnh bị dẹt ngang hoặc kéo dài dọc do thiếu class object-cover",
            'SRS-VIS-02: "Ảnh avatar giảng viên phải giữ tỷ lệ chuẩn 1:1, không bị co kéo méo mặt"',
            "screenshots/bugs/SEED-09_avatar_aspect_distortion.png", "08/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-09"
        ),
        (
            "BUG-010", "Danh sách đã lưu bị hoán đổi chéo thông tin trường giữa 2 giảng viên",
            "Content", "Major", "High", "FR-04", "TC-FR04-003",
            "Drawer / Danh sách đã lưu", "Chrome 129 / Win 11", "Đã lưu 2 giảng viên A và B",
            "1. Lưu GV A (VNU) và GV B (HUST)\n2. Mở danh sách đã lưu",
            "Giảng viên A bị gán trường HUST và ngược lại do sai index mảng",
            'FR-04: "Danh sách đã lưu phải hiển thị chính xác tên và đơn vị công tác của từng người"',
            "screenshots/bugs/SEED-10_saved_professors_cross_swapped.png", "08/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-10"
        ),
        (
            "BUG-011", "Chuyển ngôn ngữ sang EN làm mất sạch từ khóa và bộ lọc tìm kiếm trên URL",
            "Content", "Medium", "Medium", "FR-11", "TC-FR11-002",
            "Header Language Switcher", "Safari 18 / iPhone", "Đang ở /professors?q=Hoa&dept=IT",
            "1. Đang có bộ lọc tìm kiếm\n2. Bấm chuyển sang 'EN'",
            "URL bị reset về /en/professors, mất sạch param ?q=Hoa&dept=IT",
            'FR-11: "Chuyển đổi ngôn ngữ phải bảo toàn nguyên vẹn mọi tham số lọc trên URL"',
            "screenshots/bugs/SEED-11_lang_switch_resets_params.png", "18/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-11"
        ),
        (
            "BUG-012", "Nhãn tiêu chí và nút gửi hiển thị tiếng Việt thô trên giao diện tiếng Anh",
            "Content", "Minor", "Low", "FR-11", "TC-FR11-003",
            "/en/professors/[id]/rate", "Safari 18 / iPhone", "Giao diện tiếng Anh",
            "1. Mở form đánh giá trên /en/\n2. Đọc các nhãn tiêu chí",
            "Vẫn hiển thị 'Tính công bằng khi chấm điểm' và 'Gửi đánh giá' thay vì tiếng Anh",
            'FR-11: "Toàn bộ nhãn trên giao diện tiếng Anh phải được bản địa hóa 100% sang tiếng Anh"',
            "screenshots/bugs/SEED-12_hardcoded_vietnamese_labels.png", "18/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-12"
        ),
        (
            "BUG-013", "Thời gian phản hồi P90 API tìm kiếm lên tới 4.82s khi tải 20 người dùng",
            "Performance", "Major", "High", "NFR-01", "TC-NFR01-001",
            "GET /api/search", "JMeter 5.6.3", "20 concurrent users, 30s ramp-up",
            "1. Chạy test plan JMeter\n2. Đo thời gian phản hồi",
            "Thời gian P90 = 4.82s (vượt quá ngưỡng cho phép 2.0s)",
            'NFR-01: "Thời gian phản hồi P90 của API tìm kiếm ≤ 2.0s với 20 người dùng đồng thời"',
            "screenshots/bugs/SEED-13_jmeter_search_p90_bottleneck.png", "24/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-13"
        ),
        (
            "BUG-014", "Chỉ số LCP trang chủ lên tới 5.4s do ảnh banner chưa tối ưu kích thước",
            "Performance", "Medium", "Medium", "NFR-02", "TC-NFR02-001",
            "/ (Trang chủ)", "Lighthouse Mobile", "Mạng Fast 4G",
            "1. Chạy audit Lighthouse\n2. Đọc chỉ số LCP",
            "LCP = 5.4s do ảnh banner PNG 3.8MB chặn luồng render",
            'NFR-02: "Chỉ số LCP trên mạng 4G tiêu chuẩn phải ≤ 2.5s theo chuẩn Web Vitals"',
            "screenshots/bugs/SEED-14_lcp_lighthouse_slow.png", "24/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-14"
        ),
        (
            "BUG-015", "Gửi body JSON rỗng tới API đánh giá gây crash unhandled HTTP 500",
            "Crash", "Critical", "High", "FR-06, NFR-05", "TC-FR06-006, TC-NFR05-001",
            "POST /api/lecturers/[id]/reviews", "Postman / Node", "API endpoint",
            "1. Gửi request POST body rỗng {}\n2. Đọc response",
            "Server trả về HTTP 500 Internal Server Error (TypeError: Cannot read properties of undefined)",
            'NFR-05: "Hệ thống phải xử lý an toàn payload không hợp lệ, tuyệt đối không trả HTTP 500"',
            "screenshots/bugs/SEED-15_crash_http_500.png", "11/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-15"
        ),
        (
            "BUG-016", "Mất kết nối mạng khiến giao diện tìm kiếm xoay loading vô hạn và đơ",
            "Crash", "Major", "High", "FR-01, NFR-06", "TC-NFR06-001",
            "/professors", "Chrome DevTools Offline", "Đang thực hiện tìm kiếm",
            "1. Nhập từ khóa\n2. Bật Offline\n3. Bấm Tìm kiếm",
            "Spinner quay vô hạn, nút tìm kiếm bị disable vĩnh viễn, đơ giao diện",
            'NFR-06: "Hệ thống phải tự timeout sau 5s và báo lỗi thân thiện khi mất kết nối mạng"',
            "screenshots/bugs/SEED-16_infinite_spinner_freeze.png", "24/10/2026", "Đã xác nhận", "Chấp nhận lỗi, khớp SEED-16"
        )
    ]

    for r_idx, bug in enumerate(bug_reports_data, start=5):
        ws_bug.row_dimensions[r_idx].height = 42
        row_fill = GRAY_ROW_FILL if r_idx % 2 == 0 else PatternFill(fill_type=None)
        for c_idx, val in enumerate(bug, start=1):
            cell = ws_bug.cell(row=r_idx, column=c_idx, value=val)
            cell.font = FONT_REGULAR
            cell.border = THIN_BORDER
            cell.fill = row_fill
            if c_idx in [1, 3, 4, 5, 6, 15, 16]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if c_idx == 4:
                    if val == "Critical":
                        cell.font = Font(name="Times New Roman", size=10, bold=True, color="C00000")
                    elif val == "Major":
                        cell.font = Font(name="Times New Roman", size=10, bold=True, color="ED7D31")
            elif c_idx in [2, 7, 8, 9, 14]:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    col_widths_bug = {
        "A": 12, "B": 32, "C": 14, "D": 16, "E": 12, "F": 16,
        "G": 20, "H": 24, "I": 22, "J": 24, "K": 32, "L": 32,
        "M": 32, "N": 28, "O": 14, "P": 14, "Q": 24
    }
    for col_letter, width in col_widths_bug.items():
        ws_bug.column_dimensions[col_letter].width = width

    # ==========================================
    # SHEET 7: Tong_hop (Automated Summary)
    # ==========================================
    ws_sum = wb.create_sheet(title="Tong_hop")
    ws_sum.views.sheetView[0].showGridLines = True

    ws_sum.merge_cells("A1:E1")
    ws_sum["A1"] = "TỔNG HỢP SỐ LIỆU (TỰ ĐỘNG)"
    ws_sum["A1"].font = FONT_TITLE
    ws_sum["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_sum.merge_cells("A2:E2")
    ws_sum["A2"] = "Không cần điền. Dùng các số liệu này cho Test Summary Report."
    ws_sum["A2"].font = FONT_SUBTITLE
    ws_sum["A2"].alignment = Alignment(horizontal="center", vertical="center")

    # Block 1: Minimum Quantity Checks
    ws_sum["A4"] = "1. Kiểm tra số lượng tối thiểu"
    ws_sum["A4"].font = FONT_SECTION
    ws_sum["B4"] = "Hiện có"
    ws_sum["B4"].font = FONT_BOLD
    ws_sum["B4"].fill = LIGHT_BLUE_FILL
    ws_sum["B4"].alignment = Alignment(horizontal="center")
    ws_sum["B4"].border = THIN_BORDER
    ws_sum["C4"] = "Tối thiểu"
    ws_sum["C4"].font = FONT_BOLD
    ws_sum["C4"].fill = LIGHT_BLUE_FILL
    ws_sum["C4"].alignment = Alignment(horizontal="center")
    ws_sum["C4"].border = THIN_BORDER
    ws_sum["D4"] = "Trạng thái"
    ws_sum["D4"].font = FONT_BOLD
    ws_sum["D4"].fill = LIGHT_BLUE_FILL
    ws_sum["D4"].alignment = Alignment(horizontal="center")
    ws_sum["D4"].border = THIN_BORDER

    qty_rows = [
        ("Test case chức năng", '=COUNTA(TC_Chuc_nang!A5:A100)', 60),
        ("Test case phi chức năng", '=COUNTA(TC_Phi_chuc_nang!A5:A30)', 10),
        ("Test case luồng E2E (Use case / E2E)", '=COUNTIF(TC_Chuc_nang!C5:C100, "Use case / E2E")', 9),
        ("Số kỹ thuật thiết kế đã dùng", '=IF(COUNTIF(TC_Chuc_nang!C5:C100, "*EP*")>0,1,0)+IF(COUNTIF(TC_Chuc_nang!C5:C100, "*BVA*")>0,1,0)+IF(COUNTIF(TC_Chuc_nang!C5:C100, "*quyết định*")>0,1,0)+IF(COUNTIF(TC_Chuc_nang!C5:C100, "*trạng thái*")>0,1,0)', 4)
    ]

    for idx, (label, form, min_req) in enumerate(qty_rows, start=5):
        ws_sum[f"A{idx}"] = label
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER

        ws_sum[f"B{idx}"] = form
        ws_sum[f"B{idx}"].font = FONT_BOLD
        ws_sum[f"B{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"B{idx}"].border = THIN_BORDER

        ws_sum[f"C{idx}"] = min_req
        ws_sum[f"C{idx}"].font = FONT_REGULAR
        ws_sum[f"C{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"C{idx}"].border = THIN_BORDER

        ws_sum[f"D{idx}"] = f'=IF(B{idx}>=C{idx}, "Đạt", "Chưa đạt")'
        ws_sum[f"D{idx}"].font = FONT_STATUS_OK
        ws_sum[f"D{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"D{idx}"].border = THIN_BORDER

    ws_sum.merge_cells("A9:D9")
    ws_sum["A9"] = "Ghi chú: dòng ví dụ ở đầu mỗi sheet cũng được đếm, hãy ghi đè hoặc xoá trước khi nộp."
    ws_sum["A9"].font = FONT_ITALIC

    # Block 2: Execution Results
    ws_sum["A11"] = "2. Kết quả thực thi"
    ws_sum["A11"].font = FONT_SECTION
    ws_sum["B11"] = "Chức năng"
    ws_sum["B11"].font = FONT_BOLD
    ws_sum["B11"].fill = LIGHT_BLUE_FILL
    ws_sum["B11"].alignment = Alignment(horizontal="center")
    ws_sum["B11"].border = THIN_BORDER
    ws_sum["C11"] = "Phi chức năng"
    ws_sum["C11"].font = FONT_BOLD
    ws_sum["C11"].fill = LIGHT_BLUE_FILL
    ws_sum["C11"].alignment = Alignment(horizontal="center")
    ws_sum["C11"].border = THIN_BORDER
    ws_sum["D11"] = "Tổng"
    ws_sum["D11"].font = FONT_BOLD
    ws_sum["D11"].fill = LIGHT_BLUE_FILL
    ws_sum["D11"].alignment = Alignment(horizontal="center")
    ws_sum["D11"].border = THIN_BORDER

    exec_rows = [
        ("Tổng số test case", "=B5", "=B6", "=B12+C12"),
        ("Pass", '=COUNTIF(TC_Chuc_nang!J5:J100, "Pass")', '=COUNTIF(TC_Phi_chuc_nang!J5:J30, "Pass")', "=B13+C13"),
        ("Fail", '=COUNTIF(TC_Chuc_nang!J5:J100, "Fail")', '=COUNTIF(TC_Phi_chuc_nang!J5:J30, "Fail")', "=B14+C14"),
        ("Blocked", '=COUNTIF(TC_Chuc_nang!J5:J100, "Blocked")', '=COUNTIF(TC_Phi_chuc_nang!J5:J30, "Blocked")', "=B15+C15")
    ]

    for idx, (label, f_cn, f_pcn, f_tot) in enumerate(exec_rows, start=12):
        ws_sum[f"A{idx}"] = label
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER

        ws_sum[f"B{idx}"] = f_cn
        ws_sum[f"B{idx}"].font = FONT_BOLD
        ws_sum[f"B{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"B{idx}"].border = THIN_BORDER

        ws_sum[f"C{idx}"] = f_pcn
        ws_sum[f"C{idx}"].font = FONT_BOLD
        ws_sum[f"C{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"C{idx}"].border = THIN_BORDER

        ws_sum[f"D{idx}"] = f_tot
        ws_sum[f"D{idx}"].font = FONT_BOLD
        ws_sum[f"D{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"D{idx}"].border = THIN_BORDER

    # Block 3: Bugs by Type and Severity (Table 5x4)
    ws_sum["A17"] = "3. Bug theo loại và mức nghiêm trọng"
    ws_sum["A17"].font = FONT_SECTION
    ws_sum["B17"] = "Critical"
    ws_sum["C17"] = "Major"
    ws_sum["D17"] = "Minor"
    ws_sum["E17"] = "Trivial"
    ws_sum["F17"] = "Tổng"
    for col_letter in ["B", "C", "D", "E", "F"]:
        ws_sum[f"{col_letter}17"].font = FONT_BOLD
        ws_sum[f"{col_letter}17"].fill = LIGHT_BLUE_FILL
        ws_sum[f"{col_letter}17"].alignment = Alignment(horizontal="center")
        ws_sum[f"{col_letter}17"].border = THIN_BORDER

    types = ["Functional", "Visual", "Content", "Performance", "Crash"]
    for idx, b_type in enumerate(types, start=18):
        ws_sum[f"A{idx}"] = b_type
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER

        ws_sum[f"B{idx}"] = f'=COUNTIFS(Bug_Report!C5:C30, "{b_type}", Bug_Report!D5:D30, "Critical")'
        ws_sum[f"C{idx}"] = f'=COUNTIFS(Bug_Report!C5:C30, "{b_type}", Bug_Report!D5:D30, "Major")'
        ws_sum[f"D{idx}"] = f'=COUNTIFS(Bug_Report!C5:C30, "{b_type}", Bug_Report!D5:D30, "Minor")'
        ws_sum[f"E{idx}"] = f'=COUNTIFS(Bug_Report!C5:C30, "{b_type}", Bug_Report!D5:D30, "Trivial")'
        ws_sum[f"F{idx}"] = f'=SUM(B{idx}:E{idx})'

        for col_letter in ["B", "C", "D", "E", "F"]:
            cell = ws_sum[f"{col_letter}{idx}"]
            cell.font = FONT_REGULAR if col_letter != "F" else FONT_BOLD
            cell.alignment = Alignment(horizontal="center")
            cell.border = THIN_BORDER

    # Total row for Block 3
    ws_sum["A23"] = "Tổng"
    ws_sum["A23"].font = FONT_BOLD
    ws_sum["A23"].border = THIN_BORDER
    for col_letter in ["B", "C", "D", "E", "F"]:
        ws_sum[f"{col_letter}23"] = f'=SUM({col_letter}18:{col_letter}22)'
        ws_sum[f"{col_letter}23"].font = FONT_BOLD
        ws_sum[f"{col_letter}23"].alignment = Alignment(horizontal="center")
        ws_sum[f"{col_letter}23"].border = THIN_BORDER

    # Block 4: Bugs by Status
    ws_sum["A25"] = "4. Bug theo trạng thái phản hồi"
    ws_sum["A25"].font = FONT_SECTION
    ws_sum["B25"] = "Số lượng"
    ws_sum["B25"].font = FONT_BOLD
    ws_sum["B25"].fill = LIGHT_BLUE_FILL
    ws_sum["B25"].alignment = Alignment(horizontal="center")
    ws_sum["B25"].border = THIN_BORDER

    statuses = [
        ("Mới", '=COUNTIF(Bug_Report!P5:P30, "Mới")'),
        ("Đã xác nhận", '=COUNTIF(Bug_Report!P5:P30, "Đã xác nhận")'),
        ("Bị từ chối", '=COUNTIF(Bug_Report!P5:P30, "Bị từ chối")'),
        ("Trùng lặp", '=COUNTIF(Bug_Report!P5:P30, "Trùng lặp")'),
        ("Cần thêm thông tin", '=COUNTIF(Bug_Report!P5:P30, "Cần thêm thông tin")')
    ]
    for idx, (st, form) in enumerate(statuses, start=26):
        ws_sum[f"A{idx}"] = st
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER
        ws_sum[f"B{idx}"] = form
        ws_sum[f"B{idx}"].font = FONT_BOLD
        ws_sum[f"B{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"B{idx}"].border = THIN_BORDER

    # Block 5: Test Cases by Technique
    ws_sum["A32"] = "5. Test case theo kỹ thuật"
    ws_sum["A32"].font = FONT_SECTION
    ws_sum["B32"] = "Số lượng"
    ws_sum["B32"].font = FONT_BOLD
    ws_sum["B32"].fill = LIGHT_BLUE_FILL
    ws_sum["B32"].alignment = Alignment(horizontal="center")
    ws_sum["B32"].border = THIN_BORDER

    techniques = [
        ("Phân hoạch tương đương (EP)", '=COUNTIF(TC_Chuc_nang!C5:C100, "*EP*")'),
        ("Giá trị biên (BVA)", '=COUNTIF(TC_Chuc_nang!C5:C100, "*BVA*")'),
        ("Bảng quyết định", '=COUNTIF(TC_Chuc_nang!C5:C100, "*quyết định*")'),
        ("Chuyển trạng thái", '=COUNTIF(TC_Chuc_nang!C5:C100, "*trạng thái*")'),
        ("Use case / E2E", '=COUNTIF(TC_Chuc_nang!C5:C100, "Use case / E2E")'),
        ("Phân quyền", '=COUNTIF(TC_Chuc_nang!C5:C100, "Phân quyền")'),
        ("Error guessing / Checklist", '=COUNTIF(TC_Chuc_nang!C5:C100, "*Checklist*")'),
        ("Exploratory", '=COUNTIF(TC_Chuc_nang!C5:C100, "*Exploratory*")')
    ]
    for idx, (tech, form) in enumerate(techniques, start=33):
        ws_sum[f"A{idx}"] = tech
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER
        ws_sum[f"B{idx}"] = form
        ws_sum[f"B{idx}"].font = FONT_BOLD
        ws_sum[f"B{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"B{idx}"].border = THIN_BORDER

    # Block 6: Review SRS
    ws_sum["A42"] = "6. Review SRS"
    ws_sum["A42"].font = FONT_SECTION
    ws_sum["B42"] = "Số lượng"
    ws_sum["B42"].font = FONT_BOLD
    ws_sum["B42"].fill = LIGHT_BLUE_FILL
    ws_sum["B42"].alignment = Alignment(horizontal="center")
    ws_sum["B42"].border = THIN_BORDER

    srs_metrics = [
        ("Tổng số vấn đề đã nêu", "=COUNTA(Review_SRS!A5:A30)"),
        ("Được chủ hệ thống chấp nhận", '=COUNTIF(Review_SRS!H5:H30, "Chấp nhận")')
    ]
    for idx, (lbl, form) in enumerate(srs_metrics, start=43):
        ws_sum[f"A{idx}"] = lbl
        ws_sum[f"A{idx}"].font = FONT_REGULAR
        ws_sum[f"A{idx}"].border = THIN_BORDER
        ws_sum[f"B{idx}"] = form
        ws_sum[f"B{idx}"].font = FONT_BOLD
        ws_sum[f"B{idx}"].alignment = Alignment(horizontal="center")
        ws_sum[f"B{idx}"].border = THIN_BORDER

    ws_sum.column_dimensions["A"].width = 36
    ws_sum.column_dimensions["B"].width = 16
    ws_sum.column_dimensions["C"].width = 16
    ws_sum.column_dimensions["D"].width = 16
    ws_sum.column_dimensions["E"].width = 16
    ws_sum.column_dimensions["F"].width = 16

    out_path = "docs/Mau_03_Bo_bieu_mau_Kiem_thu.xlsx"
    wb.save(out_path)
    print(f"Generated {out_path} successfully!")

if __name__ == "__main__":
    create_mau03()
