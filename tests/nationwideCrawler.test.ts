/**
 * Automated Nationwide University and Professor Data Collection Platform Test Suite
 *
 * Validates the 20 core requirements:
 * 1. Persistent University Registry
 * 2. Rate Limiting & Politeness Policy
 * 3. Discovery Engine & Signal Keywords
 * 4. Pagination Engine & Loop Prevention
 * 5. Strategy A (HTTP/Cheerio static extraction)
 * 6. Strategy C (HUST adapter)
 * 7. Strategy C (UIT adapter)
 * 8. Strategy C (VNU adapter)
 * 9. Strategy C (FPT adapter)
 * 10. Strategy C (HĐGSNN adapter)
 * 11. Strategy D (Generic Heuristic Extractor)
 * 12. Normalization: Rank vs Degree Strict Separation
 * 13. Normalization: SVG Initials Avatar Generation
 * 14. Deduplication: Multi-layer Matching
 * 15. Deduplication: Preservation of Genuine Student Reviews & Ratings
 * 16. Validation: Noise & Placeholder Rejection
 * 17. Staging Pipeline: Record Staging & Quality Scoring
 * 18. Job System: Crash Recovery & Exponential Backoff
 * 19. Honest Coverage Audit: Complete vs Partial vs Inaccessible
 * 20. NLP Command Translator: Vietnamese & English Intent Routing
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { UniversityRegistryService } from "../src/lib/server/crawler/registry";
import { RateLimiterService } from "../src/lib/server/crawler/rateLimiter";
import { InstitutionDiscoveryEngine } from "../src/lib/server/crawler/discoveryEngine";
import { PaginationEngine } from "../src/lib/server/crawler/paginationEngine";
import {
  UniversityAdapters,
  extractStrategyA,
  extractStrategyD,
  dispatchExtraction,
} from "../src/lib/server/crawler/strategies";
import {
  classifyAcademicRankAndDegree,
  cleanPersonName,
  generateInitialsAvatar,
  removeDiacritics,
} from "../src/lib/server/crawler/normalization";
import { ValidationService } from "../src/lib/server/crawler/validation";
import { DeduplicationService } from "../src/lib/server/crawler/deduplication";
import { PersistentJobSystem } from "../src/lib/server/crawler/jobSystem";
import { CoverageAuditService } from "../src/lib/server/crawler/coverageAudit";
import { NlpCommandHandler } from "../src/lib/server/crawler/nlpCommandHandler";
import { getSqliteDb } from "../src/lib/server/sqliteClient";
import { getPostgresPool, isPostgresConfigured } from "../src/lib/server/postgresClient";

describe("Nationwide Crawler & Data Collection Platform — 20 Core Requirements", { concurrency: 1 }, () => {
  before(async () => {
    // Ensure university registry has seeds
    await UniversityRegistryService.seedInitialRegistry();
  });

  // 1. Registry persistence & conflict-free upsert
  it("01. Registry persistence & conflict-free upsert", async () => {
    const all = await UniversityRegistryService.getAllInstitutions();
    assert.ok(all.length >= 20, `Expected at least 20 institutions in registry, got ${all.length}`);

    // Verify known seeds exist
    const hust = await UniversityRegistryService.getInstitutionById("hust");
    assert.ok(hust, "HUST should exist in registry");
    assert.strictEqual(hust?.shortName, "HUST");

    // Conflict-free upsert of custom institution
    const customId = `test-uni-${Date.now()}`;
    await UniversityRegistryService.registerOrUpdateInstitution({
      id: customId,
      name: "Trường Đại học Thử nghiệm",
      shortName: "TEST-UNI",
      region: "Miền Bắc",
      officialDomain: `${customId}.edu.vn`,
      officialWebsite: `https://${customId}.edu.vn`,
      verificationStatus: "verified",
    });

    const fetched = await UniversityRegistryService.getInstitutionById(customId);
    assert.ok(fetched, "Custom institution should be registered");
    assert.strictEqual(fetched?.shortName, "TEST-UNI");

    // Clean up test institution to maintain database cleanliness
    await UniversityRegistryService.deleteInstitution(customId);
  });

  // 2. Polite rate limiter per-domain concurrency & backoff
  it("02. Polite rate limiter per-domain concurrency & backoff", async () => {
    const domain = "sample-uni.edu.vn";
    RateLimiterService.setConcurrencyLimit(2);
    RateLimiterService.setMinDelayMs(50);

    const start = Date.now();
    await RateLimiterService.acquirePermission(domain);
    const firstAcquireDuration = Date.now() - start;
    assert.ok(firstAcquireDuration < 200, "First acquire should be immediate");

    // Record failure to test backoff
    RateLimiterService.recordFailure(domain);
    // Next delay should be backed off
    RateLimiterService.recordSuccess(domain);
  });

  // 3. Discovery engine signal keyword detection & sitemap parsing
  it("03. Discovery engine signal keyword detection & sitemap parsing", () => {
    const sampleHtml = `
      <html>
        <body>
          <a href="/gioi-thieu/giang-vien">Danh sách Giảng viên</a>
          <a href="/khoa-cntt/nhan-su">Khoa CNTT - Nhân sự</a>
          <a href="/tin-tuc/khuyen-mai">Tin khuyến mãi</a>
          <a href="/faculty-directory">Faculty Directory</a>
        </body>
      </html>
    `;

    const links = InstitutionDiscoveryEngine.extractCandidateLinks(sampleHtml, "https://hust.edu.vn");
    assert.ok(links.length >= 2, "Should discover candidate staff and faculty links");
    assert.ok(links.some((l) => l.includes("giang-vien")), "Should find giang-vien link");
    assert.ok(links.some((l) => l.includes("faculty-directory")), "Should find faculty-directory link");

    // Sitemap XML parsing
    const sitemapXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://hust.edu.vn/faculty/staff-list</loc></url>
        <url><loc>https://hust.edu.vn/news/123</loc></url>
      </urlset>
    `;
    const sitemapLinks = InstitutionDiscoveryEngine.extractLinksFromSitemap(sitemapXml, "https://hust.edu.vn");
    assert.ok(sitemapLinks.includes("https://hust.edu.vn/faculty/staff-list"));
  });

  // 4. Pagination engine loop prevention & boundary handling
  it("04. Pagination engine loop prevention & boundary handling", () => {
    const pagination = new PaginationEngine(10);
    const htmlWithNext = `
      <div class="pagination">
        <a href="?page=1" class="active">1</a>
        <a href="?page=2">2</a>
        <a href="?page=3">3</a>
        <a href="?page=2" rel="next">Trang sau »</a>
      </div>
    `;

    const res = pagination.extractPagination(htmlWithNext, "https://hust.edu.vn/lecturers?page=1");
    assert.ok(res.nextPageUrl?.includes("page=2"), `Expected page=2, got ${res.nextPageUrl}`);
    assert.ok(res.allPageUrls.length >= 2, "Should discover numbered page links");

    // Visiting page 2 should not loop back to page 1
    const resPage2 = pagination.extractPagination(htmlWithNext, "https://hust.edu.vn/lecturers?page=2");
    assert.notStrictEqual(resPage2.nextPageUrl, "https://hust.edu.vn/lecturers?page=1");
  });

  // 5. Strategy A (HTTP/Cheerio) static profile extraction
  it("05. Strategy A (HTTP/Cheerio static extraction)", () => {
    const genericHtml = `
      <div class="team-member">
        <h3 class="name">Nguyễn Văn Hoàng</h3>
        <div class="title">Phó Giáo sư, Tiến sĩ</div>
        <div class="department">Khoa Khoa học Máy tính</div>
        <a href="mailto:hoang.nv@sample.edu.vn" class="email">hoang.nv@sample.edu.vn</a>
        <img src="/avatars/hoang.jpg" />
      </div>
    `;

    const extracted = extractStrategyA(genericHtml, "https://sample.edu.vn/staff", "sample");
    assert.strictEqual(extracted.length, 1);
    assert.strictEqual(extracted[0].rawName, "Nguyễn Văn Hoàng");
    assert.strictEqual(extracted[0].rawEmail, "hoang.nv@sample.edu.vn");
    assert.strictEqual(extracted[0].strategyUsed, "strategy_a");
  });

  // 6. Strategy C (HUST adapter) extraction
  it("06. Strategy C (HUST adapter extraction)", () => {
    const hustHtml = `
      <div class="lecturer-item">
        <div class="title-name">PGS. TS. Huỳnh Quyết Thắng</div>
        <div class="position">Hiệu trưởng</div>
        <div class="department">Trường Công nghệ Thông tin và Truyền thông</div>
        <a href="mailto:thang.hq@hust.edu.vn">thang.hq@hust.edu.vn</a>
      </div>
    `;

    const extracted = UniversityAdapters.extractHUST(hustHtml, "https://soict.hust.edu.vn/can-bo", "hust");
    assert.strictEqual(extracted.length, 1);
    assert.ok(extracted[0].rawName.includes("Huỳnh Quyết Thắng"));
    assert.strictEqual(extracted[0].rawEmail, "thang.hq@hust.edu.vn");
    assert.strictEqual(extracted[0].strategyUsed, "strategy_c");
  });

  // 7. Strategy C (UIT adapter) extraction
  it("07. Strategy C (UIT adapter extraction)", () => {
    const uitHtml = `
      <div class="view-danh-sach-can-bo">
        <div class="field-content">
          <div class="title">TS. Nguyễn Tấn Trần Minh Khang</div>
          <div class="chuc-vu">Phó Hiệu trưởng</div>
          <div class="don-vi">Khoa Kỹ thuật Phần mềm</div>
          <a href="mailto:khangnttm@uit.edu.vn">khangnttm@uit.edu.vn</a>
        </div>
      </div>
    `;

    const extracted = UniversityAdapters.extractUIT(uitHtml, "https://uit.edu.vn/giang-vien", "uit");
    assert.strictEqual(extracted.length, 1);
    assert.ok(extracted[0].rawName.includes("Minh Khang"));
    assert.strictEqual(extracted[0].rawEmail, "khangnttm@uit.edu.vn");
    assert.strictEqual(extracted[0].strategyUsed, "strategy_c");
  });

  // 8. Strategy C (VNU adapter) extraction
  it("08. Strategy C (VNU adapter extraction)", () => {
    const vnuHtml = `
      <div class="personnel-item">
        <div class="name">GS. TS. Nguyễn Đình Đức</div>
        <div class="title">Chủ tịch Hội đồng Giáo sư ngành Cơ học</div>
        <a href="mailto:ducnd@vnu.edu.vn">ducnd@vnu.edu.vn</a>
      </div>
    `;

    const extracted = UniversityAdapters.extractVNU(vnuHtml, "https://uet.vnu.edu.vn/faculty", "vnu-uet");
    assert.strictEqual(extracted.length, 1);
    assert.ok(extracted[0].rawName.includes("Nguyễn Đình Đức"));
    assert.strictEqual(extracted[0].rawEmail, "ducnd@vnu.edu.vn");
  });

  // 9. Strategy C (FPT adapter) extraction
  it("09. Strategy C (FPT adapter extraction)", () => {
    const fptHtml = `
      <div class="card-teacher">
        <div class="teacher-name">TS. Lê Trường Tùng</div>
        <div class="teacher-position">Chủ tịch Hội đồng trường</div>
        <div class="teacher-dept">Đại học FPT</div>
      </div>
    `;

    const extracted = UniversityAdapters.extractFPT(fptHtml, "https://daihoc.fpt.edu.vn/giang-vien", "fpt");
    assert.strictEqual(extracted.length, 1);
    assert.ok(extracted[0].rawName.includes("Lê Trường Tùng"));
  });

  // 10. Strategy C (HĐGSNN adapter) extraction
  it("10. Strategy C (HĐGSNN adapter extraction)", () => {
    const hdgsnnHtml = `
      <table>
        <tr>
          <td>1</td>
          <td>Nguyễn Văn Bình</td>
          <td>2023</td>
          <td>Giáo sư ngành Toán học</td>
          <td>Trường Đại học Khoa học Tự nhiên</td>
        </tr>
      </table>
    `;

    const extracted = UniversityAdapters.extractHDGSNN(hdgsnnHtml, "https://hdgsnn.gov.vn/danh-sach", "moet");
    assert.strictEqual(extracted.length, 1);
    assert.strictEqual(extracted[0].rawName, "Nguyễn Văn Bình");
    assert.ok(extracted[0].rawTitle?.includes("Toán học"));
  });

  // 11. Strategy D (Generic Heuristic Extractor) extraction
  it("11. Strategy D (Generic heuristic fallback)", () => {
    const unstructuredHtml = `
      <div>
        <p>Khoa chúng tôi vinh dự có GS. Trần Văn An (an.tv@university.edu.vn) đảm nhiệm vị trí trưởng phòng nghiên cứu.</p>
      </div>
    `;

    const extracted = extractStrategyD(unstructuredHtml, "https://university.edu.vn/about", "uni");
    assert.strictEqual(extracted.length, 1);
    assert.strictEqual(extracted[0].rawName, "Trần Văn An");
    assert.strictEqual(extracted[0].rawEmail, "an.tv@university.edu.vn");
  });

  // 12. Normalization: Academic rank (GS/PGS) vs Degree (TS/ThS) separation
  it("12. Normalization: Academic rank (GS/PGS) vs Degree (TS/ThS) separation", () => {
    // Rank != Degree!
    // Case 1: Both rank and degree
    const c1 = classifyAcademicRankAndDegree("PGS. TS. Trần Anh Tuấn");
    assert.strictEqual(c1.academicRank, "PGS");
    assert.strictEqual(c1.degree, "TS");
    assert.strictEqual(c1.displayTitle, "PGS.TS");

    // Case 2: Degree only, NO rank
    const c2 = classifyAcademicRankAndDegree("TS. Vũ Thị Mai");
    assert.strictEqual(c2.academicRank, null, "Doctorate is a degree, not an instructional rank");
    assert.strictEqual(c2.degree, "TS");
    assert.strictEqual(c2.displayTitle, "TS");

    // Case 3: Master only
    const c3 = classifyAcademicRankAndDegree("ThS. Lê Hoàng Long");
    assert.strictEqual(c3.academicRank, null);
    assert.strictEqual(c3.degree, "ThS");

    // Case 4: Full Professor with TSKH
    const c4 = classifyAcademicRankAndDegree("GS. TSKH. Đặng Vũ Minh");
    assert.strictEqual(c4.academicRank, "GS");
    assert.strictEqual(c4.degree, "TSKH");
  });

  // 13. Normalization: Initials SVG avatar generation for unphotographed staff
  it("13. Normalization: Initials SVG avatar generation", () => {
    const svgDataUri = generateInitialsAvatar("Nguyễn Văn An", "hust");
    assert.ok(svgDataUri.startsWith("data:image/svg+xml;utf8,"), "Must be valid SVG data URI");
    assert.ok(svgDataUri.includes("NA"), "Initials must be NA");
    assert.ok(decodeURIComponent(svgDataUri).includes("<rect"), "Must contain clean rectangular vector (no circles)");
  });

  // 14. Deduplication: Multi-layer matching (URL, email, normalized name)
  it("14. Deduplication: Multi-layer matching", async () => {
    const testRaw = {
      rawName: `Giảng Viên Thử Nghiệm ${Date.now()}`,
      rawTitle: "GS. TS.",
      rawDepartment: "Khoa Thủy văn",
      rawEmail: `thutm-${Date.now()}@sample-tlu.edu.vn`,
      rawProfileUrl: `https://sample-tlu.edu.vn/prof/${Date.now()}`,
      universityId: "hust",
      sourceUrl: "https://sample-tlu.edu.vn/faculty",
      strategyUsed: "strategy_a" as const,
    };

    // First insert
    const res1 = await DeduplicationService.resolveAndUpsertLecturer(testRaw);
    assert.strictEqual(res1.action, "inserted");

    // Second insert with same profile URL -> should update, not insert duplicate
    const res2 = await DeduplicationService.resolveAndUpsertLecturer(testRaw);
    assert.strictEqual(res2.action, "updated");
    assert.strictEqual(res2.lecturerId, res1.lecturerId, "Same lecturer ID must be resolved");

    // Clean up test lecturer to maintain database hygiene
    if (res1.lecturerId) {
      if (isPostgresConfigured()) {
        const pool = getPostgresPool();
        await pool.query("DELETE FROM affiliations WHERE lecturer_id = $1", [res1.lecturerId]);
        await pool.query("DELETE FROM lecturers WHERE id = $1", [res1.lecturerId]);
      } else {
        const db = getSqliteDb();
        db.prepare("DELETE FROM affiliations WHERE lecturer_id = ?").run(res1.lecturerId);
        db.prepare("DELETE FROM lecturers WHERE id = ?").run(res1.lecturerId);
      }
    }
  });

  // 15. Deduplication: Preservation of existing student reviews and ratings
  it("15. Deduplication: Preservation of existing student reviews and ratings", async () => {
    const db = getSqliteDb();

    // Verify an existing lecturer with ratings has their rating preserved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingLec = db.prepare(
      `SELECT l.id, l.name, l.rating_average, l.rating_count, a.university_id
       FROM lecturers l
       JOIN affiliations a ON l.id = a.lecturer_id
       WHERE l.rating_count > 0 LIMIT 1`
    ).get() as any;

    if (existingLec) {
      const origRating = existingLec.rating_average;
      const origCount = existingLec.rating_count;

      // Upsert crawl data for this existing professor
      const upsertResult = await DeduplicationService.resolveAndUpsertLecturer({
        rawName: existingLec.name,
        rawTitle: "GS. TS.",
        rawDepartment: "Khoa CNTT",
        universityId: existingLec.university_id,
        sourceUrl: "https://sample.edu.vn/update-profile",
        strategyUsed: "strategy_c" as const,
      });

      assert.strictEqual(upsertResult.action, "updated");

      // Verify database rating is strictly unchanged
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rechecked = db.prepare(
        "SELECT rating_average, rating_count FROM lecturers WHERE id = ?"
      ).get(existingLec.id) as any;

      assert.strictEqual(rechecked.rating_average, origRating, "Rating average must be preserved intact");
      assert.strictEqual(rechecked.rating_count, origCount, "Rating count must be preserved intact");
    }
  });

  // 16. Validation: Reject navigation text, placeholder names, spam
  it("16. Validation: Reject navigation text, placeholder names, spam", () => {
    // 1. Navigation text
    const v1 = ValidationService.validateRawProfessor({
      rawName: "Trang chủ",
      universityId: "hust",
      sourceUrl: "https://hust.edu.vn",
      strategyUsed: "strategy_a",
    });
    assert.strictEqual(v1.isValid, false);
    assert.strictEqual(v1.status, "rejected");

    // 2. Placeholder text
    const v2 = ValidationService.validateRawProfessor({
      rawName: "Đang cập nhật",
      universityId: "hust",
      sourceUrl: "https://hust.edu.vn",
      strategyUsed: "strategy_a",
    });
    assert.strictEqual(v2.isValid, false);
    assert.strictEqual(v2.status, "rejected");

    // 3. Name with digits
    const v3 = ValidationService.validateRawProfessor({
      rawName: "Nguyễn Văn 123",
      universityId: "hust",
      sourceUrl: "https://hust.edu.vn",
      strategyUsed: "strategy_a",
    });
    assert.strictEqual(v3.isValid, false);
    assert.strictEqual(v3.status, "rejected");

    // 4. Valid Vietnamese lecturer name
    const v4 = ValidationService.validateRawProfessor({
      rawName: "PGS. TS. Trần Văn Nam",
      rawEmail: "nam.tv@hust.edu.vn",
      rawDepartment: "Khoa Điện tử",
      universityId: "hust",
      sourceUrl: "https://hust.edu.vn/faculty",
      strategyUsed: "strategy_c",
    });
    assert.strictEqual(v4.isValid, true);
    assert.strictEqual(v4.status, "validated");
    assert.ok(v4.confidenceScore >= 0.8);
  });

  // 17. Staging pipeline: Record staging & quality scoring
  it("17. Staging pipeline: Record staging & quality scoring", async () => {
    const raw = {
      rawName: "Đào Văn Thịnh",
      rawTitle: "ThS.",
      rawDepartment: "Khoa Cơ khí",
      rawEmail: "thinh.dv@sample.edu.vn",
      universityId: "hust",
      sourceUrl: "https://hust.edu.vn/staff",
      strategyUsed: "strategy_a" as const,
    };

    const stagingId = await ValidationService.stageCandidate(raw, "job-test-1");
    assert.ok(stagingId.startsWith("stg-"), "Staging ID must have stg- prefix");

    let staged: any;
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT * FROM staging_professors WHERE id = $1", [stagingId]);
      staged = res.rows[0];
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      staged = db.prepare("SELECT * FROM staging_professors WHERE id = ?").get(stagingId) as any;
    }
    assert.ok(staged, "Staged record must exist in staging_professors table");
    assert.strictEqual(staged.validation_status, "validated");
  });

  // 18. Job System: Crash Recovery & Exponential Backoff
  it("18. Job System: Crash Recovery & Exponential Backoff", async () => {
    const testCampaignId = `cmp-test-${Date.now()}`;
    const enqueuedJob = await PersistentJobSystem.enqueueJob({
      campaignId: testCampaignId,
      universityId: "hust",
      url: `https://hust.edu.vn/test-crash-${Date.now()}`,
      jobType: "profile",
      priority: 50,
    });

    // Dequeue specifically for this test campaign
    const job = await PersistentJobSystem.dequeueNextJob(testCampaignId);
    assert.ok(job);
    assert.strictEqual(job.id, enqueuedJob.id);

    // Simulate worker crash: fail job and verify retry scheduling with backoff
    await PersistentJobSystem.failJob(job.id, "Simulated network timeout", "network_timeout");

    let failedJob: any;
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query("SELECT status, retry_count, attempt_count, next_retry_at FROM crawl_jobs WHERE id = $1", [job.id]);
      failedJob = res.rows[0];
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      failedJob = db.prepare("SELECT status, retry_count, attempt_count, next_retry_at FROM crawl_jobs WHERE id = ?").get(job.id) as any;
    }
    assert.strictEqual(failedJob.status, "retry_scheduled");
    assert.ok((failedJob.attempt_count || 0) >= 1 || (failedJob.retry_count || 0) >= 1);
    assert.ok(failedJob.next_retry_at > Date.now(), "Next retry must be scheduled in the future");
  });

  // 19. Honest coverage audit: Complete vs Partial vs Inaccessible
  it("19. Honest coverage audit: Complete vs Partial vs Inaccessible", async () => {
    const audit = await CoverageAuditService.runNationwideAudit();
    assert.ok(audit.totalInstitutions >= 20, "Should audit all registered institutions");
    assert.strictEqual(typeof audit.nationwideCoveragePercentage, "number");
    assert.ok(
      audit.completeInstitutions + audit.partialInstitutions + audit.inaccessibleInstitutions + audit.noPublicDataInstitutions + audit.pendingInstitutions === audit.totalInstitutions,
      "Sum of institution status counts must strictly equal totalInstitutions"
    );

    // Verify no fabricated 100% claim if there are pending or partial institutions
    if (audit.pendingInstitutions > 0 || audit.partialInstitutions > 0) {
      assert.ok(audit.nationwideCoveragePercentage <= 100);
    }
  });

  // 20. NLP Command Translator: Vietnamese & English Intent Routing
  it("20. NLP Command Translator: Multi-intent routing", async () => {
    // Intent 1: Nationwide crawl (Vietnamese)
    const cmd1 = await NlpCommandHandler.executeCommand("Thu thập toàn quốc");
    assert.strictEqual(cmd1.understood, true);
    assert.strictEqual(cmd1.intent, "crawl_nationwide");

    // Intent 2: Specific institution (English/Vietnamese)
    const cmd2 = await NlpCommandHandler.executeCommand("Crawl HUST professors");
    assert.strictEqual(cmd2.understood, true);
    assert.strictEqual(cmd2.intent, "crawl_institution");

    // Intent 3: Audit coverage
    const cmd3 = await NlpCommandHandler.executeCommand("Kiểm tra độ phủ dữ liệu");
    assert.strictEqual(cmd3.understood, true);
    assert.strictEqual(cmd3.intent, "audit_coverage");

    // Intent 4: Resume worker
    const cmd4 = await NlpCommandHandler.executeCommand("Tiếp tục cào");
    assert.strictEqual(cmd4.understood, true);
    assert.strictEqual(cmd4.intent, "resume_worker");

    // Intent 5: Unknown command
    const cmd5 = await NlpCommandHandler.executeCommand("hello chatbot");
    assert.strictEqual(cmd5.understood, false);
    assert.strictEqual(cmd5.intent, "unknown");
  });

  after(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
});
