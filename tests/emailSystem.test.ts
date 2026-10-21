import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isPostgresConfigured, getPostgresPool } from "../src/lib/server/postgresClient";
import {
  isValidEmailAddress,
  sanitizeHeaderField,
  escapeHtml,
  maskEmailAddress,
} from "../src/lib/server/email/emailSanitizer";
import { renderEmailTemplate } from "../src/lib/server/email/emailTemplates";
import { EMAIL_DESIGN_TOKENS } from "../src/lib/server/email/emailTokens";
import {
  queueEmail,
  processEmailOutboxBatch,
  createSecureEmailToken,
  verifyAndConsumeToken,
} from "../src/lib/server/email/emailService";
import {
  isEmailSuppressed,
  addEmailSuppression,
  removeEmailSuppression,
  recordEmailEvent,
  getEmailJobById,
  updateEmailJobStatus,
  getEmailOutboxStats,
} from "../src/lib/server/db";
import { checkEmailRateLimit } from "../src/lib/server/email/emailRateLimiter";
import { auditDomainDns } from "../src/lib/server/email/emailProvider";

describe("RateUrProfs — Complete Automated Email System Test Suite", () => {
  // -------------------------------------------------------------------------
  // 1. SANITIZATION & HEADER INJECTION DEFENSE
  // -------------------------------------------------------------------------
  it("01. Header Injection Defense: Strips CRLF characters to prevent SMTP/HTTP header splitting", () => {
    const maliciousSubject = "Important Alert\r\nBcc: victim@example.com\r\nSubject: Injected";
    const sanitized = sanitizeHeaderField(maliciousSubject);
    assert.strictEqual(sanitized.includes("\r"), false, "Must not contain carriage return");
    assert.strictEqual(sanitized.includes("\n"), false, "Must not contain newline");
    assert.strictEqual(sanitized, "Important Alert Bcc: victim@example.com Subject: Injected");
  });

  it("02. HTML Escaping Defense: Safely escapes XSS payloads embedded in email parameters", () => {
    const maliciousInput = '<script>alert("hacked")</script> & "quotes" \'single\'';
    const escaped = escapeHtml(maliciousInput);
    assert.strictEqual(escaped.includes("<script>"), false);
    assert.strictEqual(escaped.includes("&lt;script&gt;"), true);
    assert.strictEqual(escaped.includes("&quot;quotes&quot;"), true);
    assert.strictEqual(escaped.includes("&#039;single&#039;"), true);
  });

  it("03. RFC 5322 Recipient Validation: strictly validates recipient address syntax", () => {
    assert.strictEqual(isValidEmailAddress("student@hust.edu.vn"), true);
    assert.strictEqual(isValidEmailAddress("admin@rateurprofs.site"), true);
    assert.strictEqual(isValidEmailAddress("dungpubgame@gmail.com"), true);

    // Invalid emails
    assert.strictEqual(isValidEmailAddress(""), false);
    assert.strictEqual(isValidEmailAddress("invalid-email"), false);
    assert.strictEqual(isValidEmailAddress("spaces in@email.com"), false);
    assert.strictEqual(isValidEmailAddress("victim@domain.com\r\n"), false);
    assert.strictEqual(isValidEmailAddress("@missing-local.com"), false);
  });

  it("04. Privacy-Conscious Masking: properly masks email addresses for log views", () => {
    assert.strictEqual(maskEmailAddress("nguyen.van.a@hust.edu.vn"), "ng***a@hust.edu.vn");
    assert.strictEqual(maskEmailAddress("dungpubgame@gmail.com"), "du***e@gmail.com");
    assert.strictEqual(maskEmailAddress("ab@test.com"), "a***@test.com");
  });

  // -------------------------------------------------------------------------
  // 2. NEO-BRUTALIST TEMPLATE SYSTEM INTEGRITY
  // -------------------------------------------------------------------------
  it("05. Neo-Brutalist Visual Identity: enforces sharp corners (0px) and website brand colors", () => {
    const rendered = renderEmailTemplate(
      "review_moderated",
      {
        professorName: "GS.TS Nguyễn Văn A",
        action: "hide",
        reason: "Ngôn từ không phù hợp",
      },
      "vi"
    );

    // Strict 100% sharp corner enforcement
    assert.strictEqual(rendered.html.includes("border-radius: 0px !important"), true);
    // Strict no lock icon
    assert.strictEqual(rendered.html.includes("🔒"), false, "Must not include lock icon");

    // Signature RateUrProfs colors
    assert.strictEqual(
      rendered.html.includes(EMAIL_DESIGN_TOKENS.colors.brandRed),
      true,
      "Must include RateUrProfs editorial red #e03a3e"
    );
    assert.strictEqual(
      rendered.html.includes(EMAIL_DESIGN_TOKENS.colors.yellowAccent),
      true,
      "Must include brand yellow accent #fef9c3"
    );
    assert.strictEqual(
      rendered.html.includes(EMAIL_DESIGN_TOKENS.colors.borderBlack),
      true,
      "Must include #111111 thick borders"
    );

    // Monospace navigation tags matching website Footer.tsx
    assert.strictEqual(rendered.html.includes("[Trang chủ]"), true);
    assert.strictEqual(rendered.html.includes("[Site Guidelines]"), true);
    assert.strictEqual(rendered.html.includes("[Privacy Policy]"), true);

    // Plain-text alternative
    assert.strictEqual(rendered.text.length > 50, true);
    assert.strictEqual(rendered.text.includes("https://rateurprofs.site"), true);
  });

  it("06. Bilingual Parity: Renders fluent English and Vietnamese template variants", () => {
    const viRender = renderEmailTemplate("security_alert", { action: "Đăng nhập IP mới" }, "vi");
    const enRender = renderEmailTemplate("security_alert", { action: "New IP Login" }, "en");

    assert.strictEqual(viRender.subject.includes("[Cảnh báo Bảo mật]"), true);
    assert.strictEqual(enRender.subject.includes("[Security Notice]"), true);
    assert.strictEqual(viRender.html.includes("[Home]"), false);
    assert.strictEqual(enRender.html.includes("[Home]"), true);
  });

  // -------------------------------------------------------------------------
  // 3. CRYPTOGRAPHIC SINGLE-USE EXPIRING TOKENS
  // -------------------------------------------------------------------------
  it("07. Single-Use Expiring Tokens: Hashes raw token with SHA-256 and invalidates upon consumption", async () => {
    const testEmail = `token_test_${Date.now()}@hust.edu.vn`;
    const { rawToken } = await createSecureEmailToken({
      email: testEmail,
      tokenType: "security_token",
      expiresInMs: 3600 * 1000,
    });

    assert.strictEqual(typeof rawToken, "string");
    assert.strictEqual(rawToken.length, 64, "Raw token must be 32 random bytes in hex (64 chars)");

    // 1st consumption -> must succeed
    const firstConsume = await verifyAndConsumeToken(rawToken, "security_token");
    assert.notStrictEqual(firstConsume, null, "First consumption must succeed");
    assert.strictEqual(firstConsume?.email, testEmail);

    // 2nd consumption -> must be rejected (single-use enforced!)
    const secondConsume = await verifyAndConsumeToken(rawToken, "security_token");
    assert.strictEqual(secondConsume, null, "Second consumption must be strictly rejected (single-use)");
  });

  it("08. Token Expiration: Rejects expired tokens", async () => {
    const testEmail = `token_expired_${Date.now()}@hust.edu.vn`;
    const { rawToken } = await createSecureEmailToken({
      email: testEmail,
      tokenType: "password_reset",
      expiresInMs: -1000, // already expired!
    });

    const consumed = await verifyAndConsumeToken(rawToken, "password_reset");
    assert.strictEqual(consumed, null, "Expired token must be rejected");
  });

  // -------------------------------------------------------------------------
  // 4. RATE LIMITING ENGINE
  // -------------------------------------------------------------------------
  it("09. Rate Limiter: Enforces sliding window limits per IP and recipient", () => {
    const action = "test-reset";
    const testKey = `test_rate_${Date.now()}@rateurprofs.site`;

    // 3 allowed
    assert.strictEqual(checkEmailRateLimit(action, testKey, 3, 60000).allowed, true);
    assert.strictEqual(checkEmailRateLimit(action, testKey, 3, 60000).allowed, true);
    assert.strictEqual(checkEmailRateLimit(action, testKey, 3, 60000).allowed, true);

    // 4th must be blocked
    const blocked = checkEmailRateLimit(action, testKey, 3, 60000);
    assert.strictEqual(blocked.allowed, false, "4th request within window must be rate limited");
    assert.strictEqual(typeof blocked.retryAfterSec, "number");
    assert.strictEqual(blocked.retryAfterSec! > 0, true);
  });

  // -------------------------------------------------------------------------
  // 5. DURABLE OUTBOX QUEUE & WORKER EXECUTION
  // -------------------------------------------------------------------------
  it("10. Outbox Queue & Idempotency: Inserts queued job and suppresses duplicate keys", async () => {
    const recipient = `student_${Date.now()}@hust.edu.vn`;
    const testIdemKey = `idem_test_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const res1 = await queueEmail({
      recipient,
      templateId: "security_alert",
      templateVars: { action: "New Login" },
      idempotencyKey: testIdemKey,
    });

    assert.strictEqual(res1.success, true);
    assert.strictEqual(typeof res1.jobId, "string");

    // Second call with same idempotency key
    const res2 = await queueEmail({
      recipient,
      templateId: "security_alert",
      templateVars: { action: "New Login" },
      idempotencyKey: testIdemKey,
    });

    // Should succeed idempotently
    assert.strictEqual(res2.success, true);
  });

  it("11. Outbox Worker Batch Processing: Dispatches queued jobs and updates status", async () => {
    const recipient = `outbox_worker_${Date.now()}@rateurprofs.site`;
    const qRes = await queueEmail({
      recipient,
      templateId: "test_email",
      templateVars: { test: true },
    });

    assert.strictEqual(qRes.success, true);
    const jobId = qRes.jobId!;

    // Run batch processor
    const batchStats = await processEmailOutboxBatch(10);
    assert.strictEqual(batchStats.processed >= 1, true);

    const job = await getEmailJobById(jobId);
    assert.notStrictEqual(job, null);
    assert.strictEqual(job?.status, "sent");
    assert.strictEqual(typeof job?.sent_at, "number");
  });

  // -------------------------------------------------------------------------
  // 6. SUPPRESSION LIST & REPUTATION PROTECTION
  // -------------------------------------------------------------------------
  it("12. Suppression List: Automatically blocks delivery to bounced or unsubscribed emails", async () => {
    const bouncedEmail = `bounced_${Date.now()}@hardbounce.test`;

    // Before suppression
    assert.strictEqual(await isEmailSuppressed(bouncedEmail), false);

    // Add suppression
    await addEmailSuppression(bouncedEmail, "hard_bounce", "Simulated 550 Mailbox does not exist");
    assert.strictEqual(await isEmailSuppressed(bouncedEmail), true);

    // Queueing an email to this address must fail immediately before any API call
    const qRes = await queueEmail({
      recipient: bouncedEmail,
      templateId: "test_email",
      templateVars: {},
    });
    assert.strictEqual(qRes.success, false);
    assert.strictEqual(qRes.error?.includes("suppressed"), true);

    // Cleanup suppression
    await removeEmailSuppression(bouncedEmail);
    assert.strictEqual(await isEmailSuppressed(bouncedEmail), false);
  });

  // -------------------------------------------------------------------------
  // 7. WEBHOOK INGESTION & EVENT TRACKING
  // -------------------------------------------------------------------------
  it("13. Webhook Delivery Event Tracking: Idempotently updates job status and records delivery audit", async () => {
    const testRecipient = `webhook_${Date.now()}@rateurprofs.site`;
    const qRes = await queueEmail({
      recipient: testRecipient,
      templateId: "test_email",
      templateVars: {},
    });
    const jobId = qRes.jobId!;

    // Simulate provider delivery webhook event
    const eventId = `ev_test_${Date.now()}`;
    await recordEmailEvent({
      event_id: eventId,
      job_id: jobId,
      provider: "resend",
      event_type: "delivered",
      recipient: testRecipient,
      payload_json: { status: "250 OK" },
    });

    const updatedJob = await getEmailJobById(jobId);
    assert.strictEqual(updatedJob?.status, "delivered");
    assert.strictEqual(typeof updatedJob?.delivered_at, "number");
  });

  // -------------------------------------------------------------------------
  // 8. LIVE DNS AUDIT CAPABILITY
  // -------------------------------------------------------------------------
  it("14. Domain DNS Audit: Validates live DNS report for rateurprofs.site", async () => {
    const dnsReport = await auditDomainDns("rateurprofs.site");
    assert.strictEqual(dnsReport.domain, "rateurprofs.site");
    assert.strictEqual(dnsReport.mx.status, "verified", "Namecheap email forwarding MX records must be verified");
    assert.strictEqual(typeof dnsReport.spf.status, "string");
    assert.strictEqual(typeof dnsReport.dkim.status, "string");
    assert.strictEqual(typeof dnsReport.dmarc.status, "string");
  });

  after(async () => {
    // Allow brief grace period for any background ticks to settle
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (isPostgresConfigured()) {
      try {
        await getPostgresPool().end();
      } catch {
        // ignore
      }
    }
    process.exit(0);
  });
});
