import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/server/email/emailTemplates";
import {
  generateSupportResponse,
  shouldIgnoreInboundEmail,
  isHumanEscalationRequested,
  detectLocale,
} from "@/lib/server/email/inboundAgent";
import {
  createInboundTicket,
  generateCaseId,
  getInboundTicketById,
  appendInboundTicketMessage,
  InboundMailbox,
  InboundTicketStatus,
} from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Extracts a friendly display name from an RFC 5322 address string like:
 * "Nguyen Van A <nguyen@example.com>" -> "Nguyen Van A"
 */
export function extractDisplayName(rawSender: string): string {
  if (!rawSender) return "";
  const match = rawSender.match(/^([^<]+)<[^>]+>$/);
  if (match) {
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

/**
 * Extracts the raw email address from an address string.
 */
export function extractEmailOnly(rawSender: string): string {
  if (!rawSender) return "";
  const match = rawSender.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim();
  }
  return rawSender.trim();
}

/**
 * Parses the destination mailbox from the incoming recipient headers or payload.
 * Routes to "security", "admin", or "support" (default).
 */
export function parseDestinationMailbox(
  toField: unknown,
  headers: Record<string, string | undefined> = {}
): InboundMailbox {
  const targets: string[] = [];
  if (Array.isArray(toField)) {
    targets.push(...toField.map((t) => String(t).toLowerCase()));
  } else if (typeof toField === "string") {
    targets.push(toField.toLowerCase());
  }
  if (headers["to"]) {
    targets.push(headers["to"].toLowerCase());
  }
  if (headers["delivered-to"]) {
    targets.push(headers["delivered-to"].toLowerCase());
  }

  const combined = targets.join(" ");
  if (combined.includes("security@")) {
    return "security";
  }
  if (combined.includes("admin@")) {
    return "admin";
  }
  return "support";
}

/**
 * POST /api/webhooks/resend-inbound
 *
 * Webhook endpoint triggered by Resend's "email.received" event.
 * Dispatches emails to dedicated mailboxes (admin, support, security),
 * assigns human-readable Case IDs, runs AI auto-replies for security & support,
 * and logs tickets for human escalation.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[InboundWebhook] RESEND_API_KEY is not configured.");
    return NextResponse.json(
      { success: false, error: "RESEND_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const event = await req.json();

    // 1. Only process email.received events
    if (event?.type !== "email.received") {
      return NextResponse.json(
        { success: true, message: `Ignored event type: ${event?.type || "unknown"}` },
        { status: 200 }
      );
    }

    const emailId = event?.data?.email_id || event?.data?.id;
    if (!emailId) {
      return NextResponse.json(
        { success: false, error: "Missing required event data: email_id" },
        { status: 400 }
      );
    }

    // 2. Fetch email from Resend Receiving API with graceful fallback for Restricted / Send-Only API Keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let incomingEmail: any = null;
    try {
      const { data, error: fetchError } = await resend.emails.receiving.get(emailId);
      if (fetchError) {
        console.warn(
          "[InboundWebhook] Warning: resend.emails.receiving.get returned error (using payload fallback):",
          fetchError.message || fetchError
        );
      } else {
        incomingEmail = data;
      }
    } catch (fetchErr) {
      console.warn(
        "[InboundWebhook] Exception retrieving full email content (using payload fallback):",
        fetchErr instanceof Error ? fetchErr.message : fetchErr
      );
    }

    const rawSender = incomingEmail?.from || event.data?.from || "";
    const senderEmail = extractEmailOnly(rawSender);
    const senderName = extractDisplayName(rawSender);
    const subject = incomingEmail?.subject || event.data?.subject || "Yêu cầu liên hệ";
    const bodyText =
      incomingEmail?.text ||
      event.data?.text ||
      (incomingEmail?.html ? incomingEmail.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "") ||
      (event.data?.html ? event.data.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") : "") ||
      "";
    const headers =
      (incomingEmail?.headers as Record<string, string | undefined>) ||
      (event.data?.headers as Record<string, string | undefined>) ||
      {};
    const messageId =
      incomingEmail?.message_id ||
      event.data?.message_id ||
      headers["message-id"] ||
      null;
    const toField = incomingEmail?.to || event.data?.to || event.data?.received_for;

    // 3. Prevent auto-responder loops (RFC 3834 checks, bot addresses, bounces)
    const ignoreCheck = shouldIgnoreInboundEmail(senderEmail, headers);
    if (ignoreCheck.shouldIgnore) {
      console.log("[InboundWebhook] Skipping auto-reply:", ignoreCheck.reason);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: ignoreCheck.reason,
      });
    }

    // 4. Check if this incoming email is replying to an existing ticket conversation
    const entityRef = headers["x-entity-ref-id"] || headers["X-Entity-Ref-ID"];
    let detectedCaseId: string | null = null;
    if (entityRef) {
      const match = entityRef.match(/ticket-([A-Za-z0-9-]+)/i);
      if (match) detectedCaseId = match[1].toUpperCase();
    }
    if (!detectedCaseId && subject) {
      const match = subject.match(/\b(RUP-(?:ADM|SUP|SEC)-[0-9A-F]{4})\b/i);
      if (match) detectedCaseId = match[1].toUpperCase();
    }

    if (detectedCaseId) {
      const existingTicket = await getInboundTicketById(detectedCaseId);
      if (existingTicket) {
        // Append user follow-up message to the existing ticket conversation
        const updated = await appendInboundTicketMessage(existingTicket.id, {
          sender_type: "user",
          sender_email: senderEmail,
          sender_name: senderName || undefined,
          content: bodyText || "(Thư trả lời không có nội dung văn bản thuần)",
          status: "needs_human", // alerts staff to newly received user message!
        });

        return NextResponse.json({
          success: true,
          emailId,
          caseId: existingTicket.case_id,
          mailbox: existingTicket.mailbox,
          status: updated?.status || "needs_human",
          appended: true,
          recipient: senderEmail,
        });
      }
    }

    // 5. Resolve mailbox & generate human-readable Case ID for new inquiries
    const mailbox = parseDestinationMailbox(toField, headers);
    const caseId = generateCaseId(mailbox);

    // Common outbound headers for RFC 5322 threading
    const outboundHeaders: Record<string, string> = {
      "X-Entity-Ref-ID": `ticket-${caseId}`,
      "Auto-Submitted": "auto-replied",
      Precedence: "bulk",
    };
    if (messageId) {
      outboundHeaders["In-Reply-To"] = messageId;
      outboundHeaders["References"] = messageId;
    }

    // 5. Branch based on destination mailbox
    // -------------------------------------------------------------
    // MAILBOX: ADMIN (admin@rateurprofs.site)
    // Direct to admin panel, no automated outbound email sent.
    // -------------------------------------------------------------
    if (mailbox === "admin") {
      const ticket = await createInboundTicket({
        id: emailId,
        case_id: caseId,
        resend_email_id: emailId,
        message_id: messageId,
        mailbox: "admin",
        sender_email: senderEmail,
        sender_name: senderName || null,
        subject,
        body_text: bodyText,
        status: "needs_human",
        agent_reply: null,
      });

      return NextResponse.json({
        success: true,
        emailId,
        caseId: ticket.case_id,
        mailbox: "admin",
        status: ticket.status,
        recipient: senderEmail,
      });
    }

    // -------------------------------------------------------------
    // MAILBOX: SECURITY (security@rateurprofs.site)
    // Sends AI security triage acknowledgment first, status = needs_human
    // -------------------------------------------------------------
    if (mailbox === "security") {
      const locale = detectLocale(bodyText, subject);
      const securityReplyHtml =
        locale === "vi"
          ? `
            <p style="margin: 0 0 12px;">Kính gửi người báo cáo,</p>
            <p style="margin: 0 0 12px;">Đội ngũ An ninh & Bảo mật <strong>RateUrProfs</strong> đã tiếp nhận báo cáo của bạn với mã hồ sơ sự cố: <strong>[${caseId}]</strong>.</p>
            <p style="margin: 0 0 12px;">Báo cáo đã được định tuyến trực tiếp tới các kỹ sư an ninh để thẩm định và tiến hành đối soát độc lập.</p>
            <div style="margin: 0 0 14px; padding: 12px; background-color: #fef2f2; border: 1.5px solid #111111;">
              <strong>HƯỚNG DẪN BỔ SUNG THÔNG TIN (NẾU CÓ):</strong>
              <ul style="margin: 8px 0 0 18px; padding: 0; line-height: 1.5;">
                <li>Các bước tái hiện chi tiết (Reproduction Steps) hoặc PoC (Proof of Concept).</li>
                <li>Ảnh chụp màn hình hoặc trích xuất HTTP Request / Response liên quan.</li>
                <li>Tài khoản hoặc URL bị ảnh hưởng trực tiếp trên website.</li>
              </ul>
            </div>
            <p style="margin: 0;">Chúng tôi tuân thủ chính sách Tiếp nhận Lỗ hổng Bảo mật có Trách nhiệm (Coordinated Vulnerability Disclosure) và kỹ sư an ninh sẽ phản hồi trực tiếp tới bạn qua email này trong vòng 24 giờ làm việc.</p>
          `.trim()
          : `
            <p style="margin: 0 0 12px;">Dear Security Reporter,</p>
            <p style="margin: 0 0 12px;">The <strong>RateUrProfs Security Operations Team</strong> has received your incident report under Case ID: <strong>[${caseId}]</strong>.</p>
            <p style="margin: 0 0 12px;">Your report has been escalated directly to our security engineers for verification and triage.</p>
            <div style="margin: 0 0 14px; padding: 12px; background-color: #fef2f2; border: 1.5px solid #111111;">
              <strong>RECOMMENDED SUBMISSION DETAILS:</strong>
              <ul style="margin: 8px 0 0 18px; padding: 0; line-height: 1.5;">
                <li>Clear step-by-step reproduction instructions or Proof-of-Concept (PoC).</li>
                <li>Relevant HTTP request/response logs or screenshots.</li>
                <li>Affected URLs or user identifiers on the platform.</li>
              </ul>
            </div>
            <p style="margin: 0;">We strictly adhere to Coordinated Vulnerability Disclosure and our security team will reply directly to this thread within 24 business hours.</p>
          `.trim();

      const rendered = renderEmailTemplate(
        "inbound_auto_reply",
        {
          originalSubject: subject,
          replyHtml: securityReplyHtml,
          ticketId: caseId,
          senderName: senderName || undefined,
        },
        locale
      );

      const securitySender = "RateUrProfs Security <security@rateurprofs.site>";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sendData: any = null;
      try {
        const sendRes = await resend.emails.send({
          from: securitySender,
          to: [senderEmail],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: outboundHeaders,
        });
        sendData = sendRes.data;
        if (sendRes.error) {
          console.error("[InboundWebhook] Security reply email error:", sendRes.error);
        }
      } catch (sendErr) {
        console.error("[InboundWebhook] Security reply email dispatch threw:", sendErr);
      }

      const ticket = await createInboundTicket({
        id: emailId,
        case_id: caseId,
        resend_email_id: emailId,
        message_id: messageId,
        mailbox: "security",
        sender_email: senderEmail,
        sender_name: senderName || null,
        subject,
        body_text: bodyText,
        status: "needs_human",
        agent_reply: rendered.html,
      });

      return NextResponse.json({
        success: true,
        emailId,
        caseId: ticket.case_id,
        mailbox: "security",
        status: ticket.status,
        replyMessageId: sendData?.id,
        recipient: senderEmail,
      });
    }

    // -------------------------------------------------------------
    // MAILBOX: SUPPORT (support@rateurprofs.site)
    // Runs AI support response, checks human escalation keywords.
    // -------------------------------------------------------------
    const needsHuman = isHumanEscalationRequested(subject, bodyText);

    const agentResult = await generateSupportResponse({
      senderEmail,
      senderName,
      subject,
      bodyText,
      headers,
    });

    let replyHtml = agentResult.replyHtml;
    const ticketStatus: InboundTicketStatus = needsHuman ? "needs_human" : "auto_replied";

    if (needsHuman && replyHtml) {
      const escalationNotice =
        agentResult.locale === "vi"
          ? `<div style="margin: 14px 0 0; padding: 10px; background-color: #fee2e2; border: 1.5px solid #111111; font-weight: bold; color: #991b1b;">Hệ thống đã ghi nhận yêu cầu trao đổi với người thật / nhân viên hỗ trợ. Đội ngũ kiểm duyệt viên RateUrProfs đã được thông báo và sẽ phản hồi bổ sung tới bạn qua email này.</div>`
          : `<div style="margin: 14px 0 0; padding: 10px; background-color: #fee2e2; border: 1.5px solid #111111; font-weight: bold; color: #991b1b;">Your request to speak with a human support agent has been noted. A member of our support team has been notified and will follow up in this thread.</div>`;
      replyHtml = `${replyHtml}\n${escalationNotice}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sendData: any = null;
    let finalSavedReplyHtml: string | null = null;

    if (!agentResult.shouldSkipReply && replyHtml) {
      const rendered = renderEmailTemplate(
        "inbound_auto_reply",
        {
          originalSubject: subject,
          replyHtml,
          ticketId: caseId,
          senderName: senderName || undefined,
        },
        agentResult.locale
      );

      finalSavedReplyHtml = rendered.html;
      const supportSender = "RateUrProfs Support <support@rateurprofs.site>";

      try {
        const sendRes = await resend.emails.send({
          from: supportSender,
          to: [senderEmail],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: outboundHeaders,
        });
        sendData = sendRes.data;
        if (sendRes.error) {
          console.error("[InboundWebhook] Support reply email error:", sendRes.error);
        }
      } catch (sendErr) {
        console.error("[InboundWebhook] Support reply email dispatch threw:", sendErr);
      }
    }

    const ticket = await createInboundTicket({
      id: emailId,
      case_id: caseId,
      resend_email_id: emailId,
      message_id: messageId,
      mailbox: "support",
      sender_email: senderEmail,
      sender_name: senderName || null,
      subject,
      body_text: bodyText,
      status: ticketStatus,
      agent_reply: finalSavedReplyHtml || replyHtml || null,
    });

    return NextResponse.json({
      success: true,
      emailId,
      caseId: ticket.case_id,
      mailbox: "support",
      status: ticket.status,
      replyMessageId: sendData?.id,
      recipient: senderEmail,
    });
  } catch (error) {
    console.error("[InboundWebhook] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
