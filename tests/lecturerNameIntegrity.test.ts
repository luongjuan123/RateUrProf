import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

import { searchLecturers, getDatabaseStatistics } from "../src/lib/server/db";
import { getSqliteDb } from "../src/lib/server/sqliteClient";
import { getPostgresPool, isPostgresConfigured } from "../src/lib/server/postgresClient";

describe("RateUrProfs — Lecturer Name Quality & Database Hygiene Integrity", () => {
  it("01. Zero URLs exist in lecturer names across the database", async () => {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT COUNT(*) as c FROM lecturers WHERE name ILIKE '%http%' OR name ILIKE '%www.%'");
      assert.strictEqual(
        parseInt(res.rows[0].c, 10),
        0,
        "PostgreSQL must have zero lecturers with URLs in their names"
      );
    }

    const db = getSqliteDb();
    const row = db.prepare("SELECT COUNT(*) as c FROM lecturers WHERE name LIKE '%http%' OR name LIKE '%www.%'").get() as { c: number };
    assert.strictEqual(row.c, 0, "SQLite must have zero lecturers with URLs in their names");
  });

  it("02. Zero table headers, curriculum items, or non-person junk records exist", async () => {
    const junkPatterns = [
      "%cán bộ lớp%",
      "%chuyên ngành%",
      "%đầu sách%",
      "%họ và tên%",
      "%số cmnd%",
      "%giới tính: nữ%",
      "%giới tính: nam%",
      "%thử nghiệm 1792%",
      "%hệ thời gian thực%",
      "%thái doãn thanh công ty asc%"
    ];

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      for (const p of junkPatterns) {
        const res = await pool.query("SELECT id, name FROM lecturers WHERE name ILIKE $1", [p]);
        assert.strictEqual(
          res.rows.length,
          0,
          `PostgreSQL must have zero records matching '${p}', found: ${JSON.stringify(res.rows)}`
        );
      }
    }

    const db = getSqliteDb();
    for (const p of junkPatterns) {
      const rows = db.prepare("SELECT id, name FROM lecturers WHERE name LIKE ?").all(p);
      assert.strictEqual(
        rows.length,
        0,
        `SQLite must have zero records matching '${p}', found: ${JSON.stringify(rows)}`
      );
    }
  });

  it("03. Search queries for 'http', 'can bo lop', 'cac dau sach' return 0 results", async () => {
    const searchHttp = await searchLecturers({ query: "http", pageSize: 10 });
    assert.strictEqual(searchHttp.items.length, 0, "Search for 'http' must return 0 professors");

    const searchCanBoLop = await searchLecturers({ query: "cán bộ lớp", pageSize: 10 });
    assert.strictEqual(searchCanBoLop.items.length, 0, "Search for 'cán bộ lớp' must return 0 professors");

    const searchDauSach = await searchLecturers({ query: "các đầu sách", pageSize: 10 });
    assert.strictEqual(searchDauSach.items.length, 0, "Search for 'các đầu sách' must return 0 professors");
  });

  it("04. Cleaned HNUE2 records exist without form prefixes", async () => {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT id, name, normalized_name FROM lecturers WHERE id = 'prof-hnue2-ho-va-ten-le-van-tuong'");
      if (res.rows.length > 0) {
        assert.strictEqual(res.rows[0].name, "Lê Vân Tường", "Prefix 'Họ và tên:' must be stripped from name");
        assert.strictEqual(res.rows[0].normalized_name, "le van tuong");
      }
    }

    const db = getSqliteDb();
    const row = db.prepare("SELECT id, name, normalized_name FROM lecturers WHERE id = 'prof-hnue2-ho-va-ten-le-van-tuong'").get() as { id: string; name: string; normalized_name: string } | undefined;
    if (row) {
      assert.strictEqual(row.name, "Lê Vân Tường", "Prefix 'Họ và tên:' must be stripped from name in SQLite");
      assert.strictEqual(row.normalized_name, "le van tuong");
    }
  });

  it("05. Genuine professors like 'Nguyễn Văn Phòng' and 'Phan Công Bình' are preserved", async () => {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT id, name FROM lecturers WHERE id = 'dut-nguyen-van-phong'");
      assert.ok(res.rows.length > 0, "DUT professor 'Nguyễn Văn Phòng' must be preserved in PostgreSQL");
      assert.strictEqual(res.rows[0].name, "Nguyễn Văn Phòng");
    }

    const db = getSqliteDb();
    const row = db.prepare("SELECT id, name FROM lecturers WHERE id = 'dut-nguyen-van-phong'").get() as { id: string; name: string } | undefined;
    assert.ok(row, "DUT professor 'Nguyễn Văn Phòng' must be preserved in SQLite");
    assert.strictEqual(row?.name, "Nguyễn Văn Phòng");
  });

  it("06. Total faculty count strictly maintains the national milestone", async () => {
    const stats = await getDatabaseStatistics();
    const threshold = isPostgresConfigured() ? 85000 : 25000;
    assert.ok(
      stats.lecturersCount >= threshold,
      `Database must maintain >= ${threshold} verified professors after cleanup, found ${stats.lecturersCount}`
    );
  });

  it("07. Specific invalid teacher 'Polymer Bulletin' is purged from all databases and JSON", async () => {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        "SELECT id, name FROM lecturers WHERE id = 'prof-huit-polymer-bulletin' OR name ILIKE '%polymer bulletin%'"
      );
      assert.strictEqual(
        res.rows.length,
        0,
        `PostgreSQL must not contain Polymer Bulletin, found: ${JSON.stringify(res.rows)}`
      );
    }

    const db = getSqliteDb();
    const sqlRows = db
      .prepare(
        "SELECT id, name FROM lecturers WHERE id = 'prof-huit-polymer-bulletin' OR name LIKE '%Polymer Bulletin%'"
      )
      .all();
    assert.strictEqual(
      sqlRows.length,
      0,
      `SQLite must not contain Polymer Bulletin, found: ${JSON.stringify(sqlRows)}`
    );

    const jsonPath = path.resolve(process.cwd(), "src/data/verified_academic_data.json");
    if (fs.existsSync(jsonPath)) {
      const rawData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const foundInJson = (rawData.professors || []).filter(
        (p: { id?: string; name?: string }) =>
          p.id === "prof-huit-polymer-bulletin" || p.name?.toLowerCase().includes("polymer bulletin")
      );
      assert.strictEqual(
        foundInJson.length,
        0,
        `Static JSON must not contain Polymer Bulletin, found: ${JSON.stringify(foundInJson)}`
      );
    }
  });

  it("08. Scientific publications, admissions procedures, and short training courses are purged", async () => {
    const invalidNames = [
      "%polymer bulletin%",
      "%acta horticultura%",
      "%bioresource technology%",
      "%ceramics international%",
      "%xét tuyển hồ sơ%",
      "%thời gian học dự kiến%",
      "%quản lý phòng kiểm nghiệm%",
      "%kỹ thuật vận hành máy nhựa%",
      "%thực hành tài chính%",
      "%haccp thực phẩm%"
    ];

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      for (const pattern of invalidNames) {
        const res = await pool.query("SELECT id, name FROM lecturers WHERE name ILIKE $1", [pattern]);
        assert.strictEqual(
          res.rows.length,
          0,
          `PostgreSQL must have zero records matching '${pattern}', found: ${JSON.stringify(res.rows)}`
        );
      }
    }

    const db = getSqliteDb();
    for (const pattern of invalidNames) {
      const rows = db.prepare("SELECT id, name FROM lecturers WHERE name LIKE ?").all(pattern);
      assert.strictEqual(
        rows.length,
        0,
        `SQLite must have zero records matching '${pattern}', found: ${JSON.stringify(rows)}`
      );
    }
  });

  after(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
});
