import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactPotentialSecrets } from "../src/lib/server/email/inboundAgent";
import {
  toolSearchLecturer,
  toolSearchUniversity,
  toolCheckUserAccount,
  toolRequestPasswordReset,
  toolSubmitCorrection,
  ToolExecutionContext,
} from "../src/lib/server/email/inboundTools";

describe("Inbound AI Agent Security & Problem-Solving Tools", () => {
  describe("Zero-Secret-Leak Redaction Filter", () => {
    it("redacts Resend API keys", () => {
      const input = "Here is your key: re_abc1234567890xyz_secret_test";
      const cleaned = redactPotentialSecrets(input);
      assert.ok(!cleaned.includes("re_abc1234567890xyz_secret_test"));
      assert.ok(cleaned.includes("[REDACTED_API_KEY]"));
    });

    it("redacts Google / Gemini API keys (AIza and AQ format)", () => {
      const input1 = "Using AIzaSyD1234567890abcdef123456789012345 for generation";
      const cleaned1 = redactPotentialSecrets(input1);
      assert.ok(!cleaned1.includes("AIzaSyD1234567890abcdef123456789012345"));
      assert.ok(cleaned1.includes("[REDACTED_API_KEY]"));

      const input2 = "Using AQ.TestMockDummySecretKeyForRedactionTestOnly1234567890 for generation";
      const cleaned2 = redactPotentialSecrets(input2);
      assert.ok(!cleaned2.includes("AQ.TestMockDummySecretKeyForRedactionTestOnly1234567890"));
      assert.ok(cleaned2.includes("[REDACTED_API_KEY]"));
    });

    it("redacts PostgreSQL database connection strings", () => {
      const input = "Connect to postgresql://postgres:mypassword123@10.0.0.1:5432/rateprof_prod";
      const cleaned = redactPotentialSecrets(input);
      assert.ok(!cleaned.includes("mypassword123"));
      assert.ok(!cleaned.includes("10.0.0.1:5432"));
      assert.ok(cleaned.includes("[REDACTED_DATABASE_URL]"));
    });

    it("redacts internal server filesystem paths", () => {
      const input = "Error located at /home/juan/Work Space/rateprofcuaban/src/lib/server/db.ts";
      const cleaned = redactPotentialSecrets(input);
      assert.ok(!cleaned.includes("/home/juan/"));
      assert.ok(cleaned.includes("[REDACTED_PATH]"));
    });

    it("redacts long hex password hashes", () => {
      const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const input = `User password hash: ${hash}`;
      const cleaned = redactPotentialSecrets(input);
      assert.ok(!cleaned.includes(hash));
      assert.ok(cleaned.includes("[REDACTED_HASH]"));
    });

    it("redacts Bearer tokens", () => {
      const input = "Authorization: Bearer my_super_secret_jwt_token_1234567890";
      const cleaned = redactPotentialSecrets(input);
      assert.ok(!cleaned.includes("my_super_secret_jwt_token_1234567890"));
      assert.ok(cleaned.includes("[REDACTED_TOKEN]"));
    });
  });

  describe("Autonomous Problem-Solving Tools", () => {
    const mockContextVi: ToolExecutionContext = {
      senderEmail: "student@hcmut.edu.vn",
      senderName: "Nguyen Van A",
      locale: "vi",
    };

    const mockContextEn: ToolExecutionContext = {
      senderEmail: "student@hcmut.edu.vn",
      senderName: "Nguyen Van A",
      locale: "en",
    };

    it("toolSearchLecturer finds professors and formats live links", async () => {
      const res = await toolSearchLecturer({ query: "Nguyễn" }, mockContextVi);
      assert.ok(res.length > 20);
      assert.ok(res.includes("/vi/professors/"), "Should contain profile URL link");
    });

    it("toolSearchUniversity finds universities by acronym or name", async () => {
      const res = await toolSearchUniversity({ query: "Bách Khoa" }, mockContextVi);
      assert.ok(res.length > 20);
      assert.ok(res.includes("/vi/universities/"), "Should contain university link");
    });

    it("toolCheckUserAccount STRICTLY BLOCKS querying another person's email", async () => {
      // Trying to spy on someone else's email:
      const res = await toolCheckUserAccount(
        { targetEmail: "other_victim@gmail.com" },
        mockContextVi
      );
      assert.ok(res.includes("bảo mật") || res.includes("quyền riêng tư"), "Must block cross-account inspection");
      assert.ok(!res.includes("other_victim@gmail.com"));
    });

    it("toolRequestPasswordReset STRICTLY BLOCKS resetting someone else's email", async () => {
      const res = await toolRequestPasswordReset(
        { targetEmail: "someone_else@yahoo.com" },
        mockContextEn
      );
      assert.ok(res.includes("Security violation") || res.includes("only be initiated for your verified"));
    });

    it("toolSubmitCorrection creates a correction ticket in admin queue", async () => {
      const res = await toolSubmitCorrection(
        {
          professorId: "prof_test_101",
          professorName: "TS. Lê Hoàng B",
          details: "Thầy hiện đã chuyển sang Khoa Khoa học Máy tính.",
        },
        mockContextVi
      );

      assert.ok(res.includes("corr_"), "Should return ticket reference ID");
      assert.ok(res.includes("Lê Hoàng B"));
    });
  });

  describe("Cost-Saving Self-Service Deflection (Lowest Priority)", () => {
    it("detects professor lookup inquiries as low priority", async () => {
      const { isLowPriorityProfessorInquiry } = await import("../src/lib/server/email/inboundAgent");

      assert.equal(
        isLowPriorityProfessorInquiry(
          "Question",
          "Is Professor Nguyễn Văn A on the site? I can't find him."
        ),
        true
      );

      assert.equal(
        isLowPriorityProfessorInquiry(
          "Outdated Info",
          "Professor B's department is outdated on your site."
        ),
        true
      );

      assert.equal(
        isLowPriorityProfessorInquiry(
          "Thắc mắc",
          "Có giảng viên Lê Văn C trên web không ạ? Em tìm không thấy."
        ),
        true
      );

      assert.equal(
        isLowPriorityProfessorInquiry(
          "Khoa bị sai",
          "Khoa của thầy Nguyễn Văn D bị cũ rồi, thầy chuyển sang viện khác."
        ),
        true
      );

      // Account issues must NOT be deflected
      assert.equal(
        isLowPriorityProfessorInquiry("Help", "Why is my account locked?"),
        false
      );
      assert.equal(
        isLowPriorityProfessorInquiry("Password", "I forgot my password"),
        false
      );
    });

    it("generates 0-cost self-service response directing user to search or update themselves", async () => {
      const { generateSupportResponse } = await import("../src/lib/server/email/inboundAgent");

      const res = await generateSupportResponse({
        senderEmail: "student@hust.edu.vn",
        subject: "Find professor",
        bodyText: "Is Professor Nguyễn Văn A on the site? I can't find him.",
      });

      assert.equal(res.shouldSkipReply, false);
      assert.ok(
        res.replyHtml.includes("does not look up") ||
        res.replyHtml.includes("không lưu trữ hoặc tra cứu thông tin chi tiết"),
        "Should state support does not have this information"
      );
      assert.ok(
        res.replyHtml.includes("yourself") ||
        res.replyHtml.includes("tự kiểm tra và tra cứu trực tiếp"),
        "Should instruct user to check it themselves"
      );
      assert.ok(res.replyHtml.includes("rateurprofs.site"));
    });
  });
});

