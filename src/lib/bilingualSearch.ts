import { Professor, University } from "@/types";
import { expandQueryTerminology } from "./terminologyRegistry";

/**
 * Remove Vietnamese tonal and diacritical marks from strings.
 * e.g. "Nguyễn Văn An" -> "nguyen van an"
 * e.g. "Đại học Bách Khoa" -> "dai hoc bach khoa"
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
}

/**
 * Normalize an arbitrary search string for fuzzy & alias matching
 */
export function normalizeSearchString(str: string): string {
  return removeVietnameseDiacritics(str)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect language of query (Vietnamese vs English).
 */
export function detectQueryLanguage(query: string): "vi" | "en" {
  const lower = query.toLowerCase();

  const hasVietnameseDiacritics = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(lower);
  if (hasVietnameseDiacritics) return "vi";

  const viStopwords = [
    "tim", "giang vien", "giao su", "pho giao su", "tien si", "truong",
    "o dau", "nao", "nganh", "mon", "hoc", "thay", "co", "danh gia",
    "tai", "ha noi", "tphcm", "da nang", "can tho", "mien bac", "mien nam", "mien trung"
  ];
  for (const sw of viStopwords) {
    if (new RegExp(`\\b${sw}\\b`, "i").test(lower)) {
      return "vi";
    }
  }

  return "en";
}

export interface SearchOptions {
  query?: string;
  universityId?: string;
  city?: string;
  minRating?: number;
  sortBy?: "rating" | "reviews" | "name";
  locale?: "vi" | "en";
}

/**
 * Check if target text matches the search query or its cross-lingual expansions.
 */
function isMatch(targets: string[], queryNormalized: string, queryExpansions: string[]): boolean {
  if (!queryNormalized) return true;

  const queryTokens = queryNormalized.split(/\s+/).filter(Boolean);

  for (const target of targets) {
    if (!target) continue;
    const targetNorm = normalizeSearchString(target);
    const targetRaw = target.toLowerCase();

    // 1. Direct match (raw or normalized)
    if (
      targetRaw.includes(queryNormalized) ||
      targetNorm.includes(queryNormalized) ||
      (targetNorm.length >= 4 && queryNormalized.includes(targetNorm))
    ) {
      return true;
    }

    // 2. Token subset match: if query has multiple words and target contains all significant tokens
    if (queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every(tok =>
        tok.length <= 2 || targetNorm.includes(tok) || targetRaw.includes(tok)
      );
      if (allTokensMatch) return true;
    }

    // 3. Terminology expansions match
    for (const exp of queryExpansions) {
      const expNorm = normalizeSearchString(exp);
      if (expNorm && (targetNorm.includes(expNorm) || expNorm.includes(targetNorm))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Match a Professor record across all bilingual indexed fields.
 */
export function matchProfessor(
  prof: Professor,
  query: string,
  universitiesMap?: Map<string, University>
): boolean {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return true;

  const qNorm = normalizeSearchString(cleanQ);
  const expansions = expandQueryTerminology(cleanQ);

  // Associated university record (for checking full uni names & aliases)
  const uni = universitiesMap ? universitiesMap.get(prof.universityId) : null;

  const searchableFields = [
    prof.name,
    prof.nameVariants ? prof.nameVariants.join(" ") : "",
    prof.englishName || "",
    prof.titleVi,
    prof.titleEn,
    prof.universityShortName,
    prof.universityNameVi,
    prof.universityNameEn,
    prof.facultyVi,
    prof.facultyEn,
    prof.departmentVi || "",
    prof.departmentEn || "",
    ...(prof.coursesVi || []),
    ...(prof.coursesEn || []),
    ...(prof.researchInterestsVi || []),
    ...(prof.researchInterestsEn || []),
    prof.bioVi || prof.bio || "",
    prof.bioEn || "",
    // If university record is provided, also check aliases
    ...(uni ? [uni.nameVi || uni.name || "", uni.nameEn || uni.englishName || "", uni.shortName, ...(uni.aliasesVi || []), ...(uni.aliasesEn || [])] : [])
  ];

  return isMatch(searchableFields.filter((s): s is string => typeof s === "string"), qNorm, expansions);
}

/**
 * Match a University record across all bilingual indexed fields.
 */
export function matchUniversity(uni: University, query: string): boolean {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return true;

  const qNorm = normalizeSearchString(cleanQ);
  const expansions = expandQueryTerminology(cleanQ);

  const searchableFields = [
    uni.nameVi || uni.name || "",
    uni.nameEn || uni.englishName || "",
    uni.shortName,
    uni.cityVi || uni.city || "",
    uni.cityEn || "",
    uni.officialDomain || "",
    uni.officialWebsite || "",
    uni.descriptionVi || uni.description || "",
    uni.descriptionEn || "",
    ...(uni.aliasesVi || []),
    ...(uni.aliasesEn || []),
    ...(uni.facultiesVi || uni.faculties || []),
    ...(uni.facultiesEn || [])
  ];

  return isMatch(searchableFields.filter((s): s is string => typeof s === "string"), qNorm, expansions);
}

/**
 * Comprehensive Multi-Filter Bilingual Search for Professors.
 */
export function searchProfessors(
  professors: Professor[],
  universitiesOrOptions: University[] | SearchOptions = [],
  maybeOptions?: SearchOptions
): Professor[] {
  let universities: University[] = [];
  let options: SearchOptions = {};

  if (Array.isArray(universitiesOrOptions)) {
    universities = universitiesOrOptions;
    options = maybeOptions || {};
  } else if (universitiesOrOptions && typeof universitiesOrOptions === "object") {
    options = universitiesOrOptions;
    universities = [];
  }

  const {
    query = "",
    universityId = "all",
    city = "all",
    minRating = 0,
    sortBy = "rating",
    locale = "vi"
  } = options;

  const uniMap = new Map(universities.map(u => [u.id, u]));

  return professors
    .filter((prof) => {
      // 1. Cross-lingual text query
      if (query.trim() && !matchProfessor(prof, query, uniMap)) {
        return false;
      }

      // 2. University filter (by stable canonical ID or shortName)
      if (
        universityId !== "all" &&
        prof.universityId !== universityId &&
        prof.universityShortName?.toLowerCase() !== universityId.toLowerCase()
      ) {
        return false;
      }

      // 3. City filter (matches either VI or EN city)
      if (city !== "all") {
        const uni = uniMap.get(prof.universityId);
        if (uni) {
          const cityMatches = 
            Boolean((uni.cityVi && uni.cityVi.toLowerCase() === city.toLowerCase()) ||
            (uni.cityEn && uni.cityEn.toLowerCase() === city.toLowerCase()) ||
            (uni.city && uni.city.toLowerCase() === city.toLowerCase()) ||
            (uni.cityVi && normalizeSearchString(uni.cityVi) === normalizeSearchString(city)) ||
            (uni.city && normalizeSearchString(uni.city) === normalizeSearchString(city)));
          if (!cityMatches) return false;
        }
      }

      // 4. Minimum rating filter
      const rating = prof.ratingAverage ?? 0;
      if (minRating > 0 && rating < minRating) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aRating = a.ratingAverage ?? 0;
      const bRating = b.ratingAverage ?? 0;
      const aReviews = a.ratingCount ?? 0;
      const bReviews = b.ratingCount ?? 0;
      if (sortBy === "rating") return bRating - aRating;
      if (sortBy === "reviews") return bReviews - aReviews;
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, locale === "vi" ? "vi" : "en");
      }
      return 0;
    });
}
