#!/usr/bin/env python3
"""
Generate Mau_04_Test_Plan.docx strictly adhering to Google Drive template:
8 Sections:
1. Giới thiệu (1.1 Mục đích, 1.2 Tài liệu tham chiếu)
2. Phạm vi kiểm thử (2.1 Trong phạm vi, 2.2 Ngoài phạm vi)
3. Chiến lược kiểm thử (3.1 Các loại kiểm thử, 3.2 Phân loại lỗi và mức nghiêm trọng)
4. Môi trường kiểm thử (Server, Trình duyệt, Thiết bị, Công cụ, Tài khoản, Khung giờ)
5. Tiêu chí (Bắt đầu, Kết thúc, Tạm dừng, Tiếp tục)
6. Rủi ro và phương án giảm thiểu
7. Lịch trình kiểm thử
8. Sản phẩm bàn giao
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

def build_mau04_doc():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "Mẫu 04 – Kế hoạch kiểm thử (Test Plan) | RateProfCuaBan"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"; hp.style.font.size = Pt(8.5); hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU) | Tester: Lương Chí Dũng (24110215)"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"; fp.style.font.size = Pt(8.5); fp.style.font.color.rgb = RGBColor(128, 128, 128)

    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("KẾ HOẠCH KIỂM THỬ (TEST PLAN)")
    run_title.font.name = "Times New Roman"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_meta.add_run("Hệ thống được kiểm thử: RateProfCuaBan (RateUrProf) · Phiên bản tài liệu: 1.0")
    r_sub.font.name = "Times New Roman"; r_sub.font.size = Pt(11); r_sub.font.bold = True; r_sub.font.color.rgb = DARK_GRAY

    t_info = doc.add_table(rows=4, cols=2)
    t_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_info)
    info_pairs = [
        ("Tester (Người lập)", "Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024"),
        ("Chủ hệ thống", "Lương Chí Dũng – MSSV: 24110215"),
        ("Link sản phẩm trực tuyến", "https://rateurprofs.site (Cloud Run: rateurprofs-web)"),
        ("Ngày lập kế hoạch", "05/10/2026")
    ]
    for idx, (lbl, val) in enumerate(info_pairs):
        row = t_info.rows[idx]
        set_cell_background(row.cells[0], "DDEBF7")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.name = "Times New Roman"; r0.font.size = Pt(9.5); r0.font.bold = True
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.name = "Times New Roman"; r1.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 1: Giới thiệu
    h1 = doc.add_heading(level=1); r1 = h1.add_run("1. Giới thiệu"); r1.font.name = "Times New Roman"; r1.font.color.rgb = NAVY
    h11 = doc.add_heading(level=2); r11 = h11.add_run("1.1. Mục đích"); r11.font.name = "Times New Roman"; r11.font.color.rgb = NAVY
    p11 = doc.add_paragraph()
    p11.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p11.add_run(
        "Tài liệu Kế hoạch kiểm thử này xác định toàn bộ phạm vi, chiến lược, môi trường, tiêu chí và lịch trình "
        "thực thi kiểm thử cho hệ thống đánh giá giảng viên đại học RateProfCuaBan (RateUrProf). "
        "Mục đích cốt lõi là kiểm chứng các chức năng nghiệp vụ (FR-01 đến FR-12), các luồng nghiệp vụ E2E (FLOW-01 đến FLOW-03), "
        "và các chỉ tiêu chất lượng phi chức năng (NFR-01 đến NFR-10) nhằm phát hiện kịp thời các lỗi sai lệch so với "
        "Đặc tả yêu cầu phần mềm SRS v1.2, đánh giá mức độ ổn định, hiệu năng chịu tải dưới công cụ JMeter và mức độ an toàn bảo mật "
        "trước khi tiến hành nghiệm thu sản phẩm tại Tuần 14."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(10)

    h12 = doc.add_heading(level=2); r12 = h12.add_run("1.2. Tài liệu tham chiếu"); r12.font.name = "Times New Roman"; r12.font.color.rgb = NAVY
    t_ref = doc.add_table(rows=5, cols=3)
    t_ref.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_ref)
    ref_headers = ["Tài liệu", "Phiên bản", "Ghi chú"]
    for ci, th in enumerate(ref_headers):
        cell = t_ref.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)
    refs = [
        ("Yêu cầu người dùng (URD)", "1.0", "Đặc tả mục tiêu bài toán, vai trò người dùng và các luồng nghiệp vụ"),
        ("Đặc tả yêu cầu phần mềm (SRS)", "1.2", "Bản chốt sau Review tuần 5; căn cứ pháp lý và kỹ thuật kiểm thử"),
        ("Tài liệu đặc tả API (Mẫu 01)", "1.2", "Đặc tả chi tiết 14 endpoints và các mã lỗi làm căn cứ viết Postman"),
        ("Phiếu Review SRS (Mẫu 03 - Sheet Review_SRS)", "1.0", "Ghi nhận 10 vấn đề và các phản hồi khắc phục của chủ hệ thống")
    ]
    for ri, (d, v, n) in enumerate(refs, start=1):
        row = t_ref.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(2.5); row.cells[1].width = Inches(1.0); row.cells[2].width = Inches(3.0)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(d); r0.font.name = "Times New Roman"; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(v); r1.font.name = "Times New Roman"; r1.font.size = Pt(9); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(n); r2.font.name = "Times New Roman"; r2.font.size = Pt(9)

    doc.add_paragraph()

    # Section 2: Phạm vi kiểm thử
    h2 = doc.add_heading(level=1); r2 = h2.add_run("2. Phạm vi kiểm thử"); r2.font.name = "Times New Roman"; r2.font.color.rgb = NAVY
    h21 = doc.add_heading(level=2); r21 = h21.add_run("2.1. Trong phạm vi"); r21.font.name = "Times New Roman"; r21.font.color.rgb = NAVY

    t_scope = doc.add_table(rows=16, cols=3)
    t_scope.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_scope)
    sc_headers = ["Mã hạng mục", "Chức năng / Luồng / Yêu cầu chất lượng", "Loại kiểm thử áp dụng"]
    for ci, th in enumerate(sc_headers):
        cell = t_scope.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    scopes = [
        ("FR-01", "Tìm kiếm giảng viên thông minh (có dấu, không dấu)", "Thủ công (EP, BVA), Postman, Puppeteer"),
        ("FR-02", "Bộ lọc trường đại học và cơ sở đào tạo", "Thủ công (EP, BVA), Postman"),
        ("FR-03", "Xem hồ sơ giảng viên, học hàm, điểm rollup", "Thủ công, Visual checklist, Postman"),
        ("FR-04", "Lưu giảng viên yêu thích (Bookmark) và F5", "Thủ công (Chuyển trạng thái, LocalStorage)"),
        ("FR-05", "Xem danh sách nhận xét & Upvote hữu ích", "Thủ công (BVA, Chuyển trạng thái), Postman"),
        ("FR-06", "Đăng bài đánh giá 5 tiêu chí và nhận xét", "Thủ công (BVA biên 1-5, EP), Postman data-driven, Puppeteer"),
        ("FR-07", "Tiếp nhận yêu cầu đính chính theo Nghị định 13", "Thủ công (EP, Bảng quyết định), Postman"),
        ("FR-08", "Xác thực người dùng (Google OAuth, Cookie)", "Thủ công (Chuyển trạng thái), Security audit"),
        ("FR-09", "Quản lý bài đánh giá của tôi (/my-reviews)", "Thủ công, Phân quyền RBAC, Postman"),
        ("FR-10", "Xem thông tin trường đại học và danh bạ", "Thủ công (EP), Postman"),
        ("FR-11", "Chuyển đổi giao diện song ngữ Vi / En", "Thủ công (State URL), UI visual checklist"),
        ("FR-12", "Bảng điều khiển Quản trị viên (/admin)", "Thủ công, Phân quyền RBAC, Postman"),
        ("FLOW-01", "Luồng Tìm kiếm -> Xem hồ sơ -> Viết review", "E2E thủ công, Puppeteer tự động, JMeter"),
        ("FLOW-02", "Luồng Gửi đính chính -> Admin phê duyệt", "E2E thủ công, Postman end-to-end"),
        ("NFR-01..10", "10 Yêu cầu phi chức năng (Hiệu năng, Bảo mật, Responsive)", "JMeter non-GUI, Lighthouse, DevTools Mobile, OWASP")
    ]
    for ri, (m, c, l) in enumerate(scopes, start=1):
        row = t_scope.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(3.0); row.cells[2].width = Inches(2.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(m); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(c); r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(l); r2.font.size = Pt(8.5)

    h22 = doc.add_heading(level=2); r22 = h22.add_run("2.2. Ngoài phạm vi"); r22.font.name = "Times New Roman"; r22.font.color.rgb = NAVY
    t_out = doc.add_table(rows=3, cols=2)
    t_out.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_out)
    for ci, th in enumerate(["Hạng mục loại trừ", "Lý do không kiểm thử"]):
        cell = t_out.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)
    outs = [
        ("Cổng thanh toán ngân hàng trực tiếp", "Hệ thống RateProfCuaBan hoạt động phi lợi nhuận phục vụ sinh viên, không thu phí"),
        ("Tải mạng trường có cơ chế bảo vệ Cloudflare CAPTCHA sinh trắc học", "Tránh vi phạm chính sách tường lửa của các trường đối tác trong quá trình cào mẫu")
    ]
    for ri, (h, l) in enumerate(outs, start=1):
        row = t_out.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.5); row.cells[1].width = Inches(4.0)
        p0 = row.cells[0].paragraphs[0]; p0.add_run(h).font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(l).font.size = Pt(9)

    doc.add_paragraph()

    # Section 3: Chiến lược kiểm thử
    h3 = doc.add_heading(level=1); r3 = h3.add_run("3. Chiến lược kiểm thử"); r3.font.name = "Times New Roman"; r3.font.color.rgb = NAVY
    h31 = doc.add_heading(level=2); r31 = h31.add_run("3.1. Các loại kiểm thử áp dụng"); r31.font.name = "Times New Roman"; r31.font.color.rgb = NAVY

    t_strat = doc.add_table(rows=9, cols=3)
    t_strat.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_strat)
    for ci, th in enumerate(["Loại kiểm thử", "Kỹ thuật / Công cụ sử dụng", "Đối tượng kiểm thử"]):
        cell = t_strat.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    strats = [
        ("Chức năng thủ công", "Phân hoạch tương đương (EP), Giá trị biên (BVA), Bảng quyết định, Chuyển trạng thái", "Toàn bộ FR-01 đến FR-12"),
        ("Luồng nghiệp vụ E2E", "Use case testing (Luồng chính, Luồng phụ, Ngoại lệ)", "FLOW-01, FLOW-02, FLOW-03"),
        ("Phân quyền người dùng (RBAC)", "Kiểm thử ma trận phân quyền trên UI và gọi trực tiếp API", "Toàn bộ ô 'Không được phép' trong Ma trận RBAC"),
        ("Giao diện và nội dung", "Checklist kiểm thử đa trình duyệt; kiểm tra Responsive 375 / 768 / 1366 / 1920 px", "Màn hình Trang chủ, Tìm kiếm, Chi tiết, Đánh giá"),
        ("Kiểm thử tự động API", "Postman Collection Runner + Newman CLI, data-driven test", "14 endpoints API (/api/search, /api/reviews...)"),
        ("Kiểm thử tự động UI", "Puppeteer script Headless Chrome tự động hóa thao tác người dùng", "FLOW-01 (Tìm kiếm -> Viết đánh giá)"),
        ("Kiểm thử hiệu năng tải", "Apache JMeter 5.6.3 (chế độ non-GUI command line): Tải tĩnh 20 thread và Step-load", "API tìm kiếm và Trang chủ (NFR-01, NFR-03)"),
        ("Phi chức năng khác", "Kiểm toán bảo mật cookie OWASP ZAP, Google Lighthouse Web Vitals, WCAG 2.1 AA", "NFR-02, NFR-04, NFR-05..10")
    ]
    for ri, (l, k, o) in enumerate(strats, start=1):
        row = t_strat.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(3.0); row.cells[2].width = Inches(1.7)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(l); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(k); r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(o); r2.font.size = Pt(8.5)

    h32 = doc.add_heading(level=2); r32 = h32.add_run("3.2. Phân loại lỗi và mức độ nghiêm trọng"); r32.font.name = "Times New Roman"; r32.font.color.rgb = NAVY
    p_bug_def = doc.add_paragraph()
    r = p_bug_def.add_run(
        "Mọi khiếm khuyết phát hiện được phân loại thành đúng 5 nhóm theo quy định rubric: "
        "1. Functional (luồng chạy sai, tính toán sai, vi phạm logic); "
        "2. Visual (vỡ khung, tràn viền màn hình, méo ảnh); "
        "3. Content (sai chính tả, dịch sót, mất query param, sai dữ liệu trường); "
        "4. Performance (chậm, vượt ngưỡng P90, LCP quá lâu); "
        "5. Crash (lỗi 500 unhandled, trắng trang, treo vô hạn đơ trình duyệt). "
        "Các mức độ nghiêm trọng được xếp theo 4 thang: Critical (chặn luồng, sập hệ thống, rò rỉ bảo mật); Major (sai chức năng chính); Minor (sai chức năng phụ, giao diện); Trivial (lỗi thẩm mỹ nhỏ)."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 4: Môi trường kiểm thử
    h4 = doc.add_heading(level=1); r4 = h4.add_run("4. Môi trường kiểm thử"); r4.font.name = "Times New Roman"; r4.font.color.rgb = NAVY
    t_env = doc.add_table(rows=9, cols=2)
    t_env.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_env)
    for ci, th in enumerate(["Hạng mục môi trường", "Chi tiết cấu hình"]):
        cell = t_env.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    envs = [
        ("Link sản phẩm kiểm thử", "https://rateurprofs.site (và dự phòng Cloud Run: https://rateurprofs-web-331362663006.asia-southeast1.run.app)"),
        ("Cấu hình máy chủ (Server)", "Google Cloud Run (Serverless container, 1 vCPU, 512MB RAM, Auto-scaling 0..10 instances, Debian Linux Node 20)"),
        ("Trình duyệt kiểm thử", "Google Chrome 129+, Mozilla Firefox 130+, Microsoft Edge 129+, Apple Safari iOS 18"),
        ("Thiết bị & Độ phân giải", "Desktop (1920x1080), Laptop tiêu chuẩn (1366x768), Tablet iPad (768x1024), Mobile iPhone SE/12 (375x812)"),
        ("Công cụ và phiên bản", "Postman v11.15, Newman v6.1, Puppeteer v22.12, Apache JMeter v5.6.3, OpenJDK 21, Python 3.12"),
        ("Tài khoản thử nghiệm", "Khách (Guest), Thành viên: student@rateurprofs.site, Quản trị viên: admin@rateurprofs.site (chi tiết tại Mục 5 Tài liệu API)"),
        ("Dữ liệu thử nghiệm", "Bộ dữ liệu 10.000+ giảng viên đại học toàn quốc (VJU, VNU, HUST, NEU...) đã được chuẩn hóa"),
        ("Khung giờ chạy tải JMeter", "Khung giờ thấp điểm đã đăng ký: 21:00 – 23:30 các ngày thứ Ba, thứ Năm và thứ Bảy hàng tuần")
    ]
    for ri, (h, c) in enumerate(envs, start=1):
        row = t_env.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(h); r0.font.bold = True; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(c); r1.font.size = Pt(9)

    doc.add_paragraph()

    # Section 5: Tiêu chí
    h5 = doc.add_heading(level=1); r5 = h5.add_run("5. Tiêu chí kiểm thử"); r5.font.name = "Times New Roman"; r5.font.color.rgb = NAVY
    t_crit = doc.add_table(rows=5, cols=2)
    t_crit.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_crit)
    for ci, th in enumerate(["Tiêu chí", "Nội dung điều kiện quy định"]):
        cell = t_crit.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    crits = [
        ("Tiêu chí Bắt đầu (Entry Criteria)", "SRS v1.2 đã được rà soát và chốt; đã hoàn thành biên bản bàn giao số 1; link production https://rateurprofs.site hoạt động ổn định; tài khoản test đăng nhập thành công."),
        ("Tiêu chí Kết thúc (Exit Criteria)", "100% test case đã được thực thi; tỷ lệ lỗi Critical chưa phản hồi = 0; các bài test tự động Postman/Puppeteer và bài test tải JMeter hoàn tất; Báo cáo Test Summary Report được ký duyệt."),
        ("Tiêu chí Tạm dừng (Suspension)", "Link sản phẩm không truy cập được liên tục > 2 giờ; phát sinh lỗi Crash/Blocker nghiêm trọng làm tê liệt hoàn toàn chức năng đánh giá hoặc tìm kiếm."),
        ("Tiêu chí Tiếp tục (Resumption)", "Chủ hệ thống xác nhận khắc phục xong sự cố máy chủ Cloud Run; dữ liệu khôi phục về trạng thái ban đầu; đường truyền ổn định.")
    ]
    for ri, (t, n) in enumerate(crits, start=1):
        row = t_crit.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(t); r0.font.bold = True; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(n); r1.font.size = Pt(9)

    doc.add_paragraph()

    # Section 6: Rủi ro và giảm thiểu
    h6 = doc.add_heading(level=1); r6 = h6.add_run("6. Rủi ro và phương án giảm thiểu"); r6.font.name = "Times New Roman"; r6.font.color.rgb = NAVY
    t_risk = doc.add_table(rows=5, cols=3)
    t_risk.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_risk)
    for ci, th in enumerate(["Rủi ro tiềm ẩn", "Mức ảnh hưởng", "Phương án giảm thiểu đã chuẩn bị"]):
        cell = t_risk.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    risks = [
        ("Link sản phẩm Cloud Run bị cold start hoặc lỗi mạng", "Cao", "Thiết lập min-instances=1 trên Cloud Run để tránh độ trễ khởi động; có link dự phòng trực tiếp IP/Cloudflare"),
        ("Chậm tiến độ kiểm thử do nhiều bài test tự động", "Trung bình", "Ưu tiên hoàn thành các test case High Priority và các luồng E2E trước; ghi rõ tiến độ vào Test Log hàng tuần"),
        ("Dữ liệu thử bị thay đổi / xung đột do nhiều bên thao tác", "Trung bình", "Sử dụng tài khoản kiểm thử độc lập; xuất bản sao lưu CSDL trước mỗi phiên chạy tải lớn"),
        ("Kiểm thử JMeter làm nghẽn tài nguyên CPU máy chủ", "Cao", "Chạy đúng khung giờ thấp điểm đã đăng ký (21:00-23:30); tăng tải dần từng bước (step-load) và giám sát Cloud Console")
    ]
    for ri, (r_txt, a_txt, m_txt) in enumerate(risks, start=1):
        row = t_risk.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(1.1); row.cells[2].width = Inches(3.2)
        p0 = row.cells[0].paragraphs[0]; p0.add_run(r_txt).font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(a_txt).font.size = Pt(8.5); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; p2.add_run(m_txt).font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 7: Lịch trình
    h7 = doc.add_heading(level=1); r7 = h7.add_run("7. Lịch trình kiểm thử"); r7.font.name = "Times New Roman"; r7.font.color.rgb = NAVY
    t_sch = doc.add_table(rows=6, cols=3)
    t_sch.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_sch)
    for ci, th in enumerate(["Giai đoạn / Tuần", "Công việc thực hiện", "Kết quả bàn giao kỳ vọng"]):
        cell = t_sch.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    schedules = [
        ("Tuần 5 (28/09 – 04/10)", "Nghiên cứu SRS, lập Phiếu Review SRS (Mẫu 03), gửi góp ý cho chủ hệ thống", "Phiếu Review SRS hoàn chỉnh, chốt SRS v1.2"),
        ("Tuần 6 (05/10 – 11/10)", "Ký Biên bản bàn giao số 1; xây dựng Kế hoạch kiểm thử (Test Plan); thiết kế bộ Test Case", "Test Plan v1.0, Bộ 68 Test Case chức năng & 10 NFR"),
        ("Tuần 7 – 9 (12/10 – 01/11)", "Thực thi kiểm thử chức năng thủ công, kiểm thử phân quyền; xây dựng script Postman & Puppeteer", "Nhật ký Test Log phiên 1-5, danh sách Bug Report ban đầu"),
        ("Tuần 10 – 12 (02/11 – 22/11)", "Thực thi kiểm thử hiệu năng tải với JMeter (2 kịch bản); chạy tự động hóa Newman", "File kịch bản .jmx, HTML Dashboard JMeter, Newman report"),
        ("Tuần 13 – 14 (23/11 – 06/12)", "Kiểm thử hồi quy; tổng hợp số liệu; viết Test Summary Report; ký Biên bản bàn giao số 2", "Test Summary Report hoàn chỉnh, Biên bản bàn giao số 2")
    ]
    for ri, (w, task, out) in enumerate(schedules, start=1):
        row = t_sch.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(2.7); row.cells[2].width = Inches(2.0)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(w); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(task); r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(out); r2.font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 8: Sản phẩm bàn giao
    h8 = doc.add_heading(level=1); r8 = h8.add_run("8. Sản phẩm bàn giao đợt kiểm thử"); r8.font.name = "Times New Roman"; r8.font.color.rgb = NAVY
    t_deliv = doc.add_table(rows=7, cols=3)
    t_deliv.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_deliv)
    for ci, th in enumerate(["STT", "Tên sản phẩm bàn giao", "Định dạng và nơi lưu trữ"]):
        cell = t_deliv.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    delivs = [
        (1, "Kế hoạch kiểm thử (Test Plan)", "Mau_04_Test_Plan.docx và .pdf trong thư mục /docs"),
        (2, "Bộ biểu mẫu kiểm thử hoàn chỉnh (7 sheets)", "Mau_03_Bo_bieu_mau_Kiem_thu.xlsx (Review, TC, Log, Bug, Tong hop)"),
        (3, "Bộ kịch bản kiểm thử API tự động", "collection.json, environment.json và newman-report.html"),
        (4, "Bộ script kiểm thử giao diện E2E tự động", "puppeteer-flow01.js kèm ảnh chụp màn hình minh chứng"),
        (5, "Bộ kịch bản và báo cáo hiệu năng JMeter", "jmeter_search_plan.jmx, kết quả jmeter.jtl và thư mục HTML Dashboard"),
        (6, "Báo cáo tổng kết kiểm thử (Test Summary Report)", "Mau_05_Test_Summary_Report.docx và .pdf")
    ]
    for ri, (stt, item, fmt) in enumerate(delivs, start=1):
        row = t_deliv.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(0.6); row.cells[1].width = Inches(3.2); row.cells[2].width = Inches(2.7)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(str(stt)); r0.font.size = Pt(9); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(item); r1.font.bold = True; r1.font.size = Pt(9)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(fmt); r2.font.size = Pt(9)

    out_docx = "docs/Mau_04_Test_Plan.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/Mau_04_Test_Plan.pdf successfully!")

if __name__ == "__main__":
    build_mau04_doc()
