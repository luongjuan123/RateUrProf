/**
 * Resumable Background Crawler Worker
 *
 * Consumes atomic persistent jobs, enforces rate limiting & politeness,
 * performs multi-strategy extraction, stages & validates entities,
 * resolves identities safely, and syncs campaign telemetry.
 */

import { PersistentJobSystem, CrawlJob } from "./jobSystem";
import { RateLimiterService } from "./rateLimiter";
import { InstitutionDiscoveryEngine } from "./discoveryEngine";
import { PaginationEngine } from "./paginationEngine";
import { dispatchExtraction } from "./strategies";
import { ValidationService } from "./validation";
import { DeduplicationService } from "./deduplication";
import { CampaignManager } from "./campaignManager";
import { UniversityRegistryService } from "./registry";

export interface WorkerTickResult {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  jobs: {
    id: string;
    url: string;
    status: "succeeded" | "failed";
    extractedCount: number;
    validatedCount: number;
    error?: string;
  }[];
}

export class CrawlerWorker {
  private static readonly USER_AGENT =
    "RateUrProfs-Bot/1.0 (+https://rateurprofs.site/bot; educational research crawler)";

  /**
   * Executes a single processing tick over up to `batchSize` ready jobs
   */
  public static async tick(batchSize = 5, campaignId?: string): Promise<WorkerTickResult> {
    // 1. Recover any stale running jobs from crashed workers
    await PersistentJobSystem.recoverStaleJobs(300);

    const result: WorkerTickResult = {
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      jobs: [],
    };

    // Dequeue batch of jobs atomically in a single round-trip
    let jobs = campaignId ? await PersistentJobSystem.dequeueJobs(batchSize, campaignId) : [];
    if (jobs.length < batchSize) {
      const remaining = batchSize - jobs.length;
      const generalJobs = await PersistentJobSystem.dequeueJobs(remaining);
      jobs = [...jobs, ...generalJobs];
    }

    if (jobs.length === 0) {
      return result;
    }

    result.processedCount = jobs.length;

    // Process concurrent batch safely (RateLimiter enforces polite per-domain spacing)
    const processedJobs = await Promise.all(
      jobs.map(async (job) => {
        const jobResult = await this.processJob(job);
        if (job.campaignId) {
          await CampaignManager.syncCampaignProgress(job.campaignId);
        }
        return jobResult;
      })
    );

    for (const jobResult of processedJobs) {
      result.jobs.push(jobResult);
      if (jobResult.status === "succeeded") {
        result.succeededCount++;
      } else {
        result.failedCount++;
      }
    }

    return result;
  }

  /**
   * Processes an individual crawl job
   */
  public static async processJob(job: CrawlJob): Promise<{
    id: string;
    url: string;
    status: "succeeded" | "failed";
    extractedCount: number;
    validatedCount: number;
    error?: string;
  }> {
    const domain = RateLimiterService.extractDomain(job.url);
    const paginationEngine = new PaginationEngine(25);

    const release = await RateLimiterService.acquirePermission(domain);

    try {

      // 2. Robots.txt Compliance Check
      const allowed = await RateLimiterService.isUrlAllowed(job.url);
      if (!allowed) {
        await PersistentJobSystem.failJob(
          job.id,
          "Bị chặn bởi robots.txt của máy chủ đích",
          "robots_disallowed"
        );
        return {
          id: job.id,
          url: job.url,
          status: "failed",
          extractedCount: 0,
          validatedCount: 0,
          error: "robots_disallowed",
        };
      }

      // 3. Update heartbeat
      await PersistentJobSystem.updateHeartbeat(job.id);

      // 4. Fetch HTML with timeout and polite headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(job.url, {
        headers: {
          "User-Agent": this.USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errorCategory = resp.status === 429
          ? "rate_limit"
          : resp.status >= 500
          ? "http_5xx"
          : "http_4xx";

        await PersistentJobSystem.failJob(
          job.id,
          `HTTP Error ${resp.status}: ${resp.statusText}`,
          errorCategory,
          resp.status
        );

        return {
          id: job.id,
          url: job.url,
          status: "failed",
          extractedCount: 0,
          validatedCount: 0,
          error: `HTTP ${resp.status}`,
        };
      }

      const html = await resp.text();
      let extractedCount = 0;
      let validatedCount = 0;

      // Fetch university info for clean affiliation records and official domain
      const uni = await UniversityRegistryService.getInstitutionById(job.universityId);
      const uniMeta = uni ? { name: uni.name, shortName: uni.shortName } : undefined;

      // 5. Execution based on Job Type
      if (job.jobType === "discovery") {
        // Run Discovery Engine to find staff directories, internal links, and sitemaps
        const discoveryResult = await InstitutionDiscoveryEngine.discoverInstitutionalUrls({
          institutionId: job.universityId,
          startUrl: job.url,
          html,
          officialDomain: uni?.officialDomain,
          maxPages: 10,
        });

        // Enqueue high-priority directory jobs for discovered staff URLs
        for (const staffUrl of discoveryResult.discoveredStaffUrls) {
          if (staffUrl !== job.url) {
            await PersistentJobSystem.enqueueJob({
              campaignId: job.campaignId,
              universityId: job.universityId,
              url: staffUrl,
              jobType: "directory",
              priority: 20,
              depth: (job.depth || 0) + 1,
              parentJobId: job.id,
            });
          }
        }

        // Also check if discovery page itself lists personnel
        const rawProfessors = dispatchExtraction(html, job.url, job.universityId);
        if (rawProfessors.length > 0) {
          extractedCount = rawProfessors.length;
          for (const raw of rawProfessors) {
            await ValidationService.stageCandidate(raw, job.id);
            const val = ValidationService.validateRawProfessor(raw);
            if (val.isValid && val.status === "validated") {
              await DeduplicationService.resolveAndUpsertLecturer(raw, uniMeta);
              validatedCount++;
            }
          }
        }
      } else {
        // Directory or Profile extraction
        const rawProfessors = dispatchExtraction(html, job.url, job.universityId);
        extractedCount = rawProfessors.length;

        for (const raw of rawProfessors) {
          // Stage candidate
          await ValidationService.stageCandidate(raw, job.id);

          // Validate quality
          const val = ValidationService.validateRawProfessor(raw);
          if (val.isValid && val.status === "validated") {
            // Upsert into production lecturers with review preservation
            await DeduplicationService.resolveAndUpsertLecturer(raw, uniMeta);
            validatedCount++;
          }
        }

        // If directory job, discover pagination links
        if (job.jobType === "directory" && (job.depth || 0) < 15) {
          const pagination = paginationEngine.extractPagination(html, job.url);
          for (const nextUrl of pagination.allPageUrls) {
            if (nextUrl !== job.url) {
              await PersistentJobSystem.enqueueJob({
                campaignId: job.campaignId,
                universityId: job.universityId,
                url: nextUrl,
                jobType: "directory",
                priority: 15,
                depth: (job.depth || 0) + 1,
                parentJobId: job.id,
              });
            }
          }
        }
      }

      // 6. Complete Job Successfully
      await PersistentJobSystem.completeJob(job.id, extractedCount, validatedCount);

      // Record rate limit success
      RateLimiterService.recordSuccess(domain);

      // Sync university telemetry
      await UniversityRegistryService.syncInstitutionStats(
        job.universityId,
        extractedCount,
        validatedCount
      );

      return {
        id: job.id,
        url: job.url,
        status: "succeeded",
        extractedCount,
        validatedCount,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isTimeout = errorMsg.includes("abort") || errorMsg.includes("timeout");
      const errorCategory = isTimeout ? "network_timeout" : "parsing_error";

      RateLimiterService.recordFailure(domain);
      await PersistentJobSystem.failJob(job.id, errorMsg, errorCategory);

      return {
        id: job.id,
        url: job.url,
        status: "failed",
        extractedCount: 0,
        validatedCount: 0,
        error: errorMsg,
      };
    } finally {
      release();
    }
  }
}
