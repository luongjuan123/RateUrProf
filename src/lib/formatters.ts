export function formatRating(val: number | null | undefined, locale: "vi" | "en" = "vi"): string {
  if (val === null || val === undefined || isNaN(val)) {
    return locale === "en" ? "Not rated yet" : "Chưa có đánh giá";
  }
  return val.toFixed(1);
}

export function formatOptionalText(val: string | null | undefined, locale: "vi" | "en" = "vi"): string {
  if (!val || val.trim() === "" || val === "null" || val === "undefined") {
    return locale === "en" ? "Information unavailable" : "Chưa có thông tin";
  }
  return val;
}

export function formatNumber(val: number, locale: "vi" | "en" = "vi"): string {
  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";
  return new Intl.NumberFormat(intlLocale).format(val);
}

export function formatDate(timestamp: number | Date | null | undefined, locale: "vi" | "en" = "vi"): string {
  if (!timestamp) return "";
  const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp;
  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";

  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: locale === "vi" ? "numeric" : "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeTime(timestamp: number, locale: "vi" | "en" = "vi"): string {
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return locale === "vi" ? "Hôm nay" : "Today";
  }
  if (diffDays === 1) {
    return locale === "vi" ? "Hôm qua" : "Yesterday";
  }
  if (diffDays < 7) {
    return locale === "vi" ? `${diffDays} ngày trước` : `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return locale === "vi" ? `${weeks} tuần trước` : `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  return formatDate(timestamp, locale);
}

/**
 * Formats reviewer name to show only the student's pseudonym / cohort (e.g., "ALAH", "K64 - CNTT")
 * Removes verbose boilerplate prefixes: "Sinh viên ẩn danh (ALAH)" -> "ALAH".
 * Never returns "Ẩn danh" or "Anonymous".
 */
export function formatReviewerName(name: string | null | undefined, locale: "vi" | "en" = "vi"): string {
  if (!name || name.trim() === "" || name === "null" || name === "undefined") {
    return locale === "en" ? "Student" : "Sinh viên";
  }

  const trimmed = name.trim();

  // If format is "Sinh viên ẩn danh (ALAH)" or "Anonymous Student (ALAH)" or "(ALAH)"
  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].trim()) {
    const extracted = parenMatch[1].trim();
    if (!isAnonymousName(extracted)) {
      return extracted;
    }
  }

  // Strip prefixes like "Sinh viên ẩn danh", "Anonymous Student", "Sinh viên"
  const stripped = trimmed
    .replace(/^sinh viên ẩn danh\s*[-–:]*\s*/i, "")
    .replace(/^sinh viên\s*[-–:]*\s*/i, "")
    .replace(/^anonymous student\s*[-–:]*\s*/i, "")
    .replace(/^anonymous\s*[-–:]*\s*/i, "")
    .trim();

  if (!stripped || isAnonymousName(stripped)) {
    return locale === "en" ? "Student" : "Sinh viên";
  }

  return stripped;
}

/**
 * Checks whether a given string is an anonymous name or alias.
 * (e.g., "Ẩn danh", "an danh", "Anonymous", "Sinh viên ẩn danh", "Anonymous Student").
 */
export function isAnonymousName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

  if (!normalized) return false;

  const cleaned = normalized.replace(/[_.\-#+]/g, " ");

  const forbiddenPatterns = [
    /\ban\s*danh\b/i,
    /\bnac\s*danh\b/i,
    /\bgiau\s*ten\b/i,
    /\bkhong\s*ten\b/i,
    /\bnguoi\s*giau\s*mat\b/i,
    /\banonymous\b/i,
    /\banon\b/i,
    /\banonym\b/i,
    /\bunnamed\b/i,
    /\bunknown\b/i,
    /\bhidden\b/i,
    /\bnobody\b/i,
    /\bno\s*name\b/i,
    /^khach$/i,
    /^guest$/i,
  ];

  return forbiddenPatterns.some((pattern) => pattern.test(normalized) || pattern.test(cleaned));
}

/**
 * Resolves a valid non-anonymous display name for a reviewer.
 * Guarantees that neither "Ẩn danh", "Anonymous", nor "Sinh viên ẩn danh" is ever returned.
 */
export function resolveReviewerDisplayName(
  customName: string | null | undefined,
  user: { displayName?: string | null; email?: string | null } | null | undefined,
  profile?: { displayName?: string | null } | null | undefined
): string {
  const trimmed = customName?.trim();
  if (trimmed && !isAnonymousName(trimmed)) {
    return trimmed;
  }

  const profileName = profile?.displayName?.trim();
  if (profileName && !isAnonymousName(profileName)) {
    return profileName;
  }

  const userDisplayName = user?.displayName?.trim();
  if (userDisplayName && !isAnonymousName(userDisplayName)) {
    return userDisplayName;
  }

  if (user?.email) {
    const emailPrefix = user.email.split("@")[0].trim();
    if (emailPrefix && !isAnonymousName(emailPrefix)) {
      return emailPrefix;
    }
  }

  return "Sinh viên";
}
