import { describe, it } from "node:test";
import assert from "node:assert";
import { isAnonymousName, resolveReviewerDisplayName, formatReviewerName } from "../src/lib/formatters";
import viDict from "../src/locales/vi.json";
import enDict from "../src/locales/en.json";

describe("Anonymous Reviewer Name Rejection & Resolution Test Suite", () => {
  it("01. isAnonymousName correctly detects all anonymous Vietnamese name variations", () => {
    const anonymousVietnamese = [
      "Ẩn danh",
      "ẩn danh",
      "AN DANH",
      "an danh",
      "Sinh viên ẩn danh",
      "sinh vien an danh",
      "Người dùng ẩn danh",
      "Học sinh ẩn danh",
      "Nặc danh",
      "nặc danh",
      "nac danh",
      "Giấu tên",
      "giau ten",
      "Không tên",
      "khong ten",
      "Người giấu mặt",
      "Ẩn danh (K65)",
      "Sinh viên ẩn danh - HUST",
      "Khách",
      "khach",
    ];

    for (const name of anonymousVietnamese) {
      assert.strictEqual(
        isAnonymousName(name),
        true,
        `Expected "${name}" to be flagged as anonymous`
      );
    }
  });

  it("02. isAnonymousName correctly detects all anonymous English name variations", () => {
    const anonymousEnglish = [
      "Anonymous",
      "anonymous",
      "ANONYMOUS",
      "Anon",
      "anon",
      "Anonymous Student",
      "anonymous user",
      "Unknown",
      "unknown",
      "Hidden",
      "hidden",
      "Guest",
      "guest",
      "Nobody",
      "nobody",
      "No Name",
      "no name",
      "Anonymous_123",
      "Anon Student",
    ];

    for (const name of anonymousEnglish) {
      assert.strictEqual(
        isAnonymousName(name),
        true,
        `Expected "${name}" to be flagged as anonymous`
      );
    }
  });

  it("03. isAnonymousName permits legitimate student and user names", () => {
    const legitimateNames = [
      "Nguyễn Văn An",
      "Trần Thị Bích",
      "Lê Hoàng Long",
      "John Doe",
      "Alice Smith",
      "Sinh viên K65",
      "Sinh viên năm 3",
      "K65 HUST",
      "24IIO223 VJU Trịnh Thiên Giang",
      "Gà 🐔",
      "ALAH",
    ];

    for (const name of legitimateNames) {
      assert.strictEqual(
        isAnonymousName(name),
        false,
        `Expected "${name}" to NOT be flagged as anonymous`
      );
    }
  });

  it("04. resolveReviewerDisplayName rejects anonymous input and falls back to authenticated identity", () => {
    const user = {
      uid: "user-123",
      email: "thien.giang@vju.edu.vn",
      displayName: "Trịnh Thiên Giang",
    };
    const profile = {
      displayName: "Thiên Giang VJU",
      email: "thien.giang@vju.edu.vn",
    };

    // When user tries to provide an anonymous name, fall back to profile/user display name
    const resolvedFromAnon = resolveReviewerDisplayName("Ẩn danh", user, profile);
    assert.strictEqual(resolvedFromAnon, "Thiên Giang VJU");
    assert.strictEqual(isAnonymousName(resolvedFromAnon), false);

    // If profile is empty, fall back to user displayName
    const resolvedFromUser = resolveReviewerDisplayName("Anonymous Student", user, null);
    assert.strictEqual(resolvedFromUser, "Trịnh Thiên Giang");

    // If user displayName is empty, fall back to email username
    const userWithOnlyEmail = { uid: "user-456", email: "student2024@hust.edu.vn" };
    const resolvedFromEmail = resolveReviewerDisplayName("anon", userWithOnlyEmail, null);
    assert.strictEqual(resolvedFromEmail, "student2024");

    // If no user at all, defaults to "Sinh viên" (never "Ẩn danh")
    const resolvedFallback = resolveReviewerDisplayName("Giấu tên", null, null);
    assert.strictEqual(resolvedFallback, "Sinh viên");
    assert.strictEqual(isAnonymousName(resolvedFallback), false);
  });

  it("05. resolveReviewerDisplayName preserves legitimate custom names", () => {
    const resolved = resolveReviewerDisplayName("Sinh viên K65 Bách Khoa", null, null);
    assert.strictEqual(resolved, "Sinh viên K65 Bách Khoa");
  });

  it("06. formatReviewerName sanitizes historical anonymous strings in display", () => {
    assert.strictEqual(formatReviewerName("Ẩn danh", "vi"), "Sinh viên");
    assert.strictEqual(formatReviewerName("Anonymous", "en"), "Student");
    assert.strictEqual(formatReviewerName("Sinh viên ẩn danh", "vi"), "Sinh viên");
    assert.strictEqual(formatReviewerName("Anonymous Student", "en"), "Student");
    assert.strictEqual(formatReviewerName("Nguyễn Văn A", "vi"), "Nguyễn Văn A");
  });

  it("07. i18n keys for ratePage.cancel and rateSchoolPage.cancel exist and are not empty", () => {
    assert.ok(viDict.ratePage?.cancel, "vi.json must define ratePage.cancel");
    assert.strictEqual(viDict.ratePage.cancel, "Hủy");
    assert.ok(enDict.ratePage?.cancel, "en.json must define ratePage.cancel");
    assert.strictEqual(enDict.ratePage.cancel, "Cancel");

    assert.ok(viDict.rateSchoolPage?.cancel, "vi.json must define rateSchoolPage.cancel");
    assert.strictEqual(viDict.rateSchoolPage.cancel, "Hủy");
    assert.ok(enDict.rateSchoolPage?.cancel, "en.json must define rateSchoolPage.cancel");
    assert.strictEqual(enDict.rateSchoolPage.cancel, "Cancel");
  });

  it("08. i18n errorAnonymous keys exist across ratePage, rateSchoolPage, and reviewModal", () => {
    assert.ok(viDict.ratePage?.errorAnonymous, "vi.json must have ratePage.errorAnonymous");
    assert.ok(enDict.ratePage?.errorAnonymous, "en.json must have ratePage.errorAnonymous");

    assert.ok(viDict.rateSchoolPage?.errorAnonymous, "vi.json must have rateSchoolPage.errorAnonymous");
    assert.ok(enDict.rateSchoolPage?.errorAnonymous, "en.json must have rateSchoolPage.errorAnonymous");

    assert.ok(viDict.reviewModal?.errorAnonymous, "vi.json must have reviewModal.errorAnonymous");
    assert.ok(enDict.reviewModal?.errorAnonymous, "en.json must have reviewModal.errorAnonymous");
  });
});
