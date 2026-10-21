/**
 * Data Validation, Quality Hygiene, & Staging Pipeline
 *
 * Enforces strict name validation, filters navigation/placeholder noise,
 * assigns confidence scores, and stages records before promoting them to production.
 */

import { RawProfessorData } from "./strategies";
import { cleanPersonName, removeDiacritics, classifyAcademicRankAndDegree } from "./normalization";
import { isPostgresConfigured, getPostgresPool } from "../postgresClient";
import { getSqliteDb } from "../sqliteClient";
import { randomUUID } from "node:crypto";

export interface ValidationResult {
  isValid: boolean;
  status: "validated" | "needs_review" | "rejected";
  confidenceScore: number;
  errors: string[];
  cleanedName: string;
}

export class ValidationService {
  private static readonly NOISE_TERMS = new Set([
    "trang chu",
    "home",
    "lien he",
    "contact",
    "tin tuc",
    "news",
    "gioi thieu",
    "about",
    "tuyen sinh",
    "admissions",
    "dang nhap",
    "login",
    "khoa cntt",
    "bo mon",
    "phong ban",
    "thu vien",
    "so do trang",
    "search",
    "tim kiem",
    "menu",
    "chinh sach",
    "dieu khoan",
    "ho va ten",
    "stt",
    "thong bao",
    "ban giam hieu",
    "can bo vien chuc",
    "danh sach",
  ]);

  private static readonly PLACEHOLDER_TERMS = new Set([
    "john doe",
    "jane doe",
    "nguyen van a",
    "dang cap nhat",
    "updating",
    "chua cap nhat",
    "n/a",
    "na",
    "unknown",
    "admin",
    "administrator",
    "test user",
    "demo",
  ]);

  /**
   * Validates a raw professor data entry
   */
  public static validateRawProfessor(raw: RawProfessorData): ValidationResult {
    const errors: string[] = [];
    const cleanedName = cleanPersonName(raw.rawName);
    const normalizedName = removeDiacritics(cleanedName);

    // 1. Reject URLs
    if (/https?:\/\/|www\.|\.vn\/|\.com|\.edu|bit\.ly/i.test(raw.rawName) || /https?:\/\/|www\.|\.vn\/|\.com|\.edu|bit\.ly/i.test(cleanedName)) {
      errors.push("Tên chứa liên kết URL hoặc tên miền web");
    }

    // 2. Reject if contains digits or suspicious punctuation
    if (/\d/.test(cleanedName)) {
      errors.push("Tên chứa ký tự số");
    }
    if (/[@#$%^*_+=\[\]{}|<>\/\\~;:!?"]/.test(cleanedName)) {
      errors.push("Tên chứa ký tự đặc biệt hoặc dấu câu không hợp lệ");
    }

    // 3. Name token count
    const tokens = cleanedName.split(" ").filter(Boolean);
    if (tokens.length < 2) {
      errors.push("Tên quá ngắn (ít hơn 2 từ)");
    } else if (tokens.length > 5) {
      errors.push("Tên quá dài (nhiều hơn 5 từ)");
    }

    // 4. Reject navigation and placeholder noise
    if (this.NOISE_TERMS.has(normalizedName)) {
      errors.push("Tên trùng với từ khóa điều hướng hoặc trang tin tức");
    }
    if (this.PLACEHOLDER_TERMS.has(normalizedName)) {
      errors.push("Tên là văn bản mẫu (placeholder) không có thực");
    }

    // 5. Reject curriculum, syllabus, administrative headers, and department titles
    if (
      /\b(?:chuyen nganh|hoc phan|mon hoc|tin chi|khung chuong trinh|chuan dau ra|dau sach|giao trinh|bai giang|de cuong|can bo lop|lop truong|bi thu|ho va ten|so cmnd|cccd|gioi tinh|ngay sinh|de tai|luan van|luan an|tap chi|hoi thao|nghi quyet|thong tu)\b/i.test(
        normalizedName
      )
    ) {
      errors.push("Tên chứa từ khóa chuyên môn, chương trình học, hoặc tiêu đề biểu mẫu");
    }

    // 6. Reject journals, periodicals, and publication titles
    if (
      /\b(?:journal|bulletin|proceedings|transactions|reviews|advances in|annals of|communications in|ieee access)\b/i.test(
        raw.rawName
      ) ||
      /^(?:tap chi|ky yeu|chuyen san|ban tin|acta|international journal|frontiers in|topics in|progress in)\b/i.test(
        normalizedName
      )
    ) {
      errors.push("Tên là tiêu đề tạp chí, kỷ yếu, hoặc công bố khoa học");
    }

    // 7. Reject admissions and administrative procedures
    if (
      /\b(?:nop ho so|xet tuyen|nhap hoc|han nop|thoi han nop|dia diem nop|ma nganh|ly lich khoa hoc|thoi gian hoc|phieu dang ky|ky hoc|hoc phi|chi tieu|nguyen vong|diem chuan|bo sung kien thuc|thu tuc|ho so du tuyen|danh muc ho so)\b/i.test(
        normalizedName
      )
    ) {
      errors.push("Tên là thủ tục, thông báo tuyển sinh hoặc biểu mẫu");
    }

    // 8. Reject short-course vocational training programs
    if (
      /\b(?:phong kiem nghiem|van hanh may|thuc hanh tai chinh|bep an cong nghiep|haccp|vi sinh thuc pham|nuoi trong thuy san|quang ba website|an toan thuc pham|phan tich thuc pham|phan tich vi sinh)\b/i.test(
        normalizedName
      )
    ) {
      errors.push("Tên là khóa học đào tạo ngắn hạn");
    }

    // 9. Reject standalone majors / generic disciplines
    const STANDALONE_MAJORS = new Set([
      "cong nghe thuc pham", "cong nghe sinh hoc", "ky thuat moi truong", "ky thuat hoa hoc",
      "ky thuat co khi", "ky thuat dien", "quan tri kinh doanh", "ke toan", "ngon ngu anh",
      "ngon ngu trung", "ngon ngu nhat", "ngon ngu han", "luat kinh te", "khoa hoc moi truong",
      "cong nghe thong tin", "khoa hoc may tinh", "kinh doanh quoc te", "tai chinh ngan hang",
      "cong nghe che bien thuy san", "bao dam chat luong va an toan thuc pham", "ky thuat dieu khien",
      "noi dung", "ung dung"
    ]);
    if (STANDALONE_MAJORS.has(normalizedName) || STANDALONE_MAJORS.has(normalizedName.replace(/^nganh\s+/i, ""))) {
      errors.push("Tên là chuyên ngành đào tạo chứ không phải tên giảng viên");
    }

    // 10. Source URL sanity check: publication tables or short courses
    if (raw.sourceUrl && (raw.sourceUrl.includes("cong-bo-khoa-hoc") || raw.sourceUrl.includes("dao-tao-ngan-han"))) {
      if (!/(?:ts|ths|gs|pgs)\b/i.test(raw.rawTitle || "") && !/(?:nguyen|tran|le|pham|hoang|huynh|phan|vu|vo|dang|bui|do|ho|ngo|duong|ly)\b/i.test(normalizedName)) {
        errors.push("Dữ liệu trích xuất từ bảng công bố khoa học hoặc đào tạo ngắn hạn không xác định được tác giả");
      }
    }

    if (/^(?:khoa|bo mon|phong|vien|trung tam|truong dai hoc|ban giam hieu|to bo mon)\s+/i.test(normalizedName)) {
      errors.push("Tên là tên đơn vị/khoa/phòng ban chứ không phải tên giảng viên");
    }

    // 5. Score calculation
    let confidenceScore = 0.5; // base for clean 2-6 token name
    if (errors.length === 0) {
      if (raw.rawEmail && raw.rawEmail.includes("@")) confidenceScore += 0.2;
      const { academicRank, degree } = classifyAcademicRankAndDegree(raw.rawName, raw.rawTitle);
      if (raw.rawTitle || academicRank || degree) confidenceScore += 0.1;
      if (raw.rawDepartment) confidenceScore += 0.1;
      if (raw.rawAvatarUrl && raw.rawAvatarUrl.startsWith("http")) confidenceScore += 0.1;
    } else {
      confidenceScore = 0.0;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    let status: "validated" | "needs_review" | "rejected" = "rejected";
    if (errors.length === 0) {
      status = confidenceScore >= 0.7 ? "validated" : "needs_review";
    }

    return {
      isValid: errors.length === 0,
      status,
      confidenceScore,
      errors,
      cleanedName,
    };
  }

  /**
   * Persists a candidate professor into staging_professors
   */
  public static async stageCandidate(raw: RawProfessorData, jobId?: string): Promise<string> {
    const validation = this.validateRawProfessor(raw);
    const stagingId = `stg-${randomUUID()}`;
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO staging_professors (
          id, job_id, institution_id, raw_data_json, normalized_name,
          validation_status, validation_errors_json, confidence_score, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          stagingId,
          jobId || null,
          raw.universityId,
          JSON.stringify(raw),
          removeDiacritics(validation.cleanedName),
          validation.status,
          JSON.stringify(validation.errors),
          validation.confidenceScore,
          now,
        ]
      );
    } else {
      const db = getSqliteDb();
      db.prepare(
        `INSERT INTO staging_professors (
          id, job_id, institution_id, raw_data_json, normalized_name,
          validation_status, validation_errors_json, confidence_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        stagingId,
        jobId || null,
        raw.universityId,
        JSON.stringify(raw),
        removeDiacritics(validation.cleanedName),
        validation.status,
        JSON.stringify(validation.errors),
        validation.confidenceScore,
        now
      );
    }

    return stagingId;
  }
}
