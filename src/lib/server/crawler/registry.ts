/**
 * Persistent University Registry for Nationwide Academic Crawling
 *
 * Maintains a comprehensive, database-backed registry of educational institutions
 * in Vietnam across universities, academies, and institutes.
 * Prioritizes official MOET, government portals, and verified university domains.
 */

import { getSqliteDatabase } from "../sqliteClient";
import { getPostgresPool } from "../postgresClient";
import { isPostgresConfigured } from "../db";
import { initCrawlerSqliteSchema, initCrawlerPostgresSchema } from "./schema";

export interface EducationalInstitution {
  id: string;
  name: string;
  shortName: string;
  englishName?: string;
  city?: string;
  region?: "Miền Bắc" | "Miền Trung" | "Miền Nam";
  officialDomain?: string;
  officialWebsite?: string;
  institutionType?: "university" | "academy" | "college" | "institute";
  alternativeNames?: string[];
  discoverySource?: string;
  verificationStatus?: "verified" | "unverified" | "pending_review";
  crawlStatus?: "pending" | "discovering" | "queued" | "crawling" | "completed" | "partial" | "failed" | "inaccessible";
  totalProfessors?: number;
  lastSuccessfulCrawl?: number;
  lastAttemptedCrawl?: number;
  estimatedPages?: number;
  discoveredStaffPages?: number;
  extractedProfessors?: number;
  validatedRecords?: number;
  failedJobs?: number;
  lastErrorMessage?: string;
  nextScheduledCrawl?: number;
  faculties?: string[];
}

export type RegisteredInstitution = EducationalInstitution;

/**
 * Authoritative Nationwide Higher Education Institutions Corpus
 * Covers major public, private, and international institutions across Vietnam.
 */
export const NATIONWIDE_INSTITUTION_DIRECTORY: Partial<EducationalInstitution>[] = [
  // --- Miền Bắc (Northern Vietnam) ---
  {
    id: "hust",
    name: "Đại học Bách Khoa Hà Nội",
    shortName: "HUST",
    englishName: "Hanoi University of Science and Technology",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "hust.edu.vn",
    officialWebsite: "https://hust.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Bách Khoa", "Bách Khoa Hà Nội", "DHBK Ha Noi"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "vnu-uet",
    name: "Trường Đại học Công nghệ, Đại học Quốc gia Hà Nội",
    shortName: "VNU-UET",
    englishName: "VNU University of Engineering and Technology",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "uet.vnu.edu.vn",
    officialWebsite: "https://uet.vnu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Công nghệ ĐHQGHN", "UET"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "neu",
    name: "Trường Đại học Kinh tế Quốc dân",
    shortName: "NEU",
    englishName: "National Economics University",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "neu.edu.vn",
    officialWebsite: "https://neu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Kinh tế Quốc dân", "Kinh Te Quoc Dan"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "ftu",
    name: "Trường Đại học Ngoại thương",
    shortName: "FTU",
    englishName: "Foreign Trade University",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "ftu.edu.vn",
    officialWebsite: "https://ftu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Ngoại Thương", "Đại học Ngoại Thương"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "fpt",
    name: "Trường Đại học FPT",
    shortName: "FPT",
    englishName: "FPT University",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "fpt.edu.vn",
    officialWebsite: "https://fpt.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học FPT", "FPTU", "FSB"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "ptit",
    name: "Học viện Công nghệ Bưu chính Viễn thông",
    shortName: "PTIT",
    englishName: "Posts and Telecommunications Institute of Technology",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "ptit.edu.vn",
    officialWebsite: "https://portal.ptit.edu.vn",
    institutionType: "academy",
    alternativeNames: ["Học viện Bưu chính Viễn thông", "Bưu Chính"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "hmu",
    name: "Trường Đại học Y Hà Nội",
    shortName: "HMU",
    englishName: "Hanoi Medical University",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "hmu.edu.vn",
    officialWebsite: "https://hmu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Y Hà Nội", "Y Hà Nội"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "dav",
    name: "Học viện Ngoại giao",
    shortName: "DAV",
    englishName: "Diplomatic Academy of Vietnam",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "dav.edu.vn",
    officialWebsite: "https://dav.edu.vn",
    institutionType: "academy",
    alternativeNames: ["Học viện Ngoại giao Việt Nam"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "ba",
    name: "Học viện Ngân hàng",
    shortName: "BA",
    englishName: "Banking Academy of Vietnam",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "hvnh.edu.vn",
    officialWebsite: "https://hvnh.edu.vn",
    institutionType: "academy",
    alternativeNames: ["Học viện Ngân hàng Hà Nội"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "vinuni",
    name: "Trường Đại học VinUniversity",
    shortName: "VinUni",
    englishName: "VinUniversity",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "vinuni.edu.vn",
    officialWebsite: "https://vinuni.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học VinUni", "VinUniversity"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "vnu-vju",
    name: "Trường Đại học Việt Nhật, Đại học Quốc gia Hà Nội",
    shortName: "VJU",
    englishName: "Vietnam Japan University",
    city: "Hà Nội",
    region: "Miền Bắc",
    officialDomain: "vju.ac.vn",
    officialWebsite: "https://vju.ac.vn",
    institutionType: "university",
    alternativeNames: ["VJU", "Đại học Việt Nhật", "Trường Đại học Việt - Nhật", "Vietnam-Japan University", "Đại học Việt Nhật ĐHQGHN"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  // --- Miền Trung (Central Vietnam) ---
  {
    id: "dut",
    name: "Trường Đại học Bách khoa, Đại học Đà Nẵng",
    shortName: "DUT",
    englishName: "Danang University of Science and Technology",
    city: "Đà Nẵng",
    region: "Miền Trung",
    officialDomain: "dut.udn.vn",
    officialWebsite: "https://dut.udn.vn",
    institutionType: "university",
    alternativeNames: ["Bách Khoa Đà Nẵng", "Đại học Bách Khoa ĐHĐN"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "due",
    name: "Trường Đại học Kinh tế, Đại học Đà Nẵng",
    shortName: "DUE",
    englishName: "University of Economics, The University of Danang",
    city: "Đà Nẵng",
    region: "Miền Trung",
    officialDomain: "due.udn.vn",
    officialWebsite: "https://due.udn.vn",
    institutionType: "university",
    alternativeNames: ["Kinh tế Đà Nẵng", "Đại học Kinh tế ĐHĐN"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "husc",
    name: "Trường Đại học Khoa học, Đại học Huế",
    shortName: "HUSC",
    englishName: "Hue University of Sciences",
    city: "Thừa Thiên Huế",
    region: "Miền Trung",
    officialDomain: "husc.hueuni.edu.vn",
    officialWebsite: "https://husc.hueuni.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Khoa học Huế"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  // --- Miền Nam (Southern Vietnam) ---
  {
    id: "hcmut",
    name: "Trường Đại học Bách khoa, Đại học Quốc gia TP.HCM",
    shortName: "HCMUT",
    englishName: "Ho Chi Minh City University of Technology",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "hcmut.edu.vn",
    officialWebsite: "https://hcmut.edu.vn",
    institutionType: "university",
    alternativeNames: ["Bách Khoa TP.HCM", "DHBK TPHCM", "Bach Khoa Saigon"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "uit",
    name: "Trường Đại học Công nghệ Thông tin, Đại học Quốc gia TP.HCM",
    shortName: "UIT",
    englishName: "University of Information Technology, VNU-HCM",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "uit.edu.vn",
    officialWebsite: "https://uit.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Công nghệ Thông tin ĐHQG-HCM", "UIT VNUHCM"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "uel",
    name: "Trường Đại học Kinh tế - Luật, Đại học Quốc gia TP.HCM",
    shortName: "UEL",
    englishName: "University of Economics and Law, VNU-HCM",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "uel.edu.vn",
    officialWebsite: "https://uel.edu.vn",
    institutionType: "university",
    alternativeNames: ["Kinh tế Luật ĐHQG TP.HCM", "UEL"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "hcmus",
    name: "Trường Đại học Khoa học Tự nhiên, Đại học Quốc gia TP.HCM",
    shortName: "HCMUS",
    englishName: "VNUHCM - University of Science",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "hcmus.edu.vn",
    officialWebsite: "https://hcmus.edu.vn",
    institutionType: "university",
    alternativeNames: ["Khoa học Tự nhiên TP.HCM", "KHTN TPHCM", "HCMUS"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "hcmussh",
    name: "Trường Đại học Khoa học Xã hội và Nhân văn, Đại học Quốc gia TP.HCM",
    shortName: "HCMUSSH",
    englishName: "VNUHCM - University of Social Sciences and Humanities",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "hcmussh.edu.vn",
    officialWebsite: "https://hcmussh.edu.vn",
    institutionType: "university",
    alternativeNames: ["Khoa học Xã hội và Nhân văn TP.HCM", "KHXH&NV", "USSH", "USSH-HCM"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "hcmiu",
    name: "Trường Đại học Quốc tế, Đại học Quốc gia TP.HCM",
    shortName: "HCMIU",
    englishName: "International University, VNU-HCM",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "hcmiu.edu.vn",
    officialWebsite: "https://hcmiu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Quốc tế ĐHQG-HCM", "HCMIU", "IU", "iu-vnu"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "medvnu",
    name: "Trường Đại học Khoa học Sức khỏe, Đại học Quốc gia TP.HCM",
    shortName: "UHS",
    englishName: "University of Health Sciences, VNU-HCM",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "medvnu.edu.vn",
    officialWebsite: "https://medvnu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Khoa Y ĐHQG-HCM", "SMP-VNU", "UHS", "Khoa học Sức khỏe"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "agu",
    name: "Trường Đại học An Giang, Đại học Quốc gia TP.HCM",
    shortName: "AGU",
    englishName: "An Giang University, VNU-HCM",
    city: "An Giang",
    region: "Miền Nam",
    officialDomain: "agu.edu.vn",
    officialWebsite: "https://agu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học An Giang", "AGU", "ĐH An Giang ĐHQG-HCM"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "vnuhcm",
    name: "Đại học Quốc gia Thành phố Hồ Chí Minh",
    shortName: "VNU-HCM",
    englishName: "Vietnam National University, Ho Chi Minh City",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "vnuhcm.edu.vn",
    officialWebsite: "https://vnuhcm.edu.vn",
    institutionType: "university",
    alternativeNames: ["ĐHQG-HCM", "ĐHQG TP.HCM", "VNU-HCM", "INOMAR", "IER", "INT"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "ctu",
    name: "Trường Đại học Cần Thơ",
    shortName: "CTU",
    englishName: "Can Tho University",
    city: "Cần Thơ",
    region: "Miền Nam",
    officialDomain: "ctu.edu.vn",
    officialWebsite: "https://ctu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Đại học Cần Thơ", "Can Tho University"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "rmit",
    name: "Đại học RMIT Việt Nam",
    shortName: "RMIT",
    englishName: "RMIT University Vietnam",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "rmit.edu.vn",
    officialWebsite: "https://www.rmit.edu.vn",
    institutionType: "university",
    alternativeNames: ["RMIT Vietnam", "Đại học RMIT"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "ump",
    name: "Đại học Y Dược TP. Hồ Chí Minh",
    shortName: "UMP",
    englishName: "University of Medicine and Pharmacy at Ho Chi Minh City",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "ump.edu.vn",
    officialWebsite: "https://ump.edu.vn",
    institutionType: "university",
    alternativeNames: ["Y Dược TP.HCM", "Đại học Y Dược TPHCM"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
  {
    id: "tdtu",
    name: "Trường Đại học Tôn Đức Thắng",
    shortName: "TDTU",
    englishName: "Ton Duc Thang University",
    city: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    officialDomain: "tdtu.edu.vn",
    officialWebsite: "https://tdtu.edu.vn",
    institutionType: "university",
    alternativeNames: ["Tôn Đức Thắng", "Đại học Tôn Đức Thắng"],
    discoverySource: "moet_directory",
    verificationStatus: "verified",
  },
];

/**
 * Service managing persistent institution registry in the database.
 */
export class UniversityRegistryService {
  private static initialized = false;

  /**
   * Initializes schema and seeds foundational institutions if missing.
   */
  public static async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await initCrawlerPostgresSchema(pool);
    } else {
      const sqlite = getSqliteDatabase();
      await initCrawlerSqliteSchema(sqlite);
    }

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const countRes = await pool.query("SELECT COUNT(*) FROM universities");
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        await this.seedNationwideDirectory();
      }
    } else {
      const db = getSqliteDatabase();
      const countRes = db.prepare("SELECT COUNT(*) as count FROM universities").get() as { count: number };
      if (countRes.count === 0) {
        await this.seedNationwideDirectory();
      }
    }
    this.initialized = true;
  }

  public static async seedInitialRegistry(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * Seeds the nationwide directory into the database without overwriting existing records.
   */
  public static async seedNationwideDirectory(): Promise<number> {
    let seededCount = 0;
    const now = Date.now();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        for (const inst of NATIONWIDE_INSTITUTION_DIRECTORY) {
          const res = await client.query(
            `
            INSERT INTO universities (
              id, name, short_name, english_name, city, region,
              official_domain, official_website, institution_type,
              alternative_names, discovery_source, verification_status,
              crawl_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              official_domain = COALESCE(universities.official_domain, EXCLUDED.official_domain),
              official_website = COALESCE(universities.official_website, EXCLUDED.official_website),
              alternative_names = COALESCE(universities.alternative_names, EXCLUDED.alternative_names),
              updated_at = EXCLUDED.updated_at
            RETURNING id;
            `,
            [
              inst.id,
              inst.name,
              inst.shortName,
              inst.englishName || null,
              inst.city || null,
              inst.region || null,
              inst.officialDomain || null,
              inst.officialWebsite || null,
              inst.institutionType || "university",
              JSON.stringify(inst.alternativeNames || []),
              inst.discoverySource || "moet_directory",
              inst.verificationStatus || "verified",
              inst.crawlStatus || "pending",
              now,
              now,
            ]
          );
          if (res.rowCount && res.rowCount > 0) seededCount++;
        }
      } finally {
        client.release();
      }
    } else {
      const db = getSqliteDatabase();
      const stmt = db.prepare(`
        INSERT INTO universities (
          id, name, short_name, english_name, city, region,
          official_domain, official_website, institution_type,
          alternative_names, discovery_source, verification_status,
          crawl_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          official_domain = COALESCE(universities.official_domain, excluded.official_domain),
          official_website = COALESCE(universities.official_website, excluded.official_website),
          alternative_names = COALESCE(universities.alternative_names, excluded.alternative_names),
          updated_at = excluded.updated_at;
      `);

      for (const inst of NATIONWIDE_INSTITUTION_DIRECTORY) {
        stmt.run(
          inst.id,
          inst.name,
          inst.shortName,
          inst.englishName || null,
          inst.city || null,
          inst.region || null,
          inst.officialDomain || null,
          inst.officialWebsite || null,
          inst.institutionType || "university",
          JSON.stringify(inst.alternativeNames || []),
          inst.discoverySource || "moet_directory",
          inst.verificationStatus || "verified",
          inst.crawlStatus || "pending",
          now,
          now
        );
        seededCount++;
      }
    }

    return seededCount;
  }

  /**
   * Retrieves all registered educational institutions.
   */
  public static async getAllInstitutions(): Promise<EducationalInstitution[]> {
    await this.ensureInitialized();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(`
        SELECT 
          id, name, short_name as "shortName", english_name as "englishName",
          city, region, official_domain as "officialDomain", official_website as "officialWebsite",
          institution_type as "institutionType", alternative_names as "alternativeNames",
          discovery_source as "discoverySource", verification_status as "verificationStatus",
          crawl_status as "crawlStatus", total_professors as "totalProfessors",
          last_successful_crawl as "lastSuccessfulCrawl", last_attempted_crawl as "lastAttemptedCrawl",
          estimated_pages as "estimatedPages", discovered_staff_pages as "discoveredStaffPages",
          extracted_professors as "extractedProfessors", validated_records as "validatedRecords",
          failed_jobs as "failedJobs", last_error_message as "lastErrorMessage",
          next_scheduled_crawl as "nextScheduledCrawl"
        FROM universities
        ORDER BY total_professors DESC, name ASC;
      `);

      return res.rows.map((r) => ({
        ...r,
        alternativeNames: typeof r.alternativeNames === "string" ? JSON.parse(r.alternativeNames) : r.alternativeNames || [],
      }));
    } else {
      const db = getSqliteDatabase();
      const rows = db.prepare(`
        SELECT 
          id, name, short_name as shortName, english_name as englishName,
          city, region, official_domain as officialDomain, official_website as officialWebsite,
          institution_type as institutionType, alternative_names as alternativeNames,
          discovery_source as discoverySource, verification_status as verificationStatus,
          crawl_status as crawlStatus, total_professors as totalProfessors,
          last_successful_crawl as lastSuccessfulCrawl, last_attempted_crawl as lastAttemptedCrawl,
          estimated_pages as estimatedPages, discovered_staff_pages as discoveredStaffPages,
          extracted_professors as extractedProfessors, validated_records as validatedRecords,
          failed_jobs as failedJobs, last_error_message as lastErrorMessage,
          next_scheduled_crawl as nextScheduledCrawl
        FROM universities
        ORDER BY total_professors DESC, name ASC;
      `).all() as any[];

      return rows.map((r) => ({
        ...r,
        alternativeNames: typeof r.alternativeNames === "string" ? JSON.parse(r.alternativeNames) : r.alternativeNames || [],
      }));
    }
  }

  /**
   * Retrieves an institution by ID.
   */
  public static async getInstitutionById(id: string): Promise<EducationalInstitution | null> {
    await this.ensureInitialized();

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(`
        SELECT 
          id, name, short_name as "shortName", english_name as "englishName",
          city, region, official_domain as "officialDomain", official_website as "officialWebsite",
          institution_type as "institutionType", alternative_names as "alternativeNames",
          discovery_source as "discoverySource", verification_status as "verificationStatus",
          crawl_status as "crawlStatus", total_professors as "totalProfessors",
          last_successful_crawl as "lastSuccessfulCrawl", last_attempted_crawl as "lastAttemptedCrawl",
          estimated_pages as "estimatedPages", discovered_staff_pages as "discoveredStaffPages",
          extracted_professors as "extractedProfessors", validated_records as "validatedRecords",
          failed_jobs as "failedJobs", last_error_message as "lastErrorMessage",
          next_scheduled_crawl as "nextScheduledCrawl"
        FROM universities
        WHERE id = $1;
      `, [id]);

      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...r,
        alternativeNames: typeof r.alternativeNames === "string" ? JSON.parse(r.alternativeNames) : r.alternativeNames || [],
      };
    } else {
      const db = getSqliteDatabase();
      const r = db.prepare(`
        SELECT 
          id, name, short_name as shortName, english_name as englishName,
          city, region, official_domain as officialDomain, official_website as officialWebsite,
          institution_type as institutionType, alternative_names as alternativeNames,
          discovery_source as discoverySource, verification_status as verificationStatus,
          crawl_status as crawlStatus, total_professors as totalProfessors,
          last_successful_crawl as lastSuccessfulCrawl, last_attempted_crawl as lastAttemptedCrawl,
          estimated_pages as estimatedPages, discovered_staff_pages as discoveredStaffPages,
          extracted_professors as extractedProfessors, validated_records as validatedRecords,
          failed_jobs as failedJobs, last_error_message as lastErrorMessage,
          next_scheduled_crawl as nextScheduledCrawl
        FROM universities
        WHERE id = ?;
      `).get(id) as any;

      if (!r) return null;
      return {
        ...r,
        alternativeNames: typeof r.alternativeNames === "string" ? JSON.parse(r.alternativeNames) : r.alternativeNames || [],
      };
    }
  }

  /**
   * Discovers and registers a newly identified institution, preventing naive duplicates.
   */
  public static async registerOrUpdateInstitution(
    inst: Partial<EducationalInstitution>
  ): Promise<{ registered: boolean; institutionId: string; action: "created" | "updated" | "skipped" }> {
    if (!inst.name || (!inst.id && !inst.officialDomain && !inst.shortName)) {
      throw new Error("Invalid institution record: name and identifier (id, domain, or shortName) are required.");
    }

    const domain = inst.officialDomain?.toLowerCase().trim() || "";
    const shortName = inst.shortName?.trim().toUpperCase() || "";
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const coreName = norm(inst.name);

    // Check for existing institution by domain, id, core name, or alias
    const existing = await this.getAllInstitutions();
    let matched = existing.find(
      (e) =>
        (domain && e.officialDomain?.toLowerCase() === domain) ||
        (inst.id && e.id === inst.id) ||
        (coreName && norm(e.name) === coreName) ||
        (shortName && e.shortName.toUpperCase() === shortName && (!inst.city || e.city === inst.city)) ||
        (Array.isArray(e.alternativeNames) && e.alternativeNames.some((a) => norm(a) === coreName))
    );

    // If not matched directly, check institution_aliases table
    if (!matched) {
      try {
        if (isPostgresConfigured()) {
          const pool = getPostgresPool();
          const lookupKeys = [
            inst.id,
            domain,
            shortName.toLowerCase(),
            domain.split(".")[0],
          ].filter(Boolean);

          if (lookupKeys.length > 0) {
            const aliasRes = await pool.query(
              `SELECT canonical_id FROM institution_aliases WHERE alias_id = ANY($1) LIMIT 1`,
              [lookupKeys]
            );
            if (aliasRes.rows.length > 0) {
              const canonId = aliasRes.rows[0].canonical_id;
              matched = existing.find((e) => e.id === canonId);
            }
          }
        }
      } catch (err) {
        console.warn("[CrawlerRegistry] Error looking up aliases:", err);
      }
    }

    const now = Date.now();

    if (matched) {
      // Update existing record
      if (isPostgresConfigured()) {
        const pool = getPostgresPool();
        await pool.query(
          `
          UPDATE universities
          SET 
            official_website = COALESCE(universities.official_website, $1),
            official_domain = COALESCE(universities.official_domain, $2),
            crawl_status = COALESCE($3, universities.crawl_status),
            last_attempted_crawl = COALESCE($4, universities.last_attempted_crawl),
            updated_at = $5
          WHERE id = $6;
          `,
          [inst.officialWebsite || null, domain || null, inst.crawlStatus || null, now, now, matched.id]
        );
      } else {
        const db = getSqliteDatabase();
        db.prepare(
          `
          UPDATE universities
          SET 
            official_website = COALESCE(universities.official_website, ?),
            official_domain = COALESCE(universities.official_domain, ?),
            crawl_status = COALESCE(?, universities.crawl_status),
            last_attempted_crawl = COALESCE(?, universities.last_attempted_crawl),
            updated_at = ?
          WHERE id = ?;
          `
        ).run(inst.officialWebsite || null, domain || null, inst.crawlStatus || null, now, now, matched.id);
      }
      return { registered: true, institutionId: matched.id, action: "updated" };
    } else {
      if (inst.verificationStatus === "verified") {
        // Create verified institution record
        const newId = inst.id || (domain ? `inst-${domain.replace(/[^a-z0-9]/g, "-")}` : `inst-${shortName.toLowerCase()}`);
        if (isPostgresConfigured()) {
          const pool = getPostgresPool();
          await pool.query(
            `
            INSERT INTO universities (
              id, name, short_name, english_name, city, region,
              official_domain, official_website, institution_type,
              verification_status, crawl_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              short_name = EXCLUDED.short_name,
              updated_at = EXCLUDED.updated_at;
            `,
            [
              newId,
              inst.name,
              inst.shortName || newId.toUpperCase(),
              inst.englishName || null,
              inst.city || null,
              inst.region || "Miền Bắc",
              domain || null,
              inst.officialWebsite || null,
              inst.institutionType || "university",
              "verified",
              inst.crawlStatus || "pending",
              now,
              now,
            ]
          );
        } else {
          const db = getSqliteDatabase();
          db.prepare(
            `
            INSERT INTO universities (
              id, name, short_name, english_name, city, region,
              official_domain, official_website, institution_type,
              verification_status, crawl_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              short_name = excluded.short_name,
              updated_at = excluded.updated_at;
            `
          ).run(
            newId,
            inst.name,
            inst.shortName || newId.toUpperCase(),
            inst.englishName || null,
            inst.city || null,
            inst.region || "Miền Bắc",
            domain || null,
            inst.officialWebsite || null,
            inst.institutionType || "university",
            "verified",
            inst.crawlStatus || "pending",
            now,
            now
          );
        }
        return { registered: true, institutionId: newId, action: "created" };
      }

      // Do not dynamically create unauthorized inst-* entities.
      // Canonical registry is strictly anchored to official MOET institutions.
      console.warn(
        `[CrawlerRegistry] Blocked creation of unverified non-canonical institution: "${inst.name}" (${domain || shortName || inst.id}). Must match official MOET registry.`
      );
      return { registered: false, institutionId: "", action: "skipped" };
    }
  }

  /**
   * Deletes an institution by ID (useful for test teardown and cleanup).
   */
  public static async deleteInstitution(id: string): Promise<boolean> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("DELETE FROM universities WHERE id = $1", [id]);
      return (res.rowCount || 0) > 0;
    } else {
      const db = getSqliteDatabase();
      const info = db.prepare("DELETE FROM universities WHERE id = ?").run(id);
      return info.changes > 0;
    }
  }

  /**
   * Updates crawl telemetry metrics for an institution.
   */
  public static async updateInstitutionMetrics(
    institutionId: string,
    metrics: {
      crawlStatus?: string;
      lastSuccessfulCrawl?: number;
      lastAttemptedCrawl?: number;
      discoveredStaffPages?: number;
      extractedProfessors?: number;
      validatedRecords?: number;
      failedJobs?: number;
      lastErrorMessage?: string;
    }
  ): Promise<void> {
    const now = Date.now();
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      await pool.query(
        `
        UPDATE universities
        SET
          crawl_status = COALESCE($1, crawl_status),
          last_successful_crawl = COALESCE($2, last_successful_crawl),
          last_attempted_crawl = COALESCE($3, last_attempted_crawl),
          discovered_staff_pages = COALESCE($4, discovered_staff_pages),
          extracted_professors = COALESCE($5, extracted_professors),
          validated_records = COALESCE($6, validated_records),
          failed_jobs = COALESCE($7, failed_jobs),
          last_error_message = COALESCE($8, last_error_message),
          total_professors = GREATEST(COALESCE(total_professors, 0), COALESCE($5, 0)),
          updated_at = $9
        WHERE id = $10;
        `,
        [
          metrics.crawlStatus || null,
          metrics.lastSuccessfulCrawl || null,
          metrics.lastAttemptedCrawl || null,
          metrics.discoveredStaffPages || null,
          metrics.extractedProfessors || null,
          metrics.validatedRecords || null,
          metrics.failedJobs || null,
          metrics.lastErrorMessage || null,
          now,
          institutionId,
        ]
      );
    } else {
      const db = getSqliteDatabase();
      db.prepare(
        `
        UPDATE universities
        SET
          crawl_status = COALESCE(?, crawl_status),
          last_successful_crawl = COALESCE(?, last_successful_crawl),
          last_attempted_crawl = COALESCE(?, last_attempted_crawl),
          discovered_staff_pages = COALESCE(?, discovered_staff_pages),
          extracted_professors = COALESCE(?, extracted_professors),
          validated_records = COALESCE(?, validated_records),
          failed_jobs = COALESCE(?, failed_jobs),
          last_error_message = COALESCE(?, last_error_message),
          total_professors = MAX(COALESCE(total_professors, 0), COALESCE(?, 0)),
          updated_at = ?
        WHERE id = ?;
        `
      ).run(
        metrics.crawlStatus || null,
        metrics.lastSuccessfulCrawl || null,
        metrics.lastAttemptedCrawl || null,
        metrics.discoveredStaffPages || null,
        metrics.extractedProfessors || null,
        metrics.validatedRecords || null,
        metrics.failedJobs || null,
        metrics.lastErrorMessage || null,
        metrics.extractedProfessors || 0,
        now,
        institutionId
      );
    }
  }

  public static async syncInstitutionStats(
    institutionId: string,
    extractedCount = 0,
    validatedCount = 0
  ): Promise<void> {
    await this.updateInstitutionMetrics(institutionId, {
      extractedProfessors: extractedCount,
      validatedRecords: validatedCount,
      crawlStatus: validatedCount > 0 ? "completed" : "partial",
    });
  }
}

export const UniversityRegistry = UniversityRegistryService;

