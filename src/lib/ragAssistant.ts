import { Professor, University, Review } from "@/types";
import { getVerifiedProfessors, getVerifiedUniversities } from "./academicDataService";
import { removeVietnameseDiacritics } from "./bilingualSearch";

export interface Citation {
  title: string;
  url: string;
  sourceType: "official_profile" | "university_website" | "student_review";
  originalLanguage: "vi" | "en";
  snippet: string;
}

export interface RagResponse {
  answer: string;
  responseLanguage: "vi" | "en";
  detectedQueryLanguage: "vi" | "en";
  citations: Citation[];
  hasSufficientEvidence: boolean;
  disambiguation?: {
    isAmbiguous: boolean;
    candidateCount: number;
    explanation: string;
  };
  machineTranslatedNotice?: string;
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

  const enWords = [
    "find", "which", "where", "who", "professor", "professors", "lecturer",
    "university", "universities", "courses", "researching", "teaching",
    "what", "is", "at", "in", "economics", "computer science", "artificial intelligence"
  ];
  let enCount = 0;
  for (const ew of enWords) {
    if (new RegExp(`\\b${ew}\\b`, "i").test(lower)) {
      enCount++;
    }
  }

  return enCount >= 1 ? "en" : "vi";
}

/**
 * Normalizes text for fuzzy token matching.
 */
function normalizeText(text: string): string {
  return removeVietnameseDiacritics(text || "").toLowerCase().trim();
}

/**
 * Checks if query contains location tokens.
 */
function extractLocationFilter(normQuery: string): { city?: string; region?: string } {
  const q = normQuery.replace(/[.,]/g, " ");
  if (q.includes("ha noi") || q.includes("hanoi") || q.includes("hn")) {
    return { city: "Hà Nội", region: "Miền Bắc" };
  }
  if (q.includes("tp hcm") || q.includes("tphcm") || q.includes("ho chi minh") || q.includes("sai gon") || q.includes("hcm")) {
    return { city: "TP. Hồ Chí Minh", region: "Miền Nam" };
  }
  if (q.includes("da nang") || q.includes("danang")) {
    return { city: "Đà Nẵng", region: "Miền Trung" };
  }
  if (q.includes("hue")) {
    return { city: "Huế", region: "Miền Trung" };
  }
  if (q.includes("can tho") || q.includes("cantho")) {
    return { city: "Cần Thơ", region: "Miền Nam" };
  }
  if (q.includes("mien bac") || q.includes("north") || q.includes("northern")) {
    return { region: "Miền Bắc" };
  }
  if (q.includes("mien trung") || q.includes("central")) {
    return { region: "Miền Trung" };
  }
  if (q.includes("mien nam") || q.includes("south") || q.includes("southern")) {
    return { region: "Miền Nam" };
  }
  return {};
}

/**
 * Checks if query requests a specific academic rank (GS, PGS, TS, ThS).
 */
function extractAcademicRankFilter(normQuery: string): string | null {
  if (/\b(gs|giao su|professor|full prof)\b/.test(normQuery) && !/\b(pgs|pho giao su|assoc)\b/.test(normQuery)) {
    return "GS";
  }
  if (/\b(pgs|pho giao su|associate professor|assoc prof)\b/.test(normQuery)) {
    return "PGS";
  }
  if (/\b(ts|tien si|phd|doctor)\b/.test(normQuery)) {
    return "TS";
  }
  return null;
}

/**
 * Cross-lingual query grounding and RAG response generator.
 */
export async function queryBilingualRag(
  userQuery: string,
  preferredResponseLanguage?: "vi" | "en",
  dataset?: {
    professors?: Professor[];
    universities?: University[];
    reviews?: Review[];
  }
): Promise<RagResponse> {
  const cleanQ = userQuery.trim();
  const detectedLang = detectQueryLanguage(cleanQ);
  const targetLang = preferredResponseLanguage || detectedLang;
  const normQ = normalizeText(cleanQ);

  const professors = dataset?.professors || (await getVerifiedProfessors());
  const universities = dataset?.universities || (await getVerifiedUniversities());
  const uniMap = new Map(universities.map(u => [u.id, u]));

  // Location filter
  const locFilter = extractLocationFilter(normQ);
  // Rank filter
  const rankFilter = extractAcademicRankFilter(normQ);

  // Terminology and Research Interest Keywords
  const queryTokens = normQ.split(/\s+/).filter(t => t.length > 1);

  // Scoring function for each professor
  interface ScoredProf {
    professor: Professor;
    score: number;
    matchedFields: string[];
  }

  const scoredProfessors: ScoredProf[] = [];

  for (const prof of professors) {
    let score = 0;
    const matchedFields: string[] = [];
    const profUni = uniMap.get(prof.universityId);

    // 1. Location match
    if (locFilter.city && profUni && profUni.city !== locFilter.city) {
      // If user specifically asked for a city, deprioritize or skip other cities
      continue;
    }
    if (locFilter.region && profUni && profUni.region !== locFilter.region) {
      continue;
    }

    // 2. Academic Rank match
    if (rankFilter) {
      const titleStr = (prof.academicTitle || "") + " " + (prof.title || "");
      const isGS = /\bGS\b|giáo sư|giao su/i.test(titleStr) && !/\bPGS\b|phó|pho/i.test(titleStr);
      const isPGS = /\bPGS\b|phó giáo sư|pho giao su/i.test(titleStr);
      const isTS = /\bTS\b|tiến sĩ|tien si/i.test(titleStr);
      if (rankFilter === "GS" && isGS) {
        score += 25;
        matchedFields.push("Học hàm Giáo sư");
      } else if (rankFilter === "PGS" && isPGS) {
        score += 25;
        matchedFields.push("Học hàm Phó Giáo sư");
      } else if (rankFilter === "TS" && (isTS || isGS || isPGS)) {
        score += 20;
        matchedFields.push("Học vị Tiến sĩ");
      }
    }

    // 3. Name match
    const normProfName = normalizeText(prof.name);
    if (normProfName === normQ || normQ.includes(normProfName) || normProfName.includes(normQ)) {
      score += 60;
      matchedFields.push("Trùng khớp họ tên");
    } else {
      // Partial name tokens
      const nameParts = normProfName.split(" ");
      for (const part of nameParts) {
        if (queryTokens.includes(part)) {
          score += 15;
          matchedFields.push(`Trùng tên (${part})`);
        }
      }
    }

    // 4. University short name / official name match
    const normUniName = normalizeText(prof.universityName || "");
    const shortUni = (prof.universityShortName || "").toLowerCase();
    if (normQ.includes(shortUni) || normQ.includes(normUniName)) {
      score += 30;
      matchedFields.push(`Cơ sở đào tạo: ${prof.universityShortName}`);
    }

    // 5. Research Interests & Faculty Match
    const allInterests = (prof.researchInterests || []).map(normalizeText);
    for (const interest of allInterests) {
      if (normQ.includes(interest) || interest.includes(normQ)) {
        score += 40;
        matchedFields.push(`Lĩnh vực nghiên cứu: ${interest}`);
      } else {
        for (const token of queryTokens) {
          if (interest.includes(token) && token.length > 2) {
            score += 10;
            matchedFields.push(`Từ khóa nghiên cứu (${token})`);
          }
        }
      }
    }

    // 6. Courses match
    const allCourses = (prof.courses || []).map(normalizeText);
    for (const course of allCourses) {
      if (normQ.includes(course) || course.includes(normQ)) {
        score += 30;
        matchedFields.push(`Môn học: ${course}`);
      }
    }

    // 7. Faculty match
    const normFaculty = normalizeText(prof.faculty || "");
    if (normQ.includes(normFaculty) || (queryTokens.some(t => normFaculty.includes(t)) && normFaculty.length > 5)) {
      score += 20;
      matchedFields.push(`Khoa/Viện: ${prof.faculty}`);
    }

    // Common concepts: AI / Trí tuệ nhân tạo
    if ((/\bai\b/i.test(normQ) || normQ.includes("tri tue nhan tao") || normQ.includes("artificial intelligence") || normQ.includes("machine learning") || normQ.includes("hoc may")) &&
        (allInterests.some(i => i.includes("tri tue nhan tao") || /\bai\b/i.test(i) || i.includes("hoc may")) ||
         normFaculty.includes("thong tin") || normFaculty.includes("may tinh"))) {
      score += 35;
      matchedFields.push("Lĩnh vực AI & Khoa học Máy tính");
    }

    // Common concepts: Software Engineering / Cong nghe phan mem
    if ((normQ.includes("phan mem") || normQ.includes("software")) &&
        (allInterests.some(i => i.includes("phan mem") || i.includes("software")) || normFaculty.includes("phan mem") || normFaculty.includes("cong nghe thong tin"))) {
      score += 35;
      matchedFields.push("Lĩnh vực Công nghệ Phần mềm");
    }

    // Common concepts: CNTT / IT / Công nghệ thông tin / Máy tính
    if ((/\bcntt\b/i.test(normQ) || normQ.includes("cong nghe thong tin") || /\bit\b/i.test(normQ) || normQ.includes("computer science") || normQ.includes("may tinh")) &&
        (normFaculty.includes("may tinh") || normFaculty.includes("thong tin") || /\bcntt\b/i.test(normFaculty) || /\bit\b/i.test(normFaculty) ||
         allInterests.some(i => i.includes("thong tin") || i.includes("may tinh") || i.includes("phan mem") || i.includes("mang")))) {
      score += 35;
      matchedFields.push("Lĩnh vực CNTT & Kỹ thuật Máy tính");
    }

    // Common concepts: Economics / Kinh te / Tai chinh
    if ((normQ.includes("kinh te") || normQ.includes("economics") || normQ.includes("tai chinh") || normQ.includes("finance") || normQ.includes("thuong mai")) &&
        (profUni?.id === "neu" || profUni?.id === "ftu" || profUni?.id === "due" || profUni?.id === "ueh" || normFaculty.includes("kinh te") || normFaculty.includes("tai chinh"))) {
      score += 35;
      matchedFields.push("Khối ngành Kinh tế & Tài chính");
    }

    const onlyMatchedRank = matchedFields.length === 1 && matchedFields[0].startsWith("Học");
    if (score > 15 && !onlyMatchedRank) {
      scoredProfessors.push({ professor: prof, score, matchedFields });
    }
  }

  scoredProfessors.sort((a, b) => b.score - a.score);

  // University matches
  const matchedUniversities = universities.filter(u => {
    const normUName = normalizeText(u.name || "");
    const shortU = (u.shortName || "").toLowerCase();
    const normCity = normalizeText(u.city || "");
    return (
      normQ.includes(shortU) ||
      normQ.includes(normUName) ||
      (normCity && normQ.includes(normCity)) ||
      (locFilter.city && u.city === locFilter.city) ||
      (locFilter.region && u.region === locFilter.region)
    );
  });

  // Check for Ambiguity / Disambiguation (e.g. multiple professors with same or near-identical name)
  let disambiguation: RagResponse["disambiguation"] = undefined;
  if (scoredProfessors.length >= 2) {
    const top1 = scoredProfessors[0].professor;
    const top2 = scoredProfessors[1].professor;
    const nameSim = normalizeText(top1.name) === normalizeText(top2.name);
    if (nameSim && top1.universityId !== top2.universityId) {
      disambiguation = {
        isAmbiguous: true,
        candidateCount: 2,
        explanation: targetLang === "vi"
          ? `Hệ thống phát hiện có ${scoredProfessors.length} giảng viên trùng hoặc gần trùng tên tại các cơ sở đại học khác nhau (${top1.universityShortName} và ${top2.universityShortName}). Thông tin chi tiết của từng thầy/cô được phân tách rõ bên dưới:`
          : `Multiple professors share similar names across different universities (${top1.universityShortName} and ${top2.universityShortName}). Individual profiles are distinguished below:`,
      };
    }
  }

  // 1. Insufficient Evidence / Data Unavailable (STRICT GROUNDING: Do NOT hallucinate!)
  const seeksPersonOrSubject = /giáo sư|giao su|giang vien|giảng viên|tiến sĩ|tien si|thầy|cô|thay|co|chuyên ngành|chuyen nganh|nghiên cứu|nghien cuu|professor|faculty|lecturer|dr\b|phd/i.test(cleanQ);
  if (scoredProfessors.length === 0 && (matchedUniversities.length === 0 || seeksPersonOrSubject)) {
    const abstainMessage = targetLang === "vi"
      ? `### Thông tin chưa có trong cơ sở dữ liệu kiểm chứng\n\n` +
        `Hiện tại, RateProfCuaBan **chưa có hồ sơ học thuật đã kiểm chứng** phù hợp với yêu cầu: *"${cleanQ}"*.\n\n` +
        `**Nguyên tắc minh bạch & Không bịa đặt (Grounding Policy)**:\n` +
        `- Hệ thống chỉ cung cấp thông tin đã đối soát từ cổng thông tin chính thức (.edu.vn) của các trường đại học.\n` +
        `- Đối với các chuyên ngành hẹp hoặc cơ sở đào tạo chưa có dữ liệu chính thức công bố, chúng tôi từ chối suy đoán hoặc tạo lập dữ liệu giả định.\n\n` +
        `💡 **Gợi ý tra cứu**:\n` +
        `- Thử tìm kiếm theo tên trường: **HUST**, **VNU-UET**, **HCMUT**, **UIT**, **NEU**, **FTU**, **DUE**, **CTU**...\n` +
        `- Thử tìm theo chuyên môn đã kiểm chứng: *Trí tuệ nhân tạo (AI)*, *Công nghệ phần mềm*, *Tin sinh học*, *Khai phá dữ liệu*, *Kinh tế quốc tế*, *Tài chính doanh nghiệp*...`
      : `### Verified Institutional Records Not Found\n\n` +
        `RateProfCuaBan currently **does not have verified academic records** matching your search: *"${cleanQ}"*.\n\n` +
        `**Grounding & Accuracy Policy**:\n` +
        `- We strictly cite official public directories (.edu.vn) and do not synthesize unverified claims or hallucinate faculty details.\n` +
        `- If an academic field or institution is not yet in our database, we acknowledge the limitation transparently.\n\n` +
        `💡 **Suggested searches**:\n` +
        `- Search by institutional acronym: **HUST**, **VNU-UET**, **HCMUT**, **UIT**, **NEU**, **FTU**, **DUE**, **CTU**...\n` +
        `- Search by verified disciplines: *Artificial Intelligence (AI)*, *Software Engineering*, *Bioinformatics*, *Data Mining*, *International Trade*, *Corporate Finance*...`;

    return {
      answer: abstainMessage,
      responseLanguage: targetLang,
      detectedQueryLanguage: detectedLang,
      citations: [],
      hasSufficientEvidence: false,
    };
  }

  // Citations list
  const citations: Citation[] = [];

  for (const item of scoredProfessors.slice(0, 4)) {
    const p = item.professor;
    const profileUrl = p.officialProfileUrls?.[0] || p.sourceUrls?.[0] || `/professors/${p.id}`;
    citations.push({
      title: `${p.academicTitle || p.title || "Giảng viên"} ${p.name} - ${p.universityShortName}`,
      url: profileUrl,
      sourceType: "official_profile",
      originalLanguage: "vi",
      snippet: p.bio || `Hướng nghiên cứu: ${(p.researchInterests || []).join(", ") || "Đang cập nhật"}`,
    });
  }

  for (const u of matchedUniversities.slice(0, 2)) {
    citations.push({
      title: `${u.name} (${u.shortName})`,
      url: u.officialWebsite || `https://${u.officialDomain}`,
      sourceType: "university_website",
      originalLanguage: "vi",
      snippet: u.description || `Khu vực: ${u.region} (${u.city})`,
    });
  }

  // Answer Synthesis
  let answer = "";

  if (targetLang === "vi") {
    const parts: string[] = [];

    if (disambiguation?.isAmbiguous) {
      parts.push(`> ⚠️ **Lưu ý phân biệt danh tính**:\n> ${disambiguation.explanation}`);
    }

    if (scoredProfessors.length > 0) {
      parts.push(`Dựa trên cơ sở dữ liệu học thuật chính thức toàn quốc của RateProfCuaBan, tìm thấy **${scoredProfessors.length}** giảng viên phù hợp:`);

      scoredProfessors.slice(0, 5).forEach((item, idx) => {
        const p = item.professor;
        const uni = uniMap.get(p.universityId);
        const uniName = uni ? uni.name : p.universityName;
        const primaryUrl = p.officialProfileUrls?.[0] || p.sourceUrls?.[0] || `https://rateprofcuaban.vn/professors/${p.id}`;
        const ratingStr = (p.ratingAverage ?? 0) > 0 ? `${(p.ratingAverage ?? 0).toFixed(1)}/5.0 (${p.ratingCount} đánh giá)` : "Chưa có nhận xét sinh viên";
        const emailStr = p.identifiers?.institutionalEmail || "Chưa công bố công khai";

        parts.push(
          `### ${idx + 1}. [${p.academicTitle || p.title || "Thầy/Cô"} ${p.name}](/professors/${p.id})\n` +
          `- **Cơ sở đào tạo**: **${uniName}** ([${p.universityShortName}](/universities/${p.universityId})) — *${uni?.city || "Việt Nam"} (${uni?.region || ""})*\n` +
          `- **Đơn vị công tác**: ${p.faculty || "Khoa Chuyên ngành"}${p.department ? ` — ${p.department}` : ""}\n` +
          `- **Chức vụ / Học vị**: ${p.position ? `**${p.position}**, ` : ""}${p.academicTitle || p.title || "Giảng viên"}\n` +
          `- **Email công vụ**: \`${emailStr}\`\n` +
          `- **Lĩnh vực nghiên cứu chính**: ${p.researchInterests?.length ? p.researchInterests.join(", ") : "Đang cập nhật"}\n` +
          `- **Học phần giảng dạy**: ${p.courses?.length ? p.courses.join(", ") : "Đang cập nhật"}\n` +
          `- **Đánh giá từ sinh viên**: ${ratingStr}\n` +
          `- 🔗 **Nguồn dữ liệu kiểm chứng**: [Xem hồ sơ chính thức tại trường](${primaryUrl})`
        );
      });
    } else if (matchedUniversities.length > 0) {
      parts.push(`Tìm thấy **${matchedUniversities.length}** cơ sở đại học tại khu vực yêu cầu:`);
      matchedUniversities.forEach((u, idx) => {
        const website = u.officialWebsite || `https://${u.officialDomain}`;
        parts.push(
          `### ${idx + 1}. [${u.name} (${u.shortName})](/universities/${u.id})\n` +
          `- **Tên tiếng Anh**: ${u.englishName || "N/A"}\n` +
          `- **Địa điểm**: ${u.city} (${u.region})\n` +
          `- **Website chính thức**: [${u.officialDomain || website}](${website})\n` +
          `- **Các trường thành viên, khoa đào tạo**: ${(u.faculties || []).slice(0, 4).join(", ")}...\n` +
          `- **Mô tả**: ${u.description || ""}`
        );
      });
    }

    answer = parts.join("\n\n");
  } else {
    // English Synthesis
    const parts: string[] = [];

    if (disambiguation?.isAmbiguous) {
      parts.push(`> ⚠️ **Identity Disambiguation Notice**:\n> ${disambiguation.explanation}`);
    }

    if (scoredProfessors.length > 0) {
      parts.push(`Based on RateProfCuaBan's verified nationwide academic directory, here are **${scoredProfessors.length}** verified professors:`);

      scoredProfessors.slice(0, 5).forEach((item, idx) => {
        const p = item.professor;
        const uni = uniMap.get(p.universityId);
        const uniName = uni ? (uni.englishName || uni.name) : p.universityName;
        const primaryUrl = p.officialProfileUrls?.[0] || p.sourceUrls?.[0] || `https://rateprofcuaban.vn/professors/${p.id}`;
        const ratingStr = (p.ratingAverage ?? 0) > 0 ? `${(p.ratingAverage ?? 0).toFixed(1)}/5.0 (${p.ratingCount} student reviews)` : "No student reviews yet";
        const emailStr = p.identifiers?.institutionalEmail || "Not publicly listed";

        parts.push(
          `### ${idx + 1}. [${p.academicTitle || p.title || "Professor"} ${p.name}](/professors/${p.id})\n` +
          `- **Institution**: **${uniName}** ([${p.universityShortName}](/universities/${p.universityId})) — *${uni?.city || "Vietnam"} (${uni?.region || ""})*\n` +
          `- **Academic Unit**: ${p.faculty || "Academic Faculty"}${p.department ? ` — ${p.department}` : ""}\n` +
          `- **Rank & Title**: ${p.position ? `**${p.position}**, ` : ""}${p.academicTitle || p.title || "Lecturer"}\n` +
          `- **Institutional Email**: \`${emailStr}\`\n` +
          `- **Research Interests**: ${p.researchInterests?.length ? p.researchInterests.join(", ") : "Available in catalog"}\n` +
          `- **Courses Taught**: ${p.courses?.length ? p.courses.join(", ") : "Available in catalog"}\n` +
          `- **Student Feedback**: ${ratingStr}\n` +
          `- 🔗 **Verified Source Citation**: [Official Faculty Directory Profile](${primaryUrl})`
        );
      });
    }

    answer = parts.join("\n\n");
  }

  return {
    answer,
    responseLanguage: targetLang,
    detectedQueryLanguage: detectedLang,
    citations,
    hasSufficientEvidence: true,
    disambiguation,
    machineTranslatedNotice: detectedLang !== targetLang
      ? (targetLang === "en"
        ? "Bilingual summary synthesized from verified Vietnamese academic sources."
        : "Nội dung tổng hợp từ các nguồn tài liệu học thuật kiểm chứng.")
      : undefined,
  };
}

/**
 * Convenience wrapper for components.
 */
export async function queryBilingualAssistant(
  userQuery: string,
  preferredResponseLanguage?: "vi" | "en",
  professors?: Professor[],
  universities?: University[]
): Promise<{ text: string; responseLanguage: "vi" | "en"; sources: { title: string; url: string }[] }> {
  const result = await queryBilingualRag(userQuery, preferredResponseLanguage, {
    professors,
    universities,
  });
  return {
    text: result.answer,
    responseLanguage: result.responseLanguage,
    sources: result.citations.map(c => ({ title: c.title, url: c.url })),
  };
}
