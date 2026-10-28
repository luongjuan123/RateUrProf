#!/usr/bin/env python3
"""
Generate 04_SRS_RateProfCuaBan.docx strictly adhering to 04_SRS_BIEU_MAU_TRONG.docx:
Header:
- TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (Software Requirement Specification – SRS)
- Hệ thống Đánh giá Giảng viên và Tra cứu Học thuật Toàn quốc (RateProfCuaBan / RateUrProf)
- Phiên bản 1.2
- Chi tiết hoá URD: URD RateProfCuaBan v1.2
- Người biên soạn: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024
- Bảng phê duyệt (Biên soạn: Lương Chí Dũng; Kiểm thử: Nguyễn Văn A; Duyệt: Giảng viên hướng dẫn)

Mục lục:
1 Giới thiệu (1.1 Mục đích, 1.2 Phạm vi, 1.3 Từ điển thuật ngữ Bảng 1-1, 1.4 Tài liệu tham khảo, 1.5 Quy ước mã yêu cầu Bảng 1-2)
2 Các yêu cầu chức năng:
  2.1 Các tác nhân (Bảng 2-1)
  2.2 Các chức năng của hệ thống (FR-01 đến FR-12)
  2.3 Biểu đồ use case tổng quan (Hình 2-1)
  2.4 Biểu đồ use case phân rã (Hình 2-2)
  2.5 Quy trình nghiệp vụ (2.5.1 FLOW-01 Hình 2-3, 2.5.2 FLOW-02, 2.5.3 FLOW-03)
  2.6 Đặc tả các use case (2.6.1 UC-01 Bảng 2-2, Bảng 2-3; 2.6.2 UC-02; Hình 2-4 giao diện)
  2.7 Bảng mã lỗi (Bảng 2-4: ERR-001..016)
  2.8 Ma trận truy vết yêu cầu (Bảng 2-5: URD-SRS-TC-API)
  2.9 Câu hỏi gửi bộ phận nghiệp vụ (Bảng 2-6: 10 vấn đề Review SRS)
3 Các yêu cầu phi chức năng:
  3.1 Giao diện người dùng
  3.2 Hiệu năng (Bảng 3-1: Yêu cầu hiệu năng)
  3.3 Tính bảo mật
  3.4 Ràng buộc
"""

import os
import subprocess
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D9D9D9", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'  <w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def build_srs():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) | RateProfCuaBan"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"; hp.style.font.size = Pt(8.5); hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU) | Sinh viên: Lương Chí Dũng (24110215)"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"; fp.style.font.size = Pt(8.5); fp.style.font.color.rgb = RGBColor(128, 128, 128)

    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)

    # Cover Title
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_inst.add_run("TRƯỜNG ĐẠI HỌC VIỆT NHẬT – ĐẠI HỌC QUỐC GIA HÀ NỘI\nKHOA KHOA HỌC MÁY TÍNH VÀ KỸ THUẬT THÔNG TIN")
    r.font.name = "Times New Roman"; r.font.size = Pt(11); r.font.bold = True; r.font.color.rgb = DARK_GRAY

    doc.add_paragraph()

    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_t.add_run("TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM\n(Software Requirement Specification – SRS)")
    r_t.font.name = "Times New Roman"; r_t.font.size = Pt(18); r_t.font.bold = True; r_t.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sb = p_sub.add_run("HỆ THỐNG ĐÁNH GIÁ GIẢNG VIÊN VÀ TRA CỨU HỌC THUẬT TOÀN QUỐC\n(RateProfCuaBan / RateUrProf)\nPhiên bản 1.2 • Chi tiết hoá URD: URD RateProfCuaBan v1.2")
    r_sb.font.name = "Times New Roman"; r_sb.font.size = Pt(12); r_sb.font.bold = True

    doc.add_paragraph()

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_m = p_meta.add_run(
        "Người biên soạn: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024\n"
        "Đơn vị chủ trì: Bộ phận Kỹ thuật Phần mềm & Kiểm thử Chất lượng (QA/QC)\n"
        "Hà Nội, tháng 10 năm 2026"
    )
    r_m.font.name = "Times New Roman"; r_m.font.size = Pt(10); r_m.font.color.rgb = DARK_GRAY

    doc.add_paragraph()

    # Approval Table
    t_app = doc.add_table(rows=3, cols=4)
    t_app.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_app)
    for ci, th in enumerate(["Biên soạn bởi", "Kiểm thử bởi", "Duyệt bởi", "Phiên bản"]):
        cell = t_app.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    app_rows = [
        ("Chủ hệ thống\nLương Chí Dũng\n(24110215)", "Tester đối tác\nNguyễn Văn A\n(24110001)", "Giảng viên hướng dẫn\nTS. Giảng viên VJU\nKhoa CS/IS", "v1.2\n(Bản chốt kỹ thuật)"),
        ("Ngày: 08/10/2026", "Ngày: 15/10/2026", "Ngày: 26/10/2026", "Website: rateurprofs.site")
    ]
    for ri, r_data in enumerate(app_rows, start=1):
        row = t_app.rows[ri]
        for ci, val in enumerate(r_data):
            cell = row.cells[ci]
            set_cell_background(cell, "FFFFFF" if ri==1 else "F9F9F9"); set_cell_margins(cell)
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5); p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_page_break()

    # Table of Contents
    h_toc = doc.add_heading(level=1); r = h_toc.add_run("Mục lục"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    toc_items = [
        ("1 Giới thiệu", "4"),
        ("  1.1 Mục đích", "4"),
        ("  1.2 Phạm vi", "4"),
        ("  1.3 Từ điển thuật ngữ (Bảng 1-1)", "4"),
        ("  1.4 Tài liệu tham khảo", "5"),
        ("  1.5 Quy ước mã yêu cầu (Bảng 1-2)", "5"),
        ("2 Các yêu cầu chức năng", "6"),
        ("  2.1 Các tác nhân (Bảng 2-1)", "6"),
        ("  2.2 Các chức năng của hệ thống (FR-01 đến FR-12)", "6"),
        ("  2.3 Biểu đồ use case tổng quan (Hình 2-1)", "7"),
        ("  2.4 Biểu đồ use case phân rã (Hình 2-2)", "7"),
        ("  2.5 Quy trình nghiệp vụ", "8"),
        ("    2.5.1 Quy trình FLOW-01: Đánh giá giảng viên & Rollup điểm (Hình 2-3)", "8"),
        ("    2.5.2 Quy trình FLOW-02: Tiếp nhận và xử lý yêu cầu đính chính theo NĐ 13", "9"),
        ("    2.5.3 Quy trình FLOW-03: Thu thập dữ liệu lịch sự & Đối soát danh bạ trường", "9"),
        ("  2.6 Đặc tả các use case", "10"),
        ("    2.6.1 Đặc tả Use Case UC-01: Đăng bài đánh giá giảng viên (Bảng 2-2, 2-3)", "10"),
        ("    2.6.2 Đặc tả Use Case UC-02: Tiếp nhận & Kiểm duyệt khiếu nại NĐ 13", "11"),
        ("    Hình 2-4: Giao diện màn hình đánh giá và quản trị", "12"),
        ("  2.7 Bảng mã lỗi của hệ thống (Bảng 2-4: ERR-001 đến ERR-016)", "13"),
        ("  2.8 Ma trận truy vết yêu cầu (Bảng 2-5: URD - SRS - Test Case - API)", "14"),
        ("  2.9 Câu hỏi gửi bộ phận nghiệp vụ (Bảng 2-6: 10 câu hỏi Review SRS)", "15"),
        ("3 Các yêu cầu phi chức năng", "16"),
        ("  3.1 Giao diện người dùng", "16"),
        ("  3.2 Hiệu năng (Bảng 3-1: Yêu cầu hiệu năng chi tiết)", "16"),
        ("  3.3 Tính bảo mật", "17"),
        ("  3.4 Ràng buộc", "17"),
        ("Danh mục hình ảnh, bảng biểu", "18"),
    ]
    for title, pg in toc_items:
        p = doc.add_paragraph()
        r1 = p.add_run(title)
        r1.font.name = "Times New Roman"; r1.font.size = Pt(10)
        p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5))
        r2 = p.add_run(f"\t{pg}")
        r2.font.name = "Times New Roman"; r2.font.size = Pt(10); r2.font.bold = True

    doc.add_page_break()

    # Section 1: Giới thiệu
    h1 = doc.add_heading(level=1); r = h1.add_run("1 Giới thiệu"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY

    doc.add_heading(level=2).add_run("1.1 Mục đích")
    doc.add_paragraph(
        "Tài liệu Đặc tả Yêu cầu Phần mềm (Software Requirement Specification – SRS) này chi tiết hoá toàn bộ các yêu cầu người sử dụng "
        "đã được xác định trong tài liệu URD v1.2 của Hệ thống Đánh giá Giảng viên và Tra cứu Học thuật Toàn quốc (RateProfCuaBan / RateUrProf). "
        "Tài liệu là cơ sở kỹ thuật bắt buộc để đội ngũ phát triển xây dựng tính năng, thiết kế cơ sở dữ liệu, hiện thực hóa các API RESTful, "
        "đồng thời là căn cứ nghiệm thu, thiết kế bộ kịch bản kiểm thử (Test Plan, Test Cases, Bug Report) trong khuôn khổ Học phần Đánh giá hiệu năng."
    )

    doc.add_heading(level=2).add_run("1.2 Phạm vi")
    doc.add_paragraph(
        "Phạm vi tài liệu bao gồm toàn bộ chức năng phía người dùng (Frontend Web SPA/SSR) và dịch vụ xử lý backend (RESTful API), "
        "cơ chế phân quyền người dùng theo vai trò (RBAC), quy trình xử lý dữ liệu tự động, các ràng buộc toàn vẹn dữ liệu, "
        "bảng mã lỗi chi tiết của hệ thống (ERR-001 đến ERR-016), và các chỉ tiêu đo lường chất lượng phi chức năng định lượng (NFR-01 đến NFR-10). "
        "Hệ thống vận hành chính thức trên nền tảng Google Cloud Run tại địa chỉ: https://rateurprofs.site."
    )

    doc.add_heading(level=2).add_run("1.3 Từ điển thuật ngữ")
    doc.add_paragraph("Bảng 1-1 định nghĩa các thuật ngữ kỹ thuật và nghiệp vụ được sử dụng thống nhất xuyên suốt tài liệu.")

    # Table 1-1
    p_t1 = doc.add_paragraph(); r = p_t1.add_run("Bảng 1-1: Từ điển thuật ngữ"); r.font.bold = True
    t1 = doc.add_table(rows=1, cols=3)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t1)
    for ci, h in enumerate(["Thuật ngữ", "Tên tiếng Anh / Viết tắt", "Định nghĩa và Giải thích kỹ thuật"]):
        cell = t1.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    terms = [
        ("Rollup Rating", "Atomic Rollup Calculation", "Cơ chế tính toán lại điểm đánh giá trung bình và số lượng nhận xét của giảng viên trong một giao dịch cơ sở dữ liệu đơn nhất (Atomic DB Transaction), chống Race Condition."),
        ("Nghị định 13", "Decree 13/2023/ND-CP", "Nghị định của Chính phủ Việt Nam về Bảo vệ dữ liệu cá nhân. Hệ thống bắt buộc hỗ trợ quyền rút lại đồng ý, yêu cầu đính chính, hoặc xóa dữ liệu cá nhân theo quy định."),
        ("Google OAuth 2.0", "Open Authorization 2.0", "Giao thức ủy quyền chuẩn công nghiệp cho phép người dùng đăng nhập bằng tài khoản Google, lấy thông tin email trường (.edu.vn) mà không cần lưu mật khẩu."),
        ("Tác nhân (Actor)", "System Actor", "Đối tượng bên ngoài (người hoặc hệ thống khác) tương tác trực tiếp với các chức năng của hệ thống RateProfCuaBan."),
        ("Truy vết yêu cầu", "Traceability Matrix (RTM)", "Bảng ánh xạ chéo hai chiều giữa yêu cầu người dùng (URD), yêu cầu phần mềm (SRS), kịch bản kiểm thử (Test Case) và mã lệnh kiểm thử API."),
        ("P90 Latency", "90th Percentile Response Time", "Chỉ số thời gian phản hồi: 90% số lượng request trong phiên đo tải phải có thời gian phản hồi nhỏ hơn ngưỡng cam kết.")
    ]
    for row_data in terms:
        row = t1.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)

    doc.add_heading(level=2).add_run("1.4 Tài liệu tham khảo")
    refs = [
        "1. Tài liệu Yêu cầu Người sử dụng (URD v1.2) – Hệ thống RateProfCuaBan (Tác giả: Lương Chí Dũng, 10/2026).",
        "2. Đề cương chi tiết và Quy chuẩn đánh giá Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU).",
        "3. Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 của Chính phủ về bảo vệ dữ liệu cá nhân.",
        "4. Chuẩn tài liệu đặc tả phần mềm quốc tế IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018."
    ]
    for ref in refs:
        doc.add_paragraph(ref)

    doc.add_heading(level=2).add_run("1.5 Quy ước mã yêu cầu")
    p_t2 = doc.add_paragraph(); r = p_t2.add_run("Bảng 1-2: Quy ước mã yêu cầu"); r.font.bold = True
    t2 = doc.add_table(rows=1, cols=3)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t2)
    for ci, h in enumerate(["Tiền tố mã", "Ý nghĩa phân loại", "Cấu trúc & Ví dụ cụ thể"]):
        cell = t2.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    code_conv = [
        ("FR-xx", "Functional Requirement (Yêu cầu chức năng)", "FR-01: Đăng ký/Đăng nhập OAuth, FR-04: Đăng bài đánh giá 5 tiêu chí"),
        ("NFR-xx", "Non-Functional Requirement (Yêu cầu phi chức năng)", "NFR-01: Tốc độ P90 < 800ms, NFR-06: Chống tấn công XSS & SQL Injection"),
        ("FLOW-xx", "End-to-End Business Flow (Luồng nghiệp vụ)", "FLOW-01: Tìm kiếm & Đánh giá giảng viên; FLOW-02: Khiếu nại NĐ 13"),
        ("UC-xx", "Use Case (Trường hợp sử dụng)", "UC-01: Đăng đánh giá giảng viên; UC-02: Duyệt yêu cầu đính chính"),
        ("ERR-xxx", "Error Code (Bảng mã lỗi toàn hệ thống)", "ERR-001: Lỗi xác thực 401; ERR-004: Điểm rating ngoài khoảng [1-5]"),
        ("TC-xxx", "Test Case (Kịch bản kiểm thử)", "TC-001: Đăng nhập Google thành công; TC-024: Kiểm thử Race Condition")
    ]
    for row_data in code_conv:
        row = t2.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)

    doc.add_page_break()

    # Section 2: Các yêu cầu chức năng
    h2 = doc.add_heading(level=1); r = h2.add_run("2 Các yêu cầu chức năng"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY

    doc.add_heading(level=2).add_run("2.1 Các tác nhân")
    doc.add_paragraph("Hệ thống RateProfCuaBan định nghĩa 4 tác nhân chính tham gia tương tác theo ma trận phân quyền:")

    p_t3 = doc.add_paragraph(); r = p_t3.add_run("Bảng 2-1: Danh sách các tác nhân"); r.font.bold = True
    t3 = doc.add_table(rows=1, cols=3)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t3)
    for ci, h in enumerate(["Tác nhân (Actor)", "Mô tả vai trò", "Quyền hạn chính trong hệ thống"]):
        cell = t3.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    actors = [
        ("Khách (Guest)", "Người dùng vãng lai chưa đăng nhập hệ thống.", "Tìm kiếm giảng viên, tra cứu danh bạ trường, đọc nhận xét công khai, bấm upvote hữu ích (lưu session)."),
        ("Thành viên (Member)", "Sinh viên/Cựu sinh viên đã đăng nhập tài khoản Google.", "Đăng bài đánh giá 5 tiêu chí sư phạm (ẩn danh), bấm upvote 1 lần/bài, lưu danh sách giảng viên quan tâm (Bookmark CSDL), chỉnh sửa/xóa bài đánh giá của chính mình."),
        ("Giảng viên (Faculty)", "Giảng viên có hồ sơ trên hệ thống, xác thực qua email trường .edu.vn.", "Xem hồ sơ giảng dạy, gửi yêu cầu đính chính học hàm/học vị theo Nghị định 13/2023/NĐ-CP, không được tự đánh giá chính mình (ngăn ngừa Conflict of Interest)."),
        ("Quản trị viên (Admin)", "Người quản trị vận hành hệ thống RateProfCuaBan.", "Truy cập /admin, duyệt/từ chối các yêu cầu đính chính dữ liệu cá nhân theo NĐ 13, ẩn/xóa bài đánh giá vi phạm tiêu chuẩn cộng đồng, điều khiển pipeline cào dữ liệu và đối soát danh bạ.")
    ]
    for row_data in actors:
        row = t3.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)

    doc.add_heading(level=2).add_run("2.2 Các chức năng của hệ thống")
    doc.add_paragraph(
        "Dựa trên 12 yêu cầu chức năng cốt lõi (FR-01 đến FR-12) trong tài liệu URD, hệ thống RateProfCuaBan cung cấp các nhóm tính năng:\n"
        "• FR-01: Xác thực người dùng thông qua Google OAuth 2.0 (tự động phát hiện email trường .edu.vn).\n"
        "• FR-02: Quản lý thông tin hồ sơ cá nhân và danh sách Bookmark giảng viên yêu thích.\n"
        "• FR-03: Tìm kiếm đa tiêu chí, hỗ trợ tiếng Việt có dấu/không dấu, lọc theo trường và học hàm.\n"
        "• FR-04: Đăng tải bài đánh giá 5 tiêu chí sư phạm kèm văn bản nhận xét trung thực (ẩn danh tác giả).\n"
        "• FR-05: Tương tác cộng đồng thông qua cơ chế Upvote nhận xét hữu ích (ngăn chặn duplicate vote).\n"
        "• FR-06: Tiếp nhận và xử lý yêu cầu đính chính/gỡ thông tin cá nhân tuân thủ Nghị định 13/2023/NĐ-CP.\n"
        "• FR-07: Báo cáo nhận xét có dấu hiệu vi phạm tiêu chuẩn văn hóa học đường.\n"
        "• FR-08: Phân tích trực quan thống kê điểm số và phân phối sao dạng biểu đồ thanh ngang.\n"
        "• FR-09: Bảng điều khiển Quản trị viên (/admin) với phân quyền RBAC nghiêm ngặt.\n"
        "• FR-10: Pipeline thu thập dữ liệu lịch sự, tôn trọng robots.txt và đối soát thông tin trường đại học.\n"
        "• FR-11: Cập nhật nguyên tử điểm trung bình và số lượng review (Atomic Rollup Engine).\n"
        "• FR-12: Cung cấp hệ thống RESTful API chuẩn hóa phục vụ tích hợp và đối tác kiểm thử."
    )

    doc.add_heading(level=2).add_run("2.3 Biểu đồ use case tổng quan")
    doc.add_paragraph(
        "Hình 2-1 mô tả cấu trúc quan hệ giữa 4 tác nhân chính (Guest, Member, Faculty, Admin) "
        "và các phân hệ use case trong toàn hệ thống RateProfCuaBan:"
    )
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_img1 = p_img1.add_run(
        "+-----------------------------------------------------------------------------------------+\n"
        "|                 HỆ THỐNG ĐÁNH GIÁ GIẢNG VIÊN (RATEPROFCUABAN)                          |\n"
        "|                                                                                         |\n"
        "|   [Guest]  -----> (UC-03: Tra cứu & Tìm kiếm giảng viên)                               |\n"
        "|            -----> (UC-05: Xem hồ sơ & Phân tích điểm 5 tiêu chí)                        |\n"
        "|                                                                                         |\n"
        "|   [Member] -----> (UC-01: Đăng nhập Google OAuth 2.0)                                   |\n"
        "|            -----> (UC-04: Đăng bài đánh giá 5 tiêu chí - Anonymous)                     |\n"
        "|            -----> (UC-06: Upvote nhận xét hữu ích & Bookmark)                           |\n"
        "|                                                                                         |\n"
        "|   [Faculty] ----> (UC-07: Gửi yêu cầu đính chính học hàm / thông tin NĐ 13)             |\n"
        "|                                                                                         |\n"
        "|   [Admin]  -----> (UC-08: Thẩm định & Duyệt đính chính NĐ 13)                           |\n"
        "|            -----> (UC-09: Quản lý bài đánh giá & Gỡ vi phạm)                            |\n"
        "|            -----> (UC-10: Vận hành Crawler đối soát danh bạ trường)                     |\n"
        "+-----------------------------------------------------------------------------------------+"
    )
    r_img1.font.name = "Courier New"; r_img1.font.size = Pt(8.5); r_img1.font.color.rgb = NAVY
    p_c1 = doc.add_paragraph(); p_c1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c1 = p_c1.add_run("Hình 2-1: Biểu đồ use case tổng quan hệ thống"); r_c1.font.italic = True; r_c1.font.size = Pt(9)

    doc.add_heading(level=2).add_run("2.4 Biểu đồ use case phân rã")
    doc.add_paragraph(
        "Hình 2-2 biểu diễn phân rã chi tiết Use Case Đăng bài đánh giá và Tính điểm Rollup (UC-04/FR-04/FR-11):"
    )
    p_img2 = doc.add_paragraph()
    p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_img2 = p_img2.add_run(
        "    +-------------------------------------------------------------------+\n"
        "    |                     UC-04: ĐĂNG BÀI ĐÁNH GIÁ                      |\n"
        "    |                                                                   |\n"
        "    |     <<include>>                                                   |\n"
        "    |     +----------> (Xác thực trạng thái Đăng nhập Google)           |\n"
        "    |     <<include>>                                                   |\n"
        "    |     +----------> (Kiểm tra hợp lệ 5 tiêu chí [1.0 - 5.0])         |\n"
        "    |     <<include>>                                                   |\n"
        "    |     +----------> (Chống gửi nhận xét rỗng / Spam nội dung)        |\n"
        "    |     <<extend>>                                                    |\n"
        "    |     +----------> (Cập nhật nguyên tử Atomic Rollup Rating)        |\n"
        "    |     <<extend>>                                                    |\n"
        "    |     +----------> (Gửi thông báo kiểm duyệt nếu chứa từ cấm)       |\n"
        "    +-------------------------------------------------------------------+"
    )
    r_img2.font.name = "Courier New"; r_img2.font.size = Pt(8.5); r_img2.font.color.rgb = NAVY
    p_c2 = doc.add_paragraph(); p_c2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c2 = p_c2.add_run("Hình 2-2: Biểu đồ use case phân rã chức năng Đánh giá giảng viên"); r_c2.font.italic = True; r_c2.font.size = Pt(9)

    doc.add_page_break()

    # Section 2.5: Quy trình nghiệp vụ
    doc.add_heading(level=2).add_run("2.5 Quy trình nghiệp vụ")
    
    doc.add_heading(level=3).add_run("2.5.1 Quy trình FLOW-01: Đánh giá giảng viên & Rollup điểm")
    doc.add_paragraph(
        "Quy trình nghiệp vụ thực hiện bài đánh giá từ lúc người dùng tương tác đến khi điểm trung bình được "
        "tái cấu trúc thành công trong cơ sở dữ liệu:"
    )
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_img3 = p_img3.add_run(
        " [Sinh viên / Member]              [Frontend Web]                  [Backend API & DB]       \n"
        "          |                              |                                  |                \n"
        "   (1) Chọn giảng viên & bấm Đánh giá    |                                  |                \n"
        "          |----------------------------->|                                  |                \n"
        "          |                       (2) Kiểm tra Token                         |                \n"
        "          |                       Nếu chưa login -> redirect OAuth           |                \n"
        "   (3) Nhập điểm 5 sao & nhận xét        |                                  |                \n"
        "          |----------------------------->|                                  |                \n"
        "          |                              | (4) POST /api/professors/{id}/reviews              \n"
        "          |                              |--------------------------------->|                \n"
        "          |                              |                          (5) Validate dữ liệu      \n"
        "          |                              |                          (6) BEGIN TRANSACTION     \n"
        "          |                              |                          (7) INSERT Review         \n"
        "          |                              |                          (8) Rollup UPDATE Avg/Cnt \n"
        "          |                              |                          (9) COMMIT TRANSACTION    \n"
        "          |                              | (10) Phản hồi 201 Created        |                \n"
        "          |                              |<---------------------------------|                \n"
        "          | (11) Hiển thị thông báo      |                                                   \n"
        "          |<-----------------------------|                                                   "
    )
    r_img3.font.name = "Courier New"; r_img3.font.size = Pt(8.0); r_img3.font.color.rgb = NAVY
    p_c3 = doc.add_paragraph(); p_c3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c3 = p_c3.add_run("Hình 2-3: Biểu đồ tuần tự hoạt động quy trình FLOW-01"); r_c3.font.italic = True; r_c3.font.size = Pt(9)

    doc.add_heading(level=3).add_run("2.5.2 Quy trình FLOW-02: Tiếp nhận và xử lý yêu cầu đính chính theo NĐ 13")
    doc.add_paragraph(
        "Quy trình bảo vệ quyền dữ liệu cá nhân: Giảng viên truy cập hồ sơ cá nhân -> Bấm 'Gửi yêu cầu đính chính/gỡ bỏ' -> "
        "Điền biểu mẫu kèm văn bản/minh chứng điện tử (.edu.vn hoặc link quyết định bổ nhiệm) -> Hệ thống tạo bản ghi trạng thái 'PENDING' -> "
        "Admin nhận thông báo tại /admin/corrections -> Thẩm định tính pháp lý: nếu đầy đủ căn cứ, Admin bấm Phê duyệt (trạng thái 'APPROVED'), "
        "thông tin giảng viên được cập nhật ngay lập tức; nếu không đủ chứng cứ, Admin bấm Từ chối (trạng thái 'REJECTED') kèm lý do phản hồi qua email."
    )

    doc.add_heading(level=3).add_run("2.5.3 Quy trình FLOW-03: Thu thập dữ liệu lịch sự & Đối soát danh bạ trường đại học")
    doc.add_paragraph(
        "Quy trình tự động hóa: Quản trị viên thiết lập cấu hình trường mục tiêu -> Crawler gửi truy vấn kiểm tra tệp robots.txt -> "
        "Thiết lập User-Agent nhận diện minh bạch 'RateProfBot/1.0 (+https://rateurprofs.site/bot)' -> Duyệt cây danh mục khoa viện với giãn cách an toàn >= 1.5 giây/request -> "
        "Trích xuất họ tên, học hàm GS/PGS tách riêng học vị TS/ThS, ảnh đại diện -> Đối soát trùng lặp thực thể (Entity Deduplication) -> "
        "Admin rà soát bảng xem trước (Staging) và phê duyệt đồng bộ vào bảng chính thức."
    )

    doc.add_page_break()

    # Section 2.6: Đặc tả use case
    doc.add_heading(level=2).add_run("2.6 Đặc tả các use case")

    doc.add_heading(level=3).add_run("2.6.1 Đặc tả Use Case UC-01: Đăng bài đánh giá giảng viên")

    p_t4 = doc.add_paragraph(); r = p_t4.add_run("Bảng 2-2: Đặc tả chức năng UC-01"); r.font.bold = True
    t4 = doc.add_table(rows=1, cols=2)
    t4.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t4)
    for ci, h in enumerate(["Thuộc tính đặc tả", "Nội dung chi tiết"]):
        cell = t4.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    uc1_specs = [
        ("Mã Use Case", "UC-01 (Ánh xạ URD: US04, Chức năng: FR-04, Luồng: FLOW-01)"),
        ("Tên Use Case", "Đăng bài đánh giá giảng viên 5 tiêu chí sư phạm"),
        ("Tác nhân kích hoạt", "Thành viên (Member) đã đăng nhập bằng Google OAuth"),
        ("Mô tả tóm tắt", "Cho phép sinh viên chia sẻ nhận xét trung thực, chấm điểm 5 tiêu chí sư phạm cho giảng viên nhằm mục đích nâng cao chất lượng học tập."),
        ("Tiền điều kiện", "1. Người dùng đã xác thực phiên làm việc thành công.\n2. Hồ sơ giảng viên tồn tại và ở trạng thái hoạt động (ACTIVE)."),
        ("Hậu điều kiện", "1. Bài đánh giá mới được lưu trữ trong CSDL (ẩn danh tác giả đối với công chúng).\n2. Điểm trung bình và tổng số nhận xét của giảng viên được cập nhật nguyên tử ngay lập tức."),
        ("Luồng sự kiện chính (Main Flow)", "1. Người dùng nhấn nút 'Viết đánh giá' tại trang chi tiết giảng viên.\n"
                                             "2. Hệ thống hiển thị Modal Form với 5 thanh trượt tiêu chí và ô văn bản.\n"
                                             "3. Người dùng cho điểm từ 1 đến 5 sao cho từng tiêu chí, nhập môn học đã học, học kỳ, và lời nhận xét (tối thiểu 10 ký tự).\n"
                                             "4. Người dùng nhấn nút 'Gửi đánh giá'.\n"
                                             "5. Hệ thống kiểm tra tính hợp lệ dữ liệu (Server-side validation).\n"
                                             "6. Hệ thống thực hiện lưu dữ liệu và gọi Atomic Rollup tính toán lại điểm.\n"
                                             "7. Hệ thống hiển thị thông báo thành công và làm mới danh sách bài đánh giá."),
        ("Luồng ngoại lệ (Exceptions)", "• E1: Chưa đăng nhập -> Hệ thống lưu tạm form vào sessionStorage, chuyển hướng trang Google Login (Mã ERR-001).\n"
                                        "• E2: Điểm số ngoài khoảng 1.0 - 5.0 -> Báo lỗi kiểm tra giá trị (Mã ERR-004).\n"
                                        "• E3: Nhận xét rỗng hoặc dưới 10 ký tự -> Báo lỗi độ dài nội dung (Mã ERR-005).\n"
                                        "• E4: Phát hiện từ cấm tiêu cực/thô tục -> Chuyển vào hàng đợi kiểm duyệt tự động (Mã ERR-012).")
    ]
    for k, v in uc1_specs:
        row = t4.add_row()
        cell_k, cell_v = row.cells[0], row.cells[1]
        set_cell_margins(cell_k); set_cell_margins(cell_v)
        cell_k.width = Inches(2.2); cell_v.width = Inches(4.6)
        pk = cell_k.paragraphs[0]; rk = pk.add_run(k); rk.font.bold = True; rk.font.size = Pt(8.5)
        pv = cell_v.paragraphs[0]; rv = pv.add_run(v); rv.font.size = Pt(8.5)

    doc.add_paragraph()

    p_t5 = doc.add_paragraph(); r = p_t5.add_run("Bảng 2-3: Dữ liệu chức năng UC-01"); r.font.bold = True
    t5 = doc.add_table(rows=1, cols=5)
    t5.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t5)
    for ci, h in enumerate(["Tên trường dữ liệu", "Kiểu dữ liệu", "Bắt buộc", "Giới hạn / Quy tắc kiểm tra", "Mô tả ý nghĩa"]):
        cell = t5.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.0)

    uc1_fields = [
        ("pedagogy_rating", "Float / Numeric", "Có", "1.0 <= x <= 5.0 (bước 0.5)", "Khả năng truyền đạt và sư phạm"),
        ("punctuality_rating", "Float / Numeric", "Có", "1.0 <= x <= 5.0 (bước 0.5)", "Mức độ đúng giờ và trách nhiệm"),
        ("fairness_rating", "Float / Numeric", "Có", "1.0 <= x <= 5.0 (bước 0.5)", "Tính công bằng, minh bạch khi chấm điểm"),
        ("supportiveness_rating", "Float / Numeric", "Có", "1.0 <= x <= 5.0 (bước 0.5)", "Sự hỗ trợ sinh viên ngoài giờ lên lớp"),
        ("knowledge_rating", "Float / Numeric", "Có", "1.0 <= x <= 5.0 (bước 0.5)", "Kiến thức chuyên môn và thực tiễn"),
        ("course_name", "Varchar(100)", "Có", "Độ dài từ 2 đến 100 ký tự", "Mã hoặc tên môn học đã tham gia"),
        ("semester", "Varchar(20)", "Có", "Format: YYYY1, YYYY2, YYYY3", "Học kỳ tham gia môn học"),
        ("comment", "Text", "Có", "10 <= length <= 2000 ký tự", "Nội dung nhận xét chi tiết của sinh viên"),
        ("is_anonymous", "Boolean", "Có", "Mặc định True", "Cờ ẩn danh thông tin người đánh giá")
    ]
    for row_data in uc1_fields:
        row = t5.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)

    doc.add_page_break()

    # Section 2.7: Bảng mã lỗi
    doc.add_heading(level=2).add_run("2.7 Bảng mã lỗi của hệ thống")
    doc.add_paragraph(
        "Bảng 2-4 quy định danh mục mã lỗi chuẩn hóa toàn diện (ERR-001 đến ERR-016). Bảng mã lỗi này khớp hoàn toàn "
        "với tài liệu API Specification (Mẫu 01) và danh mục 16 lỗi cài cắm trong Bug Manifest (Mẫu 02), đảm bảo tính nhất quán 100%:"
    )

    p_t6 = doc.add_paragraph(); r = p_t6.add_run("Bảng 2-4: Bảng mã lỗi của hệ thống"); r.font.bold = True
    t6 = doc.add_table(rows=1, cols=4)
    t6.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t6)
    for ci, h in enumerate(["Mã lỗi (Error Code)", "HTTP Status", "Thông điệp lỗi trả về (Message)", "Nguyên nhân kỹ thuật & Biện pháp xử lý"]):
        cell = t6.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.0)

    error_codes = [
        ("ERR-001", "401 Unauthorized", "Yêu cầu đăng nhập tài khoản Google", "Phiên xác thực hết hạn hoặc thiếu Bearer Token. Chuyển hướng người dùng sang trang Google Login."),
        ("ERR-002", "403 Forbidden", "Bạn không có quyền thực hiện thao tác này", "Tài khoản thiếu quyền RBAC cần thiết (ví dụ Member cố truy cập phân hệ Quản trị viên /admin)."),
        ("ERR-003", "404 Not Found", "Hồ sơ giảng viên hoặc tài nguyên không tồn tại", "Đường dẫn không hợp lệ hoặc bản ghi đã bị vô hiệu hóa trong cơ sở dữ liệu."),
        ("ERR-004", "422 Unprocessable", "Điểm đánh giá phải thuộc khoảng từ 1.0 đến 5.0", "Giá trị điểm số vượt ngưỡng chuẩn quy định (ví dụ nhập 0 hoặc 6.0)."),
        ("ERR-005", "400 Bad Request", "Nội dung nhận xét tối thiểu phải từ 10 ký tự", "Người dùng bỏ trống ô nhận xét hoặc nhập ký tự trắng không hợp lệ."),
        ("ERR-006", "409 Conflict", "Bạn đã thực hiện bình chọn (Upvote) bài viết này", "Mỗi tài khoản chỉ được upvote 1 lần duy nhất cho mỗi bài đánh giá."),
        ("ERR-007", "400 Bad Request", "Email đính chính phải có định dạng .edu.vn hoặc .ac.vn", "Giảng viên gửi yêu cầu đính chính nhưng sử dụng email cá nhân (Gmail/Yahoo)."),
        ("ERR-008", "400 Bad Request", "Học hàm không hợp lệ (Chỉ chấp nhận GS hoặc PGS)", "Hệ thống chỉ công nhận học hàm Giáo sư (GS) và Phó Giáo sư (PGS) theo quy định Nhà nước."),
        ("ERR-009", "400 Bad Request", "Từ khóa tìm kiếm chứa ký tự đặc biệt nguy hiểm", "Cơ chế WAF chặn các chuỗi ký tự tấn công SQL Injection hoặc Cross-Site Scripting (XSS)."),
        ("ERR-010", "409 Conflict", "Xung đột ghi đồng thời (Race Condition Concurrency)", "Nhiều luồng đồng thời cập nhật Rollup rating của giảng viên mà không dùng Transaction Lock."),
        ("ERR-011", "400 Bad Request", "Hồ sơ khiếu nại thiếu liên kết quyết định minh chứng", "Yêu cầu theo Nghị định 13 không cung cấp URL bằng chứng pháp lý."),
        ("ERR-012", "422 Unprocessable", "Nội dung vi phạm từ điển tiêu chuẩn văn hóa học đường", "Bộ lọc ngôn từ phát hiện các từ khóa thô tục, xúc phạm danh dự nhân phẩm."),
        ("ERR-013", "429 Too Many Req", "Vượt quá giới hạn tần suất yêu cầu (Rate Limit Exceeded)", "IP gửi quá 60 request/phút, bảo vệ hệ thống khỏi các cuộc tấn công DoS/Brute-force."),
        ("ERR-014", "500 Internal Error", "Lỗi phân tích cú pháp dữ liệu trường đại học (Crawler Parse)", "Cấu trúc HTML trang web nguồn thay đổi làm gãy pipeline cào dữ liệu."),
        ("ERR-015", "400 Bad Request", "Tệp danh bạ đối soát không đúng định dạng chuẩn CSV/JSON", "Tệp tải lên vượt quá 10MB hoặc thiếu các trường bắt buộc (full_name, title)."),
        ("ERR-016", "503 Service Unavail", "Cơ sở dữ liệu tạm thời bận hoặc mất kết nối mạng", "Dịch vụ Cloud Run không thể kết nối tới cơ sở dữ liệu phân tán.")
    ]
    for row_data in error_codes:
        row = t6.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.0)

    doc.add_page_break()

    # Section 2.8: Ma trận truy vết yêu cầu
    doc.add_heading(level=2).add_run("2.8 Ma trận truy vết yêu cầu")
    doc.add_paragraph(
        "Bảng 2-5 thể hiện Ma trận truy vết hai chiều (Requirements Traceability Matrix – RTM) "
        "kết nối chặt chẽ giữa Yêu cầu người dùng (URD), Yêu cầu phần mềm (SRS), Kịch bản kiểm thử (Test Case) và Đầu mối API (Endpoint):"
    )

    p_t7 = doc.add_paragraph(); r = p_t7.add_run("Bảng 2-5: Ma trận truy vết yêu cầu"); r.font.bold = True
    t7 = doc.add_table(rows=1, cols=6)
    t7.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t7)
    for ci, h in enumerate(["Mã URD", "Mã SRS (FR)", "Mô tả tính năng", "Mã Test Case", "Mã Lỗi liên quan", "API Endpoint xử lý"]):
        cell = t7.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.0)

    rtm_data = [
        ("US01", "FR-01", "Đăng nhập xác thực Google OAuth 2.0", "TC-001 -> TC-005", "ERR-001", "POST /api/auth/google"),
        ("US02", "FR-02", "Quản lý Profile & Danh sách Bookmark", "TC-006 -> TC-010", "ERR-001, 002", "GET/POST /api/bookmarks"),
        ("US03", "FR-03", "Tìm kiếm giảng viên đa tiêu chí", "TC-011 -> TC-018", "ERR-009, 013", "GET /api/professors/search"),
        ("US04", "FR-04", "Đăng bài nhận xét & đánh giá 5 sao", "TC-019 -> TC-028", "ERR-004, 005, 012", "POST /api/professors/{id}/reviews"),
        ("US05", "FR-05", "Bình chọn Upvote nhận xét hữu ích", "TC-029 -> TC-034", "ERR-006", "POST /api/reviews/{id}/upvote"),
        ("US06", "FR-06", "Khiếu nại đính chính theo Nghị định 13", "TC-035 -> TC-042", "ERR-007, 008, 011", "POST /api/corrections"),
        ("US07", "FR-07", "Báo cáo nhận xét vi phạm nội quy", "TC-043 -> TC-048", "ERR-001, 005", "POST /api/reports"),
        ("US08", "FR-08", "Trực quan hóa thống kê phân phối điểm", "TC-049 -> TC-054", "ERR-003", "GET /api/professors/{id}/stats"),
        ("US09", "FR-09", "Bảng điều khiển kiểm duyệt Quản trị viên", "TC-055 -> TC-060", "ERR-002", "GET /api/admin/dashboard"),
        ("US10", "FR-10", "Crawler dữ liệu tôn trọng robots.txt", "TC-061 -> TC-066", "ERR-014, 015", "POST /api/crawler/trigger"),
        ("US11", "FR-11", "Atomic Rollup tính điểm trung bình", "TC-067 -> TC-072", "ERR-010", "Tích hợp DB Transaction"),
        ("US12", "FR-12", "Cung cấp REST API & Document chuẩn", "NFR-01 -> NFR-10", "ERR-013, 016", "OpenAPI Specification")
    ]
    for row_data in rtm_data:
        row = t7.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.0)

    doc.add_heading(level=2).add_run("2.9 Câu hỏi gửi bộ phận nghiệp vụ")
    doc.add_paragraph(
        "Bảng 2-6 tổng hợp 10 câu hỏi kỹ thuật/nghiệp vụ quan trọng được bộ phận kiểm thử QA/QC phát hiện trong quá trình "
        "Review SRS (khớp hoàn toàn với Sheet Review_SRS trong Mẫu 03), cùng kết luận xử lý chính thức:"
    )

    p_t8 = doc.add_paragraph(); r = p_t8.add_run("Bảng 2-6: Danh sách câu hỏi gửi bộ phận nghiệp vụ"); r.font.bold = True
    t8 = doc.add_table(rows=1, cols=4)
    t8.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t8)
    for ci, h in enumerate(["STT", "Hạng mục / Chức năng", "Nội dung câu hỏi làm rõ nghiệp vụ", "Kết luận kỹ thuật & Thống nhất giải pháp"]):
        cell = t8.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.0)

    qa_items = [
        ("1", "FR-01 / Auth", "Người dùng đăng nhập bằng Google Gmail cá nhân (@gmail.com) có được phép đánh giá không?", "Được phép đánh giá bình thường. Tuy nhiên, hệ thống sẽ gắn nhãn 'Verified Student' nếu sử dụng email đuôi .edu.vn."),
        ("2", "FR-04 / Rating", "Mỗi sinh viên được gửi tối đa bao nhiêu đánh giá cho cùng một giảng viên?", "Mỗi sinh viên chỉ được gửi 1 đánh giá duy nhất cho 1 môn học/học kỳ để chống spam dồn điểm."),
        ("3", "FR-04 / Anonymity", "Làm thế nào để đảm bảo tính ẩn danh cho sinh viên trước giảng viên và công chúng?", "Hệ thống chỉ lưu user_id nội bộ để kiểm tra trùng lặp. Mọi API công khai đều xóa trắng danh tính tác giả."),
        ("4", "FR-06 / NĐ 13", "Quy trình xác minh tư cách chính chủ của giảng viên khi gửi khiếu nại như thế nào?", "Bắt buộc gửi qua form có OTP gửi về email tên miền trường (.edu.vn / .ac.vn) kèm link quyết định."),
        ("5", "FR-06 / SLA", "Thời hạn cam kết xử lý khiếu nại thông tin cá nhân tối đa là bao lâu?", "Không quá 72 giờ làm việc kể từ thời điểm nhận được đầy đủ bằng chứng hợp lệ."),
        ("6", "FR-05 / Upvote", "Người dùng có thể rút lại lượt Upvote đã bấm không?", "Cho phép toggle: bấm lần đầu để upvote, bấm lần hai để thu hồi lượt upvote."),
        ("7", "FR-11 / Concurrency", "Giải pháp chống xung đột Rollup khi có 500 yêu cầu đánh giá đồng thời?", "Sử dụng câu lệnh SQL nguyên tử có khóa hàng (SELECT FOR UPDATE) hoặc Atomic Database Trigger."),
        ("8", "FR-10 / Crawler", "Thời gian giãn cách tối thiểu giữa các lượt cào dữ liệu là bao nhiêu?", "Tối thiểu 1.5 giây giữa các lượt request, tự động tạm dừng nếu website nguồn trả về HTTP 429/503."),
        ("9", "NFR-01 / Performance", "Khi tải đồng thời vượt quá 500 người dùng, hệ thống ứng phó thế nào?", "Cloud Run tự động kích hoạt Auto-scaling từ 1 lên tối đa 10 instances để duy trì P90 < 800ms."),
        ("10", "FR-09 / Admin", "Các hành động xóa bài hoặc duyệt khiếu nại của Admin có được ghi nhật ký không?", "Bắt buộc ghi toàn bộ vào bảng Audit_Logs (chứa admin_id, action, timestamp, old_value, new_value).")
    ]
    for row_data in qa_items:
        row = t8.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.0)

    doc.add_page_break()

    # Section 3: Các yêu cầu phi chức năng
    h3 = doc.add_heading(level=1); r = h3.add_run("3 Các yêu cầu phi chức năng"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY

    doc.add_heading(level=2).add_run("3.1 Giao diện người dùng")
    doc.add_paragraph(
        "Giao diện người dùng được thiết kế chuẩn Responsive Design, tối ưu hóa hiển thị mượt mà trên cả trình duyệt Web Desktop "
        "và thiết bị di động (Mobile/Tablet). Màu sắc chủ đạo là Xanh dương đậm (#1F4E79), phông chữ không chân (Inter/Roboto) hiện đại, "
        "thời gian hiển thị khung hình đầu tiên (FCP) dưới 1.2 giây, tuân thủ tiêu chuẩn tương phản trợ năng WCAG 2.1 Mức AA."
    )

    doc.add_heading(level=2).add_run("3.2 Hiệu năng")
    doc.add_paragraph(
        "Bảng 3-1 xác định các chỉ tiêu định lượng bắt buộc về năng lực xử lý và độ trễ của hệ thống trong môi trường sản xuất:"
    )

    p_t9 = doc.add_paragraph(); r = p_t9.add_run("Bảng 3-1: Các yêu cầu hiệu năng"); r.font.bold = True
    t9 = doc.add_table(rows=1, cols=4)
    t9.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t9)
    for ci, h in enumerate(["Mã yêu cầu", "Chỉ số hiệu năng đo lường", "Ngưỡng kỹ thuật cam kết (Target SLA)", "Điều kiện tải & Phương pháp kiểm thử"]):
        cell = t9.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(h); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.0)

    perf_reqs = [
        ("NFR-01", "Thời gian phản hồi P90 (P90 Latency)", "< 800 ms (API đọc) / < 1200 ms (API ghi)", "Đo bằng Apache JMeter với kịch bản 50 người dùng đồng thời (50 VUs)."),
        ("NFR-02", "Thông lượng xử lý (Throughput)", ">= 80 Requests Per Second (RPS)", "Thực hiện trên endpoint tìm kiếm danh bạ và chi tiết hồ sơ."),
        ("NFR-03", "Tỷ lệ lỗi tối đa cho phép (Error Rate)", "< 1.0 % trên tổng số request hợp lệ", "Trong toàn bộ phiên thử tải kéo dài 10 phút liên tục."),
        ("NFR-04", "Tính toàn vẹn Rollup khi tải cao (Rollup Consistency)", "100% bản ghi chính xác, 0 sai lệch", "Thực hiện đồng thời 50 request đánh giá cùng lúc vào một giảng viên."),
        ("NFR-05", "Thời gian phục hồi dịch vụ (MTTR)", "< 60 giây khi có sự cố instance", "Cơ chế tự phục hồi và tái tạo container của Google Cloud Run.")
    ]
    for row_data in perf_reqs:
        row = t9.add_row()
        for ci, val in enumerate(row_data):
            cell = row.cells[ci]; set_cell_margins(cell); p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)

    doc.add_heading(level=2).add_run("3.3 Tính bảo mật")
    doc.add_paragraph(
        "• NFR-06: Chống tấn công XSS, SQL Injection và CSRF. Mọi chuỗi đầu vào được lọc khử qua thư viện DOMPurify và câu lệnh Parameterized SQL.\n"
        "• NFR-07: Mã hóa toàn bộ dữ liệu truyền tải trên đường truyền bằng giao thức TLS 1.3 / HTTPS. Chứng chỉ SSL tự động cấp phát bởi Google Cloud.\n"
        "• NFR-08: Giới hạn tần suất gọi API (Rate Limiting) tối đa 60 request/phút/IP để chống vét dữ liệu trái phép và tấn công từ chối dịch vụ."
    )

    doc.add_heading(level=2).add_run("3.4 Ràng buộc")
    doc.add_paragraph(
        "• NFR-09: Ràng buộc môi trường: Triển khai trên nền tảng Serverless Google Cloud Run (khu vực asia-southeast1), container Docker chuẩn Linux Alpine.\n"
        "• NFR-10: Ràng buộc pháp lý: Toàn bộ quy trình xử lý dữ liệu cá nhân phải tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP và Luật An ninh mạng Việt Nam."
    )

    # Output directory
    os.makedirs("docs", exist_ok=True)
    out_docx = "docs/04_SRS_RateProfCuaBan.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    # Convert to PDF
    cmd = ["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs"]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(res.stdout)
    out_pdf = "docs/04_SRS_RateProfCuaBan.pdf"
    if os.path.exists(out_pdf):
        print(f"Converted to {out_pdf} successfully!")
    else:
        print(f"Conversion error: {res.stderr}")

if __name__ == "__main__":
    build_srs()
