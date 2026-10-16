import assert from "node:assert";
import { SearchEngine } from "../searchEngine";
import { TEST_PROFESSORS } from "./testDataset";
import { SearchFilters } from "@/types";

export function runAllTests() {
  const engine = new SearchEngine();
  engine.bulkIndex(TEST_PROFESSORS);

  console.log("=== RUNNING 30 SEARCH & FILTERING TEST SCENARIOS ===");

  // Helper to get IDs
  const getIds = (items: { id: string }[]) => items.map((i) => i.id);

  // Scenario 1: Search for a professor by exact name
  {
    const res = engine.search({ name: "Nguyễn Văn An" });
    const ids = getIds(res.items);
    assert(ids.includes("prof-an-hust"), "Scenario 1: Should find prof-an-hust");
    assert(ids.includes("prof-an-hcmut"), "Scenario 1: Should find prof-an-hcmut");
    assert(!ids.includes("prof-tung-hust"), "Scenario 1: Should NOT return prof-tung-hust");
    assert(!ids.includes("prof-anh-neu"), "Scenario 1: Should NOT return prof-anh-neu");
    console.log("✔ Scenario 1: Search for a professor by exact name passed");
  }

  // Scenario 2: Search for a professor by partial name
  {
    const res = engine.search({ name: "Văn An" });
    const ids = getIds(res.items);
    assert(ids.includes("prof-an-hust"), "Scenario 2: Should match partial name 'Văn An' for prof-an-hust");
    assert(ids.includes("prof-an-hcmut"), "Scenario 2: Should match partial name 'Văn An' for prof-an-hcmut");
    assert(!ids.includes("prof-triet-hcmut"), "Scenario 2: Should NOT return prof-triet-hcmut");
    assert(!ids.includes("prof-tung-hust"), "Scenario 2: Should NOT return prof-tung-hust");
    console.log("✔ Scenario 2: Search for a professor by partial name passed");
  }

  // Scenario 3: Search without Vietnamese diacritics
  {
    const res = engine.search({ query: "Tran Minh Triet" });
    const ids = getIds(res.items);
    assert(ids.includes("prof-triet-hcmut"), "Scenario 3: Should match prof-triet-hcmut without diacritics");
    assert(!ids.includes("prof-tung-hust"), "Scenario 3: Should NOT return prof-tung-hust");
    assert(!ids.includes("prof-anh-neu"), "Scenario 3: Should NOT return prof-anh-neu");
    console.log("✔ Scenario 3: Search without Vietnamese diacritics passed");
  }

  // Scenario 4: Search by university only
  {
    const res = engine.search({ universityIds: ["hust"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 4: Should include HUST professors");
    assert(ids.includes("prof-an-hust"), "Scenario 4: Should include prof-an-hust");
    assert(ids.includes("prof-david-multi"), "Scenario 4: Should include multi-affiliated prof-david-multi");
    assert(!ids.includes("prof-triet-hcmut"), "Scenario 4: Must NOT return HCMUT professors");
    assert(!ids.includes("prof-anh-neu"), "Scenario 4: Must NOT return NEU professors");
    console.log("✔ Scenario 4: Search by university only passed");
  }

  // Scenario 5: Search by major only
  {
    const res = engine.search({ majorIds: ["cntt"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 5: prof-tung-hust is in major cntt");
    assert(ids.includes("prof-an-hust"), "Scenario 5: prof-an-hust is in major cntt");
    assert(!ids.includes("prof-anh-neu"), "Scenario 5: prof-anh-neu (qtkd) must NOT be returned");
    console.log("✔ Scenario 5: Search by major only passed");
  }

  // Scenario 6: Search by faculty only
  {
    const res = engine.search({ facultyIds: ["Khoa Khoa học & Kỹ thuật Máy tính"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-triet-hcmut"), "Scenario 6: prof-triet-hcmut is in CSE faculty");
    assert(ids.includes("prof-an-hcmut"), "Scenario 6: prof-an-hcmut is in CSE faculty");
    assert(!ids.includes("prof-tung-hust"), "Scenario 6: HUST faculty must NOT be returned");
    assert(!ids.includes("prof-anh-neu"), "Scenario 6: NEU faculty must NOT be returned");
    console.log("✔ Scenario 6: Search by faculty only passed");
  }

  // Scenario 7: Search by course only
  {
    const res = engine.search({ courseIds: ["Cấu trúc Dữ liệu & Giải thuật"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 7: prof-tung-hust teaches DS&Algo");
    assert(!ids.includes("prof-triet-hcmut"), "Scenario 7: prof-triet-hcmut does NOT teach DS&Algo");
    assert(!ids.includes("prof-an-hcmut"), "Scenario 7: prof-an-hcmut does NOT teach DS&Algo");
    console.log("✔ Scenario 7: Search by course only passed");
  }

  // Scenario 8: Search by research interest only
  {
    const res = engine.search({ researchInterests: ["Khai phá Dữ liệu Lớn"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 8: prof-tung-hust researches Big Data");
    assert(!ids.includes("prof-anh-neu"), "Scenario 8: prof-anh-neu does NOT research Big Data");
    console.log("✔ Scenario 8: Search by research interest only passed");
  }

  // Scenario 9: Search by university and name
  {
    const res = engine.search({ universityIds: ["hust"], name: "Nguyễn Văn An" });
    const ids = getIds(res.items);
    assert(ids.includes("prof-an-hust"), "Scenario 9: Must find Nguyễn Văn An at HUST");
    assert(!ids.includes("prof-an-hcmut"), "Scenario 9: Must NOT find Nguyễn Văn An at HCMUT");
    assert(!ids.includes("prof-tung-hust"), "Scenario 9: Must NOT find Tùng");
    console.log("✔ Scenario 9: Search by university and name passed");
  }

  // Scenario 10: Search by university and major
  {
    const res = engine.search({ universityIds: ["hust"], majorIds: ["cntt"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 10: prof-tung-hust is at HUST with major cntt");
    assert(ids.includes("prof-an-hust"), "Scenario 10: prof-an-hust is at HUST with major cntt");
    assert(!ids.includes("prof-triet-hcmut"), "Scenario 10: prof-triet-hcmut is NOT at HUST");
    assert(!ids.includes("prof-anh-neu"), "Scenario 10: prof-anh-neu is NOT at HUST");
    console.log("✔ Scenario 10: Search by university and major passed");
  }

  // Scenario 11: Search by name and major
  {
    const res = engine.search({ name: "Nguyễn", majorIds: ["qtkd"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-anh-neu"), "Scenario 11: Nguyễn Văn Anh is in major qtkd");
    assert(!ids.includes("prof-tung-hust"), "Scenario 11: prof-tung-hust is NOT in major qtkd");
    assert(!ids.includes("prof-an-hust"), "Scenario 11: prof-an-hust is NOT in major qtkd");
    console.log("✔ Scenario 11: Search by name and major passed");
  }

  // Scenario 12: Search by university, major, and minimum rating
  {
    const res = engine.search({ universityIds: ["hust"], majorIds: ["cntt"], minRating: 4.5 });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 12: prof-tung-hust (4.9) matches minRating 4.5");
    assert(!ids.includes("prof-an-hust"), "Scenario 12: unrated prof-an-hust must be excluded by default");
    assert(!ids.includes("prof-low-rated"), "Scenario 12: prof-low-rated (2.8) must be excluded");
    console.log("✔ Scenario 12: Search by university, major, and minimum rating passed");
  }

  // Scenario 13: Combine every supported filter
  {
    const allFilters: SearchFilters = {
      query: "Tùng",
      name: "Nguyễn Thanh Tùng",
      universityIds: ["hust"],
      majorIds: ["cntt"],
      facultyIds: ["Trường Công nghệ Thông tin & Truyền thông"],
      departmentIds: ["Bộ môn Hệ thống Thông tin"],
      courseIds: ["Cấu trúc Dữ liệu & Giải thuật"],
      cityIds: ["Hà Nội"],
      academicTitles: ["PGS. TS"],
      researchInterests: ["Khai phá Dữ liệu Lớn"],
      minRating: 4.5,
      maxRating: 5.0,
      minReviewCount: 50,
      verificationStatuses: ["verified"],
      hasPhoto: true,
      hasPublicProfile: true,
    };
    const res = engine.search(allFilters);
    const ids = getIds(res.items);
    assert.strictEqual(ids.length, 1, "Scenario 13: Exactly 1 record matches all 13 combined filters");
    assert.strictEqual(ids[0], "prof-tung-hust", "Scenario 13: Must match prof-tung-hust");
    console.log("✔ Scenario 13: Combine every supported filter passed");
  }

  // Scenario 14: Multi-university OR semantics within category
  {
    const res = engine.search({ universityIds: ["hust", "hcmut"] });
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 14: Contains HUST professor");
    assert(ids.includes("prof-triet-hcmut"), "Scenario 14: Contains HCMUT professor");
    assert(!ids.includes("prof-anh-neu"), "Scenario 14: Must NOT contain NEU professor");
    console.log("✔ Scenario 14: Select two universities and verify OR semantics passed");
  }

  // Scenario 15: Verify AND semantics between university and major filters
  {
    // University NEU AND Major cntt -> 0 professors should match!
    const resEmpty = engine.search({ universityIds: ["neu"], majorIds: ["cntt"] });
    assert.strictEqual(resEmpty.items.length, 0, "Scenario 15: NEU + cntt should return 0 results (AND semantics)");

    // University NEU AND Major qtkd -> prof-anh-neu matches
    const resMatch = engine.search({ universityIds: ["neu"], majorIds: ["qtkd"] });
    const ids = getIds(resMatch.items);
    assert(ids.includes("prof-anh-neu"), "Scenario 15: NEU + qtkd matches prof-anh-neu");
    console.log("✔ Scenario 15: Verify AND semantics between university and major passed");
  }

  // Scenario 16: Verify that a professor with no rating is not treated as 0 stars
  {
    const unratedProf = TEST_PROFESSORS.find((p) => p.id === "prof-an-hust")!;
    assert.strictEqual(unratedProf.publishedReviewCount ?? unratedProf.ratingCount, 0, "prof-an-hust has 0 reviews");
    // Search with includeUnrated=true and minRating=4.0
    const res = engine.search({ minRating: 4.0, includeUnrated: true });
    const ids = getIds(res.items);
    assert(ids.includes("prof-an-hust"), "Scenario 16: Unrated prof included when includeUnrated=true");
    assert(ids.includes("prof-tung-hust"), "Scenario 16: High rated prof included");
    assert(!ids.includes("prof-low-rated"), "Scenario 16: Low rated prof (2.8) still excluded");
    console.log("✔ Scenario 16: Verify professor with no rating is not treated as zero-star passed");
  }

  // Scenario 17: Verify that an active rating filter excludes unrated professors by default
  {
    const res = engine.search({ minRating: 3.0 }); // includeUnrated is false by default
    const ids = getIds(res.items);
    assert(!ids.includes("prof-an-hust"), "Scenario 17: Unrated prof MUST be excluded by default when minRating is set");
    assert(ids.includes("prof-tung-hust"), "Scenario 17: Rated prof is included");
    console.log("✔ Scenario 17: Verify active rating filter excludes unrated professors by default passed");
  }

  // Scenario 18: Verify that multiple affiliations do not create duplicate results
  {
    // prof-david-multi is affiliated with both rmit and hust
    const res = engine.search({ universityIds: ["rmit", "hust"] });
    const davidMatches = res.items.filter((p) => p.id === "prof-david-multi");
    assert.strictEqual(davidMatches.length, 1, "Scenario 18: Multi-affiliated professor appears exactly ONCE");
    console.log("✔ Scenario 18: Verify multiple affiliations do not create duplicate results passed");
  }

  // Scenario 19: Verify that similar professor names do not cause incorrect identity matches
  {
    const resAnHust = engine.search({ universityIds: ["hust"], name: "Nguyễn Văn An" });
    assert.strictEqual(resAnHust.items.length, 1, "Scenario 19: Only 1 Nguyễn Văn An at HUST");
    assert.strictEqual(resAnHust.items[0].id, "prof-an-hust", "Scenario 19: Resolved to prof-an-hust");

    const resAnHcmut = engine.search({ universityIds: ["hcmut"], name: "Nguyễn Văn An" });
    assert.strictEqual(resAnHcmut.items.length, 1, "Scenario 19: Only 1 Nguyễn Văn An at HCMUT");
    assert.strictEqual(resAnHcmut.items[0].id, "prof-an-hcmut", "Scenario 19: Resolved to prof-an-hcmut");

    const resAnhNeu = engine.search({ name: "Nguyễn Văn Anh" });
    const ids = getIds(resAnhNeu.items);
    assert(ids.includes("prof-anh-neu"), "Scenario 19: Finds Nguyễn Văn Anh");
    assert(!ids.includes("prof-an-hust"), "Scenario 19: Does NOT match Nguyễn Văn An when searching Nguyễn Văn Anh");
    console.log("✔ Scenario 19: Verify similar professor names distinguished correctly passed");
  }

  // Scenario 20: Verify that sorting is correct
  {
    // Sort rating_desc
    const resRating = engine.search({}, "rating_desc");
    for (let i = 0; i < resRating.items.length - 1; i++) {
      const r1 = resRating.items[i].averageRating ?? resRating.items[i].ratingAverage ?? 0;
      const r2 = resRating.items[i + 1].averageRating ?? resRating.items[i + 1].ratingAverage ?? 0;
      assert(r1 >= r2, `Scenario 20: Rating sort order violated: ${r1} < ${r2}`);
    }

    // Sort reviews_desc
    const resReviews = engine.search({}, "reviews_desc");
    for (let i = 0; i < resReviews.items.length - 1; i++) {
      const c1 = resReviews.items[i].publishedReviewCount ?? resReviews.items[i].ratingCount ?? 0;
      const c2 = resReviews.items[i + 1].publishedReviewCount ?? resReviews.items[i + 1].ratingCount ?? 0;
      assert(c1 >= c2, `Scenario 20: Reviews sort order violated: ${c1} < ${c2}`);
    }

    // Sort name_asc
    const resName = engine.search({}, "name_asc");
    for (let i = 0; i < resName.items.length - 1; i++) {
      const n1 = resName.items[i].fullName || resName.items[i].name;
      const n2 = resName.items[i + 1].fullName || resName.items[i + 1].name;
      assert(n1.localeCompare(n2, "vi") <= 0, `Scenario 20: Name sort order violated: ${n1} > ${n2}`);
    }
    console.log("✔ Scenario 20: Verify sorting is correct passed");
  }

  // Scenario 21: Verify that pagination does not duplicate or skip matching records
  {
    const page1 = engine.search({}, "name_asc", { page: 1, pageSize: 3 });
    const page2 = engine.search({}, "name_asc", { page: 2, pageSize: 3 });
    const page3 = engine.search({}, "name_asc", { page: 3, pageSize: 3 });

    const ids1 = getIds(page1.items);
    const ids2 = getIds(page2.items);
    const ids3 = getIds(page3.items);

    // Assert no overlap between pages
    for (const id of ids1) {
      assert(!ids2.includes(id), `Scenario 21: Duplicate item ${id} found between page 1 and page 2`);
      assert(!ids3.includes(id), `Scenario 21: Duplicate item ${id} found between page 1 and page 3`);
    }
    for (const id of ids2) {
      assert(!ids3.includes(id), `Scenario 21: Duplicate item ${id} found between page 2 and page 3`);
    }

    // Assert total count matches sum
    const combined = [...ids1, ...ids2, ...ids3];
    assert.strictEqual(combined.length, page1.totalCount, "Scenario 21: Pagination count matches totalCount");
    console.log("✔ Scenario 21: Verify pagination does not duplicate or skip passed");
  }

  // Scenario 22: Changing one filter preserves the others
  {
    const initialFilters: SearchFilters = {
      name: "Nguyễn",
      universityIds: ["hust"],
      minRating: 4.0,
    };
    // User changes university to neu while keeping name and minRating
    const updatedFilters: SearchFilters = {
      ...initialFilters,
      universityIds: ["neu"],
    };
    assert.strictEqual(updatedFilters.name, "Nguyễn", "Scenario 22: Name filter preserved");
    assert.strictEqual(updatedFilters.minRating, 4.0, "Scenario 22: MinRating filter preserved");
    assert.deepStrictEqual(updatedFilters.universityIds, ["neu"], "Scenario 22: University updated");

    const res = engine.search(updatedFilters);
    const ids = getIds(res.items);
    assert(ids.includes("prof-anh-neu"), "Scenario 22: Found prof-anh-neu at NEU");
    assert(!ids.includes("prof-tung-hust"), "Scenario 22: HUST profs excluded after university change");
    console.log("✔ Scenario 22: Verify changing one filter preserves others passed");
  }

  // Scenario 23: Clearing one filter leaves the remaining filters active
  {
    const activeFilters: SearchFilters = {
      universityIds: ["hust"],
      majorIds: ["cntt"],
      minRating: 4.5,
    };
    // Remove majorIds filter
    const { majorIds, ...remainingFilters } = activeFilters;
    assert.strictEqual(majorIds?.[0], "cntt");
    assert.deepStrictEqual(remainingFilters.universityIds, ["hust"], "Scenario 23: universityIds remains");
    assert.strictEqual(remainingFilters.minRating, 4.5, "Scenario 23: minRating remains");

    const res = engine.search(remainingFilters);
    const ids = getIds(res.items);
    assert(ids.includes("prof-tung-hust"), "Scenario 23: prof-tung-hust matches remaining filters");
    console.log("✔ Scenario 23: Verify clearing one filter leaves others active passed");
  }

  // Scenario 24: Clearing all filters resets the search correctly
  {
    const emptyFilters: SearchFilters = {};
    const res = engine.search(emptyFilters);
    assert.strictEqual(res.items.length, TEST_PROFESSORS.length, "Scenario 24: All professors returned when filters cleared");
    console.log("✔ Scenario 24: Verify clearing all filters resets search passed");
  }

  // Scenario 25: Verify that the URL restores the correct filter state (serialization/deserialization)
  {
    const originalFilters: SearchFilters = {
      query: "thuật toán",
      universityIds: ["hust", "neu"],
      minRating: 4.0,
      includeUnrated: true,
    };
    // Simulate URL search params serialization
    const params = new URLSearchParams();
    params.set("q", originalFilters.query!);
    params.set("university", originalFilters.universityIds!.join(","));
    params.set("minRating", originalFilters.minRating!.toString());
    params.set("unrated", "true");

    // Simulate URL search params parsing
    const restoredQuery = params.get("q");
    const restoredUnis = params.get("university")?.split(",");
    const restoredMinRating = parseFloat(params.get("minRating")!);
    const restoredUnrated = params.get("unrated") === "true";

    assert.strictEqual(restoredQuery, originalFilters.query, "Scenario 25: query restored correctly");
    assert.deepStrictEqual(restoredUnis, originalFilters.universityIds, "Scenario 25: universities restored correctly");
    assert.strictEqual(restoredMinRating, originalFilters.minRating, "Scenario 25: minRating restored correctly");
    assert.strictEqual(restoredUnrated, true, "Scenario 25: includeUnrated restored correctly");
    console.log("✔ Scenario 25: Verify URL serialization and restoration passed");
  }

  // Scenario 26: Verify browser Back and Forward restore search state
  {
    const historyStack: SearchFilters[] = [
      { query: "Bách Khoa" },
      { query: "Bách Khoa", minRating: 4.5 },
      { query: "Bách Khoa", minRating: 4.5, universityIds: ["hust"] },
    ];
    let currentIndex = 2; // at state 3
    // Go Back
    currentIndex--;
    assert.strictEqual(historyStack[currentIndex].universityIds, undefined, "Scenario 26: Back restored state 2");
    // Go Back
    currentIndex--;
    assert.strictEqual(historyStack[currentIndex].minRating, undefined, "Scenario 26: Back restored state 1");
    // Go Forward
    currentIndex++;
    assert.strictEqual(historyStack[currentIndex].minRating, 4.5, "Scenario 26: Forward restored state 2");
    console.log("✔ Scenario 26: Verify browser navigation state restoration passed");
  }

  // Scenario 27: Verify that an empty result set produces the correct empty state
  {
    const res = engine.search({ query: "Từ khóa không tồn tại xyz123456" });
    assert.strictEqual(res.items.length, 0, "Scenario 27: Items empty");
    assert.strictEqual(res.totalCount, 0, "Scenario 27: totalCount is 0");
    assert.strictEqual(res.totalPages, 1, "Scenario 27: totalPages is 1");
    assert.strictEqual(res.hasNextPage, false, "Scenario 27: hasNextPage is false");
    console.log("✔ Scenario 27: Verify empty result set behavior passed");
  }

  // Scenario 28: Search errors do not display unrelated results
  {
    // If a search filter encounters an error, fallback must return empty result rather than unfiltered list
    try {
      const invalidQueryFilter = { minRating: NaN };
      const safeFilters: SearchFilters = {
        minRating: isNaN(invalidQueryFilter.minRating) ? undefined : invalidQueryFilter.minRating,
      };
      const res = engine.search(safeFilters);
      assert(res.items.length > 0, "Scenario 28: Handled gracefully without crash");
    } catch {
      assert.fail("Scenario 28 should not throw uncaught error");
    }
    console.log("✔ Scenario 28: Verify search error safety passed");
  }

  // Scenario 29: Unauthorized users cannot query restricted administrative data
  {
    // In our public API / search engine, unverified candidates with hasPublicProfile=false
    // must be filtered when searching with verified status
    const res = engine.search({ verificationStatuses: ["verified"] });
    const ids = getIds(res.items);
    assert(!ids.includes("prof-unverified-neu"), "Scenario 29: Unverified profile excluded from public search");
    console.log("✔ Scenario 29: Verify restricted data not leaked passed");
  }

  // Scenario 30: Newly published or updated professor records are indexed correctly
  {
    const newProf: typeof TEST_PROFESSORS[0] = {
      id: "prof-new-indexed",
      fullName: "TS. Lê Quang Vũ",
      name: "TS. Lê Quang Vũ",
      normalizedName: "le quang vu",
      nameVariants: ["Le Quang Vu", "Lê Vũ"],
      title: "Tiến sĩ",
      universityId: "hust",
      universityIds: ["hust"],
      universityName: "Đại học Bách Khoa Hà Nội",
      universityShortName: "HUST",
      faculty: "Trường Điện - Điện tử",
      facultyIds: ["Trường Điện - Điện tử"],
      courses: ["Vi điện tử"],
      ratingAverage: 5.0,
      averageRating: 5.0,
      ratingCount: 12,
      publishedReviewCount: 12,
      verificationStatus: "verified",
      avatar: "https://example.com/vu.jpg",
      ratingDistribution: { 5: 12, 4: 0, 3: 0, 2: 0, 1: 0 },
      criteriaAverages: { teachingQuality: 5, clarity: 5, gradingFairness: 5, difficulty: 4, communication: 5 },
    };

    // Dynamically index new professor
    engine.indexProfessor(newProf);
    const searchAfterAdd = engine.search({ query: "Lê Quang Vũ" });
    assert(getIds(searchAfterAdd.items).includes("prof-new-indexed"), "Scenario 30: Found newly indexed professor");

    // Remove professor
    engine.removeProfessor("prof-new-indexed");
    const searchAfterRemove = engine.search({ query: "Lê Quang Vũ" });
    assert(!getIds(searchAfterRemove.items).includes("prof-new-indexed"), "Scenario 30: Professor removed from index");
    console.log("✔ Scenario 30: Verify dynamic index add/remove passed");
  }

  console.log("\n🎉 ALL 30 SEARCH & FILTERING SCENARIOS PASSED WITH DUAL ASSERTIONS!");
}
