import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { getPostgresPool, isPostgresConfigured } from "../src/lib/server/postgresClient";
import { getServerUniversities, invalidateServerUniversitiesCache } from "../src/lib/server/searchIndex";
import { UniversityRegistry } from "../src/lib/server/crawler/registry";

describe("RateUrProfs — MOET 327 Official Registry & Reconciliation Test Suite", () => {
  it("01. Canonical Registry Count: Exactly 327 institutions in PostgreSQL", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const res = await pool.query("SELECT COUNT(*) FROM universities");
    const count = parseInt(res.rows[0].count, 10);
    assert.strictEqual(count, 327, `PostgreSQL universities table must contain exactly 327 institutions, found ${count}`);
  });

  it("02. Official Codes Verification: 100% of institutions have verified, unique codes", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const verifiedRes = await pool.query(
      "SELECT COUNT(*) FROM universities WHERE official_code IS NOT NULL AND official_code_status = 'verified'"
    );
    const verifiedCount = parseInt(verifiedRes.rows[0].count, 10);
    assert.strictEqual(verifiedCount, 327, `All 327 institutions must have verified official codes, found ${verifiedCount}`);

    const distinctRes = await pool.query("SELECT COUNT(DISTINCT official_code) FROM universities");
    const distinctCount = parseInt(distinctRes.rows[0].count, 10);
    assert.strictEqual(distinctCount, 327, `All 327 official codes must be unique, found ${distinctCount}`);
  });

  it("03. Official Code Accuracy for Core Universities", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const expectedCodes: Record<string, string> = {
      hust: "BKA",
      "vnu-uet": "QHI",
      "vnu-vju": "VJU",
      ftu: "NTH",
      neu: "KHA",
      fpt: "FPT",
      hau: "KTA",
      ictu: "DTC",
      utt: "GTA",
      hcmut: "QSB",
      uit: "QSC",
      hcmus: "QST",
      ctu: "TCT",
      hutech: "DKC",
      hmu: "YHB",
      ump: "YDS",
    };

    const ids = Object.keys(expectedCodes);
    const res = await pool.query("SELECT id, official_code FROM universities WHERE id = ANY($1)", [ids]);
    const foundMap = new Map<string, string>();
    res.rows.forEach((r) => foundMap.set(r.id, r.official_code));

    for (const [id, expectedCode] of Object.entries(expectedCodes)) {
      const actualCode = foundMap.get(id);
      assert.strictEqual(
        actualCode,
        expectedCode,
        `University [${id}] must have official MOET code "${expectedCode}", found "${actualCode}"`
      );
    }
  });

  it("04. Zero Duplicate Entities: No legacy duplicate university IDs exist in database", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const legacyDuplicates = [
      "viet-nhat",
      "viet-nhat-2",
      "inst-university-of-transport-technolo",
      "inst-truong-dai-hoc-bach-khoa-dai-hoc",
      "inst-truong-dai-hoc-quoc-te-dai-hoc-q",
      "hdgsnn",
      "inst-benh-vien-bach-mai",
      "inst-benh-vien-k",
    ];

    const res = await pool.query("SELECT id FROM universities WHERE id = ANY($1)", [legacyDuplicates]);
    assert.strictEqual(
      res.rows.length,
      0,
      `None of the legacy duplicate or non-school IDs should exist in universities: ${JSON.stringify(res.rows)}`
    );
  });

  it("05. Referential Integrity: Zero orphaned affiliations, zero orphaned reviews", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const orphAff = await pool.query(
      "SELECT COUNT(*) FROM affiliations WHERE university_id NOT IN (SELECT id FROM universities)"
    );
    assert.strictEqual(parseInt(orphAff.rows[0].count, 10), 0, "Orphaned affiliations must be 0");

    const orphRev = await pool.query(
      "SELECT COUNT(*) FROM reviews WHERE university_id NOT IN (SELECT id FROM universities)"
    );
    assert.strictEqual(parseInt(orphRev.rows[0].count, 10), 0, "Orphaned lecturer reviews must be 0");

    const orphSchoolRev = await pool.query(
      "SELECT COUNT(*) FROM school_reviews WHERE university_id NOT IN (SELECT id FROM universities)"
    );
    assert.strictEqual(parseInt(orphSchoolRev.rows[0].count, 10), 0, "Orphaned school reviews must be 0");

    const dupAff = await pool.query(`
      SELECT lecturer_id, university_id, COUNT(*) 
      FROM affiliations 
      GROUP BY lecturer_id, university_id 
      HAVING COUNT(*) > 1
    `);
    assert.strictEqual(dupAff.rows.length, 0, "There must be 0 duplicate (lecturer_id, university_id) pairs");
  });

  it("06. Review Safety: 100% of reviews are preserved and properly associated", async () => {
    if (!isPostgresConfigured()) return;
    const pool = getPostgresPool();

    const revCount = await pool.query("SELECT COUNT(*) FROM reviews");
    const schoolRevCount = await pool.query("SELECT COUNT(*) FROM school_reviews");

    assert.ok(parseInt(revCount.rows[0].count, 10) >= 10, "Must preserve all 10+ lecturer reviews");
    assert.ok(parseInt(schoolRevCount.rows[0].count, 10) >= 10, "Must preserve all 10+ school reviews");

    // Verify UTT school review was migrated cleanly from inst-university-of-transport-technolo
    const uttSchoolRev = await pool.query("SELECT * FROM school_reviews WHERE university_id = 'utt'");
    assert.strictEqual(uttSchoolRev.rows.length, 1, "UTT must retain its migrated school review");

    // Verify VJU school reviews
    const vjuSchoolRev = await pool.query("SELECT * FROM school_reviews WHERE university_id = 'vnu-vju'");
    assert.strictEqual(vjuSchoolRev.rows.length, 2, "VJU must retain its 2 school reviews");
  });

  it("07. Search & Discovery: Search by official MOET codes and abbreviations resolves canonical institutions", async () => {
    invalidateServerUniversitiesCache();

    // Test BKA -> HUST
    const bkaRes = await getServerUniversities("BKA");
    assert.ok(bkaRes.length > 0, "Search for 'BKA' must return results");
    assert.strictEqual(bkaRes[0].id, "hust", "Top result for official code 'BKA' must be 'hust'");

    // Test HUST -> HUST
    const hustRes = await getServerUniversities("HUST");
    assert.ok(hustRes.length > 0, "Search for 'HUST' must return results");
    assert.strictEqual(hustRes[0].id, "hust", "Top result for abbreviation 'HUST' must be 'hust'");

    // Test VJU -> VJU
    const vjuRes = await getServerUniversities("VJU");
    assert.ok(vjuRes.length > 0, "Search for 'VJU' must return results");
    assert.strictEqual(vjuRes[0].id, "vnu-vju", "Top result for official code 'VJU' must be 'vnu-vju'");

    // Test QHI -> VNU-UET
    const qhiRes = await getServerUniversities("QHI");
    assert.ok(qhiRes.length > 0, "Search for 'QHI' must return results");
    assert.strictEqual(qhiRes[0].id, "vnu-uet", "Top result for official code 'QHI' must be 'vnu-uet'");

    // Test NTH -> FTU
    const nthRes = await getServerUniversities("NTH");
    assert.ok(nthRes.length > 0, "Search for 'NTH' must return results");
    assert.strictEqual(nthRes[0].id, "ftu", "Top result for official code 'NTH' must be 'ftu'");

    // Test KHA -> NEU
    const khaRes = await getServerUniversities("KHA");
    assert.ok(khaRes.length > 0, "Search for 'KHA' must return results");
    assert.strictEqual(khaRes[0].id, "neu", "Top result for official code 'KHA' must be 'neu'");
  });

  it("08. Crawler Registry Hardening: Blocks dynamic creation of unverified non-MOET institutions", async () => {
    const unverifiedCandidate = {
      name: "Tổ chức Thử nghiệm Không thuộc MOET",
      shortName: "TEST-NON-MOET",
      officialDomain: "random-unaccredited-domain.org",
      officialWebsite: "https://random-unaccredited-domain.org",
    };

    const result = await UniversityRegistry.registerOrUpdateInstitution(unverifiedCandidate);
    assert.strictEqual(result.registered, false, "Must refuse to register unverified non-MOET institution");
    assert.strictEqual(result.action, "skipped", "Action must be 'skipped'");

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const countRes = await pool.query("SELECT COUNT(*) FROM universities");
      assert.strictEqual(
        parseInt(countRes.rows[0].count, 10),
        327,
        "University count must remain strictly 327 after rejected crawler attempt"
      );
    }
  });

  after(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
});
