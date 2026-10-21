import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { getServerUniversities, invalidateServerUniversitiesCache } from "../src/lib/server/searchIndex";
import { getPostgresPool, isPostgresConfigured } from "../src/lib/server/postgresClient";

describe("RateUrProfs — University Deduplication & Integrity Test Suite", () => {
  it("01. Vietnam Japan University is strictly deduplicated into canonical [vnu-vju]", async () => {
    invalidateServerUniversitiesCache();

    const queries = ["Vietnam Japan University", "VJU", "Việt Nhật", "Viet Nhat"];
    for (const q of queries) {
      const results = await getServerUniversities(q);
      assert.ok(results.length > 0, `Query "${q}" should return results`);

      // First/top result must always be canonical VJU
      const top = results[0];
      assert.strictEqual(top.id, "vnu-vju", `Top result for "${q}" must be canonical 'vnu-vju'`);
      assert.ok(top.totalProfessors && top.totalProfessors > 100, "VJU must have consolidated professors");

      // Verify no other university entry claims to be VJU
      const vjuInstances = results.filter(
        (u) =>
          u.id === "vnu-vju" ||
          u.id === "viet-nhat" ||
          u.id === "viet-nhat-2" ||
          u.id === "vju" ||
          u.id.startsWith("inst-truong-dai-hoc-viet-nhat")
      );
      assert.strictEqual(
        vjuInstances.length,
        1,
        `Query "${q}" must return exactly 1 instance representing Vietnam Japan University, found ${vjuInstances.length}`
      );
    }
  });

  it("02. Bounded deduplication: getServerUniversities guarantees 100% unique IDs", async () => {
    const allUnis = await getServerUniversities();
    assert.ok(allUnis.length > 0, "Must have institutions loaded");

    const idSet = new Set<string>();
    for (const u of allUnis) {
      assert.ok(!idSet.has(u.id), `Duplicate university ID found in search results: ${u.id}`);
      idSet.add(u.id);
    }
  });

  it("03. Cloud SQL PostgreSQL Referential Integrity: zero orphaned records", async () => {
    if (!isPostgresConfigured()) return;

    const pool = getPostgresPool();
    const orphanedAff = await pool.query(
      "SELECT COUNT(*) FROM affiliations WHERE university_id NOT IN (SELECT id FROM universities)"
    );
    const orphanedRev = await pool.query(
      "SELECT COUNT(*) FROM reviews WHERE university_id NOT IN (SELECT id FROM universities)"
    );

    assert.strictEqual(parseInt(orphanedAff.rows[0].count, 10), 0, "Orphaned affiliations must be 0");
    assert.strictEqual(parseInt(orphanedRev.rows[0].count, 10), 0, "Orphaned reviews must be 0");
  });

  it("04. Unique Constraint: affiliations(lecturer_id, university_id) enforces uniqueness", async () => {
    if (!isPostgresConfigured()) return;

    const pool = getPostgresPool();
    const duplicateAffRes = await pool.query(`
      SELECT lecturer_id, university_id, COUNT(*) 
      FROM affiliations 
      GROUP BY lecturer_id, university_id 
      HAVING COUNT(*) > 1
    `);

    assert.strictEqual(
      duplicateAffRes.rows.length,
      0,
      "There must be 0 duplicate (lecturer_id, university_id) pairs in affiliations"
    );
  });

  after(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
});
