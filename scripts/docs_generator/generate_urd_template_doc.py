#!/usr/bin/env python3
"""
Generate 03_URD_RateProfCuaBan.docx strictly adhering to 03_URD_BIEU_MAU_TRONG.docx:
Header:
- TÀI LIỆU YÊU CẦU NGƯỜI SỬ DỤNG (User Requirements Document – URD)
- Hệ thống Đánh giá Giảng viên và Tra cứu Học thuật Toàn quốc (RateProfCuaBan / RateUrProf)
- Phiên bản 1.2
- Người biên soạn: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024
- Đơn vị chủ trì: Bộ phận Phát triển Hệ thống & Nghiệp vụ Học thuật
- Bảng phê duyệt (Biên soạn: Lương Chí Dũng; Kiểm thử: Nguyễn Văn A; Duyệt: Giảng viên hướng dẫn)
Mục lục:
1 Giới thiệu (1.1 Mục đích, 1.2 Phạm vi, 1.3 Từ điển thuật ngữ Bảng 1-1, 1.4 Ký hiệu Bảng 1-2, 1.5 Căn cứ)
2 Mô tả chung về hệ thống (2.1 Hệ thống hiện tại, 2.2 Hạn chế, 2.3 Mức độ sử dụng Bảng 2-1, 2.4 Mục tiêu, 2.5 Khung cảnh Bảng 2-2, 2.6 Ngữ cảnh Bảng 2-3, 2.7 Hiệu quả)
3 Yêu cầu nghiệp vụ chi tiết
  3.1 Sơ đồ hoạt động nghiệp vụ tương lai (Hình 3-1)
  3.2 Luồng FLOW-01: Tra cứu học thuật & Đóng góp đánh giá giảng viên (3.2.1 Yêu cầu thông tin Bảng 3-1, 3.2.2 Trạng thái Bảng 3-2, 3.2.3 Mô tả chức năng US01..12, 3.2.4 Bảng mã lỗi Bảng 3-3)
  3.3 Luồng FLOW-02: Tiếp nhận & Xử lý yêu cầu đính chính theo Nghị định 13
  3.4 Luồng FLOW-03: Thu thập dữ liệu lịch sự & Đối soát danh bạ trường
4 Yêu cầu giao diện và dữ liệu
5 Yêu cầu phi chức năng (Bảng 5-1: NFR-01..10)
6 Bảng tổng hợp các yêu cầu chức năng (Bảng 6-1: FR-01..12)
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

def build_urd():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "TÀI LIỆU YÊU CẦU NGƯỜI SỬ DỤNG (URD) | RateProfCuaBan"
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
    r_t = p_t.add_run("TÀI LIỆU YÊU CẦU NGƯỜI SỬ DỤNG\n(User Requirements Document – URD)")
    r_t.font.name = "Times New Roman"; r_t.font.size = Pt(18); r_t.font.bold = True; r_t.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sb = p_sub.add_run("HỆ THỐNG ĐÁNH GIÁ GIẢNG VIÊN VÀ TRA CỨU HỌC THUẬT TOÀN QUỐC\n(RateProfCuaBan / RateUrProf)\nPhiên bản 1.2")
    r_sb.font.name = "Times New Roman"; r_sb.font.size = Pt(12); r_sb.font.bold = True

    doc.add_paragraph()

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_m = p_meta.add_run(
        "Đơn vị chủ trì: Bộ phận Phát triển Hệ thống & Nghiệp vụ Học thuật\n"
        "Người biên soạn: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024\n"
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
        ("Chủ hệ thống\nLương Chí Dũng\n(24110215)", "Tester đối tác\nNguyễn Văn A\n(24110001)", "Giảng viên hướng dẫn\nTS. Giảng viên VJU\nKhoa CS/IS", "v1.2\n(Bản chốt)"),
        ("Ngày: 05/10/2026", "Ngày: 12/10/2026", "Ngày: 26/10/2026", "Website: rateurprofs.site")
    ]
    for ri, r_data in enumerate(app_rows, start=1):
        row = t_app.rows[ri]
        for ci, val in enumerate(r_data):
            cell = row.cells[ci]
            set_cell_background(cell, "FFFFFF" if ri==1 else "F9F9F9"); set_cell_margins(cell)
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5); p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_page_break()

    # Section 1: Giới thiệu
    h1 = doc.add_heading(level=1); r = h1.add_run("1. Giới thiệu"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    
    h11 = doc.add_heading(level=2); r = h11.add_run("1.1 Mục đích tài liệu"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.add_run(
        "Tài liệu Yêu cầu Người sử dụng (User Requirements Document – URD) này định nghĩa toàn bộ mục tiêu nghiệp vụ, "
        "bài toán thực tế, phạm vi dự án, vai trò người dùng, các luồng nghiệp vụ tương lai và các tiêu chí chấp nhận "
        "cho hệ thống RateProfCuaBan (RateUrProf). Tài liệu làm cơ sở để chi tiết hoá sang tài liệu Đặc tả Yêu cầu Phần mềm (SRS v1.2) "
        "và thiết kế bộ Test Case phục vụ đánh giá nghiệm thu."
    ).font.size = Pt(9.5)

    h12 = doc.add_heading(level=2); r = h12.add_run("1.2 Phạm vi và đối tượng sử dụng"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.add_run(
        "Hệ thống bao phủ phạm vi tra cứu thông tin học thuật của giảng viên tại các trường đại học trên toàn quốc "
        "(ĐHQGHN, ĐHBK Hà Nội, ĐH Kinh tế Quốc dân, v.v.), hỗ trợ đánh giá ẩn danh 5 tiêu chí sư phạm, bình chọn nhận xét hữu ích, "
        "tiếp nhận yêu cầu đính chính theo Nghị định 13/2023/NĐ-CP và chuyển đổi giao diện song ngữ Vi/En. "
        "Đối tượng sử dụng gồm: Sinh viên, Học sinh THPT, Giảng viên đại học và Ban quản trị hệ thống."
    ).font.size = Pt(9.5)

    h13 = doc.add_heading(level=2); r = h13.add_run("1.3 Từ điển thuật ngữ (Bảng 1-1)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_term = doc.add_table(rows=6, cols=3)
    t_term.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_term)
    for ci, th in enumerate(["Thuật ngữ", "Tên tiếng Anh", "Định nghĩa và ngữ cảnh sử dụng"]):
        cell = t_term.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)
    terms = [
        ("Rollup Rating", "Atomic Rollup", "Cơ chế tính toán trung bình điểm số nguyên tử trong giao dịch CSDL khi có bài đánh giá mới."),
        ("Nghị định 13", "Personal Data Protection Decree", "Nghị định 13/2023/NĐ-CP của Chính phủ về bảo vệ dữ liệu cá nhân, quyền yêu cầu đính chính/gỡ bỏ."),
        ("Google OAuth", "Google OpenID Connect", "Cơ chế đăng nhập một chạm qua tài khoản Google, cấp cookie phiên an toàn HttpOnly."),
        ("Học hàm / Học vị", "Academic Rank & Degree", "Phân định độc lập Giáo sư (GS) / Phó Giáo sư (PGS) với Tiến sĩ (TS) / Thạc sĩ (ThS)."),
        ("Accent-insensitive", "Accent Insensitive Search", "Khả năng tìm kiếm chuẩn xác không phân biệt tiếng Việt có dấu và không dấu.")
    ]
    for ri, (vn, en, df) in enumerate(terms, start=1):
        row = t_term.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(1.8); row.cells[2].width = Inches(2.9)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(vn); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(en); r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(df); r2.font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 2: Mô tả chung về hệ thống
    h2 = doc.add_heading(level=1); r = h2.add_run("2. Mô tả chung về hệ thống"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    
    h21 = doc.add_heading(level=2); r = h21.add_run("2.1 Mô tả hệ thống hiện tại & 2.2 Hạn chế"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.add_run(
        "Hiện tại sinh viên Việt Nam chủ yếu trao đổi thông tin giảng viên qua các nhóm mạng xã hội (Facebook, Reddit, diễn đàn trường). "
        "Hạn chế lớn: (1) Thông tin phân tán, không có cấu trúc và khó tìm kiếm; (2) Thiếu xác thực danh tính dẫn đến tin đồn sai lệch; "
        "(3) Sinh viên sợ bị trừng phạt học tập nếu để lộ danh tính khi nhận xét thật; "
        "(4) Không có cơ chế đính chính thông tin chính thống cho giảng viên theo quy định pháp luật."
    ).font.size = Pt(9.5)

    h23 = doc.add_heading(level=2); r = h23.add_run("2.3 Mức độ sử dụng và tăng trưởng giao dịch (Bảng 2-1)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_gro = doc.add_table(rows=4, cols=4)
    t_gro.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_gro)
    for ci, th in enumerate(["Chỉ số", "Giai đoạn thử nghiệm", "Sau 6 tháng vận hành", "Sau 1 năm vận hành"]):
        cell = t_gro.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)
    gro_data = [
        ("Số người dùng hoạt động (MAU)", "2.000 users", "20.000 users", "100.000 users"),
        ("Số lượt tìm kiếm / ngày", "500 lượt", "15.000 lượt", "80.000 lượt"),
        ("Tải đồng thời đỉnh điểm (Concurrency)", "20 users", "100 users", "500 users")
    ]
    for ri, r_d in enumerate(gro_data, start=1):
        row = t_gro.rows[ri]
        for ci, val in enumerate(r_d):
            cell = row.cells[ci]
            set_cell_background(cell, "FFFFFF" if ri%2!=0 else "F9F9F9"); set_cell_margins(cell)
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)
            if ci > 0: p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    h24 = doc.add_heading(level=2); r = h24.add_run("2.4 Mục tiêu của hệ thống cần xây dựng"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.add_run(
        "Xây dựng RateProfCuaBan thành cổng thông tin học thuật minh bạch và đáng tin cậy: "
        "(1) Tra cứu tức thì trong 100ms; (2) Bảo vệ người học 100% bằng cơ chế đánh giá ẩn danh; "
        "(3) Đảm bảo tính pháp lý theo Nghị định 13/2023/NĐ-CP; (4) Vận hành bền bỉ trên Cloud Run với SLA 99.9%."
    ).font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 3: Yêu cầu nghiệp vụ chi tiết
    h3 = doc.add_heading(level=1); r = h3.add_run("3. Yêu cầu nghiệp vụ chi tiết"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    
    h31 = doc.add_heading(level=2); r = h31.add_run("3.1 Sơ đồ hoạt động nghiệp vụ tương lai"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p = doc.add_paragraph()
    p.add_run(
        "Hệ thống vận hành theo 3 luồng nghiệp vụ tương lai: FLOW-01 (Tìm kiếm -> Xem hồ sơ -> Viết đánh giá ẩn danh); "
        "FLOW-02 (Tiếp nhận báo cáo vi phạm & Đính chính thông tin theo Nghị định 13); "
        "FLOW-03 (Thu thập dữ liệu lịch sự có kiểm tra robots.txt và đối soát danh bạ trường)."
    ).font.size = Pt(9.5)

    h32 = doc.add_heading(level=2); r = h32.add_run("3.2 Luồng FLOW-01: Tra cứu học thuật & Đóng góp đánh giá"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p_req = doc.add_paragraph()
    p_req.add_run("Bảng 3-1: Yêu cầu thông tin của bài đánh giá giảng viên").font.bold = True
    t_fld = doc.add_table(rows=7, cols=4)
    t_fld.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_fld)
    for ci, th in enumerate(["Tên trường dữ liệu", "Kiểu dữ liệu", "Bắt buộc", "Quy tắc nghiệp vụ"]):
        cell = t_fld.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)
    fld_data = [
        ("pedagogy (Sư phạm)", "Số nguyên", "Có", "Giá trị từ 1 đến 5 sao"),
        ("difficulty (Độ khó)", "Số nguyên", "Có", "Giá trị từ 1 đến 5 sao"),
        ("workEffort (Nỗ lực)", "Số nguyên", "Có", "Giá trị từ 1 đến 5 sao"),
        ("gradingFairness (Công bằng)", "Số nguyên", "Có", "Giá trị từ 1 đến 5 sao"),
        ("rating (Tổng thể)", "Số nguyên", "Có", "Giá trị từ 1 đến 5 sao"),
        ("comment (Nhận xét)", "Văn bản", "Có", "Độ dài từ 10 đến 2.000 ký tự; cấm từ ngữ xúc phạm")
    ]
    for ri, (f, t, req, rul) in enumerate(fld_data, start=1):
        row = t_fld.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(2.0); row.cells[1].width = Inches(1.1); row.cells[2].width = Inches(1.0); row.cells[3].width = Inches(2.4)
        row.cells[0].paragraphs[0].add_run(f).font.bold = True
        row.cells[1].paragraphs[0].add_run(t).font.size = Pt(8.5)
        row.cells[2].paragraphs[0].add_run(req).font.size = Pt(8.5); row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[3].paragraphs[0].add_run(rul).font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 3.2.3: Danh sách 12 Câu chuyện Người dùng (US01 – US12)
    h323 = doc.add_heading(level=2); r = h323.add_run("3.2.3 Danh sách Câu chuyện người dùng (US01 đến US12)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    stories = [
        ("US01 (Đăng nhập Google OAuth) [Must]:", "Là sinh viên, tôi muốn đăng nhập an toàn bằng tài khoản Google để sử dụng tính năng đánh giá và lưu giảng viên.", "Đăng nhập 1-click, cấp cookie HttpOnly 30 ngày, đăng xuất an toàn xóa sạch phiên."),
        ("US02 (Tìm kiếm không dấu) [Must]:", "Là người dùng, tôi muốn gõ tên giảng viên có dấu hoặc không dấu kèm bộ lọc trường để nhanh chóng tìm thấy thầy cô.", "Chuẩn hóa không dấu, hỗ trợ lọc theo trường/khoa, phản hồi dưới 100ms."),
        ("US03 (Hồ sơ học thuật & Dẫn chứng) [Must]:", "Là sinh viên, tôi muốn xem thông tin học hàm, học vị và liên kết minh chứng .edu.vn để xác thực hồ sơ.", "Tách biệt rõ GS/PGS với TS/ThS, dẫn link cổng trường, avatar 1:1 chuẩn xác."),
        ("US04 (Đánh giá ẩn danh) [Must]:", "Là sinh viên, tôi muốn gửi đánh giá 5 tiêu chí ẩn danh mà không sợ lộ danh tính cá nhân để giúp ích cho khóa sau.", "Điểm 1-5 sao, nhận xét 10-2000 ký tự, hiển thị tác giả 'Sinh viên ẩn danh'."),
        ("US05 (Bình chọn hữu ích) [Should]:", "Là người đọc, tôi muốn bấm Upvote cho nhận xét chất lượng để làm nổi bật thông tin giá trị.", "Chỉ tính 1 vote/người dùng, toggle hủy vote, không spam vote vô hạn."),
        ("US06 (Tra cứu trường ĐH) [Must]:", "Là học sinh/sinh viên, tôi muốn xem thông tin các trường đại học để tìm hiểu môi trường đào tạo.", "Hiển thị danh bạ các trường toàn quốc và giảng viên trực thuộc."),
        ("US07 (Báo cáo vi phạm) [Must]:", "Là người dùng, tôi muốn báo cáo nhận xét tiêu cực/thô tục để ban quản trị kiểm duyệt gỡ bỏ.", "Gửi lý do báo cáo, đưa bài viết vào hàng đợi kiểm duyệt tại /admin."),
        ("US08 (Đính chính theo NĐ 13) [Must]:", "Là giảng viên, tôi muốn gửi yêu cầu đính chính học hàm hoặc gỡ hồ sơ theo Nghị định 13.", "Cung cấp email trường (.edu.vn), link quyết định, Admin thẩm định duyệt/từ chối."),
        ("US09 (Giao diện song ngữ) [Should]:", "Là sinh viên quốc tế, tôi muốn sử dụng giao diện tiếng Anh mà không bị mất từ khóa tìm kiếm.", "Dịch thuật 100%, bảo toàn tham số lọc ?q=... trên URL khi chuyển ngữ."),
        ("US10 (Lưu giảng viên quan tâm) [Should]:", "Là sinh viên, tôi muốn bookmark giảng viên để theo dõi và xem lại sau khi tải lại trang.", "Lưu bền vững LocalStorage/CSDL, tồn tại sau F5, danh sách hiển thị đúng người."),
        ("US11 (Bảo mật quản trị) [Must]:", "Là Admin, tôi muốn bảo vệ giao diện /admin để ngăn chặn người ngoài xâm nhập trái phép.", "Chặn khách vãng lai và thành viên thường, chỉ cho phép tài khoản Admin."),
        ("US12 (Thu thập dữ liệu lịch sự) [Must]:", "Là quản trị viên, tôi muốn thu thập danh bạ trường có kiểm tra robots.txt và độ trễ an toàn.", "Tuân thủ robots.txt, độ trễ 1.5s, thuật toán phát hiện và khử trùng lặp.")
    ]
    for tag, desc, crit in stories:
        p = doc.add_paragraph()
        r1 = p.add_run(tag + " "); r1.font.bold = True; r1.font.size = Pt(9)
        r2 = p.add_run(desc + " "); r2.font.size = Pt(9)
        r3 = p.add_run("Tiêu chí chấp nhận: " + crit); r3.font.italic = True; r3.font.size = Pt(8.5); r3.font.color.rgb = DARK_GRAY

    doc.add_paragraph()

    # Section 5: Yêu cầu phi chức năng (Bảng 5-1)
    h5 = doc.add_heading(level=1); r = h5.add_run("5. Yêu cầu phi chức năng (Bảng 5-1)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_nfr = doc.add_table(rows=11, cols=4)
    t_nfr.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_nfr)
    for ci, th in enumerate(["Mã NFR", "Nhóm chất lượng", "Chỉ tiêu định lượng bắt buộc", "Phương pháp đo"]):
        cell = t_nfr.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    nfrs = [
        ("NFR-01", "Hiệu năng phản hồi", "P90 thời gian phản hồi API tìm kiếm ≤ 2.0s với 20 người dùng đồng thời", "JMeter 5.6.3 non-GUI"),
        ("NFR-02", "Hiệu năng tải trang", "Chỉ số Largest Contentful Paint (LCP) trên mạng 4G ≤ 2.5s; Score ≥ 80", "Lighthouse Web Vitals"),
        ("NFR-03", "Toàn vẹn giao dịch", "Ghi đồng thời 50 bài đánh giá đảm bảo atomic rollback, không race condition", "K6 / Postman Newman"),
        ("NFR-04", "Tương thích hiển thị", "Responsive hoàn chỉnh tại 375px, 768px, 1366px, 1920px; không tràn ngang", "DevTools Device Mode"),
        ("NFR-05", "Độ tin cậy", "Xử lý an toàn payload JSON bất thường, tuyệt đối không trả lỗi HTTP 500", "Postman negative test"),
        ("NFR-06", "Khả năng phục hồi", "Tự ngắt timeout sau 5s khi mất kết nối mạng, hiển thị thông báo thân thiện", "Network Offline test"),
        ("NFR-07", "Bảo mật xác thực", "Cookie phiên HttpOnly=true, Secure=true, SameSite=Lax; RBAC chặn /admin", "OWASP ZAP audit"),
        ("NFR-08", "Bảo vệ dữ liệu NĐ 13", "Không rò rỉ email/danh tính sinh viên trong payload JSON công khai", "Kiểm tra gói tin API"),
        ("NFR-09", "Trợ năng tiếp cận", "Đạt chuẩn WCAG 2.1 AA; hỗ trợ 100% phím Tab/Enter/Esc; tương phản ≥ 4.5:1", "Accessibility audit"),
        ("NFR-10", "Tính nhất quán song ngữ", "Dịch thuật 100% giao diện tiếng Anh; bảo toàn query ?q=... khi đổi ngôn ngữ", "Test tự động i18n")
    ]
    for ri, (m, g, req, mth) in enumerate(nfrs, start=1):
        row = t_nfr.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.1); row.cells[1].width = Inches(1.8); row.cells[2].width = Inches(2.4); row.cells[3].width = Inches(1.8)
        row.cells[0].paragraphs[0].add_run(m).font.bold = True
        row.cells[1].paragraphs[0].add_run(g).font.size = Pt(8.5)
        row.cells[2].paragraphs[0].add_run(req).font.size = Pt(8.5)
        row.cells[3].paragraphs[0].add_run(mth).font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 6: Bảng tổng hợp các yêu cầu chức năng (Bảng 6-1)
    h6 = doc.add_heading(level=1); r = h6.add_run("6. Bảng tổng hợp các yêu cầu chức năng (Bảng 6-1)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_fr = doc.add_table(rows=13, cols=4)
    t_fr.alignment = WD_TABLE_ALIGNMENT.CENTER; set_table_borders(t_fr)
    for ci, th in enumerate(["Mã FR", "Tên chức năng nghiệp vụ", "Vai trò áp dụng", "Mức ưu tiên"]):
        cell = t_fr.rows[0].cells[ci]; set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    fr_summary = [
        ("FR-01", "Tìm kiếm thông minh tiếng Việt (có dấu, không dấu)", "Tất cả (Khách, Sinh viên)", "Must"),
        ("FR-02", "Bộ lọc trường đại học và cơ sở giáo dục", "Tất cả", "Must"),
        ("FR-03", "Xem hồ sơ giảng viên, học hàm và dẫn chứng .edu.vn", "Tất cả", "Must"),
        ("FR-04", "Lưu giảng viên yêu thích (Bookmark) bền vững", "Khách, Sinh viên", "Should"),
        ("FR-05", "Xem danh sách nhận xét & Bình chọn Upvote hữu ích", "Tất cả", "Should"),
        ("FR-06", "Đăng bài đánh giá 5 tiêu chí ẩn danh & nhận xét", "Thành viên (Sinh viên)", "Must"),
        ("FR-07", "Tiếp nhận báo cáo vi phạm & Đính chính theo Nghị định 13", "Tất cả, Giảng viên", "Must"),
        ("FR-08", "Xác thực người dùng (Google OAuth, Cookie bảo mật)", "Tất cả", "Must"),
        ("FR-09", "Hồ sơ cá nhân & Quản lý bài đánh giá của tôi", "Thành viên", "Must"),
        ("FR-10", "Tra cứu thông tin trường đại học toàn quốc", "Tất cả", "Must"),
        ("FR-11", "Chuyển đổi giao diện song ngữ Vi/En bảo toàn URL", "Tất cả", "Should"),
        ("FR-12", "Bảng điều khiển Quản trị viên (/admin) & Kiểm duyệt", "Quản trị viên (Admin)", "Must")
    ]
    for ri, (m, nm, ro, pr) in enumerate(fr_summary, start=1):
        row = t_fr.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.1); row.cells[1].width = Inches(3.2); row.cells[2].width = Inches(1.8); row.cells[3].width = Inches(1.0)
        row.cells[0].paragraphs[0].add_run(m).font.bold = True
        row.cells[1].paragraphs[0].add_run(nm).font.size = Pt(8.5)
        row.cells[2].paragraphs[0].add_run(ro).font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; p3.add_run(pr).font.bold = True; p3.alignment = WD_ALIGN_PARAGRAPH.CENTER

    out_docx = "docs/03_URD_RateProfCuaBan.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/03_URD_RateProfCuaBan.pdf successfully!")

if __name__ == "__main__":
    build_urd()
