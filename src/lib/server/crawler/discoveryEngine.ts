/**
 * Institution Discovery Engine for RateUrProfs
 *
 * Automatically explores university websites, sitemaps, and internal links
 * to detect faculty directories, department pages, and staff profiles.
 */

import * as cheerio from "cheerio";
import { RateLimiterService } from "./rateLimiter";
import { getSqliteDatabase } from "../sqliteClient";
import { getPostgresPool } from "../postgresClient";
import { isPostgresConfigured } from "../db";

export interface DiscoveredUrlRecord {
  id: string;
  institutionId: string;
  url: string;
  canonicalUrl?: string;
  discoveryMethod: "sitemap" | "internal_link" | "site_search" | "pagination" | "structured_data" | "manual";
  contentType: "directory" | "faculty_list" | "department_page" | "profile_page" | "pdf" | "unknown";
  relevanceScore: number;
  contentHash?: string;
  lastCrawledAt?: number;
  httpStatus?: number;
  isCrawled: boolean;
  parentUrl?: string;
}

export class InstitutionDiscoveryEngine {
  public static readonly HIGH_RELEVANCE_SIGNALS = [
    "giang-vien",
    "giang vien",
    "đội ngũ giảng viên",
    "doi ngu giang vien",
    "danh sách giảng viên",
    "danh sach giang vien",
    "can-bo",
    "cán bộ",
    "can bo giang vien",
    "cán bộ giảng viên",
    "nhan-su",
    "nhân sự",
    "khoa-bo-mon",
    "khoa",
    "bộ môn",
    "bo mon",
    "phòng ban",
    "faculty",
    "academic staff",
    "faculty directory",
    "staff directory",
    "people",
    "lecturers",
    "professors",
    "researchers",
    "vien",
    "viện",
  ];

  public static readonly IGNORE_PATTERNS = [
    "login",
    "dang-nhap",
    "register",
    "dang-ky",
    "cart",
    "checkout",
    "search?",
    "tag/",
    "category/",
    "wp-admin",
    "javascript:",
    "mailto:",
    "tel:",
    "#",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".zip",
    ".rar",
    ".exe",
  ];

  /**
   * Evaluates relevance score (0.0 to 1.0) and content type of a candidate URL / link text.
   */
  public static evaluateRelevance(
    urlStr: string,
    anchorText = "",
    contextText = ""
  ): { relevanceScore: number; contentType: DiscoveredUrlRecord["contentType"] } {
    const combined = `${urlStr} ${anchorText} ${contextText}`.toLowerCase();

    for (const ignored of this.IGNORE_PATTERNS) {
      if (urlStr.toLowerCase().includes(ignored)) {
        return { relevanceScore: 0.0, contentType: "unknown" };
      }
    }

    let score = 0.1;
    let contentType: DiscoveredUrlRecord["contentType"] = "unknown";

    for (const signal of this.HIGH_RELEVANCE_SIGNALS) {
      if (combined.includes(signal)) {
        score += 0.25;
      }
    }

    if (
      combined.includes("danh sách giảng viên") ||
      combined.includes("faculty directory") ||
      combined.includes("staff directory") ||
      combined.includes("đội ngũ giảng viên")
    ) {
      score = Math.max(score, 0.9);
      contentType = "directory";
    } else if (combined.includes("khoa") || combined.includes("faculty")) {
      score = Math.max(score, 0.7);
      contentType = "faculty_list";
    } else if (combined.includes("bộ môn") || combined.includes("department")) {
      score = Math.max(score, 0.75);
      contentType = "department_page";
    } else if (urlStr.toLowerCase().endsWith(".pdf")) {
      contentType = "pdf";
      score = Math.max(score, 0.5);
    } else if (score >= 0.5) {
      contentType = "directory";
    }

    return {
      relevanceScore: Math.min(1.0, score),
      contentType,
    };
  }

  /**
   * Validates whether a target URL belongs to the university's official domain or permitted subdomains.
   */
  public static isWithinInstitutionalDomain(targetUrlStr: string, officialDomain?: string): boolean {
    if (!officialDomain) return true;
    try {
      const targetHost = new URL(targetUrlStr).hostname.toLowerCase();
      const cleanedOfficial = officialDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      return targetHost === cleanedOfficial || targetHost.endsWith("." + cleanedOfficial);
    } catch {
      return false;
    }
  }

  /**
   * Discovers URLs from a university's sitemap.xml.
   */
  public static async discoverFromSitemap(
    institutionId: string,
    officialWebsite: string,
    officialDomain?: string
  ): Promise<DiscoveredUrlRecord[]> {
    const sitemapUrls = [
      `${officialWebsite.replace(/\/+$/, "")}/sitemap.xml`,
      `${officialWebsite.replace(/\/+$/, "")}/sitemap_index.xml`,
    ];

    const discovered: DiscoveredUrlRecord[] = [];

    for (const sUrl of sitemapUrls) {
      try {
        const releaseSlot = await RateLimiterService.acquireSlot(sUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RateLimiterService.DEFAULT_TIMEOUT_MS);

        const res = await fetch(sUrl, {
          signal: controller.signal,
          headers: { "User-Agent": RateLimiterService.USER_AGENT },
        });
        clearTimeout(timeout);
        releaseSlot();

        if (!res.ok) continue;

        const xmlText = await res.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });

        // Extract loc entries from sitemap
        $("loc").each((_, el) => {
          const loc = $(el).text().trim();
          if (loc && this.isWithinInstitutionalDomain(loc, officialDomain)) {
            const { relevanceScore, contentType } = this.evaluateRelevance(loc);
            if (relevanceScore >= 0.3) {
              discovered.push({
                id: `url-${absHash(loc)}`,
                institutionId,
                url: loc,
                discoveryMethod: "sitemap",
                contentType,
                relevanceScore,
                isCrawled: false,
                parentUrl: sUrl,
              });
            }
          }
        });

        if (discovered.length > 0) break;
      } catch (err) {
        // Silently continue to next sitemap candidate
      }
    }

    return discovered;
  }

  /**
   * Discovers internal department, faculty, and staff links from an HTML document.
   */
  public static extractLinksFromHtml(
    institutionId: string,
    baseUrl: string,
    html: string,
    officialDomain?: string
  ): DiscoveredUrlRecord[] {
    const $ = cheerio.load(html);
    const results: DiscoveredUrlRecord[] = [];
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
      const rawHref = $(el).attr("href");
      if (!rawHref) return;

      try {
        const resolved = new URL(rawHref, baseUrl).toString();
        // Strip fragment identifiers
        const cleanUrl = resolved.split("#")[0];

        if (seen.has(cleanUrl)) return;
        seen.add(cleanUrl);

        if (!this.isWithinInstitutionalDomain(cleanUrl, officialDomain)) {
          return;
        }

        const anchorText = $(el).text().trim();
        const parentContext = $(el).closest("li, div, p").text().slice(0, 100).trim();

        const { relevanceScore, contentType } = this.evaluateRelevance(cleanUrl, anchorText, parentContext);

        if (relevanceScore >= 0.3) {
          results.push({
            id: `url-${absHash(cleanUrl)}`,
            institutionId,
            url: cleanUrl,
            discoveryMethod: "internal_link",
            contentType,
            relevanceScore,
            isCrawled: false,
            parentUrl: baseUrl,
          });
        }
      } catch {
        // Ignore malformed URLs
      }
    });

    return results;
  }

  /**
   * Persists discovered URLs in database (idempotent upsert).
   */
  public static async persistDiscoveredUrls(urls: DiscoveredUrlRecord[]): Promise<number> {
    if (urls.length === 0) return 0;
    let count = 0;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        for (const u of urls) {
          const res = await client.query(
            `
            INSERT INTO discovered_urls (
              id, institution_id, url, canonical_url, discovery_method,
              content_type, relevance_score, is_crawled, parent_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (url) DO UPDATE SET
              relevance_score = GREATEST(discovered_urls.relevance_score, EXCLUDED.relevance_score),
              content_type = CASE WHEN EXCLUDED.content_type != 'unknown' THEN EXCLUDED.content_type ELSE discovered_urls.content_type END
            RETURNING id;
            `,
            [
              u.id,
              u.institutionId,
              u.url,
              u.canonicalUrl || u.url,
              u.discoveryMethod,
              u.contentType,
              u.relevanceScore,
              u.isCrawled,
              u.parentUrl || null,
            ]
          );
          if (res.rowCount && res.rowCount > 0) count++;
        }
      } finally {
        client.release();
      }
    } else {
      const db = getSqliteDatabase();
      const stmt = db.prepare(`
        INSERT INTO discovered_urls (
          id, institution_id, url, canonical_url, discovery_method,
          content_type, relevance_score, is_crawled, parent_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
          relevance_score = MAX(discovered_urls.relevance_score, excluded.relevance_score),
          content_type = CASE WHEN excluded.content_type != 'unknown' THEN excluded.content_type ELSE discovered_urls.content_type END;
      `);

      for (const u of urls) {
        stmt.run(
          u.id,
          u.institutionId,
          u.url,
          u.canonicalUrl || u.url,
          u.discoveryMethod,
          u.contentType,
          u.relevanceScore,
          u.isCrawled ? 1 : 0,
          u.parentUrl || null
        );
        count++;
      }
    }

    return count;
  }

  /**
   * Retrieves discovered URLs for an institution.
   */
  public static async getDiscoveredUrls(
    institutionId: string,
    limit = 50,
    onlyUncrawled = false
  ): Promise<DiscoveredUrlRecord[]> {
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const q = onlyUncrawled
        ? `SELECT * FROM discovered_urls WHERE institution_id = $1 AND is_crawled = false ORDER BY relevance_score DESC LIMIT $2`
        : `SELECT * FROM discovered_urls WHERE institution_id = $1 ORDER BY relevance_score DESC LIMIT $2`;
      const res = await pool.query(q, [institutionId, limit]);
      return res.rows.map(mapDbUrlRow);
    } else {
      const db = getSqliteDatabase();
      const q = onlyUncrawled
        ? `SELECT * FROM discovered_urls WHERE institution_id = ? AND is_crawled = 0 ORDER BY relevance_score DESC LIMIT ?`
        : `SELECT * FROM discovered_urls WHERE institution_id = ? ORDER BY relevance_score DESC LIMIT ?`;
      const rows = db.prepare(q).all(institutionId, limit) as any[];
      return rows.map(mapDbUrlRow);
    }
  }

  public static extractCandidateLinks(html: string, baseUrl: string): string[] {
    const records = this.extractLinksFromHtml("temp", baseUrl, html);
    return records.map((r) => r.url);
  }

  public static extractLinksFromSitemap(sitemapXml: string, baseUrl: string): string[] {
    const $ = cheerio.load(sitemapXml, { xmlMode: true });
    const links: string[] = [];
    $("loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) links.push(loc);
    });
    return links;
  }

  public static async discoverInstitutionalUrls(options: {
    institutionId: string;
    startUrl: string;
    html?: string;
    officialDomain?: string;
    maxPages?: number;
  }): Promise<{ discoveredStaffUrls: string[] }> {
    const records: DiscoveredUrlRecord[] = [];

    // 1. Try sitemap
    try {
      const sitemapRecords = await this.discoverFromSitemap(options.institutionId, options.startUrl, options.officialDomain);
      records.push(...sitemapRecords);
    } catch {
      // Continue if sitemap fails
    }

    // 2. Extract links from HTML if html provided
    if (options.html) {
      try {
        const htmlRecords = this.extractLinksFromHtml(
          options.institutionId,
          options.startUrl,
          options.html,
          options.officialDomain
        );
        records.push(...htmlRecords);
      } catch {
        // Continue
      }
    }

    // 3. Probe common Vietnamese university faculty and staff directory endpoints
    const commonPaths = [
      "/can-bo",
      "/giang-vien",
      "/nhan-su",
      "/doi-ngu-giang-vien",
      "/gioi-thieu/can-bo",
      "/khoa-vien",
      "/khoa-bo-mon",
      "/doi-ngu-can-bo",
    ];
    for (const p of commonPaths) {
      try {
        const probedUrl = new URL(p, options.startUrl).toString();
        records.push({
          id: `url-${absHash(probedUrl)}`,
          institutionId: options.institutionId,
          url: probedUrl,
          discoveryMethod: "manual",
          contentType: "directory",
          relevanceScore: 0.75,
          isCrawled: false,
          parentUrl: options.startUrl,
        });
      } catch {
        // Ignore
      }
    }

    // Deduplicate discovered URLs
    const uniqueMap = new Map<string, DiscoveredUrlRecord>();
    for (const r of records) {
      if (!uniqueMap.has(r.url)) {
        uniqueMap.set(r.url, r);
      }
    }

    const uniqueRecords = Array.from(uniqueMap.values());
    await this.persistDiscoveredUrls(uniqueRecords);

    const discoveredStaffUrls = uniqueRecords
      .filter((r) => r.contentType === "directory" || r.contentType === "faculty_list" || r.contentType === "department_page")
      .map((r) => r.url);

    return { discoveredStaffUrls };
  }
}

function absHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function mapDbUrlRow(r: any): DiscoveredUrlRecord {
  return {
    id: r.id,
    institutionId: r.institution_id,
    url: r.url,
    canonicalUrl: r.canonical_url,
    discoveryMethod: r.discovery_method,
    contentType: r.content_type,
    relevanceScore: parseFloat(r.relevance_score || "0"),
    contentHash: r.content_hash,
    lastCrawledAt: r.last_crawled_at ? parseInt(r.last_crawled_at, 10) : undefined,
    httpStatus: r.http_status,
    isCrawled: Boolean(r.is_crawled),
    parentUrl: r.parent_url,
  };
}
