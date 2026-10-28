#!/usr/bin/env python3
"""
Generate Mau_01_Tai_lieu_API.docx strictly adhering to Google Drive template:
1. Thông tin chung (Base URL, format, auth mechanism, token lifetime, pagination, swagger)
2. Mã lỗi chung (200, 201, 400, 401, 403, 404, 409, 500 with sample JSON)
3. Danh sách endpoint (14 endpoints covering FR-01 to FR-12)
4. Đặc tả chi tiết từng endpoint (full request/response specs with sample JSON)
5. Tài khoản dùng để gọi API (Credentials for Guest, Member, Admin)
"""

import os
import subprocess
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
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

def build_mau01_doc():
    doc = Document()

    # Set page margins (1 inch)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.text = "Mẫu 01 – Tài liệu API | RateProfCuaBan"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"
        hp.style.font.size = Pt(8.5)
        hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.text = "Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU) | Sinh viên: Lương Chí Dũng (24110215)"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"
        fp.style.font.size = Pt(8.5)
        fp.style.font.color.rgb = RGBColor(128, 128, 128)

    # Style definitions
    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)
    CODE_COLOR = RGBColor(180, 40, 40)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("TÀI LIỆU API")
    run_title.font.name = "Times New Roman"
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_meta = p_meta.add_run("Hệ thống: RateProfCuaBan (RateUrProf) · Phiên bản: 1.2 · Người lập: Lương Chí Dũng – MSSV: 24110215 · Lớp: BCSE2024 · Ngày: 26/10/2026")
    run_meta.font.name = "Times New Roman"
    run_meta.font.size = Pt(10)
    run_meta.font.italic = True
    run_meta.font.color.rgb = DARK_GRAY

    p_guide = doc.add_paragraph()
    p_guide.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r_guide = p_guide.add_run(
        "Hướng dẫn: Tài liệu này giúp tester viết collection Postman mà không cần xem mã nguồn. "
        "Tài liệu liệt kê ĐẦY ĐỦ tất cả API mà hệ thống RateProfCuaBan đang có, trả về định dạng JSON (kể cả API quản trị "
        "và API mà giao diện gọi ngầm). Mọi ràng buộc dữ liệu khớp 100% với SRS v1.2. "
        "Hệ thống được triển khai hoạt động trực tuyến tại: https://rateurprofs.site"
    )
    r_guide.font.name = "Times New Roman"
    r_guide.font.size = Pt(9.5)
    r_guide.font.italic = True

    # Section 1: Thông tin chung
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("1. Thông tin chung")
    r1.font.name = "Times New Roman"
    r1.font.color.rgb = NAVY

    t1 = doc.add_table(rows=8, cols=2)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t1)

    info_data = [
        ("Base URL", "https://rateurprofs.site/api (và Cloud Run: https://rateurprofs-web-331362663006.asia-southeast1.run.app/api)"),
        ("Định dạng dữ liệu", "JSON, mã hoá UTF-8. Request Header bắt buộc: Content-Type: application/json"),
        ("Cơ chế xác thực", "Bearer token (JWT) trong header Authorization: Bearer <token> hoặc Cookie phiên HttpOnly 'auth_token'"),
        ("Cách lấy token", "Gọi API POST /api/auth/login với thông tin đăng nhập, hoặc trích xuất từ phiên Google OAuth sinh viên"),
        ("Thời hạn token", "60 phút (3600 giây). Hết hạn yêu cầu đăng nhập lại"),
        ("Định dạng ngày giờ", "ISO 8601 chuẩn quốc tế, ví dụ: 2026-10-12T19:30:00+07:00"),
        ("Phân trang", "Hỗ trợ tham số query: page (bắt đầu từ 1, mặc định 1), limit (tối đa 50 bản ghi/trang, mặc định 10)"),
        ("Link Swagger / OpenAPI", "https://rateurprofs.site/api/docs (OpenAPI Specification 3.1)")
    ]

    for idx, (label, val) in enumerate(info_data):
        row = t1.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        set_cell_background(cell_lbl, "DDEBF7")
        set_cell_margins(cell_lbl)
        set_cell_margins(cell_val)
        cell_lbl.width = Inches(2.0)
        cell_val.width = Inches(4.5)

        p = cell_lbl.paragraphs[0]
        r = p.add_run(label)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True

        p2 = cell_val.paragraphs[0]
        r2 = p2.add_run(val)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 2: Mã lỗi chung
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("2. Mã lỗi chung")
    r2.font.name = "Times New Roman"
    r2.font.color.rgb = NAVY

    p_err_guide = doc.add_paragraph()
    r_eg = p_err_guide.add_run("Hướng dẫn: Định dạng phản hồi lỗi chuẩn của toàn bộ hệ thống tuân thủ cấu trúc JSON: {\"error\": \"MÃ_LỖI\", \"message\": \"Mô tả ngắn gọn\", \"fields\": {...}}.")
    r_eg.font.name = "Times New Roman"
    r_eg.font.size = Pt(9)
    r_eg.font.italic = True

    t_err = doc.add_table(rows=8, cols=3)
    t_err.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_err)

    err_headers = ["Mã HTTP", "Ý nghĩa", "Body mẫu"]
    for c_idx, h_text in enumerate(err_headers):
        cell = t_err.rows[0].cells[c_idx]
        set_cell_background(cell, "1F4E79")
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    errors_list = [
        ("200 OK", "Thành công", '{ "data": { ... } }'),
        ("201 Created", "Tạo mới tài nguyên thành công", '{ "data": { "id": "...", "createdAt": "..." } }'),
        ("400 Bad Request", "Dữ liệu gửi lên không hợp lệ hoặc thiếu trường bắt buộc", '{ "error": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ", "fields": { "pedagogy": "Điểm từ 1 đến 5" } }'),
        ("401 Unauthorized", "Chưa đăng nhập, thiếu token xác thực hoặc token hết hạn", '{ "error": "UNAUTHORIZED", "message": "Vui lòng đăng nhập để thực hiện thao tác này" }'),
        ("403 Forbidden", "Đã xác thực nhưng tài khoản không có quyền thực hiện", '{ "error": "FORBIDDEN", "message": "Bạn không có quyền truy cập tài nguyên quản trị" }'),
        ("404 Not Found", "Không tìm thấy tài nguyên (giảng viên, trường học, bài đánh giá)", '{ "error": "NOT_FOUND", "message": "Không tìm thấy giảng viên yêu cầu" }'),
        ("409 Conflict", "Xung đột dữ liệu (đã upvote trước đó, trùng mã định danh)", '{ "error": "CONFLICT", "message": "Bạn đã đánh giá hoặc bình chọn bài viết này rồi" }')
    ]

    for r_idx, (code, mean, body) in enumerate(errors_list, start=1):
        row = t_err.rows[r_idx]
        set_cell_background(row.cells[0], "F2F2F2" if r_idx % 2 == 0 else "FFFFFF")
        set_cell_background(row.cells[1], "F2F2F2" if r_idx % 2 == 0 else "FFFFFF")
        set_cell_background(row.cells[2], "F2F2F2" if r_idx % 2 == 0 else "FFFFFF")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(1.2)
        row.cells[1].width = Inches(2.3)
        row.cells[2].width = Inches(3.0)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(code); r0.font.name = "Times New Roman"; r0.font.size = Pt(9); r0.font.bold = True
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(mean); r1.font.name = "Times New Roman"; r1.font.size = Pt(9)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(body); r2.font.name = "Courier New"; r2.font.size = Pt(8); r2.font.color.rgb = CODE_COLOR

    doc.add_paragraph()

    # Section 3: Danh sách endpoint
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("3. Danh sách endpoint")
    r3.font.name = "Times New Roman"
    r3.font.color.rgb = NAVY

    t_ep = doc.add_table(rows=15, cols=5)
    t_ep.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_ep)

    ep_cols = ["STT", "Method", "Endpoint", "Mô tả chức năng", "Vai trò được phép"]
    for c_idx, h_text in enumerate(ep_cols):
        cell = t_ep.rows[0].cells[c_idx]
        set_cell_background(cell, "1F4E79")
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    endpoints_summary = [
        (1, "GET", "/api/search", "Tìm kiếm giảng viên và trường theo tên tiếng Việt có dấu/không dấu (FR-01, FR-02)", "Tất cả"),
        (2, "GET", "/api/lecturers/[id]", "Lấy hồ sơ chi tiết, học hàm, trường và điểm trung bình của giảng viên (FR-03)", "Tất cả"),
        (3, "GET", "/api/lecturers/[id]/reviews", "Lấy danh sách các bài đánh giá công khai của giảng viên có phân trang (FR-05)", "Tất cả"),
        (4, "POST", "/api/lecturers/[id]/reviews", "Gửi bài đánh giá mới kèm điểm 5 tiêu chí và nhận xét văn bản ẩn danh (FR-06)", "Thành viên"),
        (5, "POST", "/api/reviews/[id]/upvote", "Bình chọn tính hữu ích (Upvote) cho bài đánh giá của sinh viên khác (FR-08)", "Khách / Thành viên"),
        (6, "GET", "/api/universities", "Lấy danh sách trường đại học và cơ sở giáo dục trên toàn quốc (FR-10)", "Tất cả"),
        (7, "GET", "/api/universities/[id]", "Lấy thông tin trường và danh sách giảng viên trực thuộc (FR-10)", "Tất cả"),
        (8, "POST", "/api/correction-requests", "Gửi yêu cầu đính chính học hàm / gỡ bỏ thông tin theo Nghị định 13 (FR-07)", "Khách / Thành viên"),
        (9, "GET", "/api/admin/moderation", "Lấy danh sách hàng đợi các bài đánh giá bị báo cáo chờ kiểm duyệt (FR-12)", "Quản trị viên"),
        (10, "POST", "/api/admin/moderation/[id]/action", "Kiểm duyệt viên thực hiện phê duyệt hoặc ẩn bài đánh giá vi phạm (FR-12)", "Quản trị viên"),
        (11, "GET", "/api/admin/correction-requests", "Lấy danh sách các yêu cầu đính chính học hàm từ giảng viên (FR-12)", "Quản trị viên"),
        (12, "PUT", "/api/admin/correction-requests/[id]", "Quản trị viên phê duyệt hoặc từ chối yêu cầu đính chính (FR-12)", "Quản trị viên"),
        (13, "POST", "/api/auth/login", "Đăng nhập xác thực người dùng bằng thông tin tài khoản hoặc OAuth (FR-08)", "Tất cả"),
        (14, "POST", "/api/auth/logout", "Đăng xuất, hủy bỏ phiên làm việc và xóa cookie xác thực (FR-08)", "Thành viên / Admin")
    ]

    for r_idx, (stt, m, ep, desc, role) in enumerate(endpoints_summary, start=1):
        row = t_ep.rows[r_idx]
        bg = "F9F9F9" if r_idx % 2 == 0 else "FFFFFF"
        for c in row.cells:
            set_cell_background(c, bg)
            set_cell_margins(c)
        row.cells[0].width = Inches(0.5)
        row.cells[1].width = Inches(0.9)
        row.cells[2].width = Inches(2.2)
        row.cells[3].width = Inches(2.1)
        row.cells[4].width = Inches(0.9)

        p0 = row.cells[0].paragraphs[0]; p0.add_run(str(stt)).font.name = "Times New Roman"; p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(m); r1.font.name = "Courier New"; r1.font.bold = True
        if m == "GET": r1.font.color.rgb = RGBColor(0, 112, 192)
        elif m == "POST": r1.font.color.rgb = RGBColor(38, 128, 0)
        elif m == "PUT": r1.font.color.rgb = RGBColor(220, 110, 0)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(ep); r2.font.name = "Courier New"; r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(desc); r3.font.name = "Times New Roman"; r3.font.size = Pt(8.5)
        p4 = row.cells[4].paragraphs[0]; r4 = p4.add_run(role); r4.font.name = "Times New Roman"; r4.font.size = Pt(8.5); p4.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # Section 4: Đặc tả chi tiết từng endpoint
    h4 = doc.add_heading(level=1)
    r4 = h4.add_run("4. Đặc tả chi tiết từng endpoint")
    r4.font.name = "Times New Roman"
    r4.font.color.rgb = NAVY

    p_dt_guide = doc.add_paragraph()
    r_dg = p_dt_guide.add_run("Dưới đây là đặc tả chi tiết cấu trúc Request Body, Headers, Parameters và JSON Response thành công / lỗi cho toàn bộ 14 endpoint đã liệt kê ở Mục 3.")
    r_dg.font.name = "Times New Roman"
    r_dg.font.size = Pt(9)
    r_dg.font.italic = True

    # Helper function to render endpoint details
    def add_endpoint_detail(ep_num, method, url, desc, fr_code, role, headers_str, params_table, req_body_table, req_sample, res_success_code, res_sample, err_rows):
        h_sub = doc.add_heading(level=2)
        r_sub = h_sub.add_run(f"4.{ep_num}. [{method} {url}] – [{desc}]")
        r_sub.font.name = "Times New Roman"
        r_sub.font.size = Pt(11)
        r_sub.font.color.rgb = NAVY

        t_meta = doc.add_table(rows=4, cols=2)
        t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(t_meta)
        meta_fields = [
            ("Method + URL", f"{method} {{{{baseUrl}}}}{url}"),
            ("Chức năng liên quan", f"{fr_code}"),
            ("Vai trò được phép", f"{role}"),
            ("Headers", headers_str)
        ]
        for idx, (lbl, val) in enumerate(meta_fields):
            row = t_meta.rows[idx]
            set_cell_background(row.cells[0], "DDEBF7")
            set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
            row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(4.7)
            p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.name = "Times New Roman"; r0.font.size = Pt(9); r0.font.bold = True
            p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.name = "Times New Roman"; r1.font.size = Pt(9)

        if params_table:
            p_prm = doc.add_paragraph(); r = p_prm.add_run("Tham số URL / Query:"); r.font.bold = True; r.font.size = Pt(9)
            t_prm = doc.add_table(rows=len(params_table)+1, cols=6)
            t_prm.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(t_prm)
            prm_headers = ["Tên", "Vị trí", "Kiểu", "Bắt buộc", "Ràng buộc", "Mô tả"]
            for ci, th in enumerate(prm_headers):
                cell = t_prm.rows[0].cells[ci]
                set_cell_background(cell, "1F4E79")
                set_cell_margins(cell)
                p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(8.5)
            for ri, row_data in enumerate(params_table, start=1):
                row = t_prm.rows[ri]
                for ci, cd in enumerate(row_data):
                    cell = row.cells[ci]
                    set_cell_background(cell, "FFFFFF" if ri % 2 != 0 else "F9F9F9")
                    set_cell_margins(cell)
                    p = cell.paragraphs[0]; r = p.add_run(cd); r.font.name = "Times New Roman"; r.font.size = Pt(8.5)

        if req_body_table:
            p_bdy = doc.add_paragraph(); r = p_bdy.add_run("Request Body fields:"); r.font.bold = True; r.font.size = Pt(9)
            t_bdy = doc.add_table(rows=len(req_body_table)+1, cols=5)
            t_bdy.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(t_bdy)
            bdy_headers = ["Trường", "Kiểu", "Bắt buộc", "Ràng buộc", "Mô tả"]
            for ci, th in enumerate(bdy_headers):
                cell = t_bdy.rows[0].cells[ci]
                set_cell_background(cell, "1F4E79")
                set_cell_margins(cell)
                p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(8.5)
            for ri, row_data in enumerate(req_body_table, start=1):
                row = t_bdy.rows[ri]
                for ci, cd in enumerate(row_data):
                    cell = row.cells[ci]
                    set_cell_background(cell, "FFFFFF" if ri % 2 != 0 else "F9F9F9")
                    set_cell_margins(cell)
                    p = cell.paragraphs[0]; r = p.add_run(cd); r.font.name = "Times New Roman"; r.font.size = Pt(8.5)

        if req_sample:
            p_smp = doc.add_paragraph(); r = p_smp.add_run("Request JSON mẫu:"); r.font.italic = True; r.font.size = Pt(8.5)
            p_code = doc.add_paragraph()
            r_c = p_code.add_run(req_sample)
            r_c.font.name = "Courier New"; r_c.font.size = Pt(8); r_c.font.color.rgb = CODE_COLOR

        p_res = doc.add_paragraph(); r = p_res.add_run(f"Response thành công – {res_success_code}:"); r.font.bold = True; r.font.size = Pt(9)
        p_res_code = doc.add_paragraph()
        r_rc = p_res_code.add_run(res_sample)
        r_rc.font.name = "Courier New"; r_rc.font.size = Pt(8); r_rc.font.color.rgb = RGBColor(0, 100, 0)

        if err_rows:
            p_err = doc.add_paragraph(); r = p_err.add_run("Response lỗi đặc thù:"); r.font.bold = True; r.font.size = Pt(9)
            t_err_sub = doc.add_table(rows=len(err_rows)+1, cols=3)
            t_err_sub.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(t_err_sub)
            err_sub_headers = ["Mã HTTP", "Trường hợp xảy ra", "Body mẫu"]
            for ci, th in enumerate(err_sub_headers):
                cell = t_err_sub.rows[0].cells[ci]
                set_cell_background(cell, "2E75B6")
                set_cell_margins(cell)
                p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(8.5)
            for ri, (m_code, c_case, b_sample) in enumerate(err_rows, start=1):
                row = t_err_sub.rows[ri]
                set_cell_background(row.cells[0], "FFFFFF" if ri % 2 != 0 else "F9F9F9")
                set_cell_background(row.cells[1], "FFFFFF" if ri % 2 != 0 else "F9F9F9")
                set_cell_background(row.cells[2], "FFFFFF" if ri % 2 != 0 else "F9F9F9")
                set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
                row.cells[0].width = Inches(1.1); row.cells[1].width = Inches(2.4); row.cells[2].width = Inches(3.0)
                p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(m_code); r0.font.bold = True; r0.font.size = Pt(8.5)
                p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(c_case); r1.font.size = Pt(8.5)
                p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(b_sample); r2.font.name = "Courier New"; r2.font.size = Pt(7.5); r2.font.color.rgb = CODE_COLOR

        doc.add_paragraph()

    # Detail 4.1: POST /api/lecturers/[id]/reviews
    add_endpoint_detail(
        1, "POST", "/api/lecturers/[id]/reviews", "Gửi bài đánh giá giảng viên mới",
        "FR-06 (Đánh giá), FLOW-01", "Thành viên (Khách → 401 Unauthorized)",
        "Authorization: Bearer <token>\nContent-Type: application/json",
        [("id", "path", "string", "Có", "ID giảng viên tồn tại", "Mã định danh duy nhất của giảng viên")],
        [
            ("pedagogy", "integer", "Có", "1 – 5", "Điểm năng lực sư phạm và truyền đạt"),
            ("difficulty", "integer", "Có", "1 – 5", "Độ khó bài thi và yêu cầu môn học"),
            ("workEffort", "integer", "Có", "1 – 5", "Khối lượng bài tập và nỗ lực sinh viên"),
            ("gradingFairness", "integer", "Có", "1 – 5", "Tính minh bạch, công bằng khi chấm điểm"),
            ("rating", "integer", "Có", "1 – 5", "Điểm tổng thể dành cho giảng viên"),
            ("comment", "string", "Có", "10 – 2000 ký tự", "Nhận xét văn bản chi tiết về giảng viên"),
            ("courseCode", "string", "Không", "Tối đa 20 ký tự", "Mã học phần đã theo học (ví dụ: INT3306)")
        ],
        '{\n  "pedagogy": 5,\n  "difficulty": 3,\n  "workEffort": 4,\n  "gradingFairness": 5,\n  "rating": 5,\n  "comment": "Thầy giảng dạy rất tâm huyết, giải thích cặn kẽ và hỗ trợ sinh viên nhiệt tình.",\n  "courseCode": "INT3306"\n}',
        "201 Created",
        '{\n  "data": {\n    "reviewId": "rev_20261026_001",\n    "lecturerId": "lec_vju_001",\n    "rating": 5,\n    "status": "APPROVED",\n    "createdAt": "2026-10-26T14:30:00+07:00"\n  }\n}',
        [
            ("400 Bad Request", "Điểm ngoài khoảng 1-5 hoặc nhận xét < 10 ký tự", '{"error": "VALIDATION_ERROR", "fields": {"pedagogy": "Điểm từ 1 đến 5"}}'),
            ("401 Unauthorized", "Không gửi token xác thực", '{"error": "UNAUTHORIZED", "message": "Vui lòng đăng nhập"}'),
            ("404 Not Found", "ID giảng viên không tồn tại", '{"error": "NOT_FOUND", "message": "Giảng viên không tồn tại"}'),
            ("409 Conflict", "Sinh viên đã đánh giá giảng viên này gần đây", '{"error": "CONFLICT", "message": "Bạn đã đánh giá giảng viên này rồi"}')
        ]
    )

    # Detail 4.2: GET /api/search
    add_endpoint_detail(
        2, "GET", "/api/search", "Tìm kiếm giảng viên và trường đại học",
        "FR-01, FR-02 (Tìm kiếm & Bộ lọc)", "Tất cả (Khách, Thành viên, Admin)",
        "Content-Type: application/json",
        [
            ("q", "query", "string", "Không", ">= 2 ký tự nếu có", "Từ khóa tìm kiếm (họ tên, trường)"),
            ("university", "query", "string", "Không", "Mã trường hợp lệ", "Bộ lọc mã trường đại học"),
            ("page", "query", "integer", "Không", ">= 1, mặc định 1", "Số trang kết quả"),
            ("limit", "query", "integer", "Không", "1 – 50, mặc định 10", "Số lượng bản ghi mỗi trang")
        ],
        None, None,
        "200 OK",
        '{\n  "data": [\n    {\n      "id": "lec_vju_001",\n      "name": "Nguyễn Văn A",\n      "title": "PGS.TS",\n      "university": "Trường Đại học Việt Nhật",\n      "overallRating": 4.8,\n      "totalReviews": 24\n    }\n  ],\n  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }\n}',
        [
            ("400 Bad Request", "Từ khóa có độ dài = 1 ký tự", '{"error": "VALIDATION_ERROR", "message": "Từ khóa tìm kiếm tối thiểu 2 ký tự"}')
        ]
    )

    # Detail 4.3: GET /api/lecturers/[id]
    add_endpoint_detail(
        3, "GET", "/api/lecturers/[id]", "Lấy hồ sơ chi tiết của giảng viên",
        "FR-03 (Hồ sơ giảng viên)", "Tất cả",
        "Content-Type: application/json",
        [("id", "path", "string", "Có", "ID giảng viên hợp lệ", "Mã định danh duy nhất của giảng viên")],
        None, None,
        "200 OK",
        '{\n  "data": {\n    "id": "lec_vju_001",\n    "name": "Nguyễn Văn A",\n    "academicTitle": "PGS",\n    "degree": "TS",\n    "university": "Trường Đại học Việt Nhật",\n    "email": "nva@vju.ac.vn",\n    "avatarUrl": "/avatars/lec_vju_001.svg",\n    "stats": {\n      "avgRating": 4.8,\n      "avgPedagogy": 4.9,\n      "avgDifficulty": 3.2,\n      "totalReviews": 24\n    }\n  }\n}',
        [
            ("404 Not Found", "ID giảng viên không có trong hệ thống", '{"error": "NOT_FOUND", "message": "Giảng viên không tồn tại"}')
        ]
    )

    # Detail 4.4: POST /api/reviews/[id]/upvote
    add_endpoint_detail(
        4, "POST", "/api/reviews/[id]/upvote", "Bình chọn tính hữu ích của bài đánh giá",
        "FR-08 (Hữu ích / Upvote)", "Khách vãng lai và Thành viên",
        "Content-Type: application/json",
        [("id", "path", "string", "Có", "ID bài đánh giá tồn tại", "Mã bài đánh giá cần upvote")],
        None, None,
        "200 OK",
        '{\n  "data": {\n    "reviewId": "rev_20261026_001",\n    "upvoteCount": 13,\n    "voted": true\n  }\n}',
        [
            ("404 Not Found", "Bài đánh giá không tồn tại", '{"error": "NOT_FOUND", "message": "Bài đánh giá không tồn tại"}'),
            ("409 Conflict", "Đã upvote bài viết này trong phiên hiện tại", '{"error": "CONFLICT", "message": "Bạn đã bình chọn bài viết này"}')
        ]
    )

    # Detail 4.5: POST /api/correction-requests
    add_endpoint_detail(
        5, "POST", "/api/correction-requests", "Gửi yêu cầu đính chính học hàm / gỡ bỏ thông tin theo NĐ 13",
        "FR-07 (Đính chính / Nghị định 13), FLOW-02", "Tất cả (Giảng viên, Người dùng)",
        "Content-Type: application/json",
        None,
        [
            ("lecturerId", "string", "Có", "ID giảng viên hợp lệ", "Mã giảng viên cần đính chính"),
            ("requestType", "string", "Có", "UPDATE_INFO hoặc REMOVE_PROFILE", "Loại yêu cầu đính chính hoặc gỡ bỏ"),
            ("contactEmail", "string", "Có", "Email đuôi .edu.vn hoặc .ac.vn", "Email công vụ xác minh danh tính"),
            ("proofUrl", "string", "Có", "URL HTTPS hợp lệ", "Đường dẫn minh chứng quyết định / trang web trường"),
            ("reason", "string", "Có", "20 – 1000 ký tự", "Lý do và nội dung đính chính chi tiết")
        ],
        '{\n  "lecturerId": "lec_vju_001",\n  "requestType": "UPDATE_INFO",\n  "contactEmail": "dunglc@vju.ac.vn",\n  "proofUrl": "https://vju.vnu.edu.vn/faculty/dunglc",\n  "reason": "Yêu cầu đính chính học vị từ ThS lên TS theo Quyết định số 123/QĐ-ĐHVN"\n}',
        "201 Created",
        '{\n  "data": {\n    "requestId": "REQ-20261026-001",\n    "status": "PENDING",\n    "submittedAt": "2026-10-26T15:00:00+07:00"\n  }\n}',
        [
            ("400 Bad Request", "Email không thuộc miền giáo dục .edu.vn hoặc .ac.vn", '{"error": "VALIDATION_ERROR", "message": "Email xác minh phải là email trường (.edu.vn / .ac.vn)"}')
        ]
    )

    # Detail 4.6: GET /api/admin/moderation & PUT correction
    add_endpoint_detail(
        6, "GET", "/api/admin/moderation", "Lấy danh sách đánh giá chờ kiểm duyệt",
        "FR-12 (Bảng điều khiển Admin)", "Quản trị viên (Khách/Thành viên → 403 Forbidden)",
        "Authorization: Bearer <admin_token>\nContent-Type: application/json",
        [("status", "query", "string", "Không", "PENDING, REPORTED, ALL", "Lọc theo trạng thái kiểm duyệt")],
        None, None,
        "200 OK",
        '{\n  "data": [\n    {\n      "id": "rev_bad_001",\n      "lecturerName": "Nguyễn Văn A",\n      "reportReason": "Ngôn từ thô tục xúc phạm",\n      "reportedAt": "2026-10-25T10:00:00+07:00"\n    }\n  ]\n}',
        [
            ("401 Unauthorized", "Chưa đăng nhập", '{"error": "UNAUTHORIZED"}'),
            ("403 Forbidden", "Tài khoản không có vai trò ADMIN", '{"error": "FORBIDDEN", "message": "Chỉ Quản trị viên mới có quyền"}')
        ]
    )

    # Detail 4.7: POST /api/auth/login
    add_endpoint_detail(
        7, "POST", "/api/auth/login", "Đăng nhập và cấp token phiên",
        "FR-08 (Xác thực người dùng)", "Tất cả",
        "Content-Type: application/json",
        None,
        [
            ("email", "string", "Có", "Email hợp lệ", "Địa chỉ email đăng nhập"),
            ("password", "string", "Có", ">= 8 ký tự", "Mật khẩu tài khoản")
        ],
        '{\n  "email": "student@rateurprofs.site",\n  "password": "Password123@"\n}',
        "200 OK",
        '{\n  "data": {\n    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n    "user": {\n      "id": "usr_std_01",\n      "email": "student@rateurprofs.site",\n      "role": "MEMBER"\n    }\n  }\n}',
        [
            ("401 Unauthorized", "Sai email hoặc mật khẩu", '{"error": "INVALID_CREDENTIALS", "message": "Email hoặc mật khẩu không chính xác"}')
        ]
    )

    # Section 5: Tài khoản dùng để gọi API
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("5. Tài khoản dùng để gọi API")
    r5.font.name = "Times New Roman"
    r5.font.color.rgb = NAVY

    p_acc_guide = doc.add_paragraph()
    r_ag = p_acc_guide.add_run("Bảng tài khoản thử nghiệm được cấp sẵn phục vụ công tác kiểm thử tự động trên Postman/Newman và kiểm thử bảo mật phân quyền RBAC:")
    r_ag.font.name = "Times New Roman"; r_ag.font.size = Pt(9.5)

    t_acc = doc.add_table(rows=4, cols=4)
    t_acc.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_acc)

    acc_headers = ["Vai trò", "Email / Tên đăng nhập", "Mật khẩu", "Quyền hạn & Phạm vi kiểm thử"]
    for ci, th in enumerate(acc_headers):
        cell = t_acc.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79")
        set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    accounts_data = [
        ("Khách vãng lai (Guest)", "Không cần tài khoản", "Không có", "Tìm kiếm, xem hồ sơ, xem danh sách đánh giá, upvote ẩn danh, gửi đính chính"),
        ("Thành viên (Member)", "student@rateurprofs.site", "StudentPass2026@", "Đăng đánh giá giảng viên, lưu bookmark cá nhân, quản lý bài đánh giá của tôi"),
        ("Quản trị viên (Admin)", "admin@rateurprofs.site", "AdminSecure2026!#", "Toàn quyền truy cập /admin, kiểm duyệt bài viết, phê duyệt/từ chối đính chính NĐ 13")
    ]

    for ri, (role, mail, pw, scope) in enumerate(accounts_data, start=1):
        row = t_acc.rows[ri]
        set_cell_background(row.cells[0], "F9F9F9" if ri % 2 == 0 else "FFFFFF")
        set_cell_background(row.cells[1], "F9F9F9" if ri % 2 == 0 else "FFFFFF")
        set_cell_background(row.cells[2], "F9F9F9" if ri % 2 == 0 else "FFFFFF")
        set_cell_background(row.cells[3], "F9F9F9" if ri % 2 == 0 else "FFFFFF")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.5); row.cells[1].width = Inches(1.8); row.cells[2].width = Inches(1.4); row.cells[3].width = Inches(2.2)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(role); r0.font.bold = True; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(mail); r1.font.name = "Courier New"; r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(pw); r2.font.name = "Courier New"; r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(scope); r3.font.size = Pt(8.5)

    out_docx = "docs/Mau_01_Tai_lieu_API.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    # Convert to PDF using LibreOffice
    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/Mau_01_Tai_lieu_API.pdf successfully!")

if __name__ == "__main__":
    build_mau01_doc()
