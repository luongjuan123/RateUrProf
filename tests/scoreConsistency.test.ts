import test from "node:test";
import assert from "node:assert/strict";
import {
  executeServerSearch,
  getServerAutocomplete,
  getServerProfessorById,
  getServerUniversities,
  getServerUniversityById,
} from "../src/lib/server/searchIndex";
import {
  getLecturerById,
  getSchoolReviewsAndStats,
  insertSchoolReview,
  deleteSchoolReviewById,
} from "../src/lib/server/db";

test("Score Consistency Suite: Search Results vs Autocomplete vs Detail Views", async (t) => {
  await t.test("01. Professor with reviews: Search result scores match detail view exactly", async () => {
    const profId = "prof-vnu-hus-ngo-quoc-anh";

    // Detail view source
    const detailProf = (await getLecturerById(profId)) || (await getServerProfessorById(profId));
    assert.ok(detailProf, "Professor must exist in DB");
    assert.ok((detailProf.ratingCount || 0) > 0, "Professor should have reviews");

    // Search results source
    const searchRes = await executeServerSearch(
      { query: "Ngo Quoc Anh" },
      "relevance",
      { page: 1, pageSize: 10 }
    );
    const searchProf = searchRes.items.find((item) => item.id === profId);
    assert.ok(searchProf, "Professor must appear in search results");

    // Autocomplete source
    const autocompleteSuggestions = await getServerAutocomplete("Ngo Quoc Anh", 10);
    const autoProf = autocompleteSuggestions.find((s) => s.id === profId);
    assert.ok(autoProf, "Professor must appear in autocomplete");

    // Assert exact score matches across search, detail, and autocomplete
    assert.equal(
      searchProf.ratingAverage,
      detailProf.ratingAverage,
      `Rating average mismatch: search=${searchProf.ratingAverage}, detail=${detailProf.ratingAverage}`
    );
    assert.equal(
      searchProf.ratingCount,
      detailProf.ratingCount,
      `Rating count mismatch: search=${searchProf.ratingCount}, detail=${detailProf.ratingCount}`
    );
    assert.equal(
      searchProf.difficultyScore,
      detailProf.difficultyScore,
      `Difficulty score mismatch: search=${searchProf.difficultyScore}, detail=${detailProf.difficultyScore}`
    );
    assert.equal(
      searchProf.takeAgainPercent,
      detailProf.takeAgainPercent,
      `Take again mismatch: search=${searchProf.takeAgainPercent}, detail=${detailProf.takeAgainPercent}`
    );

    // Autocomplete verification
    assert.equal(
      autoProf?.ratingAverage,
      detailProf.ratingAverage,
      `Autocomplete ratingAverage mismatch: auto=${autoProf?.ratingAverage}, detail=${detailProf.ratingAverage}`
    );
    assert.equal(
      autoProf?.ratingCount,
      detailProf.ratingCount,
      `Autocomplete ratingCount mismatch: auto=${autoProf?.ratingCount}, detail=${detailProf.ratingCount}`
    );
  });

  await t.test("02. Unrated Professor: Returns null score and zero count across both search and detail", async () => {
    const searchRes = await executeServerSearch(
      { query: "Nguyen", includeUnrated: true },
      "name_asc",
      { page: 1, pageSize: 20 }
    );

    const unrated = searchRes.items.find((item) => (item.ratingCount || 0) === 0);
    if (unrated) {
      const detailProf = (await getLecturerById(unrated.id)) || (await getServerProfessorById(unrated.id));
      assert.ok(detailProf, "Unrated professor must exist in detail view");
      assert.equal(detailProf.ratingAverage, null, "Unrated professor must have null ratingAverage in detail");
      assert.equal(unrated.ratingAverage, null, "Unrated professor must have null ratingAverage in search");
      assert.equal(detailProf.ratingCount, 0, "Unrated professor must have 0 ratingCount in detail");
      assert.equal(unrated.ratingCount, 0, "Unrated professor must have 0 ratingCount in search");
    }
  });

  await t.test("03. University Reviews: Live ratings match between search results, detail stats, and autocomplete", async () => {
    const testUniId = "hust";
    const testReviewId = `test-school-rev-${Date.now()}`;

    try {
      // Insert a test school review for HUST
      await insertSchoolReview({
        id: testReviewId,
        universityId: testUniId,
        userDisplayName: "Test Student",
        userId: "test-user-consistency",
        cohort: "K65",
        criteria: {
          reputation: 5,
          location: 4,
          opportunities: 5,
          facilities: 4,
          internet: 4,
          food: 4,
          clubs: 5,
          social: 4,
          happiness: 4,
          safety: 5,
        },
        comment: "Trường đại học Bách Khoa Hà Nội rất tuyệt vời!",
      });

      // 1. Check detail page stats function
      const stats = await getSchoolReviewsAndStats(testUniId);
      assert.ok(stats.total > 0, "HUST should have total > 0 after inserting review");
      assert.ok(typeof stats.ratingAverage === "number", "HUST should have numerical ratingAverage");

      // 2. Check search results for universities
      const unis = await getServerUniversities("HUST");
      const hust = unis.find((u) => u.id === testUniId);
      assert.ok(hust, "HUST must appear in university search");
      assert.equal(
        hust.totalReviews,
        stats.total,
        `University search totalReviews (${hust.totalReviews}) must match detail stats (${stats.total})`
      );
      assert.equal(
        hust.ratingAverage,
        stats.ratingAverage,
        `University search ratingAverage (${hust.ratingAverage}) must match detail stats (${stats.ratingAverage})`
      );

      // 3. Check getServerUniversityById
      const singleUni = await getServerUniversityById(testUniId);
      assert.ok(singleUni, "HUST must be retrievable by ID");
      assert.equal(
        singleUni.totalReviews,
        stats.total,
        `Single university totalReviews (${singleUni.totalReviews}) must match detail stats (${stats.total})`
      );
      assert.equal(
        singleUni.ratingAverage,
        stats.ratingAverage,
        `Single university ratingAverage (${singleUni.ratingAverage}) must match detail stats (${stats.ratingAverage})`
      );

      // 4. Check autocomplete dropdown
      const autoSchools = await getServerAutocomplete("HUST", 5, "school");
      const autoHust = autoSchools.find((s) => s.id === testUniId);
      assert.ok(autoHust, "HUST must appear in school autocomplete");
      assert.equal(
        autoHust.ratingAverage,
        stats.ratingAverage,
        `Autocomplete ratingAverage (${autoHust.ratingAverage}) must match detail stats (${stats.ratingAverage})`
      );
      assert.equal(
        autoHust.ratingCount,
        stats.total,
        `Autocomplete ratingCount (${autoHust.ratingCount}) must match detail stats (${stats.total})`
      );
    } finally {
      // Clean up test review
      await deleteSchoolReviewById(testReviewId);
    }
  });

  await t.test("04. Post-deletion Cache Invalidation: University reverts cleanly when reviews are deleted", async () => {
    const unis = await getServerUniversities("HUST");
    const hust = unis.find((u) => u.id === "hust");
    assert.ok(hust, "HUST must exist");
    const stats = await getSchoolReviewsAndStats("hust");
    assert.equal(hust.totalReviews, stats.total, "totalReviews must match after deletion");
    assert.equal(hust.ratingAverage, stats.ratingAverage, "ratingAverage must match after deletion");
  });
});

test.after(async () => {
  const { isPostgresConfigured, getPostgresPool } = await import("../src/lib/server/postgresClient");
  if (isPostgresConfigured()) {
    await getPostgresPool().end();
  }
});
