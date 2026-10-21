/**
 * RateUrProfs Pluggable Email Delivery Provider
 *
 * Implements:
 * 1. Resend REST API Provider (HTTPS over Port 443 - Google Cloud Run friendly)
 * 2. SendGrid v3 REST API Provider (HTTPS over Port 443)
 * 3. Mock Sandbox Provider (intercepts emails, prevents accidental sends in dev/tests)
 * 4. Live DNS verification using Node.js dns/promises for SPF, DKIM, and DMARC
 */

import dns from "node:dns/promises";
import {
  EmailSendResult,
  ProviderConfigStatus,
  DnsVerificationReport,
  DnsCheckItem,
} from "./emailTypes";
import { DbEmailJob } from "../db";
import { renderEmailTemplate } from "./emailTemplates";

export interface EmailDeliveryProvider {
  name: "resend" | "sendgrid" | "sandbox";
  sendEmail(job: DbEmailJob): Promise<EmailSendResult>;
  verifyConfiguration(): Promise<ProviderConfigStatus>;
}

/**
 * Resend REST Delivery Provider
 */
export class ResendProvider implements EmailDeliveryProvider {
  name = "resend" as const;
  private apiKey: string;
  private fromOverride?: string;

  constructor(apiKey: string, fromOverride?: string) {
    this.apiKey = apiKey;
    this.fromOverride = fromOverride?.trim() || undefined;
  }

  async sendEmail(job: DbEmailJob): Promise<EmailSendResult> {
    try {
      const rendered = renderEmailTemplate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        job.template_id as any,
        job.template_vars,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (job.locale as any) || "vi"
      );

      const sender = this.fromOverride || job.sender;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey.trim()}`,
          "Content-Type": "application/json",
          "User-Agent": "RateUrProfs-Mailer/1.0",
        },
        body: JSON.stringify({
          from: sender,
          to: [job.recipient],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: {
            "X-Entity-Ref-ID": job.id,
          },
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("[ResendProvider] API error:", res.status, errorBody);
        return {
          success: false,
          error: `Resend HTTP ${res.status}: ${errorBody}`,
          provider: "resend",
        };
      }

      const data = await res.json();
      return {
        success: true,
        messageId: data.id,
        provider: "resend",
      };
    } catch (err) {
      console.error("[ResendProvider] Exception:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error in Resend delivery",
        provider: "resend",
      };
    }
  }

  async verifyConfiguration(): Promise<ProviderConfigStatus> {
    const isTestingSender = Boolean(this.fromOverride && this.fromOverride.includes("resend.dev"));
    return {
      provider: "resend",
      isSandbox: false,
      configured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
      senderDomain: isTestingSender ? "resend.dev (Testing Sandbox)" : "rateurprofs.site",
      senderIdentities: {
        noReply: this.fromOverride || "no-reply@rateurprofs.site",
        support: this.fromOverride || "support@rateurprofs.site",
        security: this.fromOverride || "security@rateurprofs.site",
        admin: this.fromOverride || "admin@rateurprofs.site",
      },
    };
  }
}

/**
 * SendGrid v3 REST Delivery Provider
 */
export class SendGridProvider implements EmailDeliveryProvider {
  name = "sendgrid" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(job: DbEmailJob): Promise<EmailSendResult> {
    try {
      const rendered = renderEmailTemplate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        job.template_id as any,
        job.template_vars,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (job.locale as any) || "vi"
      );

      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey.trim()}`,
          "Content-Type": "application/json",
          "User-Agent": "RateUrProfs-Mailer/1.0",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: job.recipient }],
              subject: rendered.subject,
            },
          ],
          from: { email: job.sender.includes("<") ? job.sender.replace(/.*<([^>]+)>.*/, "$1") : job.sender, name: "RateUrProfs" },
          content: [
            { type: "text/plain", value: rendered.text },
            { type: "text/html", value: rendered.html },
          ],
          custom_args: {
            job_id: job.id,
          },
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        return {
          success: false,
          error: `SendGrid HTTP ${res.status}: ${errorBody}`,
          provider: "sendgrid",
        };
      }

      const messageId = res.headers.get("x-message-id") || `sg_${Date.now()}`;
      return {
        success: true,
        messageId,
        provider: "sendgrid",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SendGrid send error",
        provider: "sendgrid",
      };
    }
  }

  async verifyConfiguration(): Promise<ProviderConfigStatus> {
    return {
      provider: "sendgrid",
      isSandbox: false,
      configured: Boolean(this.apiKey && this.apiKey.trim().length > 0),
      senderDomain: "rateurprofs.site",
      senderIdentities: {
        noReply: "no-reply@rateurprofs.site",
        support: "support@rateurprofs.site",
        security: "security@rateurprofs.site",
        admin: "admin@rateurprofs.site",
      },
    };
  }
}

/**
 * Mock Sandbox Delivery Provider
 * Intercepts emails in memory and marks them sent to avoid accidental production emails during development.
 */
export class SandboxProvider implements EmailDeliveryProvider {
  name = "sandbox" as const;
  public static capturedEmails: Array<{
    job: DbEmailJob;
    rendered: ReturnType<typeof renderEmailTemplate>;
    timestamp: number;
  }> = [];

  async sendEmail(job: DbEmailJob): Promise<EmailSendResult> {
    const rendered = renderEmailTemplate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      job.template_id as any,
      job.template_vars,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (job.locale as any) || "vi"
    );

    const captured = {
      job,
      rendered,
      timestamp: Date.now(),
    };

    SandboxProvider.capturedEmails.unshift(captured);
    if (SandboxProvider.capturedEmails.length > 100) {
      SandboxProvider.capturedEmails.pop();
    }

    console.log(
      `[SandboxProvider] Intercepted email to "${job.recipient}" with subject "${rendered.subject}" (Job ID: ${job.id})`
    );

    return {
      success: true,
      messageId: `sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: "sandbox",
    };
  }

  async verifyConfiguration(): Promise<ProviderConfigStatus> {
    return {
      provider: "sandbox",
      isSandbox: true,
      configured: true,
      senderDomain: "rateurprofs.site",
      senderIdentities: {
        noReply: "no-reply@rateurprofs.site",
        support: "support@rateurprofs.site",
        security: "security@rateurprofs.site",
        admin: "admin@rateurprofs.site",
      },
    };
  }
}

/**
 * Factory to retrieve the active email delivery provider based on environment configuration.
 */
export function getActiveEmailProvider(): EmailDeliveryProvider {
  const isExplicitSandbox =
    process.env.EMAIL_SANDBOX_MODE === "true" ||
    process.env.EMAIL_PROVIDER === "sandbox" ||
    process.env.EMAIL_PROVIDER === "test";

  if (isExplicitSandbox) {
    return new SandboxProvider();
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const providerPref = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

  if (providerPref === "sendgrid" && sendgridKey) {
    return new SendGridProvider(sendgridKey);
  }

  if (resendKey) {
    return new ResendProvider(resendKey, resendFrom);
  }

  if (sendgridKey) {
    return new SendGridProvider(sendgridKey);
  }

  // Safe fallback to Sandbox provider if no real provider API keys configured
  return new SandboxProvider();
}

/**
 * Live DNS verification query using Node.js dns/promises for rateurprofs.site.
 */
export async function auditDomainDns(domain = "rateurprofs.site"): Promise<DnsVerificationReport> {
  const report: DnsVerificationReport = {
    domain,
    spf: {
      recordType: "TXT",
      name: domain,
      expectedValue: "v=spf1 include:spf.efwd.registrar-servers.com include:_spf.resend.com ~all",
      status: "missing",
    },
    dkim: {
      recordType: "TXT",
      name: `resend._domainkey.${domain}`,
      expectedValue: "p=<dkim_public_key_from_provider>",
      status: "missing",
    },
    dmarc: {
      recordType: "TXT",
      name: `_dmarc.${domain}`,
      expectedValue: `v=DMARC1; p=none; rua=mailto:admin@${domain}; ruf=mailto:security@${domain}; fo=1`,
      status: "missing",
    },
    mx: {
      recordType: "MX",
      name: domain,
      expectedValue: "10 eforward1.registrar-servers.com.",
      status: "missing",
    },
    allPassing: false,
  };

  try {
    // 1. Check MX records
    const mxRecords = await dns.resolveMx(domain).catch(() => []);
    if (mxRecords && mxRecords.length > 0) {
      const hasValidMx = mxRecords.some((r) => {
        const ex = r.exchange.toLowerCase();
        return (
          ex.includes("registrar-servers.com") ||
          ex.includes("resend.com") ||
          ex.includes("google.com") ||
          ex.includes("googlemail.com")
        );
      });
      if (hasValidMx) {
        report.mx.status = "verified";
        report.mx.details = `Active MX records verified (${mxRecords.map((r) => r.exchange).join(", ")}).`;
      } else {
        report.mx.status = "misconfigured";
        report.mx.details = `Found ${mxRecords.length} records, but missing supported forwarders or delivery providers.`;
      }
    }
  } catch (err) {
    report.mx.details = String(err);
  }

  try {
    // 2. Check SPF in TXT records
    const txtRecords = await dns.resolveTxt(domain).catch(() => []);
    const flatTxt = txtRecords.map((chunk) => chunk.join(""));
    const spfRecord = flatTxt.find((txt) => txt.startsWith("v=spf1"));

    if (spfRecord) {
      if (
        spfRecord.includes("resend.com") ||
        spfRecord.includes("sendgrid.net")
      ) {
        report.spf.status = "verified";
        report.spf.details = `Active SPF: "${spfRecord}"`;
      } else {
        report.spf.status = "misconfigured";
        report.spf.details = `Existing SPF "${spfRecord}" does not include the transactional sending provider yet.`;
      }
    }
  } catch (err) {
    report.spf.details = String(err);
  }

  try {
    // 3. Check DMARC
    const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const flatDmarc = dmarcTxt.map((chunk) => chunk.join(""));
    const dmarcRecord = flatDmarc.find((txt) => txt.startsWith("v=DMARC1"));

    if (dmarcRecord) {
      report.dmarc.status = "verified";
      report.dmarc.details = `Active DMARC: "${dmarcRecord}"`;
    } else {
      report.dmarc.details = `No TXT record found at _dmarc.${domain}`;
    }
  } catch (err) {
    report.dmarc.details = String(err);
  }

  try {
    // 4. Check DKIM selector
    const dkimTxt = await dns.resolveTxt(`resend._domainkey.${domain}`).catch(() => []);
    if (dkimTxt && dkimTxt.length > 0) {
      report.dkim.status = "verified";
      report.dkim.details = "Selector resend._domainkey is published.";
    } else {
      report.dkim.details = `Pending provider domain activation for resend._domainkey.${domain}`;
    }
  } catch (err) {
    report.dkim.details = String(err);
  }

  report.allPassing =
    report.spf.status === "verified" &&
    report.dkim.status === "verified" &&
    report.dmarc.status === "verified" &&
    report.mx.status === "verified";

  return report;
}
