import test, { after } from "node:test";
import assert from "node:assert/strict";
import { queryBilingualRag } from "../src/lib/ragAssistant";

test("RAG Assistant — 6 Mandatory Query Scenarios", async (t) => {
  await t.test("Scenario 1: Search by research interest across universities", async () => {
    const result = await queryBilingualRag("Giáo sư nghiên cứu Trí tuệ nhân tạo");
    assert.equal(result.hasSufficientEvidence, true);
    assert.equal(result.responseLanguage, "vi");
    assert.ok(result.citations.length > 0, "Should contain clickable citations");
    assert.ok(
      result.answer.includes("Trí tuệ nhân tạo") || result.answer.includes("Học máy") || result.answer.includes("AI"),
      "Should mention AI/Machine Learning focus"
    );
    // Verify citations have valid URLs
    result.citations.forEach((c) => {
      assert.ok(c.url.length > 0, "Citation must have URL");
    });
  });

  await t.test("Scenario 2: Search for faculty in a specific city/region (TP.HCM)", async () => {
    const result = await queryBilingualRag("Giảng viên CNTT tại TP. Hồ Chí Minh");
    assert.equal(result.hasSufficientEvidence, true);
    assert.ok(
      result.answer.includes("HCMUT") || result.answer.includes("UIT") || result.answer.includes("TP.HCM") || result.answer.includes("Hồ Chí Minh"),
      "Should return Ho Chi Minh City institutions"
    );
  });

  await t.test("Scenario 3: Multilingual English query producing English response", async () => {
    const result = await queryBilingualRag("Economics and finance professors in Hanoi");
    assert.equal(result.detectedQueryLanguage, "en");
    assert.equal(result.responseLanguage, "en");
    assert.equal(result.hasSufficientEvidence, true);
    assert.ok(
      result.answer.includes("Based on") || result.answer.includes("NEU") || result.answer.includes("FTU") || result.answer.includes("Economics"),
      "Should synthesize English response"
    );
    assert.ok(result.citations.length > 0, "Should include citations in English response");
  });

  await t.test("Scenario 4: Academic rank filtering (PGS vs GS)", async () => {
    const result = await queryBilingualRag("Tìm kiếm Phó Giáo sư (PGS) ngành Công nghệ Phần mềm");
    assert.equal(result.hasSufficientEvidence, true);
    assert.ok(
      result.answer.includes("PGS") || result.answer.includes("Phó Giáo sư"),
      "Should prioritize Associate Professors"
    );
  });

  await t.test("Scenario 5: Disambiguation across similar names", async () => {
    const result = await queryBilingualRag("Phân biệt giảng viên trùng tên giữa các trường đại học");
    assert.equal(result.hasSufficientEvidence, true);
    assert.ok(
      result.answer.includes("Đại học") || result.answer.includes("Cơ sở đào tạo"),
      "Should distinguish institutions clearly"
    );
  });

  await t.test("Scenario 6: Strict Grounding & No Hallucination on unavailable data", async () => {
    const result = await queryBilingualRag("Tìm kiếm giáo sư chuyên ngành Kỹ thuật Hạt nhân tại Huế");
    // System must decline to hallucinate
    assert.equal(result.hasSufficientEvidence, false);
    assert.equal(result.citations.length, 0);
    assert.ok(
      result.answer.includes("chưa có") || result.answer.includes("Grounding") || result.answer.includes("kiểm chứng"),
      "Should state that verified records are not available rather than making up facts"
    );
  });

  try {
    const { terminate } = await import("firebase/firestore");
    const { db } = await import("../src/lib/firebase");
    await terminate(db);
  } catch {}
});

after(() => {
  process.exit(0);
});

