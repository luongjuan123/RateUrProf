/**
 * Vietnamese Text Normalization and Tokenization for RateProfCuaBan
 *
 * Provides diacritic-insensitive normalization, tokenization,
 * name variant generation, word-boundary matching, and relevance scoring.
 */

/**
 * Strips Vietnamese diacritics / tone marks and normalizes 'đ'/'Đ' to 'd'/'D'.
 * Example: "Nguyễn Văn An" -> "Nguyen Van An"
 */
export function stripVietnameseDiacritics(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
    .replace(/\s+/g, " ")
    .trim();
}

const normCache = new Map<string, string>();

/**
 * Normalizes text to lowercase, stripped of diacritics, and trimmed.
 * Suitable for indexed searching and fast equality/prefix comparisons.
 */
export function normalizeSearchString(str: string): string {
  if (!str) return "";
  const cached = normCache.get(str);
  if (cached !== undefined) return cached;
  if (normCache.size > 10000) normCache.clear();
  const normalized = stripVietnameseDiacritics(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  normCache.set(str, normalized);
  return normalized;
}

/**
 * Tokenizes a string into distinct normalized words, stripping punctuation.
 */
export function tokenizeVietnamese(str: string): string[] {
  if (!str) return [];
  const normalized = normalizeSearchString(str);
  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Generates name variants for a person's full Vietnamese name.
 */
export function generateNameVariants(fullName: string): string[] {
  if (!fullName) return [];
  const variants = new Set<string>();

  const trimmed = fullName.trim();
  variants.add(trimmed);

  const unaccented = stripVietnameseDiacritics(trimmed);
  variants.add(unaccented);

  // Strip academic titles if present at start (e.g. "PGS. TS.", "TS.", "ThS.", "GV.")
  const withoutTitle = trimmed
    .replace(/^(GS\.|PGS\.|TS\.|ThS\.|GV\.|Giáo sư|Phó Giáo sư|Tiến sĩ|Thạc sĩ|Giảng viên)\s*/gi, "")
    .replace(/^(TS|ThS|PGS|GS)\s*/gi, "")
    .trim();

  if (withoutTitle && withoutTitle !== trimmed) {
    variants.add(withoutTitle);
    variants.add(stripVietnameseDiacritics(withoutTitle));
  }

  const tokens = withoutTitle.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const familyName = tokens[0];
    const givenName = tokens[tokens.length - 1];

    variants.add(`${familyName} ${givenName}`);
    variants.add(stripVietnameseDiacritics(`${familyName} ${givenName}`));

    variants.add(givenName);
    variants.add(stripVietnameseDiacritics(givenName));

    // Reversed / western
    const western = `${givenName} ${tokens.slice(0, tokens.length - 1).join(" ")}`;
    variants.add(western);
    variants.add(stripVietnameseDiacritics(western));
  }

  return Array.from(variants);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const phraseRegexCache = new Map<string, RegExp>();
function getCachedPhraseRegex(norm: string): RegExp {
  let reg = phraseRegexCache.get(norm);
  if (!reg) {
    if (phraseRegexCache.size > 2000) phraseRegexCache.clear();
    reg = new RegExp(`(?:^|\\s)${escapeRegex(norm)}(?:\\s|$)`);
    phraseRegexCache.set(norm, reg);
  }
  return reg;
}

/**
 * Tests whether target string matches the search query respecting word boundaries.
 * Prevents "Nguyễn Văn An" from falsely matching "Nguyễn Văn Anh".
 */
export function matchesSearchQuery(target: string, query: string, allowPrefix: boolean = false): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  const qNorm = normalizeSearchString(query);
  const tNorm = normalizeSearchString(target);

  if (!qNorm || !tNorm) return false;

  // 1. Exact string match
  if (tNorm === qNorm) return true;

  // 2. Word boundary phrase match:
  // query appears as a full phrase surrounded by start/end or spaces
  const phraseRegex = getCachedPhraseRegex(qNorm);
  if (phraseRegex.test(tNorm)) return true;

  // 3. Word token matching
  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const tWords = tNorm.split(/\s+/).filter(Boolean);

  if (qWords.length === 0) return true;

  // Check if qWords appears as a contiguous sub-array of words in tWords
  for (let i = 0; i <= tWords.length - qWords.length; i++) {
    let match = true;
    for (let j = 0; j < qWords.length; j++) {
      const qW = qWords[j];
      const tW = tWords[i + j];
      const isLastWord = j === qWords.length - 1;

      if (isLastWord && allowPrefix) {
        if (!tW.startsWith(qW)) {
          match = false;
          break;
        }
      } else {
        if (tW !== qW) {
          match = false;
          break;
        }
      }
    }
    if (match) return true;
  }

  return false;
}

/**
 * Matches a specific professor name filter against target professor name and variants.
 * Strictly respects word boundaries to avoid identity collisions between similar names
 * (e.g. "Nguyễn Văn An" vs "Nguyễn Văn Anh").
 */
export function matchesProfessorName(
  fullName: string,
  variants: string[] = [],
  nameQuery: string
): boolean {
  if (!nameQuery || !nameQuery.trim()) return true;
  if (!fullName) return false;

  // Exact word boundary matching without prefix bleeding
  if (matchesSearchQuery(fullName, nameQuery, false)) return true;

  for (const v of variants) {
    if (matchesSearchQuery(v, nameQuery, false)) return true;
  }

  return false;
}

/**
 * Computes a weighted relevance score for ranking.
 */
export function computeRelevanceScore(
  query: string,
  data: {
    fullName: string;
    normalizedName?: string;
    nameVariants?: string[];
    title?: string;
    universityName?: string;
    universityShortName?: string;
    faculty?: string;
    department?: string;
    courses?: string[];
    researchInterests?: string[];
  }
): number {
  if (!query || !query.trim()) return 0;

  const qNorm = normalizeSearchString(query);
  const nameNorm = data.normalizedName || normalizeSearchString(data.fullName || "");
  let score = 0;

  // 1. Name matching
  if (nameNorm === qNorm) {
    score += 100;
  } else if (getCachedPhraseRegex(qNorm).test(nameNorm)) {
    score += 80;
  } else if (nameNorm.startsWith(qNorm)) {
    score += 60;
  } else if (nameNorm.includes(qNorm)) {
    score += 40;
  }

  // Name variants
  if (data.nameVariants) {
    for (const v of data.nameVariants) {
      const vNorm = normalizeSearchString(v);
      if (vNorm === qNorm) {
        score = Math.max(score, 75);
        break;
      } else if (vNorm.startsWith(qNorm)) {
        score = Math.max(score, 50);
      }
    }
  }

  // 2. University
  const uniNameNorm = normalizeSearchString(data.universityName || "");
  const uniShortNorm = normalizeSearchString(data.universityShortName || "");
  if (uniShortNorm === qNorm) {
    score += 50;
  } else if (uniNameNorm.includes(qNorm) || uniShortNorm.includes(qNorm)) {
    score += 30;
  }

  // 3. Courses
  if (data.courses) {
    for (const c of data.courses) {
      const cNorm = normalizeSearchString(c);
      if (cNorm === qNorm) {
        score += 40;
        break;
      } else if (cNorm.includes(qNorm)) {
        score += 25;
        break;
      }
    }
  }

  // 4. Research interests
  if (data.researchInterests) {
    for (const ri of data.researchInterests) {
      const riNorm = normalizeSearchString(ri);
      if (riNorm.includes(qNorm)) {
        score += 20;
        break;
      }
    }
  }

  return score;
}
