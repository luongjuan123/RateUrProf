/**
 * Automated Pagination Engine
 *
 * Detects pagination links, numeric pagination lists, next-page controls,
 * query parameters, and relative path structures while actively preventing
 * infinite crawling loops, query bloat, and cycles.
 */

import * as cheerio from "cheerio";

export interface PaginationResult {
  nextPageUrl: string | null;
  allPageUrls: string[];
  totalPagesEstimated: number;
}

export class PaginationEngine {
  private visitedUrls = new Set<string>();
  private readonly maxDepth: number;

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
  }

  /**
   * Normalizes a URL to prevent duplicate visits due to hash fragments or redundant query param ordering
   */
  public canonicalizeUrl(urlStr: string, baseUrl?: string): string | null {
    try {
      const url = new URL(urlStr, baseUrl);
      url.hash = ""; // strip fragments

      // Remove tracking parameters that cause loops
      const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "ref", "fbclid"];
      for (const p of trackingParams) {
        url.searchParams.delete(p);
      }

      // Sort remaining search params for stability
      url.searchParams.sort();

      return url.toString();
    } catch {
      return null;
    }
  }

  /**
   * Extracts pagination links from HTML
   */
  public extractPagination(html: string, currentUrl: string): PaginationResult {
    const $ = cheerio.load(html);
    const discovered = new Set<string>();
    let nextPageUrl: string | null = null;

    const currentCanonical = this.canonicalizeUrl(currentUrl);
    if (currentCanonical) {
      this.visitedUrls.add(currentCanonical);
    }

    // 1. Explicit <link rel="next"> or <a rel="next">
    const explicitNext = $('link[rel="next"], a[rel="next"]').attr("href");
    if (explicitNext) {
      const canon = this.canonicalizeUrl(explicitNext, currentUrl);
      if (canon && !this.visitedUrls.has(canon) && canon !== currentCanonical) {
        nextPageUrl = canon;
        discovered.add(canon);
      }
    }

    // 2. Next button text search (Vietnamese & English)
    const nextTextRegex = /^(tiếp|trang sau|sau|kế|tiếp theo|next|next\s*page|»|>|›)$/i;
    $("a").each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const href = $el.attr("href");
      if (!href) return;

      if (nextTextRegex.test(text) || $el.hasClass("next") || $el.attr("aria-label")?.toLowerCase().includes("next")) {
        const canon = this.canonicalizeUrl(href, currentUrl);
        if (canon && !this.visitedUrls.has(canon) && canon !== currentCanonical && !nextPageUrl) {
          nextPageUrl = canon;
          discovered.add(canon);
        }
      }
    });

    // 3. Numbered pagination links (e.g. .pagination a, nav a, .page-numbers a)
    const paginationContainers = [
      ".pagination a",
      ".page-numbers a",
      ".pager a",
      "nav[aria-label*='pagination'] a",
      "nav[role='navigation'] a",
      ".pages a",
      ".wp-pagenavi a",
    ];

    $(paginationContainers.join(", ")).each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const canon = this.canonicalizeUrl(href, currentUrl);
      if (canon && canon !== currentCanonical) {
        discovered.add(canon);
      }
    });

    // 4. Any anchor with page query parameters on the same origin and path
    try {
      const currentParsed = new URL(currentUrl);
      const pageParamNames = ["page", "p", "paged", "trang", "pg", "start", "offset"];

      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const target = new URL(href, currentUrl);
          if (target.origin === currentParsed.origin && target.pathname === currentParsed.pathname) {
            for (const param of pageParamNames) {
              if (target.searchParams.has(param)) {
                const canon = this.canonicalizeUrl(href, currentUrl);
                if (canon && canon !== currentCanonical) {
                  discovered.add(canon);
                }
                break;
              }
            }
          }
        } catch {
          // ignore invalid relative urls
        }
      });
    } catch {
      // ignore
    }

    // Filter discovered to prevent exceeding maxDepth
    const allPageUrls = Array.from(discovered).slice(0, this.maxDepth);

    // If nextPageUrl is still null, pick the first unvisited page URL if available
    if (!nextPageUrl) {
      for (const p of allPageUrls) {
        if (!this.visitedUrls.has(p)) {
          nextPageUrl = p;
          break;
        }
      }
    }

    return {
      nextPageUrl,
      allPageUrls,
      totalPagesEstimated: Math.max(1, allPageUrls.length + (this.visitedUrls.size > 0 ? 1 : 0)),
    };
  }

  /**
   * Resets visited tracking for a new directory or campaign
   */
  public reset(): void {
    this.visitedUrls.clear();
  }
}
