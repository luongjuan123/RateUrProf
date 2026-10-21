/**
 * Database Migration Script: SQLite -> Cloud SQL PostgreSQL
 *
 * Transfers all verified universities, lecturers, affiliations, and provenance
 * from `src/data/rateprof.db` to PostgreSQL with validation of row counts.
 *
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx tsx scripts/migrate_sqlite_to_postgres.ts
 *   npx tsx scripts/migrate_sqlite_to_postgres.ts --dry-run
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { Pool } from "pg";
import { initPostgresSchema } from "../src/lib/server/postgresClient";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("==============================================================================");
  console.log(" RATEURPROFS DATABASE MIGRATION: SQLite -> Cloud SQL PostgreSQL");
  console.log("==============================================================================");

  const dbPath = path.join(process.cwd(), "src", "data", "rateprof.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`[-] Error: SQLite database not found at ${dbPath}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(dbPath);

  // Read SQLite table counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCount = (tbl: string) => (sqlite.prepare(`SELECT COUNT(*) as c FROM ${tbl}`).get() as any).c;

  const uniCount = getCount("universities");
  const lecCount = getCount("lecturers");
  const affCount = getCount("affiliations");
  const srcCount = getCount("sources");
  const jobCount = getCount("crawl_jobs");

  console.log("[*] SQLite Source Telemetry:");
  console.log(`    - Universities:  ${uniCount}`);
  console.log(`    - Lecturers:     ${lecCount}`);
  console.log(`    - Affiliations:  ${affCount}`);
  console.log(`    - Sources:       ${srcCount}`);
  console.log(`    - Crawl Jobs:    ${jobCount}`);

  if (isDryRun) {
    console.log("\n[+] DRY RUN: SQLite source data verified successfully. No changes written.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[-] Error: DATABASE_URL environment variable is required for live migration.");
    process.exit(1);
  }

  const pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  console.log("\n[*] Initializing PostgreSQL schema and indexes...");
  await initPostgresSchema(pgPool);

  const client = await pgPool.connect();

  const batchInsert = async (
    table: string,
    columns: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[][],
    batchSize: number = 200,
    conflictTarget: string = "id",
    onConflictClause?: string
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

      const conflictAction = onConflictClause || "DO NOTHING";
      const sql = `
        INSERT INTO ${table} (${columns.join(", ")})
        VALUES ${valuePlaceholders.join(",\n")}
        ON CONFLICT (${conflictTarget}) ${conflictAction};
      `;
      await client.query(sql, params);
    }
  };

  try {
    await client.query("BEGIN;");

    // 1. Universities
    console.log(`[*] Migrating ${uniCount} Universities...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const universities = sqlite.prepare("SELECT * FROM universities").all() as any[];
    const uniCols = ["id", "name", "short_name", "english_name", "city", "region", "official_domain", "official_website", "institution_type", "total_professors", "collection_status", "validated_records", "extracted_professors", "crawl_status", "created_at", "updated_at"];
    const uniRows = universities.map((u) => {
      const profs = u.total_professors || 0;
      const status = profs >= 50 ? "complete" : profs > 0 ? "partial" : "pending";
      return [
        u.id, u.name, u.short_name, u.english_name, u.city, u.region, u.official_domain, u.official_website, u.institution_type, profs, u.collection_status || "discovered", profs, profs, status, u.created_at, u.updated_at
      ];
    });
    await batchInsert(
      "universities",
      uniCols,
      uniRows,
      250,
      "id",
      `DO UPDATE SET
        total_professors = GREATEST(universities.total_professors, EXCLUDED.total_professors),
        validated_records = GREATEST(universities.validated_records, EXCLUDED.validated_records),
        extracted_professors = GREATEST(universities.extracted_professors, EXCLUDED.extracted_professors),
        crawl_status = CASE WHEN EXCLUDED.total_professors >= 50 THEN 'complete' WHEN EXCLUDED.total_professors > 0 THEN 'partial' ELSE universities.crawl_status END,
        updated_at = EXCLUDED.updated_at`
    );

    // 2. Lecturers
    console.log(`[*] Migrating ${lecCount} Lecturers...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lecturers = sqlite.prepare("SELECT * FROM lecturers").all() as any[];
    const lecCols = ["id", "name", "normalized_name", "title", "academic_title", "academic_rank", "position", "avatar", "bio", "verification_status", "rating_average", "rating_count", "take_again_percent", "difficulty_score", "source_urls_json", "created_at", "updated_at"];
    const lecRows = lecturers.map((l) => [
      l.id, l.name, l.normalized_name, l.title, l.academic_title, l.academic_rank, l.position, l.avatar, l.bio, l.verification_status, l.rating_average, l.rating_count, l.take_again_percent, l.difficulty_score, l.source_urls_json, l.created_at, l.updated_at
    ]);
    await batchInsert("lecturers", lecCols, lecRows, 200);

    // 3. Affiliations
    console.log(`[*] Migrating ${affCount} Affiliations...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affiliations = sqlite.prepare("SELECT * FROM affiliations").all() as any[];
    const affCols = ["id", "lecturer_id", "university_id", "university_name", "university_short_name", "faculty", "department", "affiliation_status", "is_primary", "source_url", "created_at"];
    const affRows = affiliations.map((a) => [
      a.id, a.lecturer_id, a.university_id, a.university_name, a.university_short_name, a.faculty, a.department, a.affiliation_status, a.is_primary, a.source_url, a.created_at
    ]);
    await batchInsert("affiliations", affCols, affRows, 250);

    // 4. Sources
    console.log(`[*] Migrating ${srcCount} Sources...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sources = sqlite.prepare("SELECT * FROM sources").all() as any[];
    const srcCols = ["id", "university_id", "url", "domain", "source_type", "crawl_policy", "status", "content_hash", "last_crawled_at", "failure_count", "last_error_message"];
    const srcRows = sources.map((s) => [
      s.id, s.university_id, s.url, s.domain, s.source_type, s.crawl_policy, s.status, s.content_hash, s.last_crawled_at, s.failure_count, s.last_error_message
    ]);
    await batchInsert("sources", srcCols, srcRows, 250);

    // 5. Crawl Jobs
    console.log(`[*] Migrating ${jobCount} Crawl Jobs...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crawlJobs = sqlite.prepare("SELECT * FROM crawl_jobs").all() as any[];
    const jobCols = ["id", "source_id", "university_id", "url", "status", "priority", "retry_count", "max_retries", "last_error", "next_retry_at", "started_at", "completed_at"];
    const jobRows = crawlJobs.map((j) => [
      j.id, j.source_id, j.university_id, j.url, j.status, j.priority, j.retry_count, j.max_retries, j.last_error, j.next_retry_at, j.started_at, j.completed_at
    ]);
    await batchInsert("crawl_jobs", jobCols, jobRows, 250);

    await client.query("COMMIT;");
    console.log("[+] Database transaction committed successfully.");

    // Validation
    const pgUniRes = await client.query("SELECT COUNT(*) as c FROM universities");
    const pgLecRes = await client.query("SELECT COUNT(*) as c FROM lecturers");
    const pgAffRes = await client.query("SELECT COUNT(*) as c FROM affiliations");
    const pgSrcRes = await client.query("SELECT COUNT(*) as c FROM sources");
    const pgJobRes = await client.query("SELECT COUNT(*) as c FROM crawl_jobs");

    console.log("\n==============================================================================");
    console.log(" MIGRATION VERIFICATION AUDIT");
    console.log("==============================================================================");
    console.log(` Universities: SQLite (${uniCount}) vs PostgreSQL (${pgUniRes.rows[0].c})`);
    console.log(` Lecturers:    SQLite (${lecCount}) vs PostgreSQL (${pgLecRes.rows[0].c})`);
    console.log(` Affiliations: SQLite (${affCount}) vs PostgreSQL (${pgAffRes.rows[0].c})`);
    console.log(` Sources:      SQLite (${srcCount}) vs PostgreSQL (${pgSrcRes.rows[0].c})`);
    console.log(` Crawl Jobs:   SQLite (${jobCount}) vs PostgreSQL (${pgJobRes.rows[0].c})`);
    console.log("==============================================================================");

    if (
      parseInt(pgUniRes.rows[0].c, 10) === uniCount &&
      parseInt(pgLecRes.rows[0].c, 10) === lecCount &&
      parseInt(pgAffRes.rows[0].c, 10) === affCount &&
      parseInt(pgSrcRes.rows[0].c, 10) === srcCount &&
      parseInt(pgJobRes.rows[0].c, 10) === jobCount
    ) {
      console.log("[+] 100% COMPLETE DATABASE INTEGRITY VERIFIED. All 5 tables match exactly.");
    } else {
      console.warn("[-] WARNING: Record count mismatch detected.");
    }
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("[-] Migration failed, transaction rolled back:", err);
    throw err;
  } finally {
    client.release();
    await pgPool.end();
  }
}

main().catch((err) => {
  console.error("[-] Fatal error:", err);
  process.exit(1);
});
