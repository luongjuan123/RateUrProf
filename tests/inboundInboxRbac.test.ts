import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateCaseId,
  createInboundTicket,
  getInboundTickets,
  getInboundTicketById,
  replyInboundTicket,
  updateInboundTicketStatus,
  appendInboundTicketMessage,
  InboundMailbox,
} from "../src/lib/server/db";
import {
  isPostgresConfigured,
  ensurePostgresSchema,
  getPostgresPool,
} from "../src/lib/server/postgresClient";
import {
  parseDestinationMailbox,
  extractEmailOnly,
  extractDisplayName,
} from "../src/app/api/webhooks/resend-inbound/route";
import {
  isHumanEscalationRequested,
  shouldIgnoreInboundEmail,
} from "../src/lib/server/email/inboundAgent";
import { hasPermission } from "../src/lib/server/rbac";
import { renderEmailTemplate } from "../src/lib/server/email/emailTemplates";

describe("Inbound Email Management & RBAC Isolation Suite", () => {
  before(async () => {
    if (isPostgresConfigured()) {
      await ensurePostgresSchema();
    }
  });

  after(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
  describe("Case ID Generation", () => {
    it("generates correct prefix and format for support mailbox", () => {
      const caseId = generateCaseId("support");
      assert.match(caseId, /^RUP-SUP-[0-9A-F]{4}$/);
    });

    it("generates correct prefix and format for security mailbox", () => {
      const caseId = generateCaseId("security");
      assert.match(caseId, /^RUP-SEC-[0-9A-F]{4}$/);
    });

    it("generates correct prefix and format for admin mailbox", () => {
      const caseId = generateCaseId("admin");
      assert.match(caseId, /^RUP-ADM-[0-9A-F]{4}$/);
    });

    it("generates unique random IDs across calls", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 20; i++) {
        ids.add(generateCaseId("support"));
      }
      assert.equal(ids.size, 20, "Expected all generated Case IDs to be distinct");
    });
  });

  describe("Destination Mailbox Parsing", () => {
    it("routes emails to security mailbox when recipient contains security@", () => {
      assert.equal(parseDestinationMailbox("security@rateurprofs.site"), "security");
      assert.equal(parseDestinationMailbox(["security@rateurprofs.site"]), "security");
      assert.equal(
        parseDestinationMailbox("other@example.com", { to: "RateUrProfs Security <security@rateurprofs.site>" }),
        "security"
      );
    });

    it("routes emails to admin mailbox when recipient contains admin@", () => {
      assert.equal(parseDestinationMailbox("admin@rateurprofs.site"), "admin");
      assert.equal(parseDestinationMailbox(["admin@rateurprofs.site"]), "admin");
      assert.equal(
        parseDestinationMailbox(undefined, { "delivered-to": "admin@rateurprofs.site" }),
        "admin"
      );
    });

    it("routes to support mailbox as default or when recipient contains support@", () => {
      assert.equal(parseDestinationMailbox("support@rateurprofs.site"), "support");
      assert.equal(parseDestinationMailbox(["support@rateurprofs.site"]), "support");
      assert.equal(parseDestinationMailbox("unknown@rateurprofs.site"), "support");
      assert.equal(parseDestinationMailbox(undefined, {}), "support");
    });
  });

  describe("Human Escalation Keyword Detection", () => {
    it("detects Vietnamese human escalation requests", () => {
      const triggers = [
        "Tôi muốn gặp người thật để giải quyết",
        "Cho mình nói chuyện với nhân viên hỗ trợ",
        "Có ai là con người ở đây không",
        "Chuyển qua quản trị viên giúp em",
        "Không muốn bot trả lời",
        "Đừng trả lời bằng máy móc",
        "Cần hỗ trợ viên can thiệp gấp",
      ];

      for (const phrase of triggers) {
        assert.equal(
          isHumanEscalationRequested("Hỗ trợ tài khoản", phrase),
          true,
          `Failed for phrase: "${phrase}"`
        );
      }
    });

    it("detects English human escalation requests", () => {
      const triggers = [
        "I need to speak to a real person immediately",
        "Please connect me with a human agent",
        "Can I talk to an agent or representative?",
        "Human support please, bot is unhelpful",
        "I want to escalate to human",
      ];

      for (const phrase of triggers) {
        assert.equal(
          isHumanEscalationRequested("Account lock", phrase),
          true,
          `Failed for phrase: "${phrase}"`
        );
      }
    });

    it("does not false-positive on regular academic queries", () => {
      const regularQueries = [
        "Cho em hỏi thầy Nguyễn Văn A có dạy môn Cơ sở dữ liệu không?",
        "Trường Đại học Bách Khoa có cơ sở ở đâu?",
        "Làm sao để đổi ảnh đại diện tài khoản?",
        "How do I submit an anonymous review for my professor?",
      ];

      for (const phrase of regularQueries) {
        assert.equal(
          isHumanEscalationRequested("Hỏi thông tin", phrase),
          false,
          `False positive for: "${phrase}"`
        );
      }
    });
  });

  describe("RBAC Mailbox Isolation Matrix", () => {
    it("grants super_admin access to all 3 mailboxes", () => {
      assert.equal(hasPermission("super_admin", "inbox:admin"), true);
      assert.equal(hasPermission("super_admin", "inbox:support"), true);
      assert.equal(hasPermission("super_admin", "inbox:security"), true);
    });

    it("grants admin access to all 3 mailboxes", () => {
      assert.equal(hasPermission("admin", "inbox:admin"), true);
      assert.equal(hasPermission("admin", "inbox:support"), true);
      assert.equal(hasPermission("admin", "inbox:security"), true);
    });

    it("isolates support role to ONLY inbox:support", () => {
      assert.equal(hasPermission("support", "inbox:support"), true);
      assert.equal(hasPermission("support", "inbox:admin"), false, "Support must NOT see admin");
      assert.equal(hasPermission("support", "inbox:security"), false, "Support must NOT see security");
    });

    it("isolates security role to ONLY inbox:security", () => {
      assert.equal(hasPermission("security", "inbox:security"), true);
      assert.equal(hasPermission("security", "inbox:admin"), false, "Security must NOT see admin");
      assert.equal(hasPermission("security", "inbox:support"), false, "Security must NOT see support");
    });

    it("denies inbox permissions to moderator and student roles", () => {
      assert.equal(hasPermission("moderator", "inbox:admin"), false);
      assert.equal(hasPermission("moderator", "inbox:support"), false);
      assert.equal(hasPermission("moderator", "inbox:security"), false);

      assert.equal(hasPermission("student", "inbox:admin"), false);
      assert.equal(hasPermission("student", "inbox:support"), false);
      assert.equal(hasPermission("student", "inbox:security"), false);
    });
  });

  describe("Inbound Ticket Database Operations & Lifecycle", () => {
    const testAdminTicketId = `test-adm-${Date.now()}`;
    const testSupportTicketId = `test-sup-${Date.now()}`;
    const testSecurityTicketId = `test-sec-${Date.now()}`;

    it("creates and retrieves tickets for each mailbox", async () => {
      // 1. Admin Ticket
      const adm = await createInboundTicket({
        id: testAdminTicketId,
        mailbox: "admin",
        sender_email: "reporter@example.com",
        sender_name: "Test Admin Reporter",
        subject: "V/v Hợp tác truyền thông",
        body_text: "Chúng tôi muốn liên hệ ban quản trị để tài trợ học bổng.",
        status: "needs_human",
      });
      assert.equal(adm.mailbox, "admin");
      assert.equal(adm.status, "needs_human");
      assert.match(adm.case_id, /^RUP-ADM-/);

      // 2. Support Ticket
      const sup = await createInboundTicket({
        id: testSupportTicketId,
        mailbox: "support",
        sender_email: "student@hcmut.edu.vn",
        sender_name: "Sinh vien",
        subject: "Quên mật khẩu tài khoản",
        body_text: "Em không nhận được email đặt lại mật khẩu.",
        status: "auto_replied",
        agent_reply: "<p>Vui lòng kiểm tra hộp thư spam.</p>",
      });
      assert.equal(sup.mailbox, "support");
      assert.equal(sup.status, "auto_replied");
      assert.match(sup.case_id, /^RUP-SUP-/);

      // 3. Security Ticket
      const sec = await createInboundTicket({
        id: testSecurityTicketId,
        mailbox: "security",
        sender_email: "whitehat@security.vn",
        sender_name: "Security Researcher",
        subject: "Báo cáo lỗ hổng XSS tiềm ẩn",
        body_text: "Phát hiện payload XSS tại tham số search.",
        status: "needs_human",
        agent_reply: "<p>Đội ngũ an ninh đã tiếp nhận.</p>",
      });
      assert.equal(sec.mailbox, "security");
      assert.equal(sec.status, "needs_human");
      assert.match(sec.case_id, /^RUP-SEC-/);
    });

    it("filters tickets strictly by mailbox", async () => {
      // Query support mailbox only
      const supportList = await getInboundTickets({ mailbox: "support", limit: 50 });
      assert.ok(supportList.tickets.length > 0);
      for (const t of supportList.tickets) {
        assert.equal(t.mailbox, "support", "All tickets in support query must belong to support mailbox");
      }

      // Query security mailbox only
      const securityList = await getInboundTickets({ mailbox: "security", limit: 50 });
      assert.ok(securityList.tickets.length > 0);
      for (const t of securityList.tickets) {
        assert.equal(t.mailbox, "security", "All tickets in security query must belong to security mailbox");
      }

      // Query admin mailbox only
      const adminList = await getInboundTickets({ mailbox: "admin", limit: 50 });
      assert.ok(adminList.tickets.length > 0);
      for (const t of adminList.tickets) {
        assert.equal(t.mailbox, "admin", "All tickets in admin query must belong to admin mailbox");
      }
    });

    it("keeps ticket open in in_progress by default on staff reply", async () => {
      const replyMessage = "Chào bạn, đội ngũ hỗ trợ đang kiểm tra thông tin tài khoản cho bạn.";
      const staffUser = { email: "support.agent@rateurprofs.site", name: "Nguyễn Support" };

      const updated = await replyInboundTicket(testSupportTicketId, replyMessage, staffUser);
      assert.ok(updated, "Updated ticket should exist");
      assert.equal(updated.status, "in_progress", "Replying must NOT forcibly close ticket; should remain in_progress");
      assert.equal(updated.human_reply, replyMessage);
      assert.ok(updated.replied_by?.includes("Nguyễn Support"));
      assert.ok(Number(updated.replied_at) > 0);
      assert.ok(updated.messages.length >= 2, "Conversation thread must contain initial inquiry and staff reply");

      // Verify fetched by ID reflects in_progress
      const fetched = await getInboundTicketById(testSupportTicketId);
      assert.equal(fetched?.status, "in_progress");
      assert.equal(fetched?.human_reply, replyMessage);
    });

    it("supports multi-turn user follow-up responses in the same thread", async () => {
      const userFollowUp = "Cảm ơn ad, em đã thử nhưng vẫn chưa nhận được mã xác thực qua mail.";
      const updated = await appendInboundTicketMessage(testSupportTicketId, {
        sender_type: "user",
        sender_email: "student@hcmut.edu.vn",
        sender_name: "Sinh vien",
        content: userFollowUp,
      });

      assert.ok(updated);
      assert.equal(updated.status, "needs_human", "User follow-up must alert staff by transitioning to needs_human");
      const lastMsg = updated.messages[updated.messages.length - 1];
      assert.equal(lastMsg.sender_type, "user");
      assert.equal(lastMsg.content, userFollowUp);
    });

    it("resolves ticket when closeTicket is explicitly true", async () => {
      const finalReply = "Đã cấp lại mã truy cập mới cho bạn qua SMS và hoàn tất yêu cầu.";
      const staffUser = { email: "support.agent@rateurprofs.site", name: "Nguyễn Support" };

      const updated = await replyInboundTicket(testSupportTicketId, finalReply, staffUser, { closeTicket: true });
      assert.ok(updated);
      assert.equal(updated.status, "resolved", "Explicit closeTicket option must resolve the ticket");

      const fetched = await getInboundTicketById(testSupportTicketId);
      assert.equal(fetched?.status, "resolved");
    });

    it("allows explicit reopen and status updates without sending replies", async () => {
      const reopened = await updateInboundTicketStatus(testSupportTicketId, "in_progress");
      assert.ok(reopened);
      assert.equal(reopened.status, "in_progress");

      const closedAgain = await updateInboundTicketStatus(testSupportTicketId, "resolved");
      assert.ok(closedAgain);
      assert.equal(closedAgain.status, "resolved");
    });
  });

  describe("Inbound Human Reply Email Template", () => {
    it("renders official human reply email with Case ID and staff name", () => {
      const rendered = renderEmailTemplate(
        "inbound_human_reply",
        {
          originalSubject: "Cần hỗ trợ về tài khoản",
          replyText: "Chúng tôi đã kiểm tra và giải quyết sự cố cho bạn thành công.",
          ticketId: "RUP-SUP-1A2B",
          responderName: "Quân Nguyễn (Support Lead)",
          mailbox: "support",
        },
        "vi"
      );

      assert.ok(rendered.subject.includes("[RUP-SUP-1A2B]"));
      assert.ok(rendered.html.includes("RUP-SUP-1A2B"));
      assert.ok(rendered.html.includes("Quân Nguyễn (Support Lead)"));
      assert.ok(rendered.html.includes("Chúng tôi đã kiểm tra và giải quyết sự cố"));
      assert.ok(rendered.html.includes("border: 2px solid #111111"));
      assert.ok(rendered.text.includes("Quân Nguyễn (Support Lead)"));
    });
  });
});
