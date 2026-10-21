/**
 * RateUrProfs Email Sanitizer & Abuse Prevention Utilities
 *
 * Enforces:
 * - Anti-Header-Injection: Strips all CR/LF (\r, \n) from headers & subjects.
 * - Anti-XSS HTML Escaping: Safely escapes all user-supplied content before embedding in HTML templates.
 * - Strict Recipient Validation: RFC 5322 conformant email regex validation.
 * - Privacy-Conscious Masking: Partial email masking for administrative log views.
 */

const EMAIL_REGEX =
  // eslint-disable-next-line no-control-regex
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates whether an email address matches valid syntactic format.
 */
export function isValidEmailAddress(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  // Disallow CRLF or null bytes in input
  if (/[\r\n\0]/.test(email)) return false;
  const trimmed = email.trim();
  if (trimmed.length > 254 || trimmed.length < 5) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Strips all carriage return (\r) and newline (\n) characters to prevent SMTP/HTTP header injection.
 */
export function sanitizeHeaderField(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/[\r\n\0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes characters with special meaning in HTML to prevent XSS attacks in email templates.
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return "";
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Masks an email address for privacy-conscious display in administrative views.
 * Example: 'nguyen.van.a@hust.edu.vn' -> 'ng***a@hust.edu.vn'
 */
export function maskEmailAddress(email: string | null | undefined): string {
  if (!email) return "anonymous@rateurprofs.site";
  const trimmed = email.trim();
  const parts = trimmed.split("@");
  if (parts.length !== 2) return "***";

  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}
