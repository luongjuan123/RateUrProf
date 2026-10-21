/**
 * RateUrProfs Durable Email Delivery Engine & Outbox Worker
 *
 * Implements:
 * - Asynchronous, non-blocking transactional outbox queueing.
 * - Idempotency key deduplication to prevent accidental double-sends.
 * - Concurrency control with row-level locks (FOR UPDATE SKIP LOCKED on PostgreSQL).
 * - Bounded exponential backoff retries with dead-letter status.
 * - Automatic suppression checks before external API invocation.
 * - Cryptographically secure single-use expiring token generator with SHA-256 hashing.
 */

import crypto from "node:crypto";
import {
  QueueEmailOptions,
  EmailSendResult,
  SenderIdentity,
} from "./emailTypes";
import {
  insertEmailJob,
  lockAndFetchQueuedEmailJobs,
  updateEmailJobStatus,
  isEmailSuppressed,
  createEmailToken,
  consumeEmailToken,
  DbEmailJob,
  DbEmailToken,
} from "../db";
import { isValidEmailAddress, sanitizeHeaderField } from "./emailSanitizer";
import { renderEmailTemplate } from "./emailTemplates";
import { getActiveEmailProvider } from "./emailProvider";

// Exponential backoff retry intervals in milliseconds (1m, 5m, 15m, 1h, 4h)
const RETRY_BACKOFF_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  4 * 60 * 60 * 1000,
];

/**
 * Returns the standard sender identity for a given template.
 */
export function getDefaultSenderForTemplate(templateId: string): string {
  switch (templateId) {
    case "review_moderated":
    case "correction_update":
    case "appeal_submitted":
    case "appeal_accepted":
    case "appeal_rejected":
      return "RateUrProfs Support <support@rateurprofs.site>";
    case "admin_alert":
      return "RateUrProfs System <admin@rateurprofs.site>";
    case "security_alert":
    case "account_locked":
    case "account_unlocked":
    case "account_deletion_requested":
    case "account_deleted":
    case "account_recovered":
      return "RateUrProfs Security <security@rateurprofs.site>";
    case "password_reset":
    case "test_email":
    default:
      return "RateUrProfs <no-reply@rateurprofs.site>";
  }
}

/**
 * Queues a transactional email into the durable outbox without blocking page rendering.
 */
export async function queueEmail(
  options: QueueEmailOptions
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const normRecipient = options.recipient?.trim().toLowerCase();
    if (!isValidEmailAddress(normRecipient)) {
      return {
        success: false,
        error: `Địa chỉ email người nhận không hợp lệ: "${options.recipient}"`,
      };
    }

    // Check suppression list first
    const suppressed = await isEmailSuppressed(normRecipient);
    if (suppressed) {
      console.warn(`[EmailService] Recipient "${normRecipient}" is on the suppression list. Skipping queue.`);
      return {
        success: false,
        error: "Địa chỉ email này đã bị từ chối hoặc yêu cầu ngừng nhận thư (suppressed).",
      };
    }

    const sender =
      sanitizeHeaderField(options.sender) ||
      getDefaultSenderForTemplate(options.templateId);

    // Pre-render to validate template and extract canonical subject
    const rendered = renderEmailTemplate(
      options.templateId,
      options.templateVars || {},
      options.locale || "vi"
    );

    const jobId = `eml_job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const idempotencyKey =
      options.idempotencyKey ||
      `idem_${options.templateId}_${normRecipient}_${crypto
        .createHash("sha256")
        .update(JSON.stringify(options.templateVars || {}))
        .digest("hex")
        .substring(0, 16)}`;

    const job: DbEmailJob = {
      id: jobId,
      idempotency_key: idempotencyKey,
      sender,
      recipient: normRecipient,
      subject: rendered.subject,
      template_id: options.templateId,
      template_vars: options.templateVars || {},
      locale: options.locale || "vi",
      status: "queued",
      retry_count: 0,
      max_retries: 5,
      next_retry_at: null,
      provider: null,
      provider_message_id: null,
      last_error: null,
      created_at: Date.now(),
      sent_at: null,
      delivered_at: null,
    };

    await insertEmailJob(job);

    // Fire non-blocking immediate outbox tick in background
    triggerImmediateWorkerTick().catch((err) => {
      console.warn("[EmailService] Background worker tick notice:", err);
    });

    return { success: true, jobId };
  } catch (err) {
    console.error("[EmailService] Failed to queue email:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi lập lịch gửi email",
    };
  }
}

/**
 * Triggers an asynchronous outbox worker tick using setImmediate.
 */
async function triggerImmediateWorkerTick(): Promise<void> {
  if (typeof setImmediate === "function") {
    setImmediate(() => {
      processEmailOutboxBatch(5).catch((e) =>
        console.error("[EmailService] Async worker error:", e)
      );
    });
  } else {
    setTimeout(() => {
      processEmailOutboxBatch(5).catch((e) =>
        console.error("[EmailService] Async worker error:", e)
      );
    }, 50);
  }
}

/**
 * Processes a batch of queued outbox email jobs with row-level locking & bounded retries.
 */
export async function processEmailOutboxBatch(batchSize = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  errors: string[];
}> {
  const jobs = await lockAndFetchQueuedEmailJobs(batchSize);
  const stats = {
    processed: jobs.length,
    succeeded: 0,
    failed: 0,
    retried: 0,
    errors: [] as string[],
  };

  if (jobs.length === 0) {
    return stats;
  }

  const provider = getActiveEmailProvider();

  for (const job of jobs) {
    try {
      // Re-verify recipient suppression before sending
      if (await isEmailSuppressed(job.recipient)) {
        await updateEmailJobStatus(job.id, {
          status: "failed",
          last_error: "Recipient is suppressed (hard bounce or unsubscribe)",
        });
        stats.failed++;
        continue;
      }

      const result: EmailSendResult = await provider.sendEmail(job);

      if (result.success) {
        await updateEmailJobStatus(job.id, {
          status: "sent",
          provider: result.provider,
          provider_message_id: result.messageId || null,
          sent_at: Date.now(),
          last_error: null,
        });
        stats.succeeded++;
      } else {
        // Handle delivery failure & calculate backoff
        const nextRetryCount = (job.retry_count || 0) + 1;
        const maxRetries = job.max_retries || 5;

        if (nextRetryCount >= maxRetries) {
          // Dead-letter state
          await updateEmailJobStatus(job.id, {
            status: "failed",
            provider: result.provider,
            retry_count: nextRetryCount,
            last_error: result.error || "Max retries reached",
          });
          stats.failed++;
          stats.errors.push(`Job ${job.id} dead-lettered: ${result.error}`);
        } else {
          // Calculate exponential backoff
          const delayMs =
            RETRY_BACKOFF_MS[nextRetryCount - 1] ||
            RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
          const nextRetryAt = Date.now() + delayMs;

          await updateEmailJobStatus(job.id, {
            status: "failed", // Marked failed temporarily until nextRetryAt
            provider: result.provider,
            retry_count: nextRetryCount,
            next_retry_at: nextRetryAt,
            last_error: result.error || "Delivery transient failure",
          });
          stats.retried++;
          stats.errors.push(`Job ${job.id} queued for retry #${nextRetryCount}`);
        }
      }
    } catch (jobErr) {
      const errMsg = jobErr instanceof Error ? jobErr.message : "Worker exception";
      console.error(`[EmailService] Unhandled error processing job ${job.id}:`, jobErr);
      await updateEmailJobStatus(job.id, {
        status: "failed",
        last_error: errMsg,
      });
      stats.failed++;
      stats.errors.push(`Job ${job.id} exception: ${errMsg}`);
    }
  }

  return stats;
}

/**
 * Creates a cryptographically secure, single-use, expiring token.
 * Stores the SHA-256 hash in the database and returns the raw token string.
 */
export async function createSecureEmailToken(options: {
  userId?: string | null;
  email: string;
  tokenType: "password_reset" | "email_change" | "security_token";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  expiresInMs?: number;
}): Promise<{ rawToken: string; expiresAt: number }> {
  // 32-byte high-entropy cryptographic token (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresInMs = options.expiresInMs || 24 * 60 * 60 * 1000; // default 24h

  await createEmailToken({
    tokenHash,
    userId: options.userId || null,
    email: options.email,
    tokenType: options.tokenType,
    metadata: options.metadata || {},
    expiresInMs,
  });

  return {
    rawToken,
    expiresAt: Date.now() + expiresInMs,
  };
}

/**
 * Validates and atomically consumes a single-use token by verifying its SHA-256 hash.
 */
export async function verifyAndConsumeToken(
  rawToken: string,
  expectedType: "password_reset" | "email_change" | "security_token"
): Promise<DbEmailToken | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length === 0) {
    return null;
  }
  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  return consumeEmailToken(tokenHash, expectedType);
}
