import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchLecturersSql, getDatabaseStats } from "../src/lib/server/sqliteClient";
import { normalizeSearchString } from "../src/lib/search/vietnameseNormalizer";

describe("Native SQLite Client (Node 24 node:sqlite)", () => {
  it("retrieves accurate database statistics for rateprof.db", () => {
    const stats = getDatabaseStats();
    assert.ok(stats.universitiesCount > 500, `Expected > 500 universities, got ${stats.universitiesCount}`);
    assert.ok(stats.lecturersCount > 2000, `Expected > 2000 lecturers, got ${stats.lecturersCount}`);
    assert.ok(stats.affiliationsCount > 2000, `Expected > 2000 affiliations, got ${stats.affiliationsCount}`);
    assert.ok(stats.sourcesCount > 100, `Expected > 100 sources, got ${stats.sourcesCount}`);
  });

  it("enforces bounded pagination with default 12 and maximum 50", () => {
    // Default page size
    const resDefault = searchLecturersSql({ query: "Nguyen" });
    assert.equal(resDefault.page, 1);
    assert.equal(resDefault.pageSize, 12);
    assert.ok(resDefault.items.length <= 12);

    // Hard ceiling at 50
    const resLarge = searchLecturersSql({ query: "Nguyen", pageSize: 100 });
    assert.equal(resLarge.pageSize, 50, "Page size should be bounded to 50");
    assert.ok(resLarge.items.length <= 50);

    // Out of bounds page clamps to 1
    const resClamped = searchLecturersSql({ query: "Nguyen", page: -5 });
    assert.equal(resClamped.page, 1);
  });

  it("performs diacritic-insensitive search for Vietnamese names", () => {
    // "Nguyen" without diacritics should match "Nguyễn"
    const resNguyen = searchLecturersSql({ name: "Nguyen", pageSize: 10 });
    assert.ok(resNguyen.totalCount > 10, "Should find multiple lecturers with Nguyen/Nguyễn");
    for (const item of resNguyen.items) {
      assert.ok(
        normalizeSearchString(item.name).includes("nguyen"),
        `Item name ${item.name} should contain Nguyen/Nguyễn`
      );
    }

    // "Tran" without diacritics should match "Trần" / "Trân"
    const resTran = searchLecturersSql({ name: "Tran", pageSize: 10 });
    assert.ok(resTran.totalCount > 5, "Should find multiple lecturers with Tran/Trần");
    for (const item of resTran.items) {
      assert.ok(
        normalizeSearchString(item.name).includes("tran"),
        `Item name ${item.name} should contain Tran/Trần`
      );
    }
  });

  it("filters accurately by academic rank (GS / PGS)", () => {
    const resGs = searchLecturersSql({ academicRank: "GS", pageSize: 20 });
    assert.ok(resGs.totalCount > 0, "Should find professors with GS rank");
    for (const item of resGs.items) {
      assert.equal(item.academicRank, "GS", `Expected GS rank, got ${item.academicRank}`);
    }

    const resPgs = searchLecturersSql({ academicRank: "PGS", pageSize: 20 });
    assert.ok(resPgs.totalCount > 0, "Should find professors with PGS rank");
    for (const item of resPgs.items) {
      assert.equal(item.academicRank, "PGS", `Expected PGS rank, got ${item.academicRank}`);
    }
  });

  it("filters accurately by university ID", () => {
    const resHust = searchLecturersSql({ universityId: "hust", pageSize: 20 });
    assert.ok(resHust.totalCount > 0, "Should find lecturers for HUST");
    for (const item of resHust.items) {
      assert.equal(item.universityId, "hust");
    }
  });
});
