/**
 * RateUrProfs Email System Types
 */

export type EmailTemplateId =
  | "password_reset"
  | "security_alert"
  | "review_moderated"
  | "correction_update"
  | "admin_alert"
  | "test_email"
  | "account_locked"
  | "account_unlocked"
  | "appeal_submitted"
  | "appeal_accepted"
  | "appeal_rejected"
  | "account_deletion_requested"
  | "account_deleted"
  | "account_recovered"
  | "inbound_auto_reply"
  | "inbound_human_reply";

export type EmailLocale = "vi" | "en";

export type SenderIdentity =
  | "no-reply@rateurprofs.site"
  | "support@rateurprofs.site"
  | "security@rateurprofs.site"
  | "admin@rateurprofs.site";

export interface EmailSenderConfig {
  name: string;
  address: SenderIdentity | string;
  replyTo?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface QueueEmailOptions {
  recipient: string;
  templateId: EmailTemplateId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateVars: Record<string, any>;
  locale?: EmailLocale;
  idempotencyKey?: string;
  sender?: SenderIdentity | string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface ProviderConfigStatus {
  provider: "resend" | "sendgrid" | "sandbox";
  isSandbox: boolean;
  configured: boolean;
  senderDomain: string;
  senderIdentities: {
    noReply: string;
    support: string;
    security: string;
    admin: string;
  };
}

export interface DnsCheckItem {
  recordType: "TXT" | "CNAME" | "MX";
  name: string;
  expectedValue: string;
  status: "verified" | "missing" | "unverified" | "misconfigured";
  details?: string;
}

export interface DnsVerificationReport {
  domain: string;
  spf: DnsCheckItem;
  dkim: DnsCheckItem;
  dmarc: DnsCheckItem;
  mx: DnsCheckItem;
  allPassing: boolean;
}
