/**
 * Rate Limiter and Responsible Crawling Policy Enforcer
 *
 * Enforces per-domain concurrency limits, polite request intervals,
 * timeouts, robots.txt evaluation, and identification.
 */

export interface DomainPolicy {
  concurrencyLimit: number;
  minDelayMs: number;
  lastRequestTime: number;
  activeRequests: number;
  robotsDisallowedPatterns: string[];
  robotsCheckedAt?: number;
}

export class RateLimiterService {
  private static domainPolicies: Map<string, DomainPolicy> = new Map();
  public static readonly USER_AGENT =
    "RateUrProfs-AcademicBot/2.0 (+https://rateurprofs.site/bot; academic-audit@rateurprofs.site)";
  public static readonly DEFAULT_TIMEOUT_MS = 12000;
  public static readonly MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

  /**
   * Extracts hostname from a given URL.
   */
  public static extractHostname(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      return u.hostname.toLowerCase();
    } catch {
      return "default";
    }
  }

  /**
   * Retrieves or initializes domain policy.
   */
  public static getPolicy(domain: string): DomainPolicy {
    let policy = this.domainPolicies.get(domain);
    if (!policy) {
      policy = {
        concurrencyLimit: 2,
        minDelayMs: 300,
        lastRequestTime: 0,
        activeRequests: 0,
        robotsDisallowedPatterns: [],
      };
      this.domainPolicies.set(domain, policy);
    }
    return policy;
  }

  /**
   * Checks if URL is disallowed by robots.txt rules.
   */
  public static isRobotsDisallowed(urlStr: string): boolean {
    try {
      const u = new URL(urlStr);
      const domain = u.hostname.toLowerCase();
      const policy = this.getPolicy(domain);
      const path = u.pathname;

      for (const pattern of policy.robotsDisallowedPatterns) {
        if (pattern === "/" || path.startsWith(pattern)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Parses robots.txt text and updates domain disallow list.
   */
  public static parseRobotsTxt(domain: string, robotsContent: string): void {
    const policy = this.getPolicy(domain);
    policy.robotsCheckedAt = Date.now();
    const disallowed: string[] = [];

    let isAppliesToUs = true;
    const lines = robotsContent.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const [key, ...valParts] = line.split(":");
      const k = key.trim().toLowerCase();
      const val = valParts.join(":").trim();

      if (k === "user-agent") {
        isAppliesToUs = val === "*" || val.toLowerCase().includes("rateurprofs");
      } else if (isAppliesToUs && k === "disallow" && val) {
        disallowed.push(val);
      }
    }

    policy.robotsDisallowedPatterns = disallowed;
  }

  /**
   * Waits politely before dispatching request to honor per-domain concurrency and delay.
   */
  public static async acquireSlot(urlStr: string): Promise<() => void> {
    const domain = this.extractHostname(urlStr);
    const policy = this.getPolicy(domain);

    // Wait if concurrency limit reached (with self-healing 5s ceiling)
    let waitCount = 0;
    while (policy.activeRequests >= policy.concurrencyLimit && waitCount < 50) {
      await new Promise((r) => setTimeout(r, 100));
      waitCount++;
    }
    if (waitCount >= 50) {
      policy.activeRequests = 0;
    }

    // Wait for minimum delay between requests
    const now = Date.now();
    const elapsed = now - policy.lastRequestTime;
    if (elapsed < policy.minDelayMs) {
      await new Promise((r) => setTimeout(r, policy.minDelayMs - elapsed));
    }

    policy.activeRequests++;
    policy.lastRequestTime = Date.now();

    // Return release callback
    return () => {
      policy.activeRequests = Math.max(0, policy.activeRequests - 1);
    };
  }

  /**
   * Calculates exponential backoff with random jitter.
   */
  public static calculateBackoffMs(attempt: number, baseMs = 1000, maxMs = 60000): number {
    const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * (exponential * 0.3));
    return exponential + jitter;
  }

  public static setConcurrencyLimit(limit: number, domain = "default"): void {
    const policy = this.getPolicy(domain);
    policy.concurrencyLimit = limit;
  }

  public static setMinDelayMs(ms: number, domain = "default"): void {
    const policy = this.getPolicy(domain);
    policy.minDelayMs = ms;
  }

  public static async acquirePermission(domainOrUrl: string): Promise<() => void> {
    const url = domainOrUrl.startsWith("http") ? domainOrUrl : `https://${domainOrUrl}`;
    return this.acquireSlot(url);
  }

  public static recordFailure(domain: string): void {
    const policy = this.getPolicy(domain);
    policy.minDelayMs = Math.min(10000, policy.minDelayMs * 2);
  }

  public static recordSuccess(domain: string): void {
    const policy = this.getPolicy(domain);
    policy.minDelayMs = 300;
  }

  public static async isUrlAllowed(urlStr: string): Promise<boolean> {
    return !this.isRobotsDisallowed(urlStr);
  }

  public static extractDomain(urlStr: string): string {
    return this.extractHostname(urlStr);
  }
}
