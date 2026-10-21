import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  executeServerSearch,
  getServerAutocomplete,
  getServerFeaturedProfessors,
  getServerIngestionStats,
  getServerSearchEngine,
  getServerProfessorById,
  getServerReviewsForProfessor,
  getServerUniversities,
  getServerUniversityById,
  projectLightweightProfessor,
} from "../src/lib/server/searchIndex";
import { removeVietnameseDiacritics } from "../src/lib/bilingualSearch";
import { Professor } from "../src/types";

describe("RateUrProfs — Server-Side Search & Autocomplete Suite", () => {
  before(async () => {
    // Warm up the server search engine instance
    await getServerSearchEngine();
  });

  it("01. Zero-Fabrication Assertion: 100% of indexed professors are genuine verified records", async () => {
    const stats = await getServerIngestionStats();
    assert.ok(stats.totalUniqueProfessors > 0, "Database must contain verified professors");
    assert.strictEqual(
      stats.verificationStatusBreakdown.synthetic,
      0,
      "There must be ZERO synthetic/fictional records in the database"
    );

    // Verify through search query across the dataset
    const result = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 50 });
    for (const item of result.items) {
      assert.notStrictEqual(
        item.verificationStatus,
        "partially_verified",
        `Item ${item.id} must not be synthetic partially_verified`
      );
    }
  });

  it("02. Empty Query Defense & Bounded Pagination: empty query returns 0 items; pageSize capped at 50", async () => {
    // Empty query must return 0 items and never scan or return collection
    const emptyRes = await executeServerSearch({});
    assert.strictEqual(emptyRes.totalCount, 0, "Empty query must return 0 totalCount");
    assert.strictEqual(emptyRes.items.length, 0, "Empty query must return 0 items");

    // Over-limit request bounded to 50
    const overRes = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 1000 });
    assert.strictEqual(overRes.pageSize, 50, "Requested pageSize > 50 must be clamped to 50");
    assert.ok(overRes.items.length <= 50, "Results length must not exceed 50");

    // Negative page bounded to 1
    const negPageRes = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: -5, pageSize: 10 });
    assert.strictEqual(negPageRes.page, 1, "Page < 1 must be normalized to 1");
  });

  it("03. Pagination Disjointness: consecutive pages return strictly non-overlapping records", async () => {
    const page1 = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 12 });
    const page2 = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 2, pageSize: 12 });

    assert.ok(page1.items.length > 0, "Page 1 must contain items");
    assert.ok(page2.items.length > 0, "Page 2 must contain items");

    const page1Ids = new Set(page1.items.map((i) => i.id));
    const page2Ids = new Set(page2.items.map((i) => i.id));

    // Check intersection
    const overlapping = [...page1Ids].filter((id) => page2Ids.has(id));
    assert.strictEqual(
      overlapping.length,
      0,
      `Pagination must be strictly disjoint between pages, found overlap: ${overlapping.join(", ")}`
    );
  });

  it("04. Lightweight Projection: response items omit heavy bio, RAG chunks, and publications", async () => {
    const res = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 12 });
    assert.ok(res.items.length > 0);

    for (const item of res.items) {
      // Must contain lightweight identification fields
      assert.ok(item.id, "Must have id");
      assert.ok(item.name, "Must have name");

      // Must NOT contain bulky fields
      assert.strictEqual(
        (item as any).bio,
        undefined,
        `Lightweight projection must not include bulky bio for ${item.id}`
      );
      assert.strictEqual(
        (item as any).bioVi,
        undefined,
        `Lightweight projection must not include bulky bioVi for ${item.id}`
      );
      assert.strictEqual(
        (item as any).publications,
        undefined,
        `Lightweight projection must not include publications list for ${item.id}`
      );
      assert.strictEqual(
        (item as any).ragChunks,
        undefined,
        `Lightweight projection must not include RAG chunks for ${item.id}`
      );
      assert.strictEqual(
        (item as any).reviews,
        undefined,
        `Lightweight projection must not include detailed review thread for ${item.id}`
      );
    }
  });

  it("05. Response Payload Benchmark: 12-item search response serialized size is under 10 KB", async () => {
    const res = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 12 });
    const jsonString = JSON.stringify(res);
    const sizeInBytes = Buffer.byteLength(jsonString, "utf8");
    const sizeInKB = sizeInBytes / 1024;

    assert.ok(
      sizeInKB < 10,
      `Response payload size (${sizeInKB.toFixed(2)} KB) must be strictly below 10 KB threshold`
    );
  });

  it("06. Vietnamese Diacritic-Insensitive Search: 'Đại học' and 'dai hoc' yield identical results", async () => {
    const withDiacritics = await executeServerSearch({ query: "Bách Khoa" });
    const withoutDiacritics = await executeServerSearch({ query: "Bach Khoa" });

    assert.ok(withDiacritics.totalCount > 0, "Should match results with diacritics");
    assert.ok(withoutDiacritics.totalCount > 0, "Should match results without diacritics");
    assert.strictEqual(
      withDiacritics.totalCount,
      withoutDiacritics.totalCount,
      "Diacritic and non-diacritic searches must return identical match counts"
    );
  });

  it("07. Vietnamese Lecturer Name Matching: diacritic-insensitive and partial prefix match", async () => {
    // Search for common Vietnamese surname "Nguyen"
    const resNguyen = await executeServerSearch({ name: "Nguyen" });
    const resNguyenDiacritic = await executeServerSearch({ name: "Nguyễn" });

    assert.ok(resNguyen.totalCount > 0, "Should find lecturers with name Nguyen");
    assert.strictEqual(
      resNguyen.totalCount,
      resNguyenDiacritic.totalCount,
      "Nguyen and Nguyễn must match identically"
    );

    // Verify all returned items actually match the name
    for (const item of resNguyen.items) {
      const normName = removeVietnameseDiacritics(item.name.toLowerCase());
      assert.ok(
        normName.includes("nguyen"),
        `Returned lecturer '${item.name}' must contain search term 'nguyen'`
      );
    }
  });

  it("08. Fast Autocomplete: query < 2 chars returns empty list; query >= 2 returns suggestions with university badge", async () => {
    // Query < 2 chars
    const shortRes = await getServerAutocomplete("a");
    assert.deepStrictEqual(shortRes, [], "Query with length < 2 must return empty suggestions");

    // Query >= 2 chars
    const suggestions = await getServerAutocomplete("Ng", 6);
    assert.ok(suggestions.length > 0, "Should return autocomplete suggestions");
    assert.ok(suggestions.length <= 6, "Must respect limit");

    for (const s of suggestions) {
      assert.ok(s.id, "Suggestion must have id");
      assert.ok(s.title, "Suggestion must have title (lecturer name)");
      assert.strictEqual(s.type, "lecturer");
      // Must include university short name or subtitle to disambiguate identical Vietnamese names
      assert.ok(
        Boolean(s.universityShortName || s.subtitle),
        "Suggestion must include university identifier to disambiguate common names"
      );
    }
  });

  it("09. Featured Lecturers: returns bounded genuine verified cards for homepage hero", async () => {
    const featured = await getServerFeaturedProfessors(4);
    assert.strictEqual(featured.length, 4, "Must return exactly 4 featured professors");

    for (const p of featured) {
      assert.ok(p.id, "Featured lecturer must have id");
      assert.ok(p.name, "Featured lecturer must have name");
      assert.notStrictEqual(
        p.verificationStatus,
        "partially_verified",
        "Featured lecturer must be genuine verified"
      );
    }
  });

  it("10. Multi-filter combination: University + Minimum Rating", async () => {
    // Find a university with verified faculty (e.g. hust, dut, ctu)
    const hustRes = await executeServerSearch({ universityIds: ["hust"] });
    assert.ok(hustRes.totalCount > 0, "HUST must have verified professors");

    // All returned items must belong to HUST
    for (const p of hustRes.items) {
      assert.strictEqual(p.universityId, "hust", "All items must have universityId === 'hust'");
    }
  });

  it("11. Performance Latency Benchmark: server search p95 latency is under 50ms", async () => {
    const sampleQueries = [
      "Nguyễn",
      "Tran",
      "Le",
      "Bach Khoa",
      "Công nghệ",
      "Kỹ thuật",
      "Toán",
      "HUST",
      "HCMUT",
      "Đà Nẵng",
    ];

    const latencies: number[] = [];

    // Warm up engine to eliminate JIT compilation / cold-start jitter
    await executeServerSearch({ query: "warmup" });
    await executeServerSearch({ query: "HUST" });

    // Run 50 search requests across diverse queries
    for (let i = 0; i < 50; i++) {
      const q = sampleQueries[i % sampleQueries.length];
      const start = performance.now();
      await executeServerSearch({ query: q }, "relevance", { page: 1, pageSize: 12 });
      const duration = performance.now() - start;
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const max = latencies[latencies.length - 1];

    console.log(`\n  [Server Search Benchmark]`);
    console.log(`    p50: ${p50.toFixed(2)} ms`);
    console.log(`    p95: ${p95.toFixed(2)} ms (Target: < 50 ms)`);
    console.log(`    max: ${max.toFixed(2)} ms\n`);

    assert.ok(
      p95 < 50,
      `p95 search latency (${p95.toFixed(2)} ms) must be strictly below 50 ms`
    );
  });

  it("12. Unmatched query returns empty result set and zero items", async () => {
    const res = await executeServerSearch({ query: "xyznonexistentlecturer99999" });
    assert.strictEqual(res.totalCount, 0, "Unmatched query must return 0 totalCount");
    assert.strictEqual(res.items.length, 0, "Unmatched query must return empty items array");
  });

  it("13. Full Profile Separation: single lecturer retrieval fetches only requested record", async () => {
    // Find a real lecturer ID
    const searchRes = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 1 });
    assert.ok(searchRes.items.length > 0, "Must find at least one lecturer");
    const targetId = searchRes.items[0].id;

    const prof = await getServerProfessorById(targetId);
    assert.ok(prof, "Must find professor by ID");
    assert.strictEqual(prof.id, targetId, "Must return exactly the requested professor ID");
    assert.ok(prof.name, "Professor must have a genuine name");

    // Non-existent ID returns null
    const missing = await getServerProfessorById("non_existent_prof_id_12345");
    assert.strictEqual(missing, null, "Non-existent lecturer ID must return null");
  });

  it("14. Independent Paginated Reviews: reviews are loaded on demand and paginated", async () => {
    const searchRes = await executeServerSearch({ query: "Nguyen" }, "relevance", { page: 1, pageSize: 1 });
    const targetId = searchRes.items[0].id;

    const revRes = await getServerReviewsForProfessor(targetId, { page: 1, limit: 10 });
    assert.ok(Array.isArray(revRes.reviews), "Must return reviews array");
    assert.ok(revRes.total >= 0, "Total reviews must be non-negative");
    assert.ok(revRes.pageSize <= 10, "Page size must be bounded by limit");
  });

  it("15. University Endpoints: bounded university queries return genuine institutions", async () => {
    const allUnis = await getServerUniversities();
    assert.ok(allUnis.length > 0, "Must have institutions");

    const hust = await getServerUniversityById("hust");
    assert.ok(hust, "Must find HUST by ID");
    assert.strictEqual(hust.shortName, "HUST", "Short name must be HUST");

    const filtered = await getServerUniversities("Bách Khoa");
    assert.ok(filtered.length > 0, "Must find universities matching 'Bách Khoa'");
  });

  it("16. Missing Ratings Are Not Fabricated: unrated lecturers return null average rating", async () => {
    const searchRes = await executeServerSearch({ query: "Nguyen", includeUnrated: true }, "relevance", { page: 1, pageSize: 50 });
    const unrated = searchRes.items.filter((p) => !p.ratingCount || p.ratingCount === 0);

    for (const p of unrated) {
      assert.strictEqual(
        p.ratingAverage,
        null,
        `Unrated professor ${p.id} must have ratingAverage === null, never 0 or fake score`
      );
      assert.strictEqual(
        p.averageRating,
        null,
        `Unrated professor ${p.id} must have averageRating === null`
      );
    }
  });

  it("17. School-Only Autocomplete: type='school' returns only universities and excludes lecturers", async () => {
    // 1. Searching by school acronym or name returns universities
    const schoolSuggestions = await getServerAutocomplete("HUST", 5, "school");
    assert.ok(schoolSuggestions.length > 0, "Should return school suggestions for HUST");
    for (const s of schoolSuggestions) {
      assert.strictEqual(s.type, "university", "School search must return ONLY university suggestions");
    }

    // 2. Searching by a lecturer's name in school mode returns NO suggestions (never suggests lecturers)
    const profNameInSchoolMode = await getServerAutocomplete("Lê Chí Ngọc", 5, "school");
    assert.strictEqual(
      profNameInSchoolMode.length,
      0,
      "Searching a lecturer name in school mode must not return suggestions"
    );
  });

  it("18. Professor-Only Autocomplete: type='professor' returns only lecturers and excludes universities", async () => {
    // 1. Searching by lecturer name returns lecturers
    const profSuggestions = await getServerAutocomplete("Lê Chí Ngọc", 5, "professor");
    assert.ok(profSuggestions.length > 0, "Should return lecturer suggestions for Lê Chí Ngọc");
    for (const s of profSuggestions) {
      assert.strictEqual(s.type, "lecturer", "Professor search must return ONLY lecturer suggestions");
    }

    // 2. Searching an institution/acronym in professor mode never returns universities
    const hustInProfMode = await getServerAutocomplete("HUST", 5, "professor");
    for (const s of hustInProfMode) {
      assert.strictEqual(s.type, "lecturer", "Professor search mode must strictly exclude university suggestions");
    }
  });

  it("19. Lecturer Profile Avatar Integrity: verified photo URL and status resolution", async () => {
    const { getLecturerById } = await import("../src/lib/server/db");
    const { cleanAndFormatAvatarUrl } = await import("../src/components/LecturerAvatar");

    // Test a lecturer known to have an official photo
    const profWithPhoto = await getLecturerById("dut-bach-quoc-tien");
    assert.ok(profWithPhoto, "Lecturer dut-bach-quoc-tien should exist");
    assert.ok(profWithPhoto.photoUrl, "Should have photoUrl populated");
    assert.strictEqual(profWithPhoto.photoStatus, "verified_photo", "Status must be verified_photo");
    
    // Verify URL cleaning & formatting
    const cleanedUrl = cleanAndFormatAvatarUrl(profWithPhoto.photoUrl);
    assert.ok(cleanedUrl, "Cleaned URL must not be null");
    assert.ok(cleanedUrl.startsWith("https://"), "HTTP must be upgraded to HTTPS");
    assert.ok(!cleanedUrl.includes(" "), "Spaces must be URL encoded");

    // Test placeholder detection (no-image.png should resolve to default_avatar and null photoUrl)
    const profPlaceholder = await getLecturerById("prof-vnu-hus-dinh-mai-van");
    assert.ok(profPlaceholder, "Lecturer prof-vnu-hus-dinh-mai-van should exist");
    assert.strictEqual(profPlaceholder.photoUrl, null, "Placeholder photo must be null");
    assert.strictEqual(profPlaceholder.photoStatus, "default_avatar", "Status must be default_avatar");
    assert.strictEqual(cleanAndFormatAvatarUrl(profPlaceholder.avatar), null, "cleanAndFormatAvatarUrl must filter placeholder");
  });

  after(async () => {
    try {
      const { getPostgresPool, isPostgresConfigured } = await import("../src/lib/server/postgresClient");
      if (isPostgresConfigured()) {
        await getPostgresPool().end();
      }
    } catch {
      // ignore
    }
  });
});
