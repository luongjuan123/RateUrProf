import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { recordEmailEvent } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Verifies HMAC SHA-256 webhook signatures (Svix / Standard).
 */
function verifyWebhookSignature(
  payloadText: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return true; // Pass if no secret configured in dev

  try {
    const toSign = timestampHeader ? `${timestampHeader}.${payloadText}` : payloadText;
    const computedHmac = crypto
      .createHmac("sha256", secret.trim())
      .update(toSign)
      .digest("base64");

    const expected = signatureHeader.startsWith("v1,")
      ? signatureHeader.substring(3)
      : signatureHeader;

    return crypto.timingSafeEqual(
      Buffer.from(computedHmac),
      Buffer.from(expected)
    );
  } catch (err) {
    console.error("[Webhook] Signature verification error:", err);
    return false;
  }
}

/**
 * POST /api/webhooks/email
 * Receives delivery, open, click, bounce, and complaint events from Resend or SendGrid.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    // Check signature if secret is present
    const svixSig = req.headers.get("svix-signature");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const sgSig = req.headers.get("x-twilio-email-event-webhook-signature");
    const sgTimestamp = req.headers.get("x-twilio-email-event-webhook-timestamp");
    const authHeader = req.headers.get("authorization");

    if (webhookSecret && webhookSecret.trim().length > 0) {
      let isVerified = false;
      if (svixSig) {
        isVerified = verifyWebhookSignature(rawBody, svixSig, svixTimestamp, webhookSecret);
      } else if (sgSig) {
        isVerified = verifyWebhookSignature(rawBody, sgSig, sgTimestamp, webhookSecret);
      } else if (authHeader?.startsWith("Bearer ")) {
        isVerified = authHeader.substring(7) === webhookSecret;
      }

      if (!isVerified) {
        console.warn("[Webhook /api/webhooks/email] Signature verification failed");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Support both array payloads (SendGrid) and single event objects (Resend)
    const events = Array.isArray(payload) ? payload : [payload];
    let recordedCount = 0;

    for (const ev of events) {
      // 1. Resend Event Format
      if (ev.type && ev.created_at && ev.data) {
        const eventType = ev.type.replace("email.", ""); // email.delivered -> delivered
        const jobId = ev.data.headers?.["X-Entity-Ref-ID"] || null;
        const recipient = Array.isArray(ev.data.to) ? ev.data.to[0] : ev.data.to || "unknown";

        await recordEmailEvent({
          event_id: ev.data.email_id ? `${ev.data.email_id}_${eventType}` : `res_${Date.now()}_${Math.random()}`,
          job_id: jobId,
          provider: "resend",
          event_type: eventType,
          recipient,
          payload_json: ev,
          created_at: new Date(ev.created_at).getTime(),
        });
        recordedCount++;
      }
      // 2. SendGrid Event Format
      else if (ev.event && ev.email) {
        const eventType = ev.event; // delivered, bounce, dropped, open
        const jobId = ev.job_id || null;

        await recordEmailEvent({
          event_id: ev.sg_event_id || `sg_${Date.now()}_${Math.random()}`,
          job_id: jobId,
          provider: "sendgrid",
          event_type: eventType,
          recipient: ev.email,
          payload_json: ev,
          created_at: ev.timestamp ? ev.timestamp * 1000 : Date.now(),
        });
        recordedCount++;
      }
      // 3. Generic Provider Format
      else if (ev.eventType && ev.recipient) {
        await recordEmailEvent({
          event_id: ev.eventId || `gen_${Date.now()}_${Math.random()}`,
          job_id: ev.jobId || null,
          provider: ev.provider || "generic",
          event_type: ev.eventType,
          recipient: ev.recipient,
          payload_json: ev,
          created_at: Date.now(),
        });
        recordedCount++;
      }
    }

    return NextResponse.json({ received: true, processedEvents: recordedCount }, { status: 200 });
  } catch (error) {
    console.error("[API /api/webhooks/email] Error processing webhook:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
