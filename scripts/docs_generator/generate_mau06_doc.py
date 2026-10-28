#!/usr/bin/env python3
"""
Generate Mau_06_Bien_ban_ban_giao.docx strictly adhering to Google Drive template:
Two Minutes:
1. BIÊN BẢN BÀN GIAO SỐ 1: Bàn giao sản phẩm để kiểm thử (Tuần 6)
   - Thông tin bên giao / bên nhận
   - I. Danh mục bàn giao (URD, SRS, API, Link, Accounts, Sample Data)
   - II. Xác nhận của bên nhận
   - III. Hạn chế đã biết
   - IV. Cam kết giữa hai bên
   - Ký nhận
2. BIÊN BẢN BÀN GIAO SỐ 2: Bàn giao kết quả kiểm thử (Tuần 14)
   - Thông tin bên giao / bên nhận
   - I. Danh mục bàn giao (Review SRS, Test Plan, Test Cases, Postman, Puppeteer, JMeter, Test Summary)
   - II. Tóm tắt kết quả (Số TC, Pass rate, Bug matrix, Kết luận Go/No-go)
   - III. Các lỗi còn bất đồng
   - Ký nhận
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

def build_mau06_doc():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "Mẫu 06 – Biên bản bàn giao | RateProfCuaBan"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"; hp.style.font.size = Pt(8.5); hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU) | Sinh viên: Lương Chí Dũng (24110215)"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"; fp.style.font.size = Pt(8.5); fp.style.font.color.rgb = RGBColor(128, 128, 128)

    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)

    # ==========================================
    # BIÊN BẢN BÀN GIAO SỐ 1
    # ==========================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("TRƯỜNG ĐẠI HỌC VIỆT NHẬT – ĐẠI HỌC QUỐC GIA HÀ NỘI\nHỌC PHẦN: ĐÁNH GIÁ HIỆU NĂNG")
    r_inst.font.name = "Times New Roman"; r_inst.font.size = Pt(11); r_inst.font.bold = True; r_inst.font.color.rgb = DARK_GRAY

    p_title1 = doc.add_paragraph()
    p_title1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t1 = p_title1.add_run("BIÊN BẢN BÀN GIAO SỐ 1\nBàn giao sản phẩm để kiểm thử (Tuần 6)")
    r_t1.font.name = "Times New Roman"; r_t1.font.size = Pt(16); r_t1.font.bold = True; r_t1.font.color.rgb = NAVY

    p_intro = doc.add_paragraph()
    p_intro.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r_in = p_intro.add_run("Hôm nay, ngày 05/10/2026, tại Trường Đại học Việt Nhật, hai bên dưới đây thống nhất thực hiện bàn giao sản phẩm phần mềm để tiến hành công tác kiểm thử:")
    r_in.font.name = "Times New Roman"; r_in.font.size = Pt(10)

    t_parties = doc.add_table(rows=3, cols=2)
    t_parties.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_parties)
    party_data = [
        ("Bên giao (Chủ hệ thống)", "Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024"),
        ("Bên nhận (Tester đối tác)", "Nguyễn Văn A – MSSV: 24110001 – Lớp: BCSE2024"),
        ("Tên hệ thống bàn giao", "RateProfCuaBan (RateUrProf) – Nền tảng đánh giá giảng viên")
    ]
    for idx, (lbl, val) in enumerate(party_data):
        row = t_parties.rows[idx]
        set_cell_background(row.cells[0], "DDEBF7"); set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.bold = True; r0.font.size = Pt(9.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section I: Danh mục bàn giao
    h_sec1 = doc.add_heading(level=2); r = h_sec1.add_run("I. Danh mục bàn giao"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_del1 = doc.add_table(rows=7, cols=4)
    t_del1.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_del1)
    for ci, th in enumerate(["STT", "Hạng mục bàn giao", "Phiên bản / Đường dẫn truy cập", "Ghi chú"]):
        cell = t_del1.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    d1_items = [
        (1, "Tài liệu Yêu cầu người dùng (URD)", "v1.0 (PDF / DOCX)", "Mô tả bài toán, user stories và tiêu chí chấp nhận"),
        (2, "Đặc tả yêu cầu phần mềm (SRS)", "v1.2 (bản chốt sau review)", "Gồm 12 chức năng, 3 luồng E2E, 10 NFR, bảng RBAC"),
        (3, "Tài liệu đặc tả API (Mẫu 01)", "v1.2 (PDF / link Swagger)", "14 endpoint, request/response schema JSON đầy đủ"),
        (4, "Đường dẫn sản phẩm trực tuyến", "https://rateurprofs.site", "Triển khai hoạt động 24/7 trên Google Cloud Run"),
        (5, "Tài khoản thử nghiệm từng vai trò", "Theo Mục 5 Tài liệu API", "Cấp sẵn tài khoản Khách, Thành viên, Quản trị viên"),
        (6, "Bộ dữ liệu mẫu (Sample data)", "10.000+ hồ sơ giảng viên", "Dữ liệu trường ĐHQGHN, ĐHBK, VJU... đã được nạp")
    ]
    for ri, (stt, itm, link, nt) in enumerate(d1_items, start=1):
        row = t_del1.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(0.5); row.cells[1].width = Inches(2.2); row.cells[2].width = Inches(2.2); row.cells[3].width = Inches(1.6)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(str(stt)); r0.font.size = Pt(8.5); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(itm); r1.font.bold = True; r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(link); r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(nt); r3.font.size = Pt(8.5)

    # Section II: Xác nhận của bên nhận
    h_sec2 = doc.add_heading(level=2); r = h_sec2.add_run("II. Xác nhận của bên nhận"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p_chk = doc.add_paragraph()
    r = p_chk.add_run("☒ Truy cập được link sản phẩm https://rateurprofs.site\n☒ Đăng nhập thành công mọi vai trò (Khách, Thành viên, Quản trị viên)\n☒ Nhận đủ toàn bộ tài liệu và tài nguyên nêu ở Mục I")
    r.font.name = "Times New Roman"; r.font.size = Pt(10); r.font.bold = True

    # Section III: Hạn chế đã biết
    h_sec3 = doc.add_heading(level=2); r = h_sec3.add_run("III. Hạn chế đã biết của hệ thống"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p_lim = doc.add_paragraph()
    p_lim.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p_lim.add_run(
        "• Hệ thống hiện chưa hỗ trợ cổng thanh toán trực tuyến do hoạt động phi thương mại.\n"
        "• Phân trang danh sách tìm kiếm đang được giới hạn tối đa 50 kết quả mỗi trang để tối ưu bộ nhớ cache.\n"
        "• Tính năng gửi email thông báo xác thực hiện chạy ở chế độ mô phỏng qua bảng điều khiển /admin/emails.\n"
        "(Lưu ý: Không bao gồm các lỗi cài sẵn bí mật)."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    # Section IV: Cam kết
    h_sec4 = doc.add_heading(level=2); r = h_sec4.add_run("IV. Cam kết trách nhiệm"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p_com = doc.add_paragraph()
    p_com.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p_com.add_run(
        "1. Bên giao cam kết giữ nguyên trạng thái sản phẩm (không tự ý sửa các lỗi đã cài sẵn) và duy trì đường truyền https://rateurprofs.site hoạt động liên tục 24/7 từ tuần 6 đến hết buổi Demo tuần 14.\n"
        "2. Bên giao cam kết phản hồi và cập nhật trạng thái các Bug Report do bên nhận gửi trong vòng tối đa 48 giờ.\n"
        "3. Bên giao tuyệt đối không tiết lộ danh sách lỗi cài sẵn (Bug Manifest - Mẫu 02) cho bên nhận.\n"
        "4. Bên nhận cam kết bảo mật thông tin và thực thi kiểm thử trung thực, khách quan theo đúng Test Plan."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    doc.add_paragraph()
    # Signatures
    t_sig = doc.add_table(rows=2, cols=2)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig.rows[0].cells[0].width = Inches(3.2); t_sig.rows[0].cells[1].width = Inches(3.3)
    t_sig.rows[1].cells[0].width = Inches(3.2); t_sig.rows[1].cells[1].width = Inches(3.3)

    p_s0 = t_sig.rows[0].cells[0].paragraphs[0]; p_s0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_s0.add_run("BÊN GIAO (CHỦ HỆ THỐNG)\n(Ký và ghi rõ họ tên)"); r.font.bold = True; r.font.size = Pt(10)

    p_s1 = t_sig.rows[0].cells[1].paragraphs[0]; p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_s1.add_run("BÊN NHẬN (TESTER)\n(Ký và ghi rõ họ tên)"); r.font.bold = True; r.font.size = Pt(10)

    p_name0 = t_sig.rows[1].cells[0].paragraphs[0]; p_name0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_name0.add_run("\n\n\nLương Chí Dũng\nMSSV: 24110215"); r.font.bold = True; r.font.size = Pt(10)

    p_name1 = t_sig.rows[1].cells[1].paragraphs[0]; p_name1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_name1.add_run("\n\n\nNguyễn Văn A\nMSSV: 24110001"); r.font.bold = True; r.font.size = Pt(10)

    # ==========================================
    # BIÊN BẢN BÀN GIAO SỐ 2 (Page Break)
    # ==========================================
    doc.add_page_break()

    p_inst2 = doc.add_paragraph()
    p_inst2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst2 = p_inst2.add_run("TRƯỜNG ĐẠI HỌC VIỆT NHẬT – ĐẠI HỌC QUỐC GIA HÀ NỘI\nHỌC PHẦN: ĐÁNH GIÁ HIỆU NĂNG")
    r_inst2.font.name = "Times New Roman"; r_inst2.font.size = Pt(11); r_inst2.font.bold = True; r_inst2.font.color.rgb = DARK_GRAY

    p_title2 = doc.add_paragraph()
    p_title2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t2 = p_title2.add_run("BIÊN BẢN BÀN GIAO SỐ 2\nBàn giao kết quả kiểm thử (Tuần 14)")
    r_t2.font.name = "Times New Roman"; r_t2.font.size = Pt(16); r_t2.font.bold = True; r_t2.font.color.rgb = NAVY

    p_intro2 = doc.add_paragraph()
    p_intro2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r_in2 = p_intro2.add_run("Hôm nay, ngày 26/10/2026, tại Trường Đại học Việt Nhật, sau khi kết thúc đợt kiểm thử hệ thống, bên nhận (Tester) chính thức bàn giao toàn bộ kết quả kiểm thử cho bên giao (Chủ hệ thống):")
    r_in2.font.name = "Times New Roman"; r_in2.font.size = Pt(10)

    t_parties2 = doc.add_table(rows=3, cols=2)
    t_parties2.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_parties2)
    party_data2 = [
        ("Bên giao (Tester)", "Nguyễn Văn A – MSSV: 24110001 – Lớp: BCSE2024"),
        ("Bên nhận (Chủ hệ thống)", "Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024"),
        ("Tên hệ thống được kiểm thử", "RateProfCuaBan (RateUrProf) – https://rateurprofs.site")
    ]
    for idx, (lbl, val) in enumerate(party_data2):
        row = t_parties2.rows[idx]
        set_cell_background(row.cells[0], "DDEBF7"); set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.bold = True; r0.font.size = Pt(9.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section I: Danh mục bàn giao kết quả
    h2_sec1 = doc.add_heading(level=2); r = h2_sec1.add_run("I. Danh mục bàn giao kết quả kiểm thử"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_del2 = doc.add_table(rows=8, cols=4)
    t_del2.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_del2)
    for ci, th in enumerate(["STT", "Hạng mục bàn giao", "Tên file / Định dạng", "Ghi chú"]):
        cell = t_del2.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    d2_items = [
        (1, "Phiếu Review SRS", "Sheet Review_SRS trong Mau_03.xlsx", "10 góp ý hoàn chỉnh có phản hồi của chủ hệ thống"),
        (2, "Kế hoạch kiểm thử (Test Plan)", "Mau_04_Test_Plan.docx và .pdf", "Đầy đủ 8 mục chiến lược và môi trường kiểm thử"),
        (3, "Bộ test case, test log, bug report", "Mau_03_Bo_bieu_mau_Kiem_thu.xlsx", "7 sheets, 72 TC chức năng, 10 NFR, 16 bug report"),
        (4, "Collection Postman + báo cáo Newman", "collection.json, newman-report.html", "28 request API, 74 assertions tự động hóa"),
        (5, "Bộ script kiểm thử Puppeteer", "puppeteer-flow01.js + screenshots", "Tự động hóa luồng E2E người dùng trên web"),
        (6, "Kịch bản JMeter + HTML dashboard", "jmeter_search_plan.jmx, thư mục HTML", "Đo tải 20 users và Step-load 10..60 users"),
        (7, "Báo cáo tổng kết kiểm thử", "Mau_05_Test_Summary_Report.docx / pdf", "Phân tích số liệu, biểu đồ lỗi và kết luận Go/No-go")
    ]
    for ri, (stt, itm, link, nt) in enumerate(d2_items, start=1):
        row = t_del2.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(0.5); row.cells[1].width = Inches(2.2); row.cells[2].width = Inches(2.2); row.cells[3].width = Inches(1.6)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(str(stt)); r0.font.size = Pt(8.5); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(itm); r1.font.bold = True; r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(link); r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(nt); r3.font.size = Pt(8.5)

    # Section II: Tóm tắt kết quả
    h2_sec2 = doc.add_heading(level=2); r = h2_sec2.add_run("II. Tóm tắt kết quả kiểm thử"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    t_sum_k = doc.add_table(rows=5, cols=2)
    t_sum_k.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_sum_k)
    sum_items = [
        ("Số test case thực thi (Chức năng / Phi chức năng)", "72 chức năng / 10 phi chức năng (Tổng: 82 case)"),
        ("Tỉ lệ Pass chung", "80.5% (66 Pass / 16 Fail / 0 Blocked)"),
        ("Tổng số lỗi phát hiện", "16 lỗi (Critical: 2, Major: 6, Minor: 8)"),
        ("Phân bố lỗi theo loại: [Functional / Visual / Content / Performance / Crash]", "[ 6 / 3 / 3 / 2 / 2 ]")
    ]
    for idx, (lbl, val) in enumerate(sum_items):
        row = t_sum_k.rows[idx]
        set_cell_background(row.cells[0], "DDEBF7"); set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(3.2); row.cells[1].width = Inches(3.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.bold = True; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.size = Pt(9)

    row_c = t_sum_k.rows[4]
    set_cell_background(row_c.cells[0], "DDEBF7"); set_cell_margins(row_c.cells[0]); set_cell_margins(row_c.cells[1])
    row_c.cells[0].width = Inches(3.2); row_c.cells[1].width = Inches(3.3)
    p0 = row_c.cells[0].paragraphs[0]; r0 = p0.add_run("Kết luận nghiệm thu"); r0.font.bold = True; r0.font.size = Pt(9.5)
    p1 = row_c.cells[1].paragraphs[0]; r1 = p1.add_run("☒ NO-GO (Chưa đủ điều kiện do còn lỗi Critical)"); r1.font.bold = True; r1.font.size = Pt(9.5); r1.font.color.rgb = RGBColor(192, 0, 0)

    # Section III: Các lỗi còn bất đồng
    h2_sec3 = doc.add_heading(level=2); r = h2_sec3.add_run("III. Các lỗi còn bất đồng ý kiến (nếu có)"); r.font.name = "Times New Roman"; r.font.color.rgb = NAVY
    p_dis = doc.add_paragraph()
    r = p_dis.add_run("Không có bất đồng. Chủ hệ thống và Tester đã cùng đối soát và thống nhất xác nhận 16/16 lỗi được báo cáo.")
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5); r.font.italic = True

    doc.add_paragraph()
    # Signatures
    t_sig2 = doc.add_table(rows=2, cols=2)
    t_sig2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sig2.rows[0].cells[0].width = Inches(3.2); t_sig2.rows[0].cells[1].width = Inches(3.3)
    t_sig2.rows[1].cells[0].width = Inches(3.2); t_sig2.rows[1].cells[1].width = Inches(3.3)

    p_s0 = t_sig2.rows[0].cells[0].paragraphs[0]; p_s0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_s0.add_run("BÊN GIAO (TESTER)\n(Ký và ghi rõ họ tên)"); r.font.bold = True; r.font.size = Pt(10)

    p_s1 = t_sig2.rows[0].cells[1].paragraphs[0]; p_s1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_s1.add_run("BÊN NHẬN (CHỦ HỆ THỐNG)\n(Ký và ghi rõ họ tên)"); r.font.bold = True; r.font.size = Pt(10)

    p_name0 = t_sig2.rows[1].cells[0].paragraphs[0]; p_name0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_name0.add_run("\n\n\nNguyễn Văn A\nMSSV: 24110001"); r.font.bold = True; r.font.size = Pt(10)

    p_name1 = t_sig2.rows[1].cells[1].paragraphs[0]; p_name1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_name1.add_run("\n\n\nLương Chí Dũng\nMSSV: 24110215"); r.font.bold = True; r.font.size = Pt(10)

    out_docx = "docs/Mau_06_Bien_ban_ban_giao.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/Mau_06_Bien_ban_ban_giao.pdf successfully!")

if __name__ == "__main__":
    build_mau06_doc()
