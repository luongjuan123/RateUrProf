/**
 * Entity Normalization & Classification Service
 *
 * Provides diacritic-preserving and diacritic-insensitive normalization,
 * strict academic rank (GS / PGS) vs degree (TS / ThS / CN) classification,
 * contact normalization, and deterministic SVG avatar generation.
 */

export interface NormalizedAcademicProfile {
  fullName: string;
  normalizedName: string; // Lowercase, diacritic-free for matching
  academicRank: "GS" | "PGS" | null;
  degree: "TS" | "TSKH" | "ThS" | "CN" | "Kỹ sư" | null;
  displayTitle: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  avatarUrl: string;
}

/**
 * Strips Vietnamese diacritics for normalization and fuzzy matching
 */
export function removeDiacritics(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Cleans titles, salutations, and whitespace from person's name
 */
export function cleanPersonName(raw: string): string {
  if (!raw) return "";

  let cleaned = raw.trim();

  // 1. Strip common form/table field label prefixes FIRST (e.g. "Họ và tên: Nguyễn Văn A")
  cleaned = cleaned.replace(/^(?:họ\s*(?:và\s*)?tên(?:\s*gv)?|cbgd|giảng\s*viên(?:\s*cơ\s*hữu)?|cán\s*bộ)\s*[:\-\.]\s*/i, "").trim();

  // 2. Strip common Vietnamese & English title prefixes
  const titlePatterns = [
    /^(GS\.|GS|Giáo sư|Prof\.|Prof)\s+/i,
    /^(PGS\.|PGS|Phó Giáo sư|Assoc\.\s*Prof\.|Assoc\s*Prof)\s+/i,
    /^(TSKH\.|TSKH|Tiến sĩ khoa học)\s+/i,
    /^(TS\.|TS|Tiến sĩ|Dr\.|Dr|Ph\.D\.|PhD)\s+/i,
    /^(ThS\.|ThS|Thạc sĩ|MSc\.|MSc|Master)\s+/i,
    /^(KS\.|KS|Kỹ sư|Eng\.)\s+/i,
    /^(CN\.|CN|Cử nhân|BA\.|BSc\.)\s+/i,
    /^(Thầy|Cô|Ông|Bà|Mr\.|Ms\.|Mrs\.)\s+/i,
  ];

  let matched = true;
  while (matched) {
    matched = false;
    for (const pat of titlePatterns) {
      if (pat.test(cleaned)) {
        cleaned = cleaned.replace(pat, "").trim();
        matched = true;
      }
    }
  }

  // 3. Remove trailing role or affiliation notes after hyphen/dash (e.g. "Nguyễn Văn A - Trưởng khoa")
  if (cleaned.includes(" - ")) {
    cleaned = cleaned.split(" - ")[0].trim();
  }

  // 4. Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ");

  return cleaned;
}

/**
 * Strict classification separating Instructional Rank from Academic Degree
 */
export function classifyAcademicRankAndDegree(
  rawText: string,
  rawTitle?: string
): {
  academicRank: "GS" | "PGS" | null;
  degree: "TS" | "TSKH" | "ThS" | "CN" | "Kỹ sư" | null;
  displayTitle: string;
} {
  const combined = `${rawText} ${rawTitle || ""}`;

  let academicRank: "GS" | "PGS" | null = null;
  let degree: "TS" | "TSKH" | "ThS" | "CN" | "Kỹ sư" | null = null;

  // Instructional Rank (GS / PGS)
  if (/\b(PGS\b|PGS\.|Phó Giáo sư|Phó giáo sư|Assoc\.\s*Prof|Associate\s*Professor)\b/i.test(combined)) {
    academicRank = "PGS";
  } else if (/\b(GS\b|GS\.|Giáo sư|Professor|Prof\.)\b/i.test(combined)) {
    academicRank = "GS";
  }

  // Academic Degree (TSKH / TS / ThS / CN / Kỹ sư)
  if (/\b(TSKH\b|TSKH\.|Tiến sĩ khoa học)\b/i.test(combined)) {
    degree = "TSKH";
  } else if (/\b(TS\b|TS\.|Tiến sĩ|Ph\.?D\.?|Doctor of Philosophy|Dr\.)\b/i.test(combined)) {
    degree = "TS";
  } else if (/\b(ThS\b|ThS\.|Thạc sĩ|Master|M\.?Sc\.?|M\.?A\.?)\b/i.test(combined)) {
    degree = "ThS";
  } else if (/\b(KS\b|KS\.|Kỹ sư|Engineer)\b/i.test(combined)) {
    degree = "Kỹ sư";
  } else if (/\b(CN\b|CN\.|Cử nhân|Bachelor|B\.?Sc\.?|B\.?A\.?)\b/i.test(combined)) {
    degree = "CN";
  }

  // Build clean display title
  const parts: string[] = [];
  if (academicRank) parts.push(academicRank);
  if (degree) parts.push(degree);

  const displayTitle = parts.length > 0 ? parts.join(".") : "Giảng viên";

  return { academicRank, degree, displayTitle };
}

/**
 * Generates an SVG initials avatar data URI with institution-inspired deterministic palette
 */
export function generateInitialsAvatar(name: string, institutionSeed = ""): string {
  const cleaned = cleanPersonName(name);
  const tokens = cleaned.split(" ").filter(Boolean);

  let initials = "GV";
  if (tokens.length >= 2) {
    const first = tokens[0][0] || "";
    const last = tokens[tokens.length - 1][0] || "";
    initials = `${first}${last}`.toUpperCase();
  } else if (tokens.length === 1 && tokens[0].length >= 1) {
    initials = tokens[0].substring(0, 2).toUpperCase();
  }

  // Palette of refined, accessible academic colors
  const palettes = [
    { bg: "#1e3a8a", text: "#ffffff" }, // Navy
    { bg: "#065f46", text: "#ffffff" }, // Emerald
    { bg: "#831843", text: "#ffffff" }, // Rose
    { bg: "#581c87", text: "#ffffff" }, // Purple
    { bg: "#0f766e", text: "#ffffff" }, // Teal
    { bg: "#c2410c", text: "#ffffff" }, // Orange
    { bg: "#1d4ed8", text: "#ffffff" }, // Blue
    { bg: "#4338ca", text: "#ffffff" }, // Indigo
    { bg: "#701a75", text: "#ffffff" }, // Fuchsia
    { bg: "#047857", text: "#ffffff" }, // Dark Green
  ];

  // Hash seed
  const str = `${name}-${institutionSeed}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % palettes.length;
  const { bg, text } = palettes[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${bg}" />
  <text x="100" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="${text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Validates and normalizes institutional email addresses
 */
export function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  // Basic RFC 5322 regex
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  if (!emailRegex.test(trimmed)) return null;
  return trimmed;
}

/**
 * Normalizes phone numbers
 */
export function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").trim();
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

/**
 * Normalizes department names
 */
export function normalizeDepartment(dept?: string): string | null {
  if (!dept) return null;
  let cleaned = dept.trim().replace(/\s+/g, " ");
  // Capitalize properly if needed
  if (cleaned.length < 3) return null;
  return cleaned;
}
