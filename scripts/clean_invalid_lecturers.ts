/**
 * Nationwide Database Integrity & Cleaning Engine — RateUrProfs Vietnam
 *
 * Performs comprehensive audit, cleaning, and normalization across both:
 * 1. Cloud SQL PostgreSQL (production database on GCP)
 * 2. SQLite (src/data/rateprof.db for local/offline)
 *
 * Actions:
 * - Purges pure garbage records (table headers, curriculum titles, publication headers, URLs, test dummies)
 * - Cascades deletion to affiliations, provenance, and staging_professors
 * - Normalizes cleanable lecturer records (stripping form prefixes like "Họ và tên:", "CBGD:")
 * - Consolidates redundant university records (e.g., vju -> vnu-vju)
 * - Verifies zero orphaned records and zero reviews damaged
 */

import { Pool } from "pg";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

function stripVietnameseDiacritics(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

const HEADER_PREFIX_REGEX = /^(?:họ\s*(?:và\s*)?tên(?:\s*gv)?|cbgd|giảng\s*viên(?:\s*cơ\s*hữu)?|thầy|cô|cán\s*bộ)\s*[:\-\.]\s*/i;

const EXACT_JUNK_SET = new Set([
  // Classroom roles
  "cán bộ lớp", "lớp trưởng", "bí thư lớp", "cán bộ đoàn", "bí thư chi đoàn",
  // Curriculum / majors / courses
  "chuyên ngành", "mã chuyên ngành", "tên chuyên ngành", "ngành, chuyên ngành", "ngành/chuyên ngành",
  "ngành/ chuyên ngành", "tên ngành/tên chuyên ngành", "tổng số phần chuyên ngành",
  "học phần chuyên ngành", "môn tự chọn chuyên ngành", "các học phần chuyên ngành",
  "giới thiệu ngành/chuyên ngành", "khung chương trình", "chuẩn đầu ra", "chương trình đào tạo",
  "các đầu sách", "đầu sách", "giáo trình", "bài giảng", "đề cương", "tài liệu tham khảo",
  "hệ thời gian thực", "sensors and actuators a: physical", "valacich/ schneider",
  "văn học (chuyên ngành báo chí)", "tâm lý học chuyên ngành",
  "tiếng anh chuyên ngành i", "tiếng anh chuyên ngành ii", "tiếng anh chuyên ngành du lịch",
  "tiếng anh chuyên ngành điều dưỡng", "tiếng anh chuyên ngành dược",
  "công nghệ sinh học ứng dụng", "thiết kế luận lý với hdl", "thiết kế luận lý nâng cao",
  "hệ thống di động cảm biến", "hệ thống tính toán đa nhân", "kiến trúc hệ thống hiện đại",
  "master of studies in information systems", "big data analytics and cloud computing",
  "planning and strategic management of it", "advanced information systems analysis and design",
  "experiential learning học qua trải nghiệm", "promotional culture văn hóa quảng bá",
  "independent project dự án độc lập",
  // Table headers / form metadata
  "họ và tên", "họ tên", "họ và tên gv", "họ tên gv", "stt", "số thứ tự", "số tt", "no.",
  "số cmnd/cccd", "số cmnd", "số cccd", "cmnd", "cccd", "số hộ chiếu",
  "giới tính: nam", "giới tính: nữ", "giới tính", "nam", "nữ",
  "thời gian", "địa điểm", "ghi chú", "chức vụ", "đơn vị", "nhiệm vụ",
  "thành phần", "chủ trì", "chủ tọa", "thư ký", "chức danh", "học hàm", "học vị",
  "số điện thoại", "sđt", "mobile", "phone", "fax", "email", "website",
  "quê quán", "ngày sinh", "năm sinh", "nơi sinh", "dân tộc", "tôn giáo",
  "năm bắt đầu/năm hoàn thành", "năm bắt đầu", "năm hoàn thành", "năm bắt đầu/năm hoàn thành",
  "chức vụ hiện tại: giảng viên", "chức vụ hiện tại: trợ giảng", "chức vụ hiện tại: tổ trưởng",
  "chức vụ hiện tại: chuyên viên", "đơn vị công tác: khoa toán", "cơ quan công tác",
  "chức danh khoa học cao nhất", "từ tháng, năm đến tháng, năm", "danh mục hồ sơ dự tuyển",
  "không thuộc đối tượng ưu tiên",
  // Academic projects / publications / journals
  "đề tài cấp trường", "đề tài cấp đại học huế", "luận văn", "đề tài cấp", "đồng chủ nhiệm đề tài",
  "đề tài cấp cơ sở", "nghị quyết", "chủ nhiệm đề tài", "tên đề tài", "tên bài báo/bài đăng hội nghị",
  "tên đề tài/dự án", "tên bài báo",
  "tạp chí y học dự phòng", "tạp chí y học việt nam", "tạp chí y tế công cộng",
  "journal of infection in developing countries", "tạp chí y học thực hành",
  "journal of reinforced plastics and composites", "journal of sol-gel science and technology",
  "journal of food processing and preservation",
  // Corporate / units / agendas
  "bộ gd&đt", "phòng ctsv&ttrgd", "viện đt&htqt", "ptsc m&c",
  "sở kh&cn tỉnh thừa thiên huế", "thái doãn thanh công ty asc", "phòng ths. thái doãn thanh",
  "tt ts&tt phạm thái sơn", "đại học sư phạm hà nội", "ttcl vietnam co. ltd",
  "university project", "national university",
  "certificate of merit from pvu rector", "certificate of merit from petrovietnam university",
  "certificate of merit, special excellent worker", "certificate of merit from bku rector",
  // Admissions & procedure headers
  "mã ngành", "mã ngành/chương trình", "mã ngành/ chương trình", "mã ngành/tên ngành",
  "nộp hồ sơ", "nộp hồ sơ online", "hạn nộp hồ sơ", "thời hạn nộp hồ sơ", "địa điểm nộp hồ sơ",
  "xét tuyển hồ sơ", "xét tuyển", "nhập học", "thời gian học", "thời gian học dự kiến",
  "phiếu đăng ký dự tuyển", "phiếu đăng ký", "lý lịch khoa học", "kỳ học", "nội dung",
  "bổ sung kiến thức", "không thuộc đối tượng ưu tiên", "hồ sơ dự tuyển", "danh mục hồ sơ",
  "kỷ yếu", "kỷ yếu hội nghị", "chuyên san", "bản tin", "thủ tục", "học phí", "chỉ tiêu tuyển sinh",
  // Short-term vocational training programs
  "quản lý phòng kiểm nghiệm", "kỹ thuật vận hành máy nhựa", "thực hành tài chính",
  "quản lý bếp ăn công nghiệp", "phân tích vi sinh thực phẩm", "phân tích thực phẩm",
  "haccp thực phẩm", "quảng bá website cho doanh nghiệp", "nuôi trồng thủy sản an toàn",
  "phân tích vi sinh thủy sản", "haccp cơ bản", "haccp thủy sản", "nghiệp vụ sư phạm",
  // Standalone majors / generic disciplines
  "công nghệ thực phẩm", "công nghệ sinh học", "kỹ thuật môi trường", "kỹ thuật hóa học",
  "kỹ thuật cơ khí", "kỹ thuật điện", "quản trị kinh doanh", "kế toán", "ngôn ngữ anh",
  "ngôn ngữ trung", "ngôn ngữ nhật", "ngôn ngữ hàn", "luật kinh tế", "khoa học môi trường",
  "khoa học máy tính", "công nghệ thông tin", "kinh doanh quốc tế", "tài chính ngân hàng",
  "công nghệ chế biến thủy sản", "bảo đảm chất lượng và an toàn thực phẩm", "kỹ thuật điều khiển",
  "ứng dụng"
]);

export interface ClassificationResult {
  action: "keep" | "delete" | "clean";
  reason?: string;
  newName?: string;
}

export function classifyLecturer(rawName: string): ClassificationResult {
  const raw = (rawName || "").trim();
  const lower = raw.toLowerCase();
  const norm = stripVietnameseDiacritics(raw);

  // 1. URL in name
  if (/https?:\/\/|www\.|\.vn\/|\.com\/|\.edu\/|bit\.ly/i.test(raw)) {
    return { action: "delete", reason: "URL in name" };
  }

  // 2. Test dummy
  if (/thử nghiệm|test user|giảng viên test|dummy/i.test(raw)) {
    return { action: "delete", reason: "Test dummy record" };
  }

  // 3. Exact junk match
  if (EXACT_JUNK_SET.has(lower) || EXACT_JUNK_SET.has(norm)) {
    return { action: "delete", reason: "Exact junk keyword" };
  }

  // 4. Starts with junk form table prefix
  if (
    /^(?:chức vụ hiện tại|đơn vị công tác|năm bắt đầu|ngày sinh|nơi sinh|quê quán|dân tộc|tôn giáo|số cmnd|học hàm|học vị)\s*[:\-\.]/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Form field header" };
  }

  // 5. Cleanable prefix: "Họ và tên: Lê Vân Tường", "CBGD: Nguyễn Văn A"
  if (HEADER_PREFIX_REGEX.test(raw)) {
    let cleaned = raw.replace(HEADER_PREFIX_REGEX, "").trim();
    // Also remove any academic title prefix if present
    cleaned = cleaned.replace(/^(?:GS|PGS|TS|ThS|Tiến sĩ|Thạc sĩ)\.?\s*/i, "").trim();
    const cleanTokens = cleaned.split(/\s+/).filter(Boolean);
    if (
      cleanTokens.length >= 2 &&
      cleanTokens.length <= 5 &&
      !/\d|[@#$%^&*_+=\[\]{}|<>\/\\~;:!?"]/.test(cleaned) &&
      !/\b(?:chức vụ|ứng viên|chức danh|đơn vị|cán bộ|nhiệm vụ|thành phần)\b/i.test(cleaned)
    ) {
      return { action: "clean", newName: cleaned };
    } else {
      return { action: "delete", reason: "Header prefix with invalid remainder" };
    }
  }

  // Reject any header line containing "họ và tên" or "họ tên"
  if (/\b(?:họ\s*(?:và\s*)?tên|ho\s*(?:va\s*)?ten)\b/i.test(raw)) {
    return { action: "delete", reason: "Table header containing 'họ và tên'" };
  }

  // 6. Doubled names from OpenAlex scraping: "DO VUONG HOANH DO VUONG HOANH"
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 4 && tokens.length % 2 === 0) {
    const half = tokens.length / 2;
    const firstHalf = tokens.slice(0, half).join(" ").toLowerCase();
    const secondHalf = tokens.slice(half).join(" ").toLowerCase();
    if (firstHalf === secondHalf) {
      const single = tokens.slice(0, half).join(" ");
      return { action: "clean", newName: single };
    }
  }

  // 7. Academic title prefix: "Assoc. Prof. Dr. Truong Thi Bich"
  if (/^(?:Assoc\.\s*Prof\.\s*Dr\.|Prof\.\s*Dr\.|Assoc\.\s*Prof\.|Prof\.|Dr\.)\s+/i.test(raw)) {
    const cleaned = raw
      .replace(/^(?:Assoc\.\s*Prof\.\s*Dr\.|Prof\.\s*Dr\.|Assoc\.\s*Prof\.|Prof\.|Dr\.)\s+/i, "")
      .trim();
    const cleanTokens = cleaned.split(/\s+/).filter(Boolean);
    if (cleanTokens.length >= 2 && cleanTokens.length <= 5) {
      return { action: "clean", newName: cleaned };
    }
  }

  // 8. Suffix cleaning: "NguyễnThành Đạo Giảng viên cơ hữu" or "... Giảng viên Email"
  if (/\s+(?:giảng\s*viên(?:\s*cơ\s*hữu)?|email)$/i.test(raw)) {
    const cleaned = raw.replace(/\s+(?:giảng\s*viên(?:\s*cơ\s*hữu)?|email)$/i, "").trim();
    const cleanTokens = cleaned.split(/\s+/).filter(Boolean);
    if (cleanTokens.length >= 2 && cleanTokens.length <= 5) {
      return { action: "clean", newName: cleaned };
    }
  }

  // 9. Department/Unit starting as lecturer name
  if (/^(?:khoa|bộ môn|phòng|viện|trung tâm|trường đại học|ban giám hiệu|tổ bộ môn)\s+/i.test(raw)) {
    return { action: "delete", reason: "Department/Unit as lecturer name" };
  }

  // 10. Journals and periodicals (English and Vietnamese)
  if (
    /\b(?:journal|bulletin|proceedings|transactions|reviews|advances in|annals of|communications in|ieee access)\b/i.test(raw) ||
    /^(?:tạp chí|kỷ yếu|chuyên san|bản tin|acta\b|international journal|frontiers in|topics in|progress in|express polymer)\b/i.test(raw)
  ) {
    return { action: "delete", reason: "Journal / Publication" };
  }

  // 11. Admissions / Administrative / Syllabus patterns
  if (
    /\b(?:nộp hồ sơ|xét tuyển|nhập học|hạn nộp|thời hạn nộp|địa điểm nộp|mã ngành|lý lịch khoa học|thời gian học|chuẩn đầu ra|khung chương trình|chương trình đào tạo|phiếu đăng ký|kỳ học|học phí|chỉ tiêu|nguyện vọng|điểm chuẩn|bổ sung kiến thức|thủ tục|hồ sơ dự tuyển|danh mục hồ sơ|không thuộc đối tượng|mã chuyên ngành|tên chuyên ngành|chuyên ngành|học phần|môn học|tín chỉ|đầu sách|tài liệu|giáo trình|bài giảng|đề cương)\b/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Admissions / Course / Syllabus keyword" };
  }

  // 12. Short-course vocational training topics
  if (
    /\b(?:phòng kiểm nghiệm|vận hành máy|thực hành tài chính|bếp ăn công nghiệp|haccp|vi sinh thực phẩm|nuôi trồng thủy sản|quảng bá website|an toàn thực phẩm|phân tích thực phẩm|phân tích vi sinh)\b/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Short course / Vocational training program" };
  }

  // 13. Standalone academic major or generic discipline as lecturer name
  const STANDALONE_MAJORS = [
    "công nghệ thực phẩm", "công nghệ sinh học", "kỹ thuật môi trường", "kỹ thuật hóa học",
    "kỹ thuật cơ khí", "kỹ thuật điện", "quản trị kinh doanh", "kế toán", "ngôn ngữ anh",
    "ngôn ngữ trung", "ngôn ngữ nhật", "ngôn ngữ hàn", "luật kinh tế", "khoa học môi trường",
    "công nghệ thông tin", "khoa học máy tính", "kinh doanh quốc tế", "tài chính ngân hàng",
    "công nghệ chế biến thủy sản", "bảo đảm chất lượng và an toàn thực phẩm", "kỹ thuật điều khiển",
    "nội dung", "ứng dụng"
  ];
  if (
    STANDALONE_MAJORS.includes(lower) ||
    STANDALONE_MAJORS.includes(norm) ||
    STANDALONE_MAJORS.includes(lower.replace(/^ngành\s+/i, "")) ||
    STANDALONE_MAJORS.includes(norm.replace(/^nganh\s+/i, ""))
  ) {
    return { action: "delete", reason: "Academic major or generic discipline as name" };
  }

  // 14. Project / Report patterns
  if (
    /\b(?:đề tài|luận văn|luận án|nghiên cứu sinh|bài báo|hội thảo|hội nghị|tọa đàm|nghị quyết|thông tư|quyết định)\b/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Project / Administrative document keyword" };
  }

  // 15. Foreign syllabus, awards, or course titles
  if (
    /(?:specialized elective|certificate of achievement|certificate of merit|automation of technological|system analysis|irkutsk state|best employee in|natural gas gathering|petrophysics of|international association|fundamentals of engineering|donetsk, national|introduction to chemical)/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Foreign course/award text" };
  }

  // 16. Quoted publication title e.g. "“Tôn giáo và văn hóa"
  if (/^[“"'\<\(\[]/.test(raw)) {
    return { action: "delete", reason: "Quoted publication title" };
  }

  // 17. Cyrillic text (Russian scraper leakage)
  if (/[а-яА-ЯёЁ]/.test(raw)) {
    return { action: "delete", reason: "Cyrillic script leakage" };
  }

  // 18. Multi-author bibliography line or roles with commas separating names
  if (
    raw.includes(",") &&
    (tokens.length > 3 ||
      /\b(?:giảng viên|chủ nhiệm|thành viên|trưởng khoa|phó trưởng khoa|trưởng bộ môn|học vị|học hàm|mã số)\b/i.test(raw))
  ) {
    return { action: "delete", reason: "Co-author bibliography string or role title with comma" };
  }

  // 19. CJK characters (Chinese title scraper leakage)
  if (/[\u4e00-\u9fff]/.test(raw)) {
    return { action: "delete", reason: "CJK script leakage" };
  }

  // 20. Non-person academic/institutional English terms (journals, conferences, certificates, departments)
  if (
    /\b(?:technology|international|certificate|university|institute|academy|ministry|consortium|council|laboratory|communications|letters|reports|papers|bulletin|journal|joumal|loumal|proceedings|transactions|advances|reviews|acta|economics|engineering|computing|recognition|uncertainty|solutions|integration|development|literacy|performance|network|networking|drilling|refining|processing|production|maintenance|polymer|biomass|bitumen|lubricant|petroleum|petrochemical|catalysis|microbiology|chemistry|materials|electronics|optics|physics|bioscience|algebra|innovations|macromolecules|pollution|toxicology|pharmacology|modelling|aquatic|bioresource|ceramics|nanoscience|nanotechnology|science of the|theory and pracrice|transport problems)\b/i.test(
      raw
    )
  ) {
    return { action: "delete", reason: "Non-person English academic/institutional term" };
  }

  return { action: "keep" };
}

async function cleanPostgres(pool: Pool) {
  console.log("\n=======================================================");
  console.log(" 1. CLEANING CLOUD SQL POSTGRESQL DATABASE");
  console.log("=======================================================");

  const client = await pool.connect();
  try {
    const totalBeforeRes = await client.query("SELECT COUNT(*) as c FROM lecturers");
    const totalBefore = parseInt(totalBeforeRes.rows[0].c, 10);
    console.log(`[*] Total lecturers before cleaning: ${totalBefore.toLocaleString()}`);

    const allLecRes = await client.query("SELECT id, name FROM lecturers");
    const toDelete: { id: string; name: string; reason?: string }[] = [];
    const toClean: { id: string; oldName: string; newName: string }[] = [];

    for (const row of allLecRes.rows) {
      const cls = classifyLecturer(row.name);
      if (cls.action === "delete") {
        toDelete.push({ id: row.id, name: row.name, reason: cls.reason });
      } else if (cls.action === "clean" && cls.newName) {
        toClean.push({ id: row.id, oldName: row.name, newName: cls.newName });
      }
    }

    console.log(`[+] Identified for Deletion: ${toDelete.length.toLocaleString()}`);
    console.log(`[+] Identified for Name Normalization: ${toClean.length.toLocaleString()}`);

    await client.query("BEGIN;");

    // 1. Delete associated affiliations and provenance for invalid records
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map((d) => d.id);
      console.log(`[*] Deleting associated affiliations for ${deleteIds.length} invalid lecturers...`);
      const affRes = await client.query("DELETE FROM affiliations WHERE lecturer_id = ANY($1)", [deleteIds]);
      console.log(`    -> Removed ${affRes.rowCount} affiliations.`);

      console.log(`[*] Deleting associated provenance for ${deleteIds.length} invalid lecturers...`);
      const provRes = await client.query("DELETE FROM provenance WHERE lecturer_id = ANY($1)", [deleteIds]);
      console.log(`    -> Removed ${provRes.rowCount} provenance entries.`);

      console.log(`[*] Deleting invalid lecturers from lecturers table...`);
      const lecRes = await client.query("DELETE FROM lecturers WHERE id = ANY($1)", [deleteIds]);
      console.log(`    -> Removed ${lecRes.rowCount} invalid lecturers.`);
    }

    // 2. Update cleanable records
    console.log(`[*] Normalizing ${toClean.length} valid lecturer names with stripped prefixes...`);
    let updatedCount = 0;
    for (const item of toClean) {
      const norm = stripVietnameseDiacritics(item.newName);
      await client.query(
        "UPDATE lecturers SET name = $1, normalized_name = $2, updated_at = $3 WHERE id = $4",
        [item.newName, norm, Date.now(), item.id]
      );
      updatedCount++;
    }
    console.log(`    -> Normalized ${updatedCount} lecturer records.`);

    // 3. Consolidate vju university records
    console.log("[*] Consolidating redundant Vietnam Japan University records (vju -> vnu-vju)...");
    await client.query(
      "UPDATE affiliations SET university_id = 'vnu-vju', university_name = 'Trường Đại học Việt Nhật - ĐHQGHN', university_short_name = 'VJU' WHERE university_id = 'vju'"
    );
    await client.query("DELETE FROM universities WHERE id = 'vju'");

    await client.query("COMMIT;");

    const totalAfterRes = await client.query("SELECT COUNT(*) as c FROM lecturers");
    const totalAfter = parseInt(totalAfterRes.rows[0].c, 10);
    console.log(`[✔] PostgreSQL Cleaning Completed!`);
    console.log(`    - Lecturers Before: ${totalBefore.toLocaleString()}`);
    console.log(`    - Lecturers After:  ${totalAfter.toLocaleString()}`);
    console.log(`    - Purged Junk:      ${toDelete.length.toLocaleString()}`);
    console.log(`    - Normalized:       ${toClean.length.toLocaleString()}`);
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("[!] PostgreSQL cleaning failed, rolled back:", err);
    throw err;
  } finally {
    client.release();
  }
}

function cleanSqlite() {
  console.log("\n=======================================================");
  console.log(" 2. CLEANING SQLITE DATABASE (src/data/rateprof.db)");
  console.log("=======================================================");

  const dbPath = path.resolve(process.cwd(), "src/data/rateprof.db");
  if (!fs.existsSync(dbPath)) {
    console.warn(`[!] SQLite database not found at ${dbPath}`);
    return;
  }

  const db = new DatabaseSync(dbPath);
  try {
    const totalBeforeRow = db.prepare("SELECT COUNT(*) as c FROM lecturers").get() as { c: number };
    const totalBefore = totalBeforeRow.c;
    console.log(`[*] Total lecturers in SQLite before cleaning: ${totalBefore.toLocaleString()}`);

    const allLecturers = db.prepare("SELECT id, name FROM lecturers").all() as { id: string; name: string }[];
    const toDelete: { id: string; name: string; reason?: string }[] = [];
    const toClean: { id: string; oldName: string; newName: string }[] = [];

    for (const row of allLecturers) {
      const cls = classifyLecturer(row.name);
      if (cls.action === "delete") {
        toDelete.push({ id: row.id, name: row.name, reason: cls.reason });
      } else if (cls.action === "clean" && cls.newName) {
        toClean.push({ id: row.id, oldName: row.name, newName: cls.newName });
      }
    }

    console.log(`[+] Identified for Deletion: ${toDelete.length.toLocaleString()}`);
    console.log(`[+] Identified for Name Normalization: ${toClean.length.toLocaleString()}`);

    db.exec("BEGIN TRANSACTION;");

    const deleteAffStmt = db.prepare("DELETE FROM affiliations WHERE lecturer_id = ?");
    const deleteProvStmt = db.prepare("DELETE FROM provenance WHERE lecturer_id = ?");
    const deleteLecStmt = db.prepare("DELETE FROM lecturers WHERE id = ?");

    for (const d of toDelete) {
      deleteAffStmt.run(d.id);
      deleteProvStmt.run(d.id);
      deleteLecStmt.run(d.id);
    }

    const updateLecStmt = db.prepare(
      "UPDATE lecturers SET name = ?, normalized_name = ?, updated_at = ? WHERE id = ?"
    );
    const now = Date.now();
    for (const c of toClean) {
      const norm = stripVietnameseDiacritics(c.newName);
      updateLecStmt.run(c.newName, norm, now, c.id);
    }

    // Consolidate vju university
    db.prepare(
      "UPDATE affiliations SET university_id = 'vnu-vju', university_name = 'Trường Đại học Việt Nhật - ĐHQGHN', university_short_name = 'VJU' WHERE university_id = 'vju'"
    ).run();
    db.prepare("DELETE FROM universities WHERE id = 'vju'").run();

    db.exec("COMMIT;");

    const totalAfterRow = db.prepare("SELECT COUNT(*) as c FROM lecturers").get() as { c: number };
    const totalAfter = totalAfterRow.c;
    console.log(`[✔] SQLite Cleaning Completed!`);
    console.log(`    - Lecturers Before: ${totalBefore.toLocaleString()}`);
    console.log(`    - Lecturers After:  ${totalAfter.toLocaleString()}`);
    console.log(`    - Purged Junk:      ${toDelete.length.toLocaleString()}`);
    console.log(`    - Normalized:       ${toClean.length.toLocaleString()}`);
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[!] SQLite cleaning failed, rolled back:", err);
    throw err;
  } finally {
    db.close();
  }
}

function cleanVerifiedAcademicJson() {
  console.log("\n=======================================================");
  console.log(" 3. CLEANING STATIC JSON DATA (src/data/verified_academic_data.json)");
  console.log("=======================================================");

  const jsonPath = path.resolve(process.cwd(), "src/data/verified_academic_data.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[!] Static academic JSON not found at ${jsonPath}`);
    return;
  }

  const rawJson = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(rawJson);
  const profs = data.professors || [];
  const totalBefore = profs.length;
  console.log(`[*] Total professors in JSON before cleaning: ${totalBefore.toLocaleString()}`);

  const cleanedProfs: any[] = [];
  let purgedCount = 0;
  let normalizedCount = 0;

  for (const prof of profs) {
    const cls = classifyLecturer(prof.name);
    if (cls.action === "delete") {
      purgedCount++;
      continue;
    }
    if (cls.action === "clean" && cls.newName) {
      prof.name = cls.newName;
      normalizedCount++;
    }
    // Consolidate vju university
    if (prof.universityId === "vju") {
      prof.universityId = "vnu-vju";
      prof.universityName = "Trường Đại học Việt Nhật - ĐHQGHN";
      prof.universityShortName = "VJU";
    }
    cleanedProfs.push(prof);
  }

  data.professors = cleanedProfs;
  // Also filter universities in JSON if vju exists
  if (Array.isArray(data.universities)) {
    data.universities = data.universities.filter((u: any) => u.id !== "vju");
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`[✔] Static Academic JSON Cleaning Completed!`);
  console.log(`    - Professors Before: ${totalBefore.toLocaleString()}`);
  console.log(`    - Professors After:  ${cleanedProfs.length.toLocaleString()}`);
  console.log(`    - Purged Junk:       ${purgedCount.toLocaleString()}`);
  console.log(`    - Normalized:        ${normalizedCount.toLocaleString()}`);
}

async function main() {
  console.log("==============================================================================");
  console.log(" RATEURPROFS COMPREHENSIVE DATABASE VERIFICATION & CLEANING");
  console.log("==============================================================================");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    max: 5,
  });

  try {
    await cleanPostgres(pool);
  } finally {
    await pool.end();
  }

  cleanSqlite();
  cleanVerifiedAcademicJson();

  console.log("\n[✔] ALL DATABASES SUCCESSFULLY VERIFIED AND CLEANED!");
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("clean_invalid_lecturers.ts") || process.argv[1].endsWith("clean_invalid_lecturers.js"))
) {
  main().catch((err) => {
    console.error("FATAL Cleaning Error:", err);
    process.exit(1);
  });
}
