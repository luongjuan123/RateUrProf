#!/usr/bin/env python3
"""
Generate Checklist_truoc_khi_nop.docx and .pdf:
A comprehensive checklist covering every item in the Course Rubric (Phần A: Chủ hệ thống 4.0đ, Phần B: Tester 6.0đ)
verifying that all deliverables, criteria, formats, formulas, and links are 100% satisfied.
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

def build_checklist():
    doc = Document()

    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        header = s.header
        hp = header.paragraphs[0]
        hp.text = "Checklist trước khi nộp bài | Đánh giá hiệu năng VJU"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.style.font.name = "Times New Roman"; hp.style.font.size = Pt(8.5); hp.style.font.color.rgb = RGBColor(128, 128, 128)

        footer = s.footer
        fp = footer.paragraphs[0]
        fp.text = "Sinh viên: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.style.font.name = "Times New Roman"; fp.style.font.size = Pt(8.5); fp.style.font.color.rgb = RGBColor(128, 128, 128)

    NAVY = RGBColor(31, 78, 121)
    DARK_GRAY = RGBColor(50, 50, 50)
    SUCCESS_GREEN = RGBColor(55, 86, 35)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("CHECKLIST TRƯỚC KHI NỘP BÀI\nVÀ TIÊU CHÍ CHẤM ĐIỂM")
    r_title.font.name = "Times New Roman"; r_title.font.size = Pt(18); r_title.font.bold = True; r_title.font.color.rgb = NAVY

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_meta.add_run("Học phần: Đánh giá hiệu năng · Học kỳ I – Năm học 2026-2027 · Trường Đại học Việt Nhật (VJU)\nSinh viên: Lương Chí Dũng – MSSV: 24110215 – Lớp: BCSE2024\nHệ thống: RateProfCuaBan (RateUrProf) – https://rateurprofs.site")
    r_sub.font.name = "Times New Roman"; r_sub.font.size = Pt(10); r_sub.font.color.rgb = DARK_GRAY

    doc.add_paragraph()

    # Part A: Chủ hệ thống
    hA = doc.add_heading(level=1); rA = hA.add_run("PHẦN A – VAI TRÒ CHỦ HỆ THỐNG (4.0 ĐIỂM)"); rA.font.name = "Times New Roman"; rA.font.color.rgb = NAVY
    tA = doc.add_table(rows=5, cols=4)
    tA.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tA)
    for ci, th in enumerate(["Hạng mục", "Điểm", "Tiêu chí bắt buộc theo Rubric", "Tình trạng kiểm tra"]):
        cell = tA.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    partA_items = [
        ("A1. Tài liệu URD", "1.0đ", "≥ 3 vai trò người dùng (Khách, Sinh viên, Admin); bài toán rõ ràng; ≥ 3 luồng nghiệp vụ; User story chuẩn 'Là... tôi muốn... để...'; có mức ưu tiên và tiêu chí chấp nhận Acceptance Criteria.", "☑ ĐẠT (URD v1.0, 12 User Stories, 3 luồng nghiệp vụ)"),
        ("A2. Tài liệu SRS", "1.5đ", "≥ 12 chức năng nghiệp vụ (FR-01..12); ≥ 3 luồng E2E chi tiết luồng chính/phụ/ngoại lệ; ≥ 8 NFR (≥ 3 chỉ tiêu hiệu năng định lượng bằng số); Bảng quyết định, Biểu đồ chuyển trạng thái, Ma trận phân quyền RBAC; Ma trận truy vết URD-SRS.", "☑ ĐẠT (SRS v1.2, 12 FR, FLOW-01..03, 10 NFR, Ma trận RBAC & Truy vết)"),
        ("A3. Tài liệu API & Link sản phẩm", "0.5đ", "Đúng định dạng Mẫu 01 (5 mục); khớp mã nguồn thực tế; có request/response JSON mẫu; link sản phẩm Google Cloud Run hoạt động ổn định 24/7.", "☑ ĐẠT (Mau_01_Tai_lieu_API.docx/.pdf, link https://rateurprofs.site hoạt động)"),
        ("A4. Lỗi cài sẵn & Bug Manifest", "1.0đ", "Đúng định dạng Mẫu 02; ≥ 15 lỗi phủ đủ 5 loại (Functional ≥ 5, Visual ≥ 3, Content ≥ 3, Performance ≥ 2, Crash ≥ 2); ≥ 3 lỗi Critical/Major; vi phạm yêu cầu SRS cụ thể; tái hiện được 100% trên link demo.", "☑ ĐẠT (Mau_02_Bug_Manifest.xlsx, 16 lỗi, đủ 5 nhóm, 10 Critical+Major, công thức tự tính)")
    ]
    for ri, (cat, pts, req, status) in enumerate(partA_items, start=1):
        row = tA.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "DDEBF7")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.5); row.cells[1].width = Inches(0.7); row.cells[2].width = Inches(3.0); row.cells[3].width = Inches(1.8)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(cat); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(pts); r1.font.bold = True; r1.font.size = Pt(8.5); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(req); r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(status); r3.font.bold = True; r3.font.size = Pt(8); r3.font.color.rgb = SUCCESS_GREEN

    doc.add_paragraph()

    # Part B: Tester
    hB = doc.add_heading(level=1); rB = hB.add_run("PHẦN B – VAI TRÒ TESTER (6.0 ĐIỂM)"); rB.font.name = "Times New Roman"; rB.font.color.rgb = NAVY
    tB = doc.add_table(rows=6, cols=4)
    tB.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tB)
    for ci, th in enumerate(["Hạng mục", "Điểm", "Tiêu chí bắt buộc theo Rubric", "Tình trạng kiểm tra"]):
        cell = tB.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    partB_items = [
        ("B1. Review SRS & Test Plan", "0.5đ", "Sheet Review_SRS trong Mẫu 03 (chỉ rõ điều khoản không kiểm thử được, mơ hồ); Test Plan Mẫu 04 đủ 8 mục (giới thiệu, phạm vi, chiến lược, môi trường, tiêu chí, rủi ro, lịch trình, sản phẩm bàn giao).", "☑ ĐẠT (10 Review findings trong Mẫu 03; Mau_04_Test_Plan.docx/.pdf đủ 8 mục)"),
        ("B2. Thiết kế Test Case", "1.5đ", "Sheet TC_Chuc_nang: ≥ 60 test case chức năng phủ hết chức năng và 3 luồng E2E; áp dụng đủ 4 kỹ thuật (EP, BVA, Bảng quyết định, Chuyển trạng thái); Sheet TC_Phi_chuc_nang: ≥ 10 test case NFR.", "☑ ĐẠT (72 TC chức năng, 10 TC phi chức năng, đủ 4 kỹ thuật thiết kế)"),
        ("B3. Báo cáo lỗi & Tỉ lệ phát hiện", "1.5đ", "Sheet Bug_Report trong Mẫu 03; đủ thông tin, có bằng chứng ảnh/video, phân loại đúng 5 nhóm; chỉ rõ yêu cầu SRS vi phạm; phát hiện được các lỗi cài sẵn của chủ hệ thống.", "☑ ĐẠT (16 Bug Reports có bằng chứng link ảnh, đối chiếu chính xác mã SRS vi phạm)"),
        ("B4. Kiểm thử tự động", "1.0đ", "Postman / Newman (0.5đ): ≥ 6 chức năng, có assertion, lệnh CLI, file HTML report; Puppeteer (0.5đ): script chạy được, ≥ 2 luồng nghiệp vụ, chụp ảnh kết quả.", "☑ ĐẠT (Newman 28 requests, 74 assertions; Puppeteer FLOW-01 và FLOW-02 có ảnh minh chứng)"),
        ("B5. Kiểm thử hiệu năng (JMeter)", "1.5đ", "File kịch bản .jmx chạy được; ≥ 1 kịch bản tải thường + 1 kịch bản tăng tải; sinh HTML dashboard; đối chiếu chỉ số P90/lỗi với SRS; phân tích nút thắt hiệu năng.", "☑ ĐẠT (Kịch bản tải 20 users + Step-load, kết quả P90=4.82s đối chiếu NFR-01, HTML Dashboard)")
    ]
    for ri, (cat, pts, req, status) in enumerate(partB_items, start=1):
        row = tB.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[3], "DDEBF7")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2]); set_cell_margins(row.cells[3])
        row.cells[0].width = Inches(1.5); row.cells[1].width = Inches(0.7); row.cells[2].width = Inches(3.0); row.cells[3].width = Inches(1.8)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(cat); r0.font.bold = True; r0.font.size = Pt(8.5)
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(pts); r1.font.bold = True; r1.font.size = Pt(8.5); p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(req); r2.font.size = Pt(8.5)
        p3 = row.cells[3].paragraphs[0]; r3 = p3.add_run(status); r3.font.bold = True; r3.font.size = Pt(8); r3.font.color.rgb = SUCCESS_GREEN

    doc.add_paragraph()

    # Part C: Danh sách toàn bộ file bàn giao
    hC = doc.add_heading(level=1); rC = hC.add_run("DANH SÁCH FILE NỘP BÀI ĐÃ HOÀN TẤT"); rC.font.name = "Times New Roman"; rC.font.color.rgb = NAVY
    tC = doc.add_table(rows=10, cols=3)
    tC.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tC)
    for ci, th in enumerate(["STT", "Tên file theo chuẩn Mẫu biểu", "Mô tả nội dung & Định dạng"]):
        cell = tC.rows[0].cells[ci]
        set_cell_background(cell, "1F4E79"); set_cell_margins(cell)
        p = cell.paragraphs[0]; r = p.add_run(th); r.font.bold = True; r.font.color.rgb = RGBColor(255, 255, 255); r.font.size = Pt(9)

    file_list = [
        (1, "Checklist_truoc_khi_nop.docx / .pdf", "Checklist tổng kiểm tra các tiêu chí Rubric trước khi nộp bài"),
        (2, "Mau_01_Tai_lieu_API.docx / .pdf", "Đặc tả kỹ thuật API đầy đủ 5 mục (Thông tin chung, Mã lỗi, 14 endpoints, Tài khoản)"),
        (3, "Mau_02_Bug_Manifest.xlsx", "Danh sách 16 lỗi cài sẵn (Chủ hệ thống) có công thức tự động đếm kiểm tra"),
        (4, "Mau_03_Bo_bieu_mau_Kiem_thu.xlsx", "Bộ biểu mẫu kiểm thử 7 sheets: Thong_tin, Review_SRS, TC_Chuc_nang, TC_Phi_chuc_nang, Test_Log, Bug_Report, Tong_hop"),
        (5, "Mau_04_Test_Plan.docx / .pdf", "Kế hoạch kiểm thử chi tiết 8 mục chuẩn Rubric"),
        (6, "Mau_05_Test_Summary_Report.docx / .pdf", "Báo cáo tổng kết kiểm thử đầy đủ 8 mục (kết quả, biểu đồ lỗi, JMeter, Go/No-go)"),
        (7, "Mau_06_Bien_ban_ban_giao.docx / .pdf", "Biên bản bàn giao số 1 (Tuần 6) và số 2 (Tuần 14) giữa Chủ hệ thống và Tester"),
        (8, "Tai_Lieu_Yeu_Cau_Nguoi_Dung_URD_RateProfCuaBan.pdf", "Tài liệu URD đồng bộ vai trò, phạm vi và user stories"),
        (9, "Dac_Ta_Yeu_Cau_Phan_Mem_SRS_RateProfCuaBan.pdf", "Tài liệu SRS v1.2 đồng bộ FR-01..12, FLOW-01..03, NFR-01..10, ma trận RBAC")
    ]
    for ri, (stt, fname, fdesc) in enumerate(file_list, start=1):
        row = tC.rows[ri]
        set_cell_background(row.cells[0], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[1], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_background(row.cells[2], "FFFFFF" if ri%2!=0 else "F9F9F9")
        set_cell_margins(row.cells[0]); set_cell_margins(row.cells[1]); set_cell_margins(row.cells[2])
        row.cells[0].width = Inches(0.6); row.cells[1].width = Inches(3.2); row.cells[2].width = Inches(3.2)

        p0 = row.cells[0].paragraphs[0]; r0 = p0.add_run(str(stt)); r0.font.size = Pt(8.5); p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1 = row.cells[1].paragraphs[0]; r1 = p1.add_run(fname); r1.font.bold = True; r1.font.size = Pt(8.5)
        p2 = row.cells[2].paragraphs[0]; r2 = p2.add_run(fdesc); r2.font.size = Pt(8.5)

    out_docx = "docs/Checklist_truoc_khi_nop.docx"
    doc.save(out_docx)
    print(f"Generated {out_docx} successfully!")

    subprocess.run(["libreoffice", "--headless", "--convert-to", "pdf", out_docx, "--outdir", "docs/"], check=True)
    print("Converted to docs/Checklist_truoc_khi_nop.pdf successfully!")

if __name__ == "__main__":
    build_checklist()
