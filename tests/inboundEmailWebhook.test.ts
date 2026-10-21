import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldIgnoreInboundEmail, generateSupportResponse } from "../src/lib/server/email/inboundAgent";
import { renderEmailTemplate } from "../src/lib/server/email/emailTemplates";

describe("Resend Inbound AI Auto-Reply System", () => {
  describe("Anti-Loop and Bot Filter (RFC 3834)", () => {
    it("should ignore automated noreply / bounce addresses", () => {
      const bots = [
        "noreply@example.com",
        "no-reply@google.com",
        "mailer-daemon@mx.mail.yahoo.com",
        "postmaster@domain.vn",
        "notifications@github.com",
        "bounce@notifications.service.com",
      ];

      for (const bot of bots) {
        const check = shouldIgnoreInboundEmail(bot);
        assert.equal(check.shouldIgnore, true, `Expected ${bot} to be ignored`);
      }
    });

    it("should ignore auto-submitted / auto-generated headers", () => {
      assert.equal(
        shouldIgnoreInboundEmail("student@university.edu.vn", { "auto-submitted": "auto-replied" })
          .shouldIgnore,
        true
      );
      assert.equal(
        shouldIgnoreInboundEmail("student@university.edu.vn", { "auto-submitted": "auto-generated" })
          .shouldIgnore,
        true
      );
      assert.equal(
        shouldIgnoreInboundEmail("student@university.edu.vn", { precedence: "bulk" }).shouldIgnore,
        true
      );
      assert.equal(
        shouldIgnoreInboundEmail("student@university.edu.vn", { "list-id": "<list.example.com>" })
          .shouldIgnore,
        true
      );
    });

    it("should allow legitimate human inquiries", () => {
      const genuineSenders = [
        "sinhvien.hust@gmail.com",
        "nguyen.van.a@student.uit.edu.vn",
        "lecturer.support@yahoo.com",
      ];

      for (const sender of genuineSenders) {
        const check = shouldIgnoreInboundEmail(sender, {});
        assert.equal(check.shouldIgnore, false, `Expected ${sender} to be accepted`);
      }
    });
  });

  describe("Neo-Brutalist Inbound Template Rendering", () => {
    it("renders valid Vietnamese auto-reply with proper styling tokens", () => {
      const rendered = renderEmailTemplate(
        "inbound_auto_reply",
        {
          originalSubject: "Làm sao để khiếu nại đánh giá?",
          replyHtml: "<p>Bạn có thể nhấn nút Báo cáo bên cạnh đánh giá để quản trị viên kiểm duyệt.</p>",
          ticketId: "ABCD1234",
          senderName: "Minh Quân",
        },
        "vi"
      );

      assert.ok(rendered.subject.startsWith("Re:"));
      assert.ok(rendered.subject.includes("Làm sao để khiếu nại đánh giá?"));
      assert.ok(rendered.html.includes("ABCD1234"), "Should display ticket ID");
      assert.ok(rendered.html.includes("Chào Minh Quân"), "Should greet recipient");
      assert.ok(rendered.html.includes("#e03a3e"), "Should include brand red accent color");
      assert.ok(rendered.html.includes("border: 2px solid #111111"), "Should have sharp thick borders");
      assert.ok(rendered.html.includes("5px 5px 0px #111111"), "Should have offset hard shadow");
      assert.ok(rendered.text.includes("Minh Quân"), "Text fallback should contain name");
    });

    it("renders valid English auto-reply with clean typography and layout", () => {
      const rendered = renderEmailTemplate(
        "inbound_auto_reply",
        {
          originalSubject: "Re: Question regarding lecturer profile update",
          replyHtml: "<p>Lecturer updates are automatically reconciled from MOET directory.</p>",
          ticketId: "EN9999",
          senderName: "John Doe",
        },
        "en"
      );

      // Should sanitize double "Re:"
      assert.equal(rendered.subject, "Re: Question regarding lecturer profile update");
      assert.ok(rendered.html.includes("Hello John Doe"));
      assert.ok(rendered.html.includes("TICKET ID:"));
      assert.ok(rendered.html.includes("RateUrProfs AI Assistant"));
      assert.ok(rendered.text.length > 50);
    });
  });

  describe("Inbound AI Agent Fallback & Response Logic", () => {
    it("generates helpful Vietnamese fallback response when GEMINI_API_KEY is not set", async () => {
      const result = await generateSupportResponse({
        senderEmail: "student@hcmut.edu.vn",
        subject: "Hỏi về cách đánh giá ẩn danh",
        bodyText: "Cho em hỏi đánh giá trên web có lộ danh tính không ạ?",
      });

      assert.equal(result.shouldSkipReply, false);
      assert.equal(result.locale, "vi");
      assert.ok(result.replyHtml.includes("RateUrProfs"));
      assert.ok(result.replyHtml.includes("rateurprofs.site"));
    });

    it("generates helpful English fallback response for English inquiries", async () => {
      const result = await generateSupportResponse({
        senderEmail: "international@rmit.edu.vn",
        subject: "How do I review a course lecturer?",
        bodyText: "Is it completely anonymous to leave feedback on your platform?",
      });

      assert.equal(result.shouldSkipReply, false);
      assert.equal(result.locale, "en");
      assert.ok(result.replyHtml.includes("RateUrProfs"));
      assert.ok(result.replyHtml.includes("rateurprofs.site"));
    });
  });

  describe("Webhook Route Handler Edge Cases", () => {
    it("safely ignores non-inbound event types", async () => {
      const { POST } = await import("../src/app/api/webhooks/resend-inbound/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/webhooks/resend-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email.sent", data: {} }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.message.includes("Ignored event type"));
    });

    it("returns 400 Bad Request when email_id is missing", async () => {
      const { POST } = await import("../src/app/api/webhooks/resend-inbound/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/webhooks/resend-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email.received", data: {} }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.includes("email_id"));
    });
  });
});

