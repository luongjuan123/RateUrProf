/**
 * Multi-Tiered Extraction Strategies & Specialized University Adapters
 *
 * Tier A: HTTP/Cheerio static HTML extraction
 * Tier B: Structured metadata (JSON-LD, Microdata, meta tags) extraction
 * Tier C: Specialized high-precision university adapters (HUST, UIT, VNU, HCMUT, FPT, FTU, NEU, HĐGSNN)
 * Tier D: Generic heuristic fallback extractor
 */

import * as cheerio from "cheerio";
import { cleanPersonName, classifyAcademicRankAndDegree, normalizeEmail, normalizePhone } from "./normalization";

export interface RawProfessorData {
  rawName: string;
  rawTitle?: string;
  rawDepartment?: string;
  rawEmail?: string;
  rawPhone?: string;
  rawBio?: string;
  rawAvatarUrl?: string;
  rawProfileUrl?: string;
  universityId: string;
  researchInterests?: string[];
  sourceUrl: string;
  strategyUsed: "strategy_a" | "strategy_b" | "strategy_c" | "strategy_d";
}

/**
 * Strategy C: Specialized Adapters for Top Vietnamese Institutions
 */
export class UniversityAdapters {
  /**
   * Adapter for HUST (Hanoi University of Science and Technology - hust.edu.vn, soict.hust.edu.vn)
   */
  public static extractHUST(html: string, pageUrl: string, universityId = "hust"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    // SOICT and HUST standard faculty directory selectors
    const cardSelectors = [
      ".lecturer-item",
      ".member-item",
      ".teacher-item",
      ".profile-item",
      ".item-lecturer",
      ".staff-item",
      ".faculty-member",
      "article.person",
    ];

    $(cardSelectors.join(", ")).each((_, el) => {
      const $el = $(el);
      const name = $el.find(".name, .title-name, h3, h4, .lecturer-name, .member-name").first().text().trim();
      const title = $el.find(".position, .title, .degree, .academic-title").first().text().trim();
      const dept = $el.find(".department, .faculty, .dept, .lab").first().text().trim();
      const email = $el.find("a[href^='mailto:'], .email").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const phone = $el.find(".phone, a[href^='tel:']").first().text().trim();
      const profileHref = $el.find("a").attr("href");
      const avatarSrc = $el.find("img").attr("src");

      if (name && name.length >= 3) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: dept || "Đại học Bách Khoa Hà Nội",
          rawEmail: email || undefined,
          rawPhone: phone || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    // Also check HUST table format
    $("table tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 2) {
        const text0 = $(tds[0]).text().trim();
        const text1 = $(tds[1]).text().trim();
        const nameCandidate = text1.length > 2 && !/^\d+$/.test(text1) ? text1 : text0;
        const emailLink = $(tr).find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");

        if (nameCandidate && nameCandidate.split(" ").length >= 2 && !/họ và tên|stt|no\./i.test(nameCandidate)) {
          results.push({
            rawName: nameCandidate,
            rawTitle: $(tds[2]).text().trim() || undefined,
            rawDepartment: "Đại học Bách Khoa Hà Nội",
            rawEmail: emailLink || undefined,
            rawProfileUrl: pageUrl,
            universityId,
            sourceUrl: pageUrl,
            strategyUsed: "strategy_c",
          });
        }
      }
    });

    return results;
  }

  /**
   * Adapter for UIT (University of Information Technology - uit.edu.vn)
   */
  public static extractUIT(html: string, pageUrl: string, universityId = "uit"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".views-row, .view-danh-sach-can-bo .field-content, .card-teacher, .giang-vien-item").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".views-field-title, .title, h3, .name, strong").first().text().trim();
      const title = $el.find(".views-field-field-chuc-vu, .chuc-vu, .position").first().text().trim();
      const dept = $el.find(".views-field-field-don-vi, .don-vi, .department").first().text().trim();
      const email = $el.find("a[href^='mailto:']").text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").first().attr("href");

      if (name && name.length >= 3 && !/danh sách|khoa|phòng/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: dept || "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for VNU (Vietnam National University - uet.vnu.edu.vn, ussh.vnu.edu.vn, vnu.edu.vn)
   */
  public static extractVNU(html: string, pageUrl: string, universityId = "vnu-uet"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".faculty-item, .personnel-item, .staff-member, .person-box, .profile-card, table tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".name, h3, h4, strong, td:nth-child(2)").first().text().trim();
      const title = $el.find(".title, .rank, .degree, td:nth-child(3)").first().text().trim();
      const dept = $el.find(".dept, .department, td:nth-child(4)").first().text().trim();
      const email = $el.find("a[href^='mailto:']").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").first().attr("href");

      if (name && name.length >= 3 && !/họ và tên|stt|danh sách|phòng ban/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: dept || "Đại học Quốc gia",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for HCMUT (Ho Chi Minh City University of Technology - hcmut.edu.vn)
   */
  public static extractHCMUT(html: string, pageUrl: string, universityId = "hcmut"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".lecturer-card, .staff-card, .profile-list-item, .item-person, tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".name, h4, h3, .fullname, td:nth-child(2)").first().text().trim();
      const email = $el.find("a[href^='mailto:']").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const title = $el.find(".title, .degree, td:nth-child(3)").first().text().trim();
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").attr("href");

      if (name && name.length >= 3 && !/họ và tên|stt/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: "Trường Đại học Bách Khoa - ĐHQG TP.HCM",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for FPT University (fpt.edu.vn)
   */
  public static extractFPT(html: string, pageUrl: string, universityId = "fpt"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".teacher-item, .faculty-item, .card-teacher, .giang-vien, .item-giang-vien, article").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".teacher-name, .name, h3, h4, .title").first().text().trim();
      const title = $el.find(".teacher-position, .position, .role, .degree").first().text().trim();
      const dept = $el.find(".teacher-dept, .dept, .department").first().text().trim();
      const email = $el.find("a[href^='mailto:']").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").first().attr("href");

      if (name && name.length >= 3 && !/tin tức|sự kiện|tuyển sinh|chương trình/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: dept || "Trường Đại học FPT",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for FTU (Foreign Trade University - ftu.edu.vn)
   */
  public static extractFTU(html: string, pageUrl: string, universityId = "ftu"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".person-item, .staff-profile, .card-lecturer, table tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".name, h3, h4, strong, td:nth-child(2)").first().text().trim();
      const title = $el.find(".title, .rank, td:nth-child(3)").first().text().trim();
      const email = $el.find("a[href^='mailto:']").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").first().attr("href");

      if (name && name.length >= 3 && !/họ và tên|stt/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: "Trường Đại học Ngoại thương",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for NEU (National Economics University - neu.edu.vn)
   */
  public static extractNEU(html: string, pageUrl: string, universityId = "neu"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $(".faculty-list .item, .teacher-card, .personnel-item, table tr").each((_, el) => {
      const $el = $(el);
      const name = $el.find(".name, h3, h4, strong, td:nth-child(2)").first().text().trim();
      const title = $el.find(".title, .degree, td:nth-child(3)").first().text().trim();
      const email = $el.find("a[href^='mailto:']").first().text().trim() ||
        $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
      const avatarSrc = $el.find("img").attr("src");
      const profileHref = $el.find("a").first().attr("href");

      if (name && name.length >= 3 && !/họ và tên|stt|khoa|viện/i.test(name)) {
        results.push({
          rawName: name,
          rawTitle: title || undefined,
          rawDepartment: "Trường Đại học Kinh tế Quốc dân",
          rawEmail: email || undefined,
          rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
          rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_c",
        });
      }
    });

    return results;
  }

  /**
   * Adapter for HĐGSNN (Hội đồng Giáo sư Nhà nước - hdgsnn.gov.vn)
   */
  public static extractHDGSNN(html: string, pageUrl: string, universityId = "moet"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];

    $("table tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 4) {
        const name = $(tds[1]).text().trim();
        const year = $(tds[2]).text().trim();
        const rankOrField = $(tds[3]).text().trim();
        const affiliation = tds.length >= 5 ? $(tds[4]).text().trim() : "";

        if (name && name.length >= 3 && !/họ và tên|stt|họ tên/i.test(name)) {
          results.push({
            rawName: name,
            rawTitle: `${rankOrField} (${year})`,
            rawDepartment: affiliation || "Hội đồng Giáo sư Nhà nước",
            rawProfileUrl: pageUrl,
            universityId,
            sourceUrl: pageUrl,
            strategyUsed: "strategy_c",
          });
        }
      }
    });

    return results;
  }

  /**
   * Adapter for HCMUS (University of Science, VNU-HCM - hcmus.edu.vn)
   */
  public static extractHCMUS(html: string, pageUrl: string, universityId = "hcmus"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];
    const seenNames = new Set<string>();

    $("tr, li, p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 200 && /GS\.|PGS\.|TS\.|ThS\.|NCV\./i.test(text)) {
        const m = text.match(/(?:(?:Trưởng|Phó|Thư ký)[^:]*:\s*)?((?:GS|PGS|TS|ThS|NCV)[\w\s.,]+)/);
        if (m) {
          const rawCandidate = m[1].trim();
          const clean = cleanPersonName(rawCandidate);
          if (clean && clean.length >= 3 && clean.split(" ").length >= 2 && !seenNames.has(clean.toLowerCase())) {
            seenNames.add(clean.toLowerCase());
            results.push({
              rawName: clean,
              rawTitle: rawCandidate,
              rawDepartment: "Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
              rawProfileUrl: pageUrl,
              universityId,
              sourceUrl: pageUrl,
              strategyUsed: "strategy_c",
            });
          }
        }
      }
    });

    return results;
  }

  /**
   * Adapter for UEL (University of Economics and Law, VNU-HCM - uel.edu.vn)
   */
  public static extractUEL(html: string, pageUrl: string, universityId = "uel"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];
    const seenNames = new Set<string>();

    $("h3, h4, h5, strong, tr").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 150 && /PGS\.TS|Tiến sĩ|Thạc sĩ|Giáo sư|Dr\.|Prof\./i.test(text)) {
        const clean = cleanPersonName(text);
        if (clean && clean.length >= 3 && clean.split(" ").length >= 2 && !seenNames.has(clean.toLowerCase())) {
          seenNames.add(clean.toLowerCase());
          results.push({
            rawName: clean,
            rawTitle: text,
            rawDepartment: "Trường Đại học Kinh tế - Luật - ĐHQG TP.HCM",
            rawProfileUrl: pageUrl,
            universityId,
            sourceUrl: pageUrl,
            strategyUsed: "strategy_c",
          });
        }
      }
    });

    return results;
  }

  /**
   * Adapter for HCMIU (International University, VNU-HCM - hcmiu.edu.vn)
   */
  public static extractHCMIU(html: string, pageUrl: string, universityId = "hcmiu"): RawProfessorData[] {
    const $ = cheerio.load(html);
    const results: RawProfessorData[] = [];
    const seenNames = new Set<string>();

    $("tr, .member-item, article").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && /GS\.|PGS\.|TS\.|Prof\.|Ph\.D/i.test(text)) {
        const clean = cleanPersonName(text);
        if (clean && clean.length >= 3 && clean.split(" ").length >= 2 && !seenNames.has(clean.toLowerCase())) {
          seenNames.add(clean.toLowerCase());
          results.push({
            rawName: clean,
            rawTitle: text.slice(0, 50),
            rawDepartment: "Trường Đại học Quốc tế - ĐHQG TP.HCM",
            rawProfileUrl: pageUrl,
            universityId,
            sourceUrl: pageUrl,
            strategyUsed: "strategy_c",
          });
        }
      }
    });

    return results;
  }
}

/**
 * Strategy A: General Fast HTML & Cheerio Extractor
 */
export function extractStrategyA(html: string, pageUrl: string, universityId: string): RawProfessorData[] {
  const $ = cheerio.load(html);
  const results: RawProfessorData[] = [];

  // Card & grid selectors common in modern university websites
  const cardSelectors = [
    ".team-member",
    ".member-card",
    ".faculty-member",
    ".lecturer-card",
    ".staff-card",
    ".profile-card",
    ".user-profile",
    ".teacher-card",
    ".person-item",
    ".author-card",
    ".staff-item",
    "div[class*='faculty']",
    "div[class*='lecturer']",
    "div[class*='giang-vien']",
  ];

  $(cardSelectors.join(", ")).each((_, el) => {
    const $el = $(el);
    const name = $el.find("h2, h3, h4, .name, .title-name, .fullname, strong").first().text().trim();
    const title = $el.find(".title, .position, .role, .academic-title, .degree").first().text().trim();
    const dept = $el.find(".department, .dept, .faculty, .faculty-name").first().text().trim();
    const email = $el.find("a[href^='mailto:']").first().text().trim() ||
      $el.find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
    const phone = $el.find("a[href^='tel:'], .phone").first().text().trim();
    const avatarSrc = $el.find("img").attr("src");
    const profileHref = $el.find("a").first().attr("href");

    const isNonPersonText = (text: string) =>
      !text ||
      text.length < 4 ||
      text.length > 45 ||
      /\d/.test(text) ||
      /https?:\/\/|www\.|\.vn\/|\.com|\.edu/i.test(text) ||
      /\b(?:trang chủ|giới thiệu|tin tức|chuyên ngành|học phần|môn học|tín chỉ|chuẩn đầu ra|khung chương trình|đầu sách|giáo trình|bài giảng|đề cương|cán bộ lớp|lớp trưởng|bí thư|họ và tên|họ tên|stt|số cmnd|cccd|giới tính|thời gian|địa điểm|ghi chú|năm sinh|quê quán|đề tài|luận văn|luận án|tạp chí|hội thảo|nghị quyết|thông tư|quyết định)\b/i.test(text);

    if (name && name.split(" ").length >= 2 && name.split(" ").length <= 5 && !isNonPersonText(name)) {
      results.push({
        rawName: name,
        rawTitle: title || undefined,
        rawDepartment: dept || undefined,
        rawEmail: email || undefined,
        rawPhone: phone || undefined,
        rawAvatarUrl: avatarSrc ? new URL(avatarSrc, pageUrl).toString() : undefined,
        rawProfileUrl: profileHref ? new URL(profileHref, pageUrl).toString() : pageUrl,
        universityId,
        sourceUrl: pageUrl,
        strategyUsed: "strategy_a",
      });
    }
  });

  // Table rows extractor if no cards found
  if (results.length === 0) {
    const isNonPersonText = (text: string) =>
      !text ||
      text.length < 4 ||
      text.length > 45 ||
      /\d/.test(text) ||
      /https?:\/\/|www\.|\.vn\/|\.com|\.edu/i.test(text) ||
      /\b(?:trang chủ|giới thiệu|tin tức|chuyên ngành|học phần|môn học|tín chỉ|chuẩn đầu ra|khung chương trình|đầu sách|giáo trình|bài giảng|đề cương|cán bộ lớp|lớp trưởng|bí thư|họ và tên|họ tên|stt|số cmnd|cccd|giới tính|thời gian|địa điểm|ghi chú|năm sinh|quê quán|đề tài|luận văn|luận án|tạp chí|hội thảo|nghị quyết|thông tư|quyết định)\b/i.test(text);

    $("table tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length >= 2) {
        const text0 = $(tds[0]).text().trim();
        const text1 = $(tds[1]).text().trim();
        const nameCandidate = /^\d+$/.test(text0) ? text1 : text0;

        if (nameCandidate && nameCandidate.split(" ").length >= 2 && nameCandidate.split(" ").length <= 5 && !isNonPersonText(nameCandidate)) {
          const emailLink = $(tr).find("a[href^='mailto:']").attr("href")?.replace(/^mailto:/i, "");
          const titleCandidate = tds.length >= 3 ? $(tds[2]).text().trim() : undefined;
          const deptCandidate = tds.length >= 4 ? $(tds[3]).text().trim() : undefined;

          results.push({
            rawName: nameCandidate,
            rawTitle: titleCandidate,
            rawDepartment: deptCandidate,
            rawEmail: emailLink,
            rawProfileUrl: pageUrl,
            universityId,
            sourceUrl: pageUrl,
            strategyUsed: "strategy_a",
          });
        }
      }
    });
  }

  return results;
}

/**
 * Strategy B: Structured Data Extractor (JSON-LD, Schema.org Person)
 */
export function extractStrategyB(html: string, pageUrl: string, universityId: string): RawProfessorData[] {
  const $ = cheerio.load(html);
  const results: RawProfessorData[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text().trim());
      const items = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];

      for (const item of items) {
        if (item["@type"] === "Person") {
          const name = item.name || item.givenName;
          if (name) {
            results.push({
              rawName: name,
              rawTitle: item.jobTitle || item.description,
              rawDepartment: item.worksFor?.name || item.department,
              rawEmail: item.email,
              rawPhone: item.telephone,
              rawAvatarUrl: item.image?.url || item.image,
              rawProfileUrl: item.url || pageUrl,
              universityId,
              sourceUrl: pageUrl,
              strategyUsed: "strategy_b",
            });
          }
        }
      }
    } catch {
      // Ignore unparseable json-ld
    }
  });

  return results;
}

/**
 * Strategy D: Generic Heuristic Fallback Extractor
 */
export function extractStrategyD(html: string, pageUrl: string, universityId: string): RawProfessorData[] {
  const $ = cheerio.load(html);
  const results: RawProfessorData[] = [];
  const seenNames = new Set<string>();

  // Look for paragraphs or list items containing Vietnamese names and academic titles
  const academicRegex = /(GS\.|PGS\.|TS\.|ThS\.|Giáo sư|Phó Giáo sư|Tiến sĩ|Thạc sĩ)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4})/;

  $("p, li, td, span").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 300) {
      const match = text.match(academicRegex);
      if (match) {
        const titlePart = match[1];
        const namePart = match[2];

        if (seenNames.has(namePart.toLowerCase())) return;
        seenNames.add(namePart.toLowerCase());

        // Extract email if in the same container
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        results.push({
          rawName: namePart,
          rawTitle: titlePart,
          rawEmail: emailMatch ? emailMatch[0] : undefined,
          rawProfileUrl: pageUrl,
          universityId,
          sourceUrl: pageUrl,
          strategyUsed: "strategy_d",
        });
      }
    }
  });

  return results;
}

/**
 * Multi-Tier Strategy Dispatcher
 * Selects the best strategy based on university domain, specialized adapters, and content analysis.
 */
export function dispatchExtraction(html: string, pageUrl: string, universityId: string): RawProfessorData[] {
  const urlLower = pageUrl.toLowerCase();

  // Tier C: Check specialized adapters first
  if (urlLower.includes("hust.edu.vn")) {
    const res = UniversityAdapters.extractHUST(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("uit.edu.vn")) {
    const res = UniversityAdapters.extractUIT(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("vnu.edu.vn")) {
    const res = UniversityAdapters.extractVNU(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("hcmut.edu.vn")) {
    const res = UniversityAdapters.extractHCMUT(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("hcmus.edu.vn")) {
    const res = UniversityAdapters.extractHCMUS(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("uel.edu.vn")) {
    const res = UniversityAdapters.extractUEL(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("hcmiu.edu.vn")) {
    const res = UniversityAdapters.extractHCMIU(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("fpt.edu.vn")) {
    const res = UniversityAdapters.extractFPT(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("ftu.edu.vn")) {
    const res = UniversityAdapters.extractFTU(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("neu.edu.vn")) {
    const res = UniversityAdapters.extractNEU(html, pageUrl, universityId);
    if (res.length > 0) return res;
  } else if (urlLower.includes("hdgsnn.gov.vn")) {
    const res = UniversityAdapters.extractHDGSNN(html, pageUrl, universityId);
    if (res.length > 0) return res;
  }

  // Tier B: Check structured JSON-LD
  const bRes = extractStrategyB(html, pageUrl, universityId);
  if (bRes.length > 0) return bRes;

  // Tier A: Cheerio standard selector heuristics
  const aRes = extractStrategyA(html, pageUrl, universityId);
  if (aRes.length > 0) return aRes;

  // Tier D: Fallback heuristic scan
  return extractStrategyD(html, pageUrl, universityId);
}
