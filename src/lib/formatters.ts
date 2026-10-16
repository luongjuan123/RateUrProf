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
