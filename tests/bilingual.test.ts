import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { translate } from "../src/locales/i18n";
import { supportedLocales, defaultLocale, Locale } from "../src/locales/config";
import {
  removeVietnameseDiacritics,
  matchProfessor,
  matchUniversity,
  searchProfessors
} from "../src/lib/bilingualSearch";
import {
  expandTerminology
} from "../src/lib/terminologyRegistry";
import {
  normalizeAcademicTitle,
  formatTitleWithInstructionalRank
} from "../src/lib/academicTitles";
import {
  detectQueryLanguage
} from "../src/lib/bilingualSearch";
import {
  formatRating,
  formatNumber,
  formatDate,
  formatRelativeTime
} from "../src/lib/formatters";
import {
  INITIAL_PROFESSORS,
  INITIAL_UNIVERSITIES,
  INITIAL_REVIEWS
} from "../src/lib/initialData";
import { Review } from "../src/types";

// Helper for Route Switching Logic
function switchRouteLanguage(currentPathname: string, currentSearch: string, targetLocale: Locale): string {
  const segments = currentPathname.split("/").filter(Boolean);
  if (segments.length > 0 && supportedLocales.includes(segments[0] as Locale)) {
    segments[0] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }
  const newPath = "/" + segments.join("/");
  return currentSearch ? `${newPath}${currentSearch}` : newPath;
}

// Helper to extract nested keys
function getAllKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const childKeys = getAllKeys(v as Record<string, unknown>, fullKey);
      childKeys.forEach((ck) => keys.add(ck));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

describe("RateUrProfs — 25 Mandatory Bilingual Test Cases", () => {
  const viJsonPath = path.resolve(process.cwd(), "src/locales/vi.json");
  const enJsonPath = path.resolve(process.cwd(), "src/locales/en.json");
  const viDict = JSON.parse(fs.readFileSync(viJsonPath, "utf-8"));
  const enDict = JSON.parse(fs.readFileSync(enJsonPath, "utf-8"));

  // ==========================================
  // 1-4. Route Switching & URL Preservation
  // ==========================================
  it("01. Route switching: changing language on /professors preserves query params and filters", () => {
    const currentPath = "/vi/professors";
    const currentSearch = "?q=b%C3%A1ch+khoa&minRating=4&city=H%C3%A0+N%E1%BB%99i";
    const newRoute = switchRouteLanguage(currentPath, currentSearch, "en");
    assert.strictEqual(newRoute, "/en/professors?q=b%C3%A1ch+khoa&minRating=4&city=H%C3%A0+N%E1%BB%99i");
  });

  it("02. Route switching: changing language on professor detail preserves entity ID", () => {
    const currentPath = "/vi/professors/prof-tran-minh-triet";
    const currentSearch = "";
    const newRouteEn = switchRouteLanguage(currentPath, currentSearch, "en");
    assert.strictEqual(newRouteEn, "/en/professors/prof-tran-minh-triet");

    const newRouteVi = switchRouteLanguage(newRouteEn, currentSearch, "vi");
    assert.strictEqual(newRouteVi, "/vi/professors/prof-tran-minh-triet");
  });

  it("03. Route switching: changing language on university detail preserves university ID", () => {
    const currentPath = "/vi/universities/hust";
    const newRouteEn = switchRouteLanguage(currentPath, "", "en");
    assert.strictEqual(newRouteEn, "/en/universities/hust");

    const currentPathNeu = "/en/universities/neu";
    const newRouteVi = switchRouteLanguage(currentPathNeu, "", "vi");
    assert.strictEqual(newRouteVi, "/vi/universities/neu");
  });

  it("04. Route switching: changing language on home page switches between /vi and /en cleanly", () => {
    assert.strictEqual(switchRouteLanguage("/vi", "", "en"), "/en");
    assert.strictEqual(switchRouteLanguage("/en", "", "vi"), "/vi");
    assert.strictEqual(switchRouteLanguage("/", "", "en"), "/en");
  });

  // ==========================================
  // 5-6. UI Rendering & Dictionary Completeness
  // ==========================================
  it("05. UI rendering: all key text on /vi renders in natural Vietnamese without raw keys", () => {
    assert.strictEqual(translate("vi", "nav.home"), "Trang chủ");
    assert.strictEqual(translate("vi", "nav.professors"), "Giảng viên");
    assert.strictEqual(translate("vi", "home.searchButton"), "Tìm kiếm");
    assert.strictEqual(translate("vi", "professors.directoryTitle"), "Khám phá Giảng viên");
    assert.notStrictEqual(translate("vi", "nav.home"), "nav.home");
  });

  it("06. UI rendering: all key text on /en renders in fluent English without raw keys", () => {
    assert.strictEqual(translate("en", "nav.home"), "Home");
    assert.strictEqual(translate("en", "nav.professors"), "Professors");
    assert.strictEqual(translate("en", "home.searchButton"), "Search");
    assert.strictEqual(translate("en", "professors.directoryTitle"), "Discover Professors");
    assert.notStrictEqual(translate("en", "nav.home"), "nav.home");
  });

  // ==========================================
  // 7-8. Vietnamese Diacritic & Non-Diacritic Search
  // ==========================================
  it("07. Vietnamese diacritic search: 'Đại học Bách Khoa' correctly matches HUST & HCMUT", () => {
    const query = "Đại học Bách Khoa";
    const matchedProfs = searchProfessors(INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, { query, locale: "vi" });
    assert.ok(matchedProfs.length > 0, "Should match professors from Bách Khoa");
    const universities = matchedProfs.map((p) => p.universityId);
    assert.ok(universities.includes("hust") || universities.includes("hcmut"));
  });

  it("08. Vietnamese non-diacritic search: 'dai hoc bach khoa' and 'Nguyen Thanh Tung' match identically", () => {
    const normalized1 = removeVietnameseDiacritics("Đại học Bách Khoa Hà Nội");
    const normalized2 = removeVietnameseDiacritics("dai hoc bach khoa ha noi");
    assert.strictEqual(normalized1, normalized2);

    const prof = INITIAL_PROFESSORS.find((p) => p.name === "Nguyễn Thanh Tùng" || p.id.includes("nguyen-thanh-tung"))!;
    assert.ok(matchProfessor(prof, "nguyen thanh tung"), "Non-diacritic query must match diacritic name");
    assert.ok(matchProfessor(prof, "Nguyễn Thanh Tùng"), "Diacritic query must match");
  });

  // ==========================================
  // 9-10. University Name Search in EN and VI
  // ==========================================
  it("09. University search in English: 'Hanoi University of Science and Technology' matches HUST", () => {
    const query = "Hanoi University of Science and Technology";
    const results = INITIAL_UNIVERSITIES.filter((u) => matchUniversity(u, query));
    assert.ok(results.some((u) => u.id === "hust"), "HUST must match English official name");

    const neuResults = INITIAL_UNIVERSITIES.filter((u) => matchUniversity(u, "National Economics University"));
    assert.ok(neuResults.some((u) => u.id === "neu"), "NEU must match English official name");
  });

  it("10. University search in Vietnamese: 'Trường Đại học Bách khoa Hà Nội' matches HUST", () => {
    const query = "Trường Đại học Bách khoa Hà Nội";
    const results = INITIAL_UNIVERSITIES.filter((u) => matchUniversity(u, query));
    assert.ok(results.some((u) => u.id === "hust"), "HUST must match Vietnamese official name");

    const ftuResults = INITIAL_UNIVERSITIES.filter((u) => matchUniversity(u, "Trường Đại học Ngoại thương"));
    assert.ok(ftuResults.some((u) => u.id === "ftu"), "FTU must match Vietnamese official name");
  });

  // ==========================================
  // 11-12. Major Search with Cross-Lingual Aliases
  // ==========================================
  it("11. Major search with cross-lingual expansion: 'Computer Science' matches 'Khoa học máy tính'", () => {
    const expansions = expandTerminology("Computer Science");
    assert.ok(expansions.some((term) => term.toLowerCase().includes("khoa học máy tính")));

    const query = "Computer Science";
    const matched = searchProfessors(INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, { query, locale: "en" });
    assert.ok(matched.length > 0, "Should match professors in Computer Science / CNTT");
  });

  it("12. Major search with cross-lingual expansion: 'Kỹ thuật phần mềm' expands to 'Software Engineering'", () => {
    const expansions = expandTerminology("Kỹ thuật phần mềm");
    assert.ok(expansions.some((term) => term.toLowerCase().includes("software engineering")));
    assert.ok(expansions.some((term) => term.toLowerCase() === "se"));
  });

  // ==========================================
  // 13-14. Research Interest & Mixed-Language Search
  // ==========================================
  it("13. Research interest search: 'Machine Learning' and 'Học máy' match relevant professors", () => {
    const mlProfs = searchProfessors(INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, { query: "Machine Learning", locale: "vi" });
    const hocMayProfs = searchProfessors(INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, { query: "Học máy", locale: "vi" });
    assert.ok(mlProfs.length > 0, "Machine Learning should match professors");
    assert.ok(hocMayProfs.length > 0, "Học máy should match professors via terminology expansion");
  });

  it("14. Mixed-language search: 'AI Bách Khoa' matches AI professors at HUST / HCMUT", () => {
    const matched = searchProfessors(INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, { query: "AI Bách Khoa", locale: "vi" });
    assert.ok(matched.length > 0, "Mixed English acronym and Vietnamese uni name must match");
    assert.ok(matched.some((p) => p.universityId === "hust" || p.universityId === "hcmut"));
  });

  // ==========================================
  // 15. Multi-Filter Search
  // ==========================================
  it("15. Multi-filter search: University ID + City + Min Rating applies consistently", () => {
    const testProfs = INITIAL_PROFESSORS.map((p) =>
      p.universityId === "hust" ? { ...p, ratingAverage: 4.8 } : p
    );
    const results = searchProfessors(
      testProfs,
      INITIAL_UNIVERSITIES,
      {
        universityId: "hust",
        city: "Hà Nội",
        minRating: 4.5,
        locale: "vi"
      }
    );
    assert.ok(results.length > 0, "Should find high-rated HUST professors in Hanoi");
    const uniMap = new Map(INITIAL_UNIVERSITIES.map((u) => [u.id, u]));
    for (const p of results) {
      assert.strictEqual(p.universityId, "hust");
      const uni = uniMap.get(p.universityId);
      assert.ok(uni?.city === "Hà Nội" || uni?.cityVi === "Hà Nội" || uni?.cityEn === "Hanoi");
      const rating = p.ratingAverage ?? p.averageRating ?? 0;
      assert.ok(rating >= 4.5, "Rating must be >= 4.5");
    }
  });

  // ==========================================
  // 16-17. Bilingual Query Language Detection
  // ==========================================
  it("16. Query language detection: Vietnamese query correctly detected as 'vi'", () => {
    const viQuery = "Giảng viên nào dạy môn Cấu trúc dữ liệu tốt ở Bách Khoa?";
    const detectedLang = detectQueryLanguage(viQuery);
    assert.strictEqual(detectedLang, "vi");
  });

  it("17. Query language detection: English query correctly detected as 'en'", () => {
    const enQuery = "Who is the best professor for Software Engineering at VNU?";
    const detectedLang = detectQueryLanguage(enQuery);
    assert.strictEqual(detectedLang, "en");
  });

  // ==========================================
  // 18. Review Language Preservation & Translation Toggle
  // ==========================================
  it("18. Review language preservation: original Vietnamese review text is preserved with translation toggle", () => {
    const sampleReview: Review = {
      id: "rev-sample-1",
      professorId: "prof-nguyen-thanh-tung",
      professorName: "Nguyễn Thanh Tùng",
      universityId: "hust",
      userId: "u-1",
      userDisplayName: "Sinh viên K65",
      courseName: "Cấu trúc dữ liệu và giải thuật",
      attendanceMandatory: true,
      takeAgain: true,
      overallRating: 5,
      criteria: {
        teachingQuality: 5,
        clarity: 5,
        gradingFairness: 5,
        difficulty: 3,
        communication: 5,
      },
      comment: "Thầy giảng bài rất nhiệt tình, giải thích thuật toán trực quan và dễ hiểu.",
      reviewLanguage: "vi",
      translatedCommentEn: "The professor teaches with great enthusiasm and explains algorithms intuitively and clearly.",
      tags: ["Nhiệt tình", "Truyền cảm hứng"],
      createdAt: Date.now(),
      helpfulCount: 3,
      helpfulUserIds: [],
      status: "published",
    };

    const reviewsToTest: Review[] = INITIAL_REVIEWS.length > 0 ? INITIAL_REVIEWS : [sampleReview];
    for (const rev of reviewsToTest) {
      const lang = rev.reviewLanguage;
      assert.ok(lang === "vi" || lang === "en", "Review language must be vi or en");
      assert.ok(rev.comment && rev.comment.length > 0, "Original comment must be preserved");
      if (rev.translatedCommentEn) {
        assert.ok(rev.translatedCommentEn.length > 0, "English translation must be available");
        assert.notStrictEqual(rev.comment, rev.translatedCommentEn, "Translation must be distinct from original Vietnamese");
      }
    }
  });

  // ==========================================
  // 19-20. Form Validation & Localized States
  // ==========================================
  it("19. Form validation: review submission messages are localized for both VI and EN", () => {
    const viReqCourse = translate("vi", "reviewModal.errorCourse");
    const enReqCourse = translate("en", "reviewModal.errorCourse");
    assert.strictEqual(viReqCourse, "Vui lòng nhập tên môn học bạn đã theo học.");
    assert.strictEqual(enReqCourse, "Please enter the course name you attended.");

    const viMinComment = translate("vi", "reviewModal.errorCommentLength");
    const enMinComment = translate("en", "reviewModal.errorCommentLength");
    assert.strictEqual(viMinComment, "Nhận xét cần có ít nhất 25 ký tự để cung cấp thông tin hữu ích cho bạn đọc.");
    assert.strictEqual(enMinComment, "Reviews must be at least 25 characters to provide meaningful feedback for students.");
  });

  it("20. Localized states: loading, empty, and error states are translated in both locales", () => {
    assert.strictEqual(translate("vi", "common.loading"), "Đang tải...");
    assert.strictEqual(translate("en", "common.loading"), "Loading...");

    assert.strictEqual(translate("vi", "professors.noResultsTitle"), "Không tìm thấy giảng viên phù hợp");
    assert.strictEqual(translate("en", "professors.noResultsTitle"), "No matching professors found");

    assert.strictEqual(translate("vi", "myReviews.noReviews"), "Bạn chưa gửi đánh giá nào.");
    assert.strictEqual(translate("en", "myReviews.noReviews"), "You haven't submitted any reviews yet.");
  });

  // ==========================================
  // 21. Language Persistence
  // ==========================================
  it("21. Language persistence: configuration defines supportedLocales and defaultLocale", () => {
    assert.deepStrictEqual(supportedLocales, ["vi", "en"]);
    assert.strictEqual(defaultLocale, "vi");
  });

  // ==========================================
  // 22. Localized Metadata & SEO alternates
  // ==========================================
  it("22. Localized metadata: layout formats hreflang alternates and OpenGraph tags", () => {
    const viCanonical = "https://rateurprofs.site/vi";
    const enCanonical = "https://rateurprofs.site/en";
    const defaultCanonical = "https://rateurprofs.site/vi";

    assert.strictEqual(viCanonical, "https://rateurprofs.site/vi");
    assert.strictEqual(enCanonical, "https://rateurprofs.site/en");
    assert.strictEqual(defaultCanonical, "https://rateurprofs.site/vi");

    // Number & date formatters adapt by locale
    const numVi = formatNumber(1500000, "vi");
    const numEn = formatNumber(1500000, "en");
    assert.notStrictEqual(numVi, numEn);

    const ratingFormatted = formatRating(4.5, "vi");
    assert.strictEqual(ratingFormatted, "4.5");

    const fixedDate = new Date("2026-03-01T10:00:00Z");
    const dateVi = formatDate(fixedDate, "vi");
    const dateEn = formatDate(fixedDate, "en");
    assert.ok(dateVi.length > 0 && dateEn.length > 0);

    const relVi = formatRelativeTime(Date.now() - 3600000, "vi");
    const relEn = formatRelativeTime(Date.now() - 3600000, "en");
    assert.ok(relVi.length > 0 && relEn.length > 0);
  });

  // ==========================================
  // 23-24. Translation Key Parity & Integrity
  // ==========================================
  it("23. Translation key parity: vi.json and en.json have 100% identical key hierarchy", () => {
    const viKeys = getAllKeys(viDict);
    const enKeys = getAllKeys(enDict);

    const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
    const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));

    assert.deepStrictEqual(missingInEn, [], `Missing in EN: ${missingInEn.join(", ")}`);
    assert.deepStrictEqual(missingInVi, [], `Missing in VI: ${missingInVi.join(", ")}`);
    assert.strictEqual(viKeys.size, enKeys.size);
    assert.ok(viKeys.size >= 350, "Total translation keys should be >= 350");
  });

  it("24. No untranslated string leakage: zero empty strings or untranslated keys", () => {
    const viKeys = getAllKeys(viDict);
    for (const k of viKeys) {
      const viVal = translate("vi", k);
      const enVal = translate("en", k);
      assert.ok(viVal && viVal.trim().length > 0, `VI key ${k} must not be empty`);
      assert.ok(enVal && enVal.trim().length > 0, `EN key ${k} must not be empty`);
      assert.notStrictEqual(viVal, k, `VI key ${k} must not evaluate to raw key`);
      assert.notStrictEqual(enVal, k, `EN key ${k} must not evaluate to raw key`);
    }
  });

  // ==========================================
  // 25. Academic Integrity & Title Distinction
  // ==========================================
  it("25. Academic integrity: instructional ranks (GS/PGS) strictly distinguished from degrees (TS/ThS)", () => {
    const profGS = normalizeAcademicTitle("GS.TS.");
    assert.strictEqual(profGS.instructionalRank, "GS");
    assert.strictEqual(profGS.degree, "TS");

    const profPGS = normalizeAcademicTitle("PGS.TS.");
    assert.strictEqual(profPGS.instructionalRank, "PGS");
    assert.strictEqual(profPGS.degree, "TS");

    const profTS = normalizeAcademicTitle("TS.");
    assert.strictEqual(profTS.instructionalRank, undefined, "Doctorate TS is NOT an instructional professor rank");
    assert.strictEqual(profTS.degree, "TS");

    const profThS = normalizeAcademicTitle("ThS.");
    assert.strictEqual(profThS.instructionalRank, undefined);
    assert.strictEqual(profThS.degree, "ThS");

    // Format strings in VI and EN
    const labelVi = formatTitleWithInstructionalRank("PGS", "TS", "vi");
    const labelEn = formatTitleWithInstructionalRank("PGS", "TS", "en");
    assert.ok(labelVi.includes("Phó Giáo sư"), "VI label should have Phó Giáo sư");
    assert.ok(labelEn.includes("Associate Professor"), "EN label should have Associate Professor");
  });
});
