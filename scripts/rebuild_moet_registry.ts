/**
 * Rebuild RateUrProfs University Registry from Official MOET 327 Institutions Source
 *
 * Execution:
 *   npx tsx --env-file=.env.local scripts/rebuild_moet_registry.ts [--dry-run | --execute]
 *
 * Actions:
 *   1. Load and parse 327 official institutions from src/data/moet_official_327.json.
 *   2. Build canonical entity mappings retaining established slugs (hust, vnu-uet, vnu-vju, etc.)
 *      and assigning clean unique slugs for all 327 institutions.
 *   3. Reconcile all existing 1,469 database universities to the canonical 327 MOET scope.
 *   4. Re-point affiliations and reviews to canonical university IDs.
 *   5. Remove non-school affiliations and delete lecturers not in the 327 schools.
 *   6. Deduplicate affiliations to satisfy UNIQUE(lecturer_id, university_id).
 *   7. Rebuild universities table with all verified MOET metadata, leaving exactly 327 records.
 *   8. Upsert aliases into institution_aliases for all legacy IDs, official codes, and abbreviations.
 *   9. Recalculate total_professors and rating aggregates.
 *  10. Provide atomic ACID transaction guarantees and detailed audit logging.
 */

import fs from "node:fs";
import path from "node:path";
import { Pool, PoolClient } from "pg";

interface MoetRawItem {
  _id: string;
  code: string;
  title: string;
  website: string;
  crawlerLink?: string;
  rewriteURL?: string;
}

interface CanonicalUniversityDef {
  id: string;
  name: string;
  shortName: string;
  englishName?: string;
  officialCode: string;
  officialCodeSource: string;
  officialCodeVerifiedAt: number;
  officialCodeStatus: "verified";
  commonAbbreviations: string[];
  externalIdentifiers: Record<string, string>;
  officialDomain: string;
  officialWebsite: string;
  institutionType: "university" | "academy" | "institute" | "college";
  city: string;
  region: "Miền Bắc" | "Miền Trung" | "Miền Nam";
  sourceUrl: string;
  sourceId: string;
  importBatchId: string;
}

const KNOWN_CANONICAL_SLUGS: Record<string, string> = {
  // Northern Top Universities
  BKA: "hust",
  QHI: "vnu-uet",
  VJU: "vnu-vju",
  NTH: "ftu",
  KHA: "neu",
  FPT: "fpt",
  KTA: "hau",
  DTC: "ictu",
  QHT: "vnu-hus",
  DDN: "dnu",
  MTC: "my-thuat-cong-nghiep",
  GTA: "utt",
  XDA: "nuce",
  NHF: "hanu",
  SPH: "hnue",
  SP2: "hnue2",
  YHB: "hmu",
  DKH: "hup",
  BVH: "ptit",
  HQT: "dav",
  NHH: "ba",
  HBT: "ajc",
  MHN: "hou",
  DMT: "hunre",
  KCN: "usth",
  HKC: "gust",
  GHA: "utc",
  PVU: "pvu",
  VIN: "vinuni",
  RMU: "rmit",

  // VNU Hanoi Members
  A: "vnu",
  QHE: "vnu-ueb",
  QHL: "vnu-law",
  QHY: "vnu-ump",
  QHS: "vnu-ued",
  QHF: "vnu-ulis",
  QHX: "vnu-ussh",

  // Southern Top Universities
  QSB: "hcmut",
  QSC: "uit",
  QST: "hcmus",
  QSX: "hcmussh",
  QSK: "uel",
  QSQ: "hcmiu",
  TAG: "agu",
  C: "vnuhcm",
  TCT: "ctu",
  DKC: "hutech",
  YDS: "ump",
  DTT: "tdtu",
  NTT: "nttu",
  GTS: "ut-hcm",
  DCT: "huit",
  SPS: "hcmue",
  HIU: "hiu",
  NHS: "buh",
  MBS: "ou-hcm",
  DTM: "hcmunre",

  // Central Top Universities
  D: "hue-uni",
  DDK: "dut",
  DDQ: "due",
  DDC: "ute-dn",
  DDF: "ufl-dn",
  DDS: "ued-dn",
  VKU: "vku",
  E: "udn",
  DDT: "dtu",
  DHY: "hump",
  DHT: "husc",
  DHS: "hued",
  DHK: "hue-econ",
  DHL: "huaf",
  DHN: "hufa",
  DHA: "hul",
  DHF: "hucfl",

  // Thai Nguyen Univ Members
  B: "tnu",
  DTY: "tump",
  DTS: "tue",
  DTN: "tuaf",
  DTK: "tnut",
  DTZ: "tnus",
  DTE: "tuae",
};

const LEGACY_ID_TO_CANONICAL: Record<string, string> = {
  "viet-nhat": "vnu-vju",
  "viet-nhat-2": "vnu-vju",
  "vju": "vnu-vju",
  "bach-khoa": "hust",
  "dhbk-hn": "hust",
  "inst-university-of-transport-technolo": "utt",
  "cong-nghe-giao-thong-van-tai": "utt",
  "inst-truong-dai-hoc-bach-khoa-dai-hoc": "hcmut",
  "inst-truong-dai-hoc-quoc-te-dai-hoc-q": "hcmiu",
  "inst-truong-dai-hoc-xay-dung": "nuce",
  "tai-nguyen-va-moi-truong-thanh-pho-ho-ch": "hcmunre",
  "ha-noi": "hanu",
  "hub": "buh",
  "ajc": "ajc",
  "hcmcou": "ou-hcm",
  "hou": "hou",
  "inst-vietnam-national-university-hano": "vnu",
  "inst-vietnam-national-university-ho-c": "vnuhcm",
  "inst-hue-university": "hue-uni",
  "inst-graduate-university-of-science-a": "gust",
  "khoa-hoc-va-cong-nghe-ha-noi": "usth",
};

function normalizeVi(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/tp\.?\s*ho chi minh|thanh pho ho chi minh|tp\s*hcm/g, "hcm")
    .replace(/ha noi/g, "hn")
    .replace(/dai hoc quoc gia/g, "dhqg")
    .replace(/truong dai hoc|dai hoc|hoc vien|vien nghien cuu|vien|truong cao dang|cao dang/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractDomain(url: string): string {
  if (!url) return "";
  try {
    let clean = url.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) clean = "http://" + clean;
    const u = new URL(clean);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function formatWord(w: string): string {
  if (!w) return "";
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function formatVietnameseTitle(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();
  if (s !== s.toUpperCase()) return s;

  return s
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      if (word.includes("-")) {
        return word.split("-").map((part) => formatWord(part)).join("-");
      }
      return formatWord(word);
    })
    .join(" ")
    .replace(/\b(tp\.\s*hcm)\b/gi, "TP.HCM")
    .replace(/\b(tp\.\s*hồ chí minh)\b/gi, "TP. Hồ Chí Minh")
    .replace(/\b(đhqghn)\b/gi, "ĐHQGHN")
    .replace(/\b(đhqg\s*tp\.?\s*hcm)\b/gi, "ĐHQG TP.HCM")
    .replace(/\b(fpt)\b/gi, "FPT")
    .replace(/\b(rmit)\b/gi, "RMIT");
}

function detectCityRegion(title: string, website: string): { city: string; region: "Miền Bắc" | "Miền Trung" | "Miền Nam" } {
  const t = title.toLowerCase();

  // Southern Vietnam
  if (
    /hồ chí minh|tp\.?\s*hcm|sài gòn|cần thơ|bình dương|đồng nai|vũng tàu|tiền giang|an giang|kiên giang|long an|đồng tháp|bến tre|vĩnh long|trà vinh|hậu giang|sóc trăng|bạc liêu|cà mau|tây ninh|bình phước/i.test(
      t
    )
  ) {
    let city = "TP. Hồ Chí Minh";
    if (/cần thơ/i.test(t)) city = "Cần Thơ";
    else if (/bình dương/i.test(t)) city = "Bình Dương";
    else if (/đồng nai/i.test(t)) city = "Đồng Nai";
    else if (/vũng tàu|bà rịa/i.test(t)) city = "Bà Rịa - Vũng Tàu";
    else if (/an giang/i.test(t)) city = "An Giang";
    else if (/tiền giang/i.test(t)) city = "Tiền Giang";
    return { city, region: "Miền Nam" };
  }

  // Central Vietnam
  if (
    /đà nẵng|huế|thừa thiên|nghệ an|thanh hóa|hà tĩnh|quảng bình|quảng trị|quảng nam|quảng ngãi|bình định|quy nhơn|phú yên|khánh hòa|nha trang|ninh thuận|bình thuận|kon tum|gia lai|đắk lắk|đắk nông|lâm đồng|đà lạt/i.test(
      t
    )
  ) {
    let city = "Đà Nẵng";
    if (/huế|thừa thiên/i.test(t)) city = "Thừa Thiên Huế";
    else if (/nghệ an|vinh/i.test(t)) city = "Nghệ An";
    else if (/thanh hóa/i.test(t)) city = "Thanh Hóa";
    else if (/khánh hòa|nha trang/i.test(t)) city = "Khánh Hòa";
    else if (/quy nhơn|bình định/i.test(t)) city = "Bình Định";
    else if (/đắk lắk/i.test(t)) city = "Đắk Lắk";
    else if (/lâm đồng|đà lạt/i.test(t)) city = "Lâm Đồng";
    return { city, region: "Miền Trung" };
  }

  // Northern Vietnam
  let city = "Hà Nội";
  if (/thái nguyên/i.test(t)) city = "Thái Nguyên";
  else if (/hải phòng/i.test(t)) city = "Hải Phòng";
  else if (/hải dương/i.test(t)) city = "Hải Dương";
  else if (/nam định/i.test(t)) city = "Nam Định";
  else if (/bắc ninh/i.test(t)) city = "Bắc Ninh";
  else if (/bắc giang/i.test(t)) city = "Bắc Giang";
  else if (/phú thọ/i.test(t)) city = "Phú Thọ";
  else if (/vĩnh phúc/i.test(t)) city = "Vĩnh Phúc";
  else if (/quảng ninh/i.test(t)) city = "Quảng Ninh";
  else if (/hà nam/i.test(t)) city = "Hà Nam";
  else if (/thái bình/i.test(t)) city = "Thái Bình";
  else if (/ninh bình/i.test(t)) city = "Ninh Bình";
  else if (/hưng yên/i.test(t)) city = "Hưng Yên";

  return { city, region: "Miền Bắc" };
}

function detectInstitutionType(title: string): "university" | "academy" | "institute" | "college" {
  const t = title.toLowerCase();
  if (t.includes("cao đẳng")) return "college";
  if (t.includes("học viện")) return "academy";
  if (t.includes("viện")) return "institute";
  return "university";
}

export async function runRebuildPipeline(mode: "dry-run" | "execute" = "dry-run") {
  console.log("================================================================================");
  console.log(`[MOET Registry Rebuild] Starting pipeline in [${mode.toUpperCase()}] mode`);
  console.log("================================================================================");

  const importBatchId = `moet_rebuild_${Date.now()}`;
  const moetFilePath = path.join(process.cwd(), "src", "data", "moet_official_327.json");
  if (!fs.existsSync(moetFilePath)) {
    throw new Error(`MOET data source file not found at: ${moetFilePath}`);
  }

  const rawMoetList: MoetRawItem[] = JSON.parse(fs.readFileSync(moetFilePath, "utf-8"));
  if (rawMoetList.length !== 327) {
    throw new Error(`Expected exactly 327 records from MOET official dataset, found: ${rawMoetList.length}`);
  }

  console.log(`[MOET Registry Rebuild] Loaded 327 official records from MOET dataset.`);

  // 1. Process 327 canonical definitions
  const canonicalUnis: CanonicalUniversityDef[] = [];
  const canonicalByCode = new Map<string, CanonicalUniversityDef>();
  const canonicalById = new Map<string, CanonicalUniversityDef>();
  const canonicalByDomain = new Map<string, CanonicalUniversityDef>();
  const canonicalByNorm = new Map<string, CanonicalUniversityDef>();

  const usedIds = new Set<string>();

  for (const item of rawMoetList) {
    const code = (item.code || "").trim().toUpperCase();
    if (!code) throw new Error(`Missing code for item: ${JSON.stringify(item)}`);

    let id = KNOWN_CANONICAL_SLUGS[code];
    if (!id) {
      id = code.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    if (usedIds.has(id)) {
      id = `${id}-${code.toLowerCase()}`;
    }
    usedIds.add(id);

    const title = formatVietnameseTitle(item.title);
    const domain = extractDomain(item.website);
    const { city, region } = detectCityRegion(title, item.website);
    const institutionType = detectInstitutionType(title);

    // Build common abbreviations
    const abbreviations = new Set<string>();
    abbreviations.add(code);
    if (KNOWN_CANONICAL_SLUGS[code]) {
      abbreviations.add(KNOWN_CANONICAL_SLUGS[code].toUpperCase());
    }
    if (domain) {
      const parts = domain.split(".");
      if (parts[0] && parts[0].length <= 8) {
        abbreviations.add(parts[0].toUpperCase());
      }
    }

    const shortName = KNOWN_CANONICAL_SLUGS[code] ? KNOWN_CANONICAL_SLUGS[code].toUpperCase() : code;

    const uniDef: CanonicalUniversityDef = {
      id,
      name: title,
      shortName,
      officialCode: code,
      officialCodeSource: "moet_directory",
      officialCodeVerifiedAt: Date.now(),
      officialCodeStatus: "verified",
      commonAbbreviations: Array.from(abbreviations),
      externalIdentifiers: {
        moet_code: code,
        moet_unit_id: item._id,
        moet_rewrite_url: item.rewriteURL || "",
      },
      officialDomain: domain,
      officialWebsite: item.website || "",
      institutionType,
      city,
      region,
      sourceUrl: item.crawlerLink || "https://moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc",
      sourceId: item._id,
      importBatchId,
    };

    canonicalUnis.push(uniDef);
    canonicalByCode.set(code, uniDef);
    canonicalById.set(id, uniDef);
    if (domain) canonicalByDomain.set(domain, uniDef);
    canonicalByNorm.set(normalizeVi(title), uniDef);
  }

  console.log(`[MOET Registry Rebuild] Built ${canonicalUnis.length} canonical university definitions.`);

  // 2. Connect to PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client: PoolClient = await pool.connect();

  try {
    // 3. Query existing state
    const existingUnisRes = await client.query("SELECT id, name, short_name, official_domain, official_website, official_code FROM universities");
    const existingAffRes = await client.query("SELECT id, lecturer_id, university_id FROM affiliations");
    const existingLecturersRes = await client.query("SELECT id, name FROM lecturers");
    const existingReviewsRes = await client.query("SELECT id, lecturer_id, university_id FROM reviews");
    const existingSchoolReviewsRes = await client.query("SELECT id, university_id FROM school_reviews");

    console.log(`[MOET Registry Rebuild] Current DB State:`);
    console.log(`  Universities:    ${existingUnisRes.rows.length}`);
    console.log(`  Lecturers:       ${existingLecturersRes.rows.length}`);
    console.log(`  Affiliations:    ${existingAffRes.rows.length}`);
    console.log(`  Lecturer Reviews: ${existingReviewsRes.rows.length}`);
    console.log(`  School Reviews:   ${existingSchoolReviewsRes.rows.length}`);

    // 4. Map existing DB universities to canonical MOET institutions
    const dbIdToCanonical = new Map<string, CanonicalUniversityDef>();
    const unmappedDbUniIds = new Set<string>();

    for (const u of existingUnisRes.rows) {
      let matched: CanonicalUniversityDef | undefined;

      // Check legacy override map first
      if (LEGACY_ID_TO_CANONICAL[u.id]) {
        matched = canonicalById.get(LEGACY_ID_TO_CANONICAL[u.id]);
      }
      // Check canonical ID direct match
      if (!matched && canonicalById.has(u.id)) {
        matched = canonicalById.get(u.id);
      }
      // Check official code match
      const uCode = (u.official_code || "").trim().toUpperCase();
      if (!matched && uCode && canonicalByCode.has(uCode)) {
        matched = canonicalByCode.get(uCode);
      }
      // Check official domain match
      const uDomain = extractDomain(u.official_domain || u.official_website);
      if (!matched && uDomain && canonicalByDomain.has(uDomain)) {
        matched = canonicalByDomain.get(uDomain);
      }
      // Check normalized name match
      const uNorm = normalizeVi(u.name);
      if (!matched && uNorm && canonicalByNorm.has(uNorm)) {
        matched = canonicalByNorm.get(uNorm);
      }
      // Substring normalized matching
      if (!matched && uNorm.length >= 6) {
        const candidates = canonicalUnis.filter(
          (c) => normalizeVi(c.name).includes(uNorm) || uNorm.includes(normalizeVi(c.name))
        );
        if (candidates.length === 1) {
          matched = candidates[0];
        }
      }

      if (matched) {
        dbIdToCanonical.set(u.id, matched);
      } else {
        unmappedDbUniIds.add(u.id);
      }
    }

    console.log(`[MOET Registry Rebuild] Mapping Analysis:`);
    console.log(`  DB Universities mapped to MOET: ${dbIdToCanonical.size}`);
    console.log(`  DB Universities unmapped (non-school to be deleted): ${unmappedDbUniIds.size}`);

    // 5. Affiliation & Lecturer Reconciliations
    const validAffiliations: { id: string; lecturerId: string; canonicalId: string; canonUni: CanonicalUniversityDef }[] = [];
    const removedAffiliationIds: string[] = [];
    const lecturerAffiliationsMap = new Map<string, Set<string>>(); // lecturerId -> Set of canonicalIds

    for (const a of existingAffRes.rows) {
      const canon = dbIdToCanonical.get(a.university_id);
      if (canon) {
        validAffiliations.push({
          id: a.id,
          lecturerId: a.lecturer_id,
          canonicalId: canon.id,
          canonUni: canon,
        });
        if (!lecturerAffiliationsMap.has(a.lecturer_id)) {
          lecturerAffiliationsMap.set(a.lecturer_id, new Set());
        }
        lecturerAffiliationsMap.get(a.lecturer_id)!.add(canon.id);
      } else {
        removedAffiliationIds.push(a.id);
      }
    }

    const retainedLecturerIds = new Set(lecturerAffiliationsMap.keys());
    const deletedLecturerIds = existingLecturersRes.rows
      .filter((l) => !retainedLecturerIds.has(l.id))
      .map((l) => l.id);

    console.log(`[MOET Registry Rebuild] Affiliation & Lecturer Audit:`);
    console.log(`  Affiliations Retained: ${validAffiliations.length}`);
    console.log(`  Affiliations Removed:  ${removedAffiliationIds.length}`);
    console.log(`  Lecturers Retained:    ${retainedLecturerIds.size}`);
    console.log(`  Lecturers to Delete:   ${deletedLecturerIds.length} (no affiliations in MOET 327)`);

    // 6. Review Safety Verification
    let reviewsPreservedCount = 0;
    let reviewsAtRiskCount = 0;
    for (const r of existingReviewsRes.rows) {
      if (retainedLecturerIds.has(r.lecturer_id)) {
        reviewsPreservedCount++;
      } else {
        reviewsAtRiskCount++;
        console.error(`[CRITICAL WARNING] Review ${r.id} for lecturer ${r.lecturer_id} is at risk!`);
      }
    }

    let schoolReviewsPreservedCount = 0;
    let schoolReviewsAtRiskCount = 0;
    for (const sr of existingSchoolReviewsRes.rows) {
      if (dbIdToCanonical.has(sr.university_id)) {
        schoolReviewsPreservedCount++;
      } else {
        schoolReviewsAtRiskCount++;
        console.error(`[CRITICAL WARNING] School Review ${sr.id} for uni ${sr.university_id} is at risk!`);
      }
    }

    console.log(`[MOET Registry Rebuild] Review Safety:`);
    console.log(`  Lecturer Reviews Preserved: ${reviewsPreservedCount} / ${existingReviewsRes.rows.length}`);
    console.log(`  School Reviews Preserved:   ${schoolReviewsPreservedCount} / ${existingSchoolReviewsRes.rows.length}`);

    if (reviewsAtRiskCount > 0 || schoolReviewsAtRiskCount > 0) {
      throw new Error(`Safety check failed: ${reviewsAtRiskCount} reviews and ${schoolReviewsAtRiskCount} school reviews would be orphaned!`);
    }

    // 7. Calculate total_professors per canonical university
    const profCountMap = new Map<string, number>();
    for (const [, uniSet] of lecturerAffiliationsMap.entries()) {
      for (const uniId of uniSet) {
        profCountMap.set(uniId, (profCountMap.get(uniId) || 0) + 1);
      }
    }

    // Top 10 preview
    const sortedPreview = Array.from(profCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    console.log(`[MOET Registry Rebuild] Top 10 Universities by Reconciled Faculty Count:`);
    for (const [id, count] of sortedPreview) {
      const u = canonicalById.get(id);
      console.log(`  - [${id}] ${u?.shortName} (${u?.officialCode}): ${count} professors`);
    }

    // DRY-RUN EXIT
    if (mode === "dry-run") {
      console.log("================================================================================");
      console.log(`[MOET Registry Rebuild] DRY-RUN COMPLETED SUCCESSFULLY. No changes were committed.`);
      console.log(`To execute and persist changes, run with: --execute`);
      console.log("================================================================================");
      return {
        mode: "dry-run",
        canonicalCount: canonicalUnis.length,
        retainedLecturers: retainedLecturerIds.size,
        deletedLecturers: deletedLecturerIds.length,
        retainedAffiliations: validAffiliations.length,
        removedAffiliations: removedAffiliationIds.length,
        reviewsPreserved: reviewsPreservedCount,
        schoolReviewsPreserved: schoolReviewsPreservedCount,
      };
    }

    // 8. EXECUTION TRANSACTION
    console.log(`[MOET Registry Rebuild] Starting atomic execution transaction...`);
    await client.query("BEGIN;");

    // A. Clean up orphan/invalid affiliations
    console.log(`[MOET Registry Rebuild] Step 1/8: Deleting non-MOET affiliations...`);
    if (removedAffiliationIds.length > 0) {
      // Chunked deletion
      const chunkSize = 2000;
      for (let i = 0; i < removedAffiliationIds.length; i += chunkSize) {
        const chunk = removedAffiliationIds.slice(i, i + chunkSize);
        await client.query("DELETE FROM affiliations WHERE id = ANY($1)", [chunk]);
      }
    }

    // B. Delete lecturers with 0 MOET affiliations
    console.log(`[MOET Registry Rebuild] Step 2/8: Deleting non-MOET lecturers (${deletedLecturerIds.length})...`);
    if (deletedLecturerIds.length > 0) {
      const chunkSize = 2000;
      for (let i = 0; i < deletedLecturerIds.length; i += chunkSize) {
        const chunk = deletedLecturerIds.slice(i, i + chunkSize);
        // Clean related tables
        await client.query("DELETE FROM user_saved_professors WHERE professor_id = ANY($1)", [chunk]);
        await client.query("DELETE FROM provenance WHERE lecturer_id = ANY($1)", [chunk]);
        await client.query("DELETE FROM entity_match_candidates WHERE source_professor_id = ANY($1) OR candidate_professor_id = ANY($1)", [chunk]);
        await client.query("DELETE FROM lecturers WHERE id = ANY($1)", [chunk]);
      }
    }

    // C. Upsert all 327 canonical universities
    console.log(`[MOET Registry Rebuild] Step 3/8: Upserting 327 canonical institutions...`);
    const now = Date.now();
    for (const u of canonicalUnis) {
      const count = profCountMap.get(u.id) || 0;
      await client.query(
        `
        INSERT INTO universities (
          id, name, short_name, english_name, city, region,
          official_domain, official_website, institution_type,
          official_code, official_code_source, official_code_verified_at, official_code_status,
          common_abbreviations, external_identifiers, source_url, source_id, import_batch_id,
          total_professors, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          official_code = EXCLUDED.official_code,
          official_code_source = EXCLUDED.official_code_source,
          official_code_verified_at = EXCLUDED.official_code_verified_at,
          official_code_status = EXCLUDED.official_code_status,
          common_abbreviations = EXCLUDED.common_abbreviations,
          external_identifiers = EXCLUDED.external_identifiers,
          official_domain = EXCLUDED.official_domain,
          official_website = EXCLUDED.official_website,
          institution_type = EXCLUDED.institution_type,
          city = EXCLUDED.city,
          region = EXCLUDED.region,
          source_url = EXCLUDED.source_url,
          source_id = EXCLUDED.source_id,
          import_batch_id = EXCLUDED.import_batch_id,
          total_professors = EXCLUDED.total_professors,
          updated_at = EXCLUDED.updated_at;
        `,
        [
          u.id,
          u.name,
          u.shortName,
          u.englishName || null,
          u.city,
          u.region,
          u.officialDomain || null,
          u.officialWebsite || null,
          u.institutionType,
          u.officialCode,
          u.officialCodeSource,
          u.officialCodeVerifiedAt,
          u.officialCodeStatus,
          JSON.stringify(u.commonAbbreviations),
          JSON.stringify(u.externalIdentifiers),
          u.sourceUrl,
          u.sourceId,
          u.importBatchId,
          count,
          now,
          now,
        ]
      );
    }

    // D. Re-point reviews
    console.log(`[MOET Registry Rebuild] Step 4/8: Re-pointing student reviews...`);
    for (const r of existingReviewsRes.rows) {
      if (!r.university_id) {
        // Look up lecturer's canonical affiliation
        const affs = lecturerAffiliationsMap.get(r.lecturer_id);
        if (affs && affs.size > 0) {
          const targetUniId = Array.from(affs)[0];
          await client.query("UPDATE reviews SET university_id = $1 WHERE id = $2", [targetUniId, r.id]);
        }
      } else if (dbIdToCanonical.has(r.university_id)) {
        const canon = dbIdToCanonical.get(r.university_id)!;
        if (canon.id !== r.university_id) {
          await client.query("UPDATE reviews SET university_id = $1 WHERE id = $2", [canon.id, r.id]);
        }
      }
    }

    // Re-point school reviews
    for (const sr of existingSchoolReviewsRes.rows) {
      const canon = dbIdToCanonical.get(sr.university_id);
      if (canon && canon.id !== sr.university_id) {
        await client.query("UPDATE school_reviews SET university_id = $1 WHERE id = $2", [canon.id, sr.id]);
      }
    }

    // E. Re-point affiliations and deduplicate
    console.log(`[MOET Registry Rebuild] Step 5/8: Re-pointing affiliations and crawler metadata to canonical IDs...`);
    for (const [oldId, canon] of dbIdToCanonical.entries()) {
      if (oldId !== canon.id) {
        await client.query(
          `
          UPDATE affiliations
          SET 
            university_id = $1,
            university_name = $2,
            university_short_name = $3
          WHERE university_id = $4;
          `,
          [canon.id, canon.name, canon.shortName, oldId]
        );
        await client.query("UPDATE sources SET university_id = $1 WHERE university_id = $2", [canon.id, oldId]);
        await client.query("UPDATE crawl_jobs SET university_id = $1 WHERE university_id = $2", [canon.id, oldId]);
      }
    }

    // Remove any duplicate (lecturer_id, university_id) pairs created by merging
    console.log(`[MOET Registry Rebuild] Step 6/8: Enforcing affiliation uniqueness...`);
    await client.query(`
      DELETE FROM affiliations a1
      USING affiliations a2
      WHERE a1.lecturer_id = a2.lecturer_id
        AND a1.university_id = a2.university_id
        AND a1.id > a2.id;
    `);

    // F. Delete non-canonical universities
    console.log(`[MOET Registry Rebuild] Step 7/8: Purging non-canonical university entities...`);
    const canonicalIdList = canonicalUnis.map((u) => u.id);
    await client.query(
      "DELETE FROM universities WHERE id != ALL($1)",
      [canonicalIdList]
    );

    // G. Upsert aliases
    console.log(`[MOET Registry Rebuild] Step 8/8: Synchronizing institution aliases...`);
    for (const [oldId, canon] of dbIdToCanonical.entries()) {
      if (oldId !== canon.id) {
        await client.query(
          `
          INSERT INTO institution_aliases (alias_id, canonical_id, alias_name, alias_type, created_at)
          VALUES ($1, $2, $3, 'legacy_slug', $4)
          ON CONFLICT (alias_id) DO UPDATE SET
            canonical_id = EXCLUDED.canonical_id,
            alias_name = EXCLUDED.alias_name;
          `,
          [oldId, canon.id, canon.name, now]
        );
      }
    }

    for (const u of canonicalUnis) {
      // Alias for code
      const codeLower = u.officialCode.toLowerCase();
      if (codeLower !== u.id) {
        await client.query(
          `
          INSERT INTO institution_aliases (alias_id, canonical_id, alias_name, alias_type, created_at)
          VALUES ($1, $2, $3, 'official_code', $4)
          ON CONFLICT (alias_id) DO UPDATE SET
            canonical_id = EXCLUDED.canonical_id;
          `,
          [codeLower, u.id, u.name, now]
        );
      }
      // Alias for abbreviations
      for (const abbr of u.commonAbbreviations) {
        const abbrLower = abbr.toLowerCase();
        if (abbrLower !== u.id && abbrLower !== codeLower) {
          await client.query(
            `
            INSERT INTO institution_aliases (alias_id, canonical_id, alias_name, alias_type, created_at)
            VALUES ($1, $2, $3, 'abbreviation', $4)
            ON CONFLICT (alias_id) DO NOTHING;
            `,
            [abbrLower, u.id, u.name, now]
          );
        }
      }
    }

    // Recalculate school review ratings
    await client.query(`
      UPDATE universities u
      SET 
        rating_average = sub.avg_rating,
        total_reviews = sub.cnt
      FROM (
        SELECT university_id, ROUND(AVG(overall_rating), 2) as avg_rating, COUNT(*) as cnt
        FROM school_reviews
        GROUP BY university_id
      ) sub
      WHERE u.id = sub.university_id;
    `);

    // Audit log
    await client.query(
      `
      INSERT INTO admin_audit_logs (
        actor_id, actor_email, actor_role, action, target_type, target_id,
        reason, before_state, after_state, created_at
      ) VALUES (
        'system', 'admin@rateurprofs.vn', 'admin', 'REBUILD_MOET_REGISTRY', 'universities', 'moet_official_327',
        'Official MOET registry rebuild and faculty reconciliation',
        $1, $2, $3
      );
      `,
      [
        JSON.stringify({ previousUniversityCount: existingUnisRes.rows.length, previousLecturerCount: existingLecturersRes.rows.length }),
        JSON.stringify({ canonicalUniversityCount: canonicalUnis.length, retainedLecturers: retainedLecturerIds.size }),
        now,
      ]
    );

    await client.query("COMMIT;");
    console.log("================================================================================");
    console.log(`[MOET Registry Rebuild] TRANSACTION COMMITTED SUCCESSFULLY!`);
    console.log(`Database now contains exactly 327 verified canonical universities.`);
    console.log("================================================================================");

    return {
      mode: "execute",
      canonicalCount: canonicalUnis.length,
      retainedLecturers: retainedLecturerIds.size,
      retainedAffiliations: validAffiliations.length,
    };
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error(`[MOET Registry Rebuild] Transaction rolled back due to error:`, err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI Execution entrypoint
if (require.main === module || process.argv[1]?.includes("rebuild_moet_registry")) {
  const isExecute = process.argv.includes("--execute");
  const mode = isExecute ? "execute" : "dry-run";

  runRebuildPipeline(mode)
    .then((result) => {
      console.log(`Pipeline finished in ${result.mode} mode.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Pipeline failed:", err);
      process.exit(1);
    });
}
