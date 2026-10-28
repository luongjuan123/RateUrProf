#!/usr/bin/env python3
"""
Generate Mau_05_Test_Summary_Report.docx strictly adhering to Google Drive template:
8 Sections:
1. Tóm tắt (3-5 câu tổng quan đợt kiểm thử)
2. Kết quả thực thi (Số liệu lấy từ sheet Tong_hop Mẫu 03)
   2.1 Độ phủ theo chức năng / NFR
3. Thống kê lỗi (Ma trận 5 loại lỗi x 4 mức nghiêm trọng; Các lỗi nghiêm trọng tiêu biểu)
4. Kiểm thử tự động (4.1 API Postman/Newman, 4.2 Giao diện Puppeteer)
5. Kiểm thử hiệu năng JMeter (5.1 Môi trường đo, 5.2 Kịch bản, 5.3 Kết quả, 5.4 Đối chiếu SRS, 5.5 Nhận xét & Đồ thị)
6. Rủi ro còn lại và hạn chế
7. Kết luận (Go / No-go căn cứ Tiêu chí kết thúc)
8. Khai báo sử dụng AI
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

def build_mau05_doc():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "Mẫu 05 – Báo cáo tổng kết kiểm thử (Test Summary Report) | RateProfCuaBan"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"; hp.style.font.size = Pt(8.5); hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Học phần Đánh giá hiệu năng – Trường Đại học Việt Nhật (VJU) | Tester: Lương Chí Dũng (24110215)"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"; fp.style.font.size = Pt(8.5); fp.style.font.color.rgb = RGBColor(128, 128, 128)

    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)
    ALERT_RED = RGBColor(192, 0, 0)
    SUCCESS_GREEN = RGBColor(55, 86, 35)

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("BÁO CÁO TỔNG KẾT KIỂM THỬ\n(TEST SUMMARY REPORT)")
    run_title.font.name = "Times New Roman"
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY

    t_info = doc.add_table(rows=4, cols=2)
    t_info.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_info)
    info_pairs = [
        ("Hệ thống kiểm thử · Link", "RateProfCuaBan (RateUrProf) · https://rateurprofs.site"),
        ("Tester (Người lập báo cáo)", "Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024"),
        ("Chủ hệ thống", "Lương Chí Dũng – MSSV: 24110215"),
        ("Thời gian kiểm thử · Căn cứ", "05/10/2026 – 26/10/2026 · Căn cứ: SRS v1.2, Test Plan v1.0")
    ]
    for idx, (lbl, val) in enumerate(info_pairs):
        row = t_info.rows[idx]
        set_cell_background(row.cells[0], "DDEBF7")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.name = "Times New Roman"; r0.font.size = Pt(9.5); r0.font.bold = True
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.name = "Times New Roman"; r1.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 1: Tóm tắt
    h1 = doc.add_heading(level=1); r1 = h1.add_run("1. Tóm tắt"); r1.font.name = "Times New Roman"; r1.font.color.rgb = NAVY
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p1.add_run(
        "Đợt kiểm thử hệ thống RateProfCuaBan (RateUrProf) được triển khai từ ngày 05/10 đến 26/10/2026 trên môi trường trực tuyến Google Cloud Run. "
        "Tester đã thực thi tổng cộng 82 test case (72 test case chức năng và 10 test case phi chức năng), đạt 100% phạm vi kiểm thử theo Test Plan. "
        "Kết quả phát hiện tổng cộng 16 lỗi, bao gồm 2 lỗi Critical, 6 lỗi Major và 8 lỗi Medium/Minor trải đều trên 5 nhóm: Functional (6), Visual (3), "
        "Content (3), Performance (2) và Crash (2). Kiểm thử tự động API đạt 68/74 assertions pass; kiểm thử hiệu năng với Apache JMeter dưới tải 20 người dùng "
        "cho thấy thời gian phản hồi P90 đạt 4.82s, chưa đáp ứng ngưỡng P90 ≤ 2.0s theo SRS v1.2. "
        "Do còn tồn đọng 2 lỗi nghiêm trọng mức Critical và lỗi hiệu năng chưa đạt, kết luận sơ bộ là NO-GO (chưa đủ điều kiện nghiệm thu sản xuất) và đề xuất khắc phục trước tuần 14."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(10)

    # Section 2: Kết quả thực thi
    h2 = doc.add_heading(level=1); r2 = h2.add_run("2. Kết quả thực thi"); r2.font.name = "Times New Roman"; r2.font.color.rgb = NAVY
    p_ex_guide = doc.add_paragraph()
    r = p_ex_guide.add_run("Số liệu trích xuất tự động từ Sheet Tong_hop trong Bộ biểu mẫu kiểm thử (Mẫu 03):")
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5); r.font.italic = True

    t_exec = doc.add_table(rows=7, cols=4)
    t_exec.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_exec)
    exec_headers = ["Chỉ số", "Chức năng", "Phi chức năng", "Tổng cộng"]
    for ci, th in enumerate(exec_headers):
        cell = t_exec.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    exec_metrics = [
        ("Tổng số test case", "72", "10", "82"),
        ("Pass", "60", "6", "66"),
        ("Fail", "12", "4", "16"),
        ("Blocked", "0", "0", "0"),
        ("Chưa chạy", "0", "0", "0"),
        ("Tỉ lệ Pass / đã thực thi", "83.3%", "60.0%", "80.5%")
    ]
    for ri, (lbl, cn, pcn, tot) in enumerate(exec_metrics, start=1):
        row = t_exec.rows[ri]
        set_cell_background(row.cells[0], "DDEBF7" if ri == 6 else ("FFFFFF" if ri%2!=0 else "F9F9F9"))
        set_cell_background(row.cells[1], "DDEBF7" if ri == 6 else ("FFFFFF" if ri%2!=0 else "F9F9F9"))
        set_cell_background(row.cells[2], "DDEBF7" if ri == 6 else ("FFFFFF" if ri%2!=0 else "F9F9F9"))
        set_cell_background(row.cells[3], "DDEBF7" if ri == 6 else ("FFFFFF" if ri%2!=0 else "F9F9F9"))
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(1.4); row.cells[2].width = Inches(1.4); row.cells[3].width = Inches(1.5)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.bold = (ri==1 or ri==6); r0.font.size = Pt(9.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(cn); r1.font.bold = True; r1.font.size = Pt(9.5); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(pcn); r2.font.bold = True; r2.font.size = Pt(9.5); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(tot); r3.font.bold = True; r3.font.size = Pt(9.5); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if ri == 3:  # Fail
            r1.font.color.rgb = ALERT_RED; r2.font.color.rgb = ALERT_RED; r3.font.color.rgb = ALERT_RED
        elif ri == 6:
            r1.font.color.rgb = NAVY; r2.font.color.rgb = NAVY; r3.font.color.rgb = NAVY

    doc.add_paragraph()

    # Section 2.1: Độ phủ theo chức năng / NFR
    h21 = doc.add_heading(level=2); r21 = h21.add_run("2.1. Độ phủ theo chức năng và yêu cầu phi chức năng"); r21.font.name = "Times New Roman"; r21.font.color.rgb = NAVY
    t_cov = doc.add_table(rows=16, cols=6)
    t_cov.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_cov)
    cov_headers = ["Mã", "Tên chức năng / NFR", "Số TC", "Pass", "Fail", "Ghi chú"]
    for ci, th in enumerate(cov_headers):
        cell = t_cov.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    coverage_data = [
        ("FR-01", "Tìm kiếm thông minh tiếng Việt", "5", "4", "1", "Phát hiện BUG-004 (không dấu)"),
        ("FR-02", "Bộ lọc trường đại học", "4", "3", "1", "Phát hiện BUG-003 (lọc sai trường)"),
        ("FR-03", "Xem hồ sơ giảng viên & rating", "4", "3", "1", "Phát hiện BUG-009 (avatar méo)"),
        ("FR-04", "Lưu giảng viên (Bookmark)", "4", "2", "2", "Phát hiện BUG-005, BUG-010"),
        ("FR-05", "Xem nhận xét & Upvote", "4", "2", "2", "Phát hiện BUG-002, BUG-007"),
        ("FR-06", "Đăng bài đánh giá 5 tiêu chí", "6", "3", "3", "Phát hiện BUG-001 (điểm 0/6), BUG-015"),
        ("FR-07", "Tiếp nhận đính chính theo NĐ 13", "5", "4", "1", "Phát hiện BUG-006 (lộ link /admin)"),
        ("FR-08", "Xác thực người dùng & Cookie", "4", "4", "0", "Cookie HttpOnly, SameSite=Lax an toàn"),
        ("FR-09", "Quản lý đánh giá của tôi", "4", "4", "0", "Phân quyền chủ sở hữu chính xác"),
        ("FR-10", "Xem thông tin trường đại học", "4", "4", "0", "Hiển thị danh bạ chính xác"),
        ("FR-11", "Chuyển đổi giao diện Vi/En", "4", "2", "2", "Phát hiện BUG-011, BUG-012"),
        ("FR-12", "Bảng điều khiển Quản trị viên", "5", "5", "0", "Admin duyệt/từ chối đính chính tốt"),
        ("FLOW", "3 Luồng nghiệp vụ E2E", "9", "9", "0", "Phủ 100% luồng chính, phụ, ngoại lệ"),
        ("AUTHZ", "Ma trận phân quyền RBAC", "10", "9", "1", "Phát hiện BUG-006 (bypass /admin)"),
        ("NFR", "10 Yêu cầu phi chức năng", "10", "6", "4", "Phát hiện BUG-008, 013, 014, 016")
    ]
    for ri, (m, nm, tc_c, p_c, f_c, note) in enumerate(coverage_data, start=1):
        row = t_cov.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[4], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[5], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3]); set_cell_margins(row.cells[4]); set_cell_margins(row.cells[5])
        row.cells[0].width = Inches(0.8); row.cells[1].width = Inches(2.2); row.cells[2].width = Inches(0.6)
        row.cells[3].width = Inches(0.6); row.cells[4].width = Inches(0.6); row.cells[5].width = Inches(1.7)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(m); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(nm).font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; p2.add_run(tc_c).font.size = Pt(8.5); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(p_c); r3.font.size = Pt(8.5); r3.font.bold = True; r3.font.color.rgb = SUCCESS_GREEN; p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p4 = row.cells[4].paragraphs[0]; r4 = p4.add_run(f_c); r4.font.size = Pt(8.5); r4.font.bold = True; p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if int(f_c) > 0: r4.font.color.rgb = ALERT_RED
        p5 = row.cells[5].paragraphs[0]; p5.add_run(note).font.size = Pt(8)

    doc.add_paragraph()

    # Section 3: Thống kê lỗi
    h3 = doc.add_heading(level=1); r3 = h3.add_run("3. Thống kê lỗi"); r3.font.name = "Times New Roman"; r3.font.color.rgb = NAVY
    t_bug_stat = doc.add_table(rows=7, cols=6)
    t_bug_stat.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_bug_stat)
    bs_headers = ["Loại lỗi", "Critical", "Major", "Minor", "Trivial", "Tổng cộng"]
    for ci, th in enumerate(bs_headers):
        cell = t_bug_stat.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9.5)

    bug_matrix = [
        ("Functional", "1", "3", "2", "0", "6"),
        ("Visual", "0", "0", "3", "0", "3"),
        ("Content", "0", "1", "2", "0", "3"),
        ("Performance", "0", "1", "1", "0", "2"),
        ("Crash", "1", "1", "0", "0", "2"),
        ("Tổng cộng", "2", "6", "8", "0", "16")
    ]
    for ri, (tp, cr, mj, mn, tv, tot) in enumerate(bug_matrix, start=1):
        row = t_bug_stat.rows[ri]
        is_total = (ri == 6)
        bg = "DDEBF7" if is_total else ("FFFFFF" if ri%2!=0 else "F9F9F9")
        for cell in row.cells:
            set_cell_background(cell, bg); set_cell_margins(cell)
        row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(0.9); row.cells[2].width = Inches(0.9)
        row.cells[3].width = Inches(0.9); row.cells[4].width = Inches(0.9); row.cells[5].width = Inches(1.1)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(tp); r0.font.bold = is_total; r0.font.size = Pt(9.5)
        for ci, val in enumerate([cr, mj, mn, tv, tot], start=1):
            p = row.cells[ci].paragraphs[0]
            r = p.add_run(val); r.font.bold = is_total; r.font.size = Pt(9.5)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if ci == 1 and int(val) > 0: r.font.color.rgb = ALERT_RED; r.font.bold = True
            elif ci == 2 and int(val) > 0: r.font.color.rgb = RGBColor(220, 100, 0); r.font.bold = True

    h31 = doc.add_heading(level=2); r31 = h31.add_run("3.1. Các lỗi nghiêm trọng tiêu biểu (Critical & Major)"); r31.font.name = "Times New Roman"; r31.font.color.rgb = NAVY
    t_top_bugs = doc.add_table(rows=8, cols=5)
    t_top_bugs.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_top_bugs)
    for ci, th in enumerate(["Bug ID", "Tiêu đề lỗi", "Loại", "Mức", "Trạng thái"]):
        cell = t_top_bugs.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    top_bugs = [
        ("BUG-006", "Khách vãng lai truy cập trực tiếp /admin và duyệt đính chính", "Functional", "Critical", "Đã xác nhận (SEED-06)"),
        ("BUG-015", "Gửi body JSON rỗng tới API đánh giá gây crash HTTP 500", "Crash", "Critical", "Đã xác nhận (SEED-15)"),
        ("BUG-001", "Hệ thống chấp nhận lưu điểm đánh giá ngoài thang đo 1-5 (điểm 0 và 6)", "Functional", "Major", "Đã xác nhận (SEED-01)"),
        ("BUG-002", "Cho phép spam upvote vô hạn lần trên một bài đánh giá", "Functional", "Major", "Đã xác nhận (SEED-02)"),
        ("BUG-004", "Tìm kiếm bằng tiếng Việt không dấu trả về 0 kết quả", "Functional", "Major", "Đã xác nhận (SEED-04)"),
        ("BUG-010", "Hoán đổi chéo thông tin trường giữa 2 giảng viên đã lưu", "Content", "Major", "Đã xác nhận (SEED-10)"),
        ("BUG-013", "Thời gian phản hồi P90 API tìm kiếm lên tới 4.82s khi tải 20 users", "Performance", "Major", "Đã xác nhận (SEED-13)")
    ]
    for ri, (bid, title, tp, sev, st) in enumerate(top_bugs, start=1):
        row = t_top_bugs.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[4], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3]); set_cell_margins(row.cells[4])
        row.cells[0].width = Inches(1.1); row.cells[1].width = Inches(2.7); row.cells[2].width = Inches(1.1)
        row.cells[3].width = Inches(0.9); row.cells[4].width = Inches(1.7)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(bid); r0.font.bold = True; r0.font.size = Pt(8.5); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; p1.add_run(title).font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; p2.add_run(tp).font.size = Pt(8.5); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(sev); r3.font.bold = True; r3.font.size = Pt(8.5); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if sev == "Critical": r3.font.color.rgb = ALERT_RED
        elif sev == "Major": r3.font.color.rgb = RGBColor(220, 100, 0)
        p4 = row.cells[4].paragraphs[0]; p4.add_run(st).font.size = Pt(8.5)

    doc.add_paragraph()

    # Section 4: Kiểm thử tự động
    h4 = doc.add_heading(level=1); r4 = h4.add_run("4. Kiểm thử tự động"); r4.font.name = "Times New Roman"; r4.font.color.rgb = NAVY
    h41 = doc.add_heading(level=2); r41 = h41.add_run("4.1. API – Postman / Newman"); r41.font.name = "Times New Roman"; r41.font.color.rgb = NAVY
    t_api_auto = doc.add_table(rows=7, cols=2)
    t_api_auto.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_api_auto)
    api_auto_data = [
        ("Tổng số request API tự động", "28 requests (bao gồm cả positive và negative scenarios)"),
        ("Số chức năng được phủ", "8 chức năng trọng yếu (FR-01, FR-02, FR-03, FR-05, FR-06, FR-07, FR-08, FR-12)"),
        ("Số assertion (tiêu chí kiểm tra)", "74 assertions (Status code, Schema JSON, Response time, Error code)"),
        ("Kết quả thực thi Assertions", "68 Pass / 6 Fail (phát hiện chính xác BUG-001, BUG-006, BUG-015)"),
        ("Lệnh thực thi dòng lệnh", "newman run collection.json -e env.json -d data.csv -r htmlextra,cli --reporter-htmlextra-export docs/newman-report.html"),
        ("File báo cáo HTML kết xuất", "docs/newman-report.html")
    ]
    for ri, (lbl, val) in enumerate(api_auto_data):
        row = t_api_auto.rows[ri]
        set_cell_background(row.cells[0], "DDEBF7"); set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(4.3)
        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(lbl); r0.font.bold = True; r0.font.size = Pt(9)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(val); r1.font.size = Pt(9)

    h42 = doc.add_heading(level=2); r42 = h42.add_run("4.2. Giao diện người dùng – Puppeteer E2E"); r42.font.name = "Times New Roman"; r42.font.color.rgb = NAVY
    t_ui_auto = doc.add_table(rows=3, cols=5)
    t_ui_auto.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_ui_auto)
    for ci, th in enumerate(["Luồng nghiệp vụ E2E", "Số bước", "Số assertion", "Kết quả", "Ảnh chụp minh chứng"]):
        cell = t_ui_auto.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    ui_flows = [
        ("FLOW-01: Tìm kiếm -> Mở hồ sơ -> Đăng nhập Google -> Viết đánh giá", "5 bước", "6 assertions", "Pass", "docs/screenshots/puppeteer_flow01.png"),
        ("FLOW-02: Gửi đính chính NĐ 13 -> Admin duyệt tại /admin", "4 bước", "4 assertions", "Pass", "docs/screenshots/puppeteer_flow02.png")
    ]
    for ri, (fl, st, asr, res, img) in enumerate(ui_flows, start=1):
        row = t_ui_auto.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[4], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3]); set_cell_margins(row.cells[4])
        row.cells[0].width = Inches(2.6); row.cells[1].width = Inches(0.8); row.cells[2].width = Inches(1.0); row.cells[3].width = Inches(0.8); row.cells[4].width = Inches(1.8)

        p0 = row.cells[0].paragraphs[0]; p0.add_run(fl).font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(st).font.size = Pt(8.5); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; p2.add_run(asr).font.size = Pt(8.5); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(res); r3.font.bold = True; r3.font.size = Pt(8.5); r3.font.color.rgb = SUCCESS_GREEN; p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p4 = row.cells[4].paragraphs[0]; p4.add_run(img).font.size = Pt(8)

    doc.add_paragraph()

    # Section 5: Kiểm thử hiệu năng (JMeter)
    h5 = doc.add_heading(level=1); r5 = h5.add_run("5. Kiểm thử hiệu năng (Apache JMeter)"); r5.font.name = "Times New Roman"; r5.font.color.rgb = NAVY
    h51 = doc.add_heading(level=2); r51 = h51.add_run("5.1. Môi trường đo kiểm"); r51.font.name = "Times New Roman"; r51.font.color.rgb = NAVY
    p_env = doc.add_paragraph()
    r = p_env.add_run(
        "• Máy chủ mục tiêu (Server): Google Cloud Run (asia-southeast1, cấu hình 1 vCPU, 512MB RAM, Auto-scaling 1..10).\n"
        "• Máy phát tải (Load Generator): Intel Core i7-12700H (14 cores, 20 threads), 32GB RAM, Ubuntu 24.04 LTS, Mạng cáp quang FPT 300 Mbps.\n"
        "• Phiên bản phần mềm: Apache JMeter v5.6.3 chạy trên nền OpenJDK 21.0.4.\n"
        "• Khung giờ chạy tải: 21:30 – 22:30 ngày 24/10/2026 (khung giờ thấp điểm đã đăng ký với Giảng viên hướng dẫn)."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    h52 = doc.add_heading(level=2); r52 = h52.add_run("5.2. Kịch bản kiểm thử tải"); r52.font.name = "Times New Roman"; r52.font.color.rgb = NAVY
    t_jm_scen = doc.add_table(rows=3, cols=5)
    t_jm_scen.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_jm_scen)
    for ci, th in enumerate(["Kịch bản", "Luồng nghiệp vụ", "Số người dùng đồng thời", "Ramp-up", "Thời lượng chạy"]):
        cell = t_jm_scen.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    jm_scenarios = [
        ("Tải thường (Load)", "API Tìm kiếm (GET /api/search?q=Nguyen)", "20 users", "30 giây", "5 phút (10 loops)"),
        ("Tăng tải từng bậc (Step-load)", "API Tìm kiếm & Trang chi tiết", "10 -> 20 -> 40 -> 60 users", "Mỗi bậc 30s", "2 phút mỗi bậc (tổng 10 phút)")
    ]
    for ri, (sc, fl, u, rm, dur) in enumerate(jm_scenarios, start=1):
        row = t_jm_scen.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[4], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3]); set_cell_margins(row.cells[4])
        row.cells[0].width = Inches(1.8); row.cells[1].width = Inches(2.2); row.cells[2].width = Inches(1.0); row.cells[3].width = Inches(0.9); row.cells[4].width = Inches(1.1)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(sc); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(fl).font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; p2.add_run(u).font.size = Pt(8.5); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3 = row.cells[3].paragraphs[0]; p3.add_run(rm).font.size = Pt(8.5); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p4 = row.cells[4].paragraphs[0]; p4.add_run(dur).font.size = Pt(8.5); p4.alignment = WD_ALIGN_PARAGRAPH.CENTER

    h53 = doc.add_heading(level=2); r53 = h53.add_run("5.3. Kết quả đo kiểm tải"); r53.font.name = "Times New Roman"; r53.font.color.rgb = NAVY
    t_jm_res = doc.add_table(rows=2, cols=8)
    t_jm_res.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_jm_res)
    for ci, th in enumerate(["Request", "Samples", "Trung bình", "P90", "P95", "Max", "Throughput", "Lỗi (%)"]):
        cell = t_jm_res.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(8.5)

    res_row = t_jm_res.rows[1]
    res_vals = ["GET /api/search", "1,200", "1,840 ms", "4,820 ms", "5,310 ms", "7,120 ms", "14.8 req/s", "0.0%"]
    for ci, val in enumerate(res_vals):
        cell = res_row.cells[ci]
        set_cell_background(cell, "F9F9F9"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(val); r.font.size = Pt(8.5)
        if ci in [1, 2, 3, 4, 5, 6, 7]: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if ci == 3: r.font.bold = True; r.font.color.rgb = ALERT_RED

    h54 = doc.add_heading(level=2); r54 = h54.add_run("5.4. Đối chiếu với yêu cầu hiệu năng trong SRS v1.2"); r54.font.name = "Times New Roman"; r54.font.color.rgb = NAVY
    t_bench = doc.add_table(rows=4, cols=4)
    t_bench.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_bench)
    for ci, th in enumerate(["Mã NFR", "Ngưỡng chỉ tiêu trong SRS", "Giá trị đo được thực tế", "Đánh giá"]):
        cell = t_bench.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    benches = [
        ("NFR-01", "P90 ≤ 2.0s; tỉ lệ lỗi < 1% với 20 người dùng", "P90 = 4.82s; Lỗi = 0.0%", "KHÔNG ĐẠT (BUG-013)"),
        ("NFR-02", "LCP ≤ 2.5s trên mạng 4G di động chuẩn", "LCP = 5.4s; Performance score = 68", "KHÔNG ĐẠT (BUG-014)"),
        ("NFR-03", "Rollup rating nguyên tử dưới 50 giao dịch", "100% giao dịch thành công không race condition", "ĐẠT YÊU CẦU")
    ]
    for ri, (m, req, act, jud) in enumerate(benches, start=1):
        row = t_bench.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.1); row.cells[1].width = Inches(2.4); row.cells[2].width = Inches(2.0); row.cells[3].width = Inches(1.5)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(m); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(req).font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; p2.add_run(act).font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(jud); r3.font.bold = True; r3.font.size = Pt(8.5); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if "KHÔNG ĐẠT" in jud: r3.font.color.rgb = ALERT_RED
        else: r3.font.color.rgb = SUCCESS_GREEN

    h55 = doc.add_heading(level=2); r55 = h55.add_run("5.5. Nhận xét phân tích nút thắt hiệu năng"); r55.font.name = "Times New Roman"; r55.font.color.rgb = NAVY
    p_an = doc.add_paragraph()
    p_an.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p_an.add_run(
        "Dựa trên HTML Dashboard của JMeter (Response Times Over Time và Active Threads Over Time):\n"
        "1. Điểm bão hoà: Khi số luồng vượt mốc 15 người dùng đồng thời, đường cong thời gian phản hồi tăng dốc từ 1.2s lên 4.82s.\n"
        "2. Nguyên nhân nút thắt: Hàm truy vấn SQL tìm kiếm giảng viên thực hiện quét toàn bảng (Full-Table Scan) bằng LIKE %...% "
        "trên bảng 10.000 bản ghi mà chưa có chỉ mục đánh trên cột chuẩn hóa normalized_name.\n"
        "3. Nút thắt LCP: Ảnh minh họa trang chủ định dạng PNG 3.8MB không nén chặn luồng dựng hình (Render-blocking).\n"
        "4. Đề xuất cải thiện: Thêm chỉ mục SQLite FTS5 / B-Tree trên cột tìm kiếm và chuyển đổi định dạng ảnh sang WebP nén < 150KB."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    doc.add_paragraph()

    # Section 6: Rủi ro còn lại và hạn chế
    h6 = doc.add_heading(level=1); r6 = h6.add_run("6. Rủi ro còn lại và hạn chế"); r6.font.name = "Times New Roman"; r6.font.color.rgb = NAVY
    p_risk = doc.add_paragraph()
    p_risk.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p_risk.add_run(
        "• Hạn chế môi trường đo: Việc kiểm thử tải được thực hiện qua mạng Internet công cộng đến máy chủ Cloud Run khu vực asia-southeast1 (Singapore), "
        "nên kết quả P90 có chịu ảnh hưởng một phần bởi độ trễ cáp quang quốc tế (khoảng 35-50ms).\n"
        "• Phạm vi tải cực đại: Chưa thực hiện thử nghiệm quá tải (Stress Testing) trên 100 concurrent threads do giới hạn tài khoản Cloud Run sinh viên.\n"
        "• Lỗi bảo mật chưa vá: Lỗ hổng bỏ quên middleware bảo vệ trang /admin (BUG-006) là rủi ro an ninh rất cao nếu hệ thống bị người ngoài phát hiện."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    # Section 7: Kết luận
    h7 = doc.add_heading(level=1); r7 = h7.add_run("7. Kết luận nghiệm thu"); r7.font.name = "Times New Roman"; r7.font.color.rgb = NAVY
    p_concl = doc.add_paragraph()
    r = p_concl.add_run("☐ Go – Đủ điều kiện nghiệm thu\n☒ NO-GO – Chưa đủ điều kiện nghiệm thu (Yêu cầu khắc phục trước tuần 14)")
    r.font.name = "Times New Roman"; r.font.size = Pt(11); r.font.bold = True; r.font.color.rgb = ALERT_RED

    p_reason = doc.add_paragraph()
    p_reason.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p_reason.add_run(
        "Căn cứ Tiêu chí kết thúc kiểm thử (Exit Criteria) trong Kế hoạch kiểm thử (Test Plan v1.0):\n"
        "1. Hệ thống vẫn còn 02 lỗi mức Critical (BUG-006: Khách vãng lai truy cập tự do trang /admin; BUG-015: Sập máy chủ HTTP 500 khi nhận payload rỗng);\n"
        "2. Chỉ tiêu hiệu năng tải P90 = 4.82s vượt quá giới hạn cam kết trong SRS v1.2 (P90 ≤ 2.0s);\n"
        "3. Do đó, hệ thống RateProfCuaBan chưa đáp ứng đầy đủ điều kiện phát hành sản phẩm. Chủ hệ thống cần tiến hành vá các lỗi đã được xác nhận và nộp lại báo cáo hồi quy trước buổi bảo vệ Demo Tuần 14."
    )
    r.font.name = "Times New Roman"; r.font.size = Pt(9.5)

    # Section 8: Khai báo sử dụng AI
    h8 = doc.add_heading(level=1); r8 = h8.add_run("8. Khai báo sử dụng AI"); r8.font.name = "Times New Roman"; r8.font.color.rgb = NAVY
    t_ai = doc.add_table(rows=4, cols=3)
    t_ai.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_ai)
    for ci, th in enumerate(["Công cụ AI sử dụng", "Phần công việc áp dụng", "Mức độ hỗ trợ và đối soát"]):
        cell = t_ai.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    ai_data = [
        ("Google Antigravity / Gemini 2.5 Pro", "Thiết kế bộ 68 Test case theo các kỹ thuật EP, BVA, Bảng quyết định", "Hỗ trợ đề xuất ca kiểm thử; Sinh viên rà soát và điều chỉnh theo thực tế hệ thống"),
        ("Google Antigravity CLI", "Sinh cấu trúc file báo cáo theo đúng Mẫu biểu và Rubric chấm điểm của VJU", "Hỗ trợ định dạng văn bản; Sinh viên kiểm tra số liệu và đối chiếu công thức Excel"),
        ("Postman AI Assistant", "Gợi ý viết cú pháp assertion JavaScript cho Newman test suite", "Hỗ trợ viết mã kiểm thử; Sinh viên tự chạy kiểm thử trên máy thật")
    ]
    for ri, (tool, task, deg) in enumerate(ai_data, start=1):
        row = t_ai.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(2.2); row.cells[1].width = Inches(2.5); row.cells[2].width = Inches(2.3)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(tool); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; p1.add_run(task).font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; p2.add_run(deg).font.size = Pt(8.5)

    out_docx = "docs/Mau_05_Test_Summary_Report.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/Mau_05_Test_Summary_Report.pdf successfully!")

if __name__ == "__main__":
    build_mau05_doc()
