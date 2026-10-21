/**
 * Fast Academic Entity Sync: SQLite -> Cloud SQL PostgreSQL
 *
 * Synchronizes universities, lecturers, and affiliations with SSL support.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { Pool } from "pg";
import { initPostgresSchema } from "../src/lib/server/postgresClient";

async function main() {
  console.log("==============================================================================");
  console.log(" SYNCING ACADEMIC CATALOG TO CLOUD SQL POSTGRESQL");
  console.log("==============================================================================");

  const dbPath = path.join(process.cwd(), "src", "data", "rateprof.db");
  const sqlite = new DatabaseSync(dbPath);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log("[*] Verifying PostgreSQL connection and schema...");
  await initPostgresSchema(pgPool);

  const client = await pgPool.connect();

  const batchInsert = async (
    table: string,
    columns: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[][],
    batchSize: number = 250,
    conflictTarget: string = "id",
    conflictAction: string = "DO NOTHING"
  ) => {
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const valuePlaceholders: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];
      let pIdx = 1;

      for (const row of chunk) {
        const rowPlaceholders: string[] = [];
        for (const val of row) {
          rowPlaceholders.push(`$${pIdx++}`);
          params.push(val);
        }
        valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
      }

      const sql = `
        INSERT INTO ${table} (${columns.join(", ")})
        VALUES ${valuePlaceholders.join(",\n")}
        ON CONFLICT (${conflictTarget}) ${conflictAction};
      `;
      await client.query(sql, params);
      process.stdout.write(`    Synced ${Math.min(i + batchSize, rows.length)} / ${rows.length} rows to ${table}\r`);
    }
    console.log(`\n[+] Finished syncing ${rows.length} rows to ${table}`);
  };

  try {
    await client.query("BEGIN;");

    // Clean legacy false-positive non-human records from hcmus
    await client.query(`
      DELETE FROM affiliations
      WHERE lecturer_id IN (
          SELECT id FROM lecturers
          WHERE id LIKE 'prof-hcmus-%'
            AND (
              name LIKE 'Phòng%' OR name LIKE 'KHOA%' OR name LIKE 'BP %' OR
              name LIKE 'TT.%' OR name LIKE 'CÁC KHOA%' OR name LIKE '%Điện thoại%' OR
              name LIKE '%Nội bộ%' OR name LIKE '%Tổ %' OR name LIKE '%Ban %'
            )
      );
      DELETE FROM lecturers
      WHERE id LIKE 'prof-hcmus-%'
        AND (
          name LIKE 'Phòng%' OR name LIKE 'KHOA%' OR name LIKE 'BP %' OR
          name LIKE 'TT.%' OR name LIKE 'CÁC KHOA%' OR name LIKE '%Điện thoại%' OR
          name LIKE '%Nội bộ%' OR name LIKE '%Tổ %' OR name LIKE '%Ban %'
        );
    `);

    // 1. Universities
    console.log("\n[*] 1. Syncing Universities...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const universities = sqlite.prepare("SELECT * FROM universities").all() as any[];
    const uniCols = ["id", "name", "short_name", "english_name", "city", "region", "official_domain", "official_website", "institution_type", "total_professors", "collection_status", "validated_records", "extracted_professors", "crawl_status", "created_at", "updated_at"];
    const uniRows = universities.map((u) => {
      const profs = u.total_professors || 0;
      const status = profs >= 50 ? "complete" : profs > 0 ? "partial" : "pending";
      return [
        u.id, u.name, u.short_name, u.english_name, u.city, u.region, u.official_domain, u.official_website, u.institution_type, profs, u.collection_status || "verified", profs, profs, status, u.created_at, u.updated_at
      ];
    });
    await batchInsert(
      "universities",
      uniCols,
      uniRows,
      250,
      "id",
      `DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        english_name = EXCLUDED.english_name,
        city = EXCLUDED.city,
        region = EXCLUDED.region,
        official_domain = EXCLUDED.official_domain,
        official_website = EXCLUDED.official_website,
        total_professors = EXCLUDED.total_professors,
        validated_records = EXCLUDED.validated_records,
        extracted_professors = EXCLUDED.extracted_professors,
        crawl_status = EXCLUDED.crawl_status,
        updated_at = EXCLUDED.updated_at`
    );

    // Normalize legacy university references in existing affiliations now that universities table is populated
    await client.query(`
      UPDATE affiliations
      SET university_id = 'hcmussh', university_name = 'Trường ĐH Khoa học Xã hội & Nhân văn - ĐHQG TP.HCM', university_short_name = 'HCMUSSH'
      WHERE university_id IN ('ussh-hcm', 'inst-truong-dai-hoc-khoa-hoc-xa-hoi-v');
      UPDATE affiliations
      SET university_id = 'hcmiu', university_name = 'Trường ĐH Quốc tế - ĐHQG TP.HCM', university_short_name = 'HCMIU'
      WHERE university_id IN ('iu-vnu', 'inst-truong-dai-hoc-quoc-te-dai-quoc-', 'inst-truong-dai-hoc-quoc-te-dhg-hcm');
      UPDATE affiliations
      SET university_id = 'medvnu', university_name = 'Trường ĐH Khoa học Sức khỏe - ĐHQG TP.HCM', university_short_name = 'UHS'
      WHERE university_id IN ('smp-vnu', 'inst-truong-dai-hoc-khoa-hoc-suc-khoe');
      UPDATE affiliations
      SET university_id = 'hcmut', university_name = 'Trường ĐH Bách Khoa - ĐHQG TP.HCM', university_short_name = 'HCMUT'
      WHERE university_id IN ('inst-truong-dai-hoc-bach-khoa-dhqg-tp', 'inst-nghi-huu-dai-hoc-bach-khoa-dhqgt');
      UPDATE affiliations
      SET university_id = 'uit', university_name = 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM', university_short_name = 'UIT'
      WHERE university_id IN ('inst-truong-dai-hoc-cong-nghe-thong-t');
      UPDATE affiliations
      SET university_id = 'hcmus', university_name = 'Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM', university_short_name = 'HCMUS'
      WHERE university_id IN ('inst-truong-dh-khoa-hoc-tu-nhien-dhqg');
      UPDATE affiliations
      SET university_id = 'vnuhcm', university_name = 'Đại học Quốc gia Thành phố Hồ Chí Minh', university_short_name = 'VNU-HCM'
      WHERE university_id IN ('inst-vien-moi-truong-va-tai-nguyen-da', 'inst-vien-cong-nghe-nano-dai-hoc-quoc', 'inst-trung-tam-nghien-cuu-vat-lieu-ca', 'inst-ban-thanh-tra-phap-che-dai-hoc-q', 'inst-dai-hoc-quoc-gia-thanh-pho-ho-ch', 'quoc-gia-thanh-pho-ho-chi-minh');
    `);

    // 2. Lecturers
    console.log("\n[*] 2. Syncing Lecturers...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lecturers = sqlite.prepare("SELECT * FROM lecturers").all() as any[];
    const lecCols = ["id", "name", "normalized_name", "title", "academic_title", "academic_rank", "position", "avatar", "bio", "verification_status", "rating_average", "rating_count", "take_again_percent", "difficulty_score", "source_urls_json", "created_at", "updated_at"];
    const lecRows = lecturers.map((l) => [
      l.id, l.name, l.normalized_name, l.title, l.academic_title, l.academic_rank, l.position, l.avatar, l.bio, l.verification_status, l.rating_average, l.rating_count, l.take_again_percent, l.difficulty_score, l.source_urls_json, l.created_at, l.updated_at
    ]);
    await batchInsert(
      "lecturers",
      lecCols,
      lecRows,
      250,
      "id",
      `DO UPDATE SET
        name = EXCLUDED.name,
        normalized_name = EXCLUDED.normalized_name,
        title = EXCLUDED.title,
        academic_title = EXCLUDED.academic_title,
        academic_rank = EXCLUDED.academic_rank,
        position = EXCLUDED.position,
        avatar = EXCLUDED.avatar,
        bio = EXCLUDED.bio,
        updated_at = EXCLUDED.updated_at`
    );

    // 3. Affiliations
    console.log("\n[*] 3. Syncing Affiliations...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affiliations = sqlite.prepare("SELECT * FROM affiliations").all() as any[];
    const affCols = ["id", "lecturer_id", "university_id", "university_name", "university_short_name", "faculty", "department", "affiliation_status", "is_primary", "source_url", "created_at"];
    const affRows = affiliations.map((a) => [
      a.id, a.lecturer_id, a.university_id, a.university_name, a.university_short_name, a.faculty, a.department, a.affiliation_status, a.is_primary, a.source_url, a.created_at
    ]);
    await batchInsert(
      "affiliations",
      affCols,
      affRows,
      250,
      "id",
      `DO UPDATE SET
        university_id = EXCLUDED.university_id,
        university_name = EXCLUDED.university_name,
        university_short_name = EXCLUDED.university_short_name,
        faculty = EXCLUDED.faculty,
        department = EXCLUDED.department`
    );

    await client.query("COMMIT;");
    console.log("\n[+] PostgreSQL Transaction Committed Successfully!");

    // Telemetry count verification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgUnis = (await client.query("SELECT COUNT(*) as c FROM universities")).rows[0].c;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgLecs = (await client.query("SELECT COUNT(*) as c FROM lecturers")).rows[0].c;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgAffs = (await client.query("SELECT COUNT(*) as c FROM affiliations")).rows[0].c;

    console.log("\n[*] PostgreSQL Verification Telemetry:");
    console.log(`    - Universities: ${pgUnis}`);
    console.log(`    - Lecturers:    ${pgLecs}`);
    console.log(`    - Affiliations: ${pgAffs}`);

  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("[-] PostgreSQL Sync Error, transaction rolled back:", err);
    throw err;
  } finally {
    client.release();
    await pgPool.end();
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
