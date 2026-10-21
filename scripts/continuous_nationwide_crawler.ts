/**
 * Continuous Nationwide Crawler Daemon — RateUrProfs Vietnam
 *
 * Autonomous, fault-tolerant background crawler daemon that crawls, stages,
 * validates, deduplicates, and persists faculty across all 1,275 Vietnamese
 * universities and institutes until complete.
 *
 * Usage:
 *   npx tsx scripts/continuous_nationwide_crawler.ts [--concurrency=5] [--idle-ms=3000]
 */

import { CrawlerWorker } from "../src/lib/server/crawler/worker";
import { PersistentJobSystem } from "../src/lib/server/crawler/jobSystem";
import { CampaignManager } from "../src/lib/server/crawler/campaignManager";
import { getPostgresPool, isPostgresConfigured, initPostgresSchema } from "../src/lib/server/postgresClient";
import { getSqliteDb } from "../src/lib/server/sqliteClient";

// Common Vietnamese university staff paths for direct probing
const KNOWN_STAFF_PATHS = [
  "/can-bo",
  "/giang-vien",
  "/nhan-su",
  "/doi-ngu-giang-vien",
  "/doi-ngu-can-bo",
  "/gioi-thieu/can-bo",
  "/gioi-thieu/doi-ngu-giang-vien",
  "/khoa-vien",
  "/khoa-bo-mon",
  "/danh-ba",
  "/danh-sach-can-bo",
];

// CLI configuration
function parseArgs() {
  const args = process.argv.slice(2);
  let concurrency = 5;
  let batchSize = 5;
  let idleMs = 3000;
  let heartbeatIntervalMs = 30000;

  for (const arg of args) {
    if (arg.startsWith("--concurrency=")) {
      concurrency = Math.max(1, Math.min(20, parseInt(arg.split("=")[1], 10) || 5));
    } else if (arg.startsWith("--batch-size=")) {
      batchSize = Math.max(1, Math.min(20, parseInt(arg.split("=")[1], 10) || 5));
    } else if (arg.startsWith("--idle-ms=")) {
      idleMs = Math.max(1000, parseInt(arg.split("=")[1], 10) || 3000);
    } else if (arg.startsWith("--heartbeat=")) {
      heartbeatIntervalMs = Math.max(5000, parseInt(arg.split("=")[1], 10) || 30000);
    }
  }

  return { concurrency, batchSize, idleMs, heartbeatIntervalMs };
}

function print(msg: string) {
  process.stdout.write(msg + "\n");
}

async function main() {
  const config = parseArgs();
  let isRunning = true;
  const startTime = Date.now();

  print("==============================================================================");
  print(" CONTINUOUS NATIONWIDE CRAWLER DAEMON — RATEURPROFS VIETNAM");
  print("==============================================================================");
  print(`[*] Configuration:`);
  print(`    - Concurrency / Batch Size: ${config.batchSize}`);
  print(`    - Idle Interval:            ${config.idleMs} ms`);
  print(`    - Heartbeat Interval:        ${config.heartbeatIntervalMs} ms`);
  print(`    - Database Backend:          ${isPostgresConfigured() ? "Cloud SQL PostgreSQL" : "SQLite"}`);
  print("==============================================================================\n");

  // Verify database connection and schema
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();
    await initPostgresSchema(pool);
    print("[+] PostgreSQL connection & schema verified.");
  }

  // Session telemetry counters
  const sessionStats = {
    totalTicks: 0,
    jobsProcessed: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    professorsExtracted: 0,
    professorsValidated: 0,
  };

  // Graceful shutdown registration
  const shutdown = (signal: string) => {
    console.log(`\n[!] Received ${signal}. Initiating graceful shutdown...`);
    isRunning = false;
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Initial recovery of any stale jobs
  try {
    const recovered = await PersistentJobSystem.recoverStaleJobs(300);
    if (recovered > 0) {
      console.log(`[*] Recovered ${recovered} stale crawl jobs from previous sessions.`);
    }
  } catch (err: any) {
    console.warn(`[!] Initial stale job recovery notice: ${err?.message || err}`);
  }

  let lastHeartbeatTime = Date.now();
  let lastSeedCheckTime = 0;

  // Main continuous crawler loop
  while (isRunning) {
    try {
      sessionStats.totalTicks++;

      // 1. Check queue depth and seed pending/partial universities if queue is low
      const now = Date.now();
      if (now - lastSeedCheckTime > 20000) {
        lastSeedCheckTime = now;
        await seedPendingUniversitiesIfNeeded();
      }

      // 2. Execute worker tick (round-robining active running campaigns)
      const activeCampaignId = await getNextActiveCampaignId();
      const tickResult = await CrawlerWorker.tick(config.batchSize, activeCampaignId);

      if (tickResult.processedCount > 0) {
        sessionStats.jobsProcessed += tickResult.processedCount;
        sessionStats.jobsSucceeded += tickResult.succeededCount;
        sessionStats.jobsFailed += tickResult.failedCount;

        for (const j of tickResult.jobs) {
          sessionStats.professorsExtracted += j.extractedCount;
          sessionStats.professorsValidated += j.validatedCount;

          if (j.status === "succeeded") {
            const extra = j.validatedCount > 0
              ? ` -> 🎯 ${j.validatedCount} validated professors persisted`
              : j.extractedCount > 0
              ? ` -> 🔍 ${j.extractedCount} raw candidates found`
              : " -> (0 candidates)";
            print(`[Job Succeeded] ${j.url.slice(0, 75)}${extra}`);
          } else {
            print(`[Job Failed]    ${j.url.slice(0, 75)} -> ${j.error || "unknown error"}`);
          }
        }
      }

      // 3. Sync all running campaigns periodically
      if (sessionStats.totalTicks % 5 === 0) {
        await syncActiveCampaigns();
      }

      // 4. Structured Heartbeat Telemetry Logging
      if (now - lastHeartbeatTime >= config.heartbeatIntervalMs) {
        lastHeartbeatTime = now;
        await logHeartbeatTelemetry(startTime, sessionStats);
      }

      // 5. Politeness delay when queue was empty or after tick
      if (tickResult.processedCount === 0) {
        // Queue is momentarily empty, recover stale jobs and sleep
        await PersistentJobSystem.recoverStaleJobs(120);
        await sleep(config.idleMs);
      } else {
        // Small yield to event loop
        await sleep(200);
      }
    } catch (loopError: any) {
      console.error("[!] Crawler loop error caught (daemon will continue):", loopError?.message || loopError);
      await sleep(2000);
    }
  }

  console.log("\n==============================================================================");
  console.log(" CRAWLER DAEMON SHUTDOWN COMPLETE");
  console.log(` Total Jobs Processed:     ${sessionStats.jobsProcessed}`);
  console.log(` Total Jobs Succeeded:     ${sessionStats.jobsSucceeded}`);
  console.log(` Total Jobs Failed:        ${sessionStats.jobsFailed}`);
  console.log(` Total Validated Added:    ${sessionStats.professorsValidated}`);
  console.log("==============================================================================");
}

/**
 * Ensures pending or partial universities have active crawl jobs in the queue.
 */
async function seedPendingUniversitiesIfNeeded() {
  try {
    const queueStats = await PersistentJobSystem.getQueueStats();
    if (queueStats.queued >= 100) {
      return; // Queue already has plenty of pending work
    }

    const neededCount = 10; // Batch of universities to seed

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      // Select institutions with priority: pending (0 profs) or partial (< 50 profs)
      const res = await pool.query(
        `SELECT id, name, short_name, official_website, official_domain, total_professors
         FROM universities
         WHERE (total_professors < 50 OR crawl_status IN ('pending', 'partial'))
           AND (official_website IS NOT NULL OR official_domain IS NOT NULL)
         ORDER BY total_professors ASC, id ASC
         LIMIT $1`,
        [neededCount]
      );

      for (const uni of res.rows) {
        const rootUrl = uni.official_website || `https://${uni.official_domain}`;
        const cleanRoot = rootUrl.replace(/\/+$/, "");

        // 1. Root discovery job
        await PersistentJobSystem.enqueueJob({
          universityId: uni.id,
          url: cleanRoot,
          jobType: "discovery",
          priority: 15,
          depth: 0,
        });

        // 2. High-priority known staff directory URLs
        for (const subPath of KNOWN_STAFF_PATHS.slice(0, 4)) {
          const targetUrl = `${cleanRoot}${subPath}`;
          await PersistentJobSystem.enqueueJob({
            universityId: uni.id,
            url: targetUrl,
            jobType: "directory",
            priority: 25,
            depth: 1,
          });
        }
      }
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = db.prepare(
        `SELECT id, name, short_name, official_website, official_domain, total_professors
         FROM universities
         WHERE (total_professors < 50 OR crawl_status IN ('pending', 'partial'))
           AND (official_website IS NOT NULL OR official_domain IS NOT NULL)
         ORDER BY total_professors ASC, id ASC
         LIMIT ?`
      ).all(neededCount) as any[];

      for (const uni of rows) {
        const rootUrl = uni.official_website || `https://${uni.official_domain}`;
        const cleanRoot = rootUrl.replace(/\/+$/, "");

        await PersistentJobSystem.enqueueJob({
          universityId: uni.id,
          url: cleanRoot,
          jobType: "discovery",
          priority: 15,
          depth: 0,
        });

        for (const subPath of KNOWN_STAFF_PATHS.slice(0, 4)) {
          const targetUrl = `${cleanRoot}${subPath}`;
          await PersistentJobSystem.enqueueJob({
            universityId: uni.id,
            url: targetUrl,
            jobType: "directory",
            priority: 25,
            depth: 1,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[!] Seed pending universities check error: ${err?.message || err}`);
  }
}

let runningCampaignsCache: string[] = [];
let campaignRoundRobinIndex = 0;
let lastCampaignLookup = 0;

async function getNextActiveCampaignId(): Promise<string | undefined> {
  const now = Date.now();
  if (now - lastCampaignLookup > 8000 || runningCampaignsCache.length === 0) {
    lastCampaignLookup = now;
    try {
      if (isPostgresConfigured()) {
        const pool = getPostgresPool();
        const res = await pool.query(
          "SELECT id FROM crawl_campaigns WHERE status = 'running' ORDER BY created_at DESC"
        );
        runningCampaignsCache = res.rows.map((r) => r.id);
      } else {
        const db = getSqliteDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = db.prepare(
          "SELECT id FROM crawl_campaigns WHERE status = 'running' ORDER BY created_at DESC"
        ).all() as any[];
        runningCampaignsCache = rows.map((r) => r.id);
      }
    } catch {
      runningCampaignsCache = [];
    }
  }

  if (runningCampaignsCache.length === 0) return undefined;
  const cid = runningCampaignsCache[campaignRoundRobinIndex % runningCampaignsCache.length];
  campaignRoundRobinIndex++;
  return cid;
}

/**
 * Synchronizes progress and telemetry for all active campaigns
 */
async function syncActiveCampaigns() {
  try {
    let runningCampaignIds: string[] = [];
    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const res = await pool.query(
        "SELECT id FROM crawl_campaigns WHERE status = 'running'"
      );
      runningCampaignIds = res.rows.map((r) => r.id);
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = db.prepare("SELECT id FROM crawl_campaigns WHERE status = 'running'").all() as any[];
      runningCampaignIds = rows.map((r) => r.id);
    }

    for (const cid of runningCampaignIds) {
      await CampaignManager.syncCampaignProgress(cid);
    }
  } catch (err: any) {
    console.warn(`[!] Campaign sync error: ${err?.message || err}`);
  }
}

/**
 * Logs structured telemetry heartbeat every 30 seconds
 */
async function logHeartbeatTelemetry(
  startTime: number,
  sessionStats: {
    totalTicks: number;
    jobsProcessed: number;
    jobsSucceeded: number;
    jobsFailed: number;
    professorsExtracted: number;
    professorsValidated: number;
  }
) {
  const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
  const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

  try {
    const queueStats = await PersistentJobSystem.getQueueStats();

    let totalUniversities = 0;
    let completeUnis = 0;
    let partialUnis = 0;
    let totalLecturers = 0;

    if (isPostgresConfigured()) {
      const pool = getPostgresPool();
      const uniRes = await pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN total_professors >= 50 THEN 1 END) as complete,
           COUNT(CASE WHEN total_professors > 0 AND total_professors < 50 THEN 1 END) as partial
         FROM universities`
      );
      const lecRes = await pool.query("SELECT COUNT(*) as count FROM lecturers");
      totalUniversities = parseInt(uniRes.rows[0].total || "0", 10);
      completeUnis = parseInt(uniRes.rows[0].complete || "0", 10);
      partialUnis = parseInt(uniRes.rows[0].partial || "0", 10);
      totalLecturers = parseInt(lecRes.rows[0].count || "0", 10);
    } else {
      const db = getSqliteDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniRow = db.prepare(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN total_professors >= 50 THEN 1 END) as complete,
           COUNT(CASE WHEN total_professors > 0 AND total_professors < 50 THEN 1 END) as partial
         FROM universities`
      ).get() as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lecRow = db.prepare("SELECT COUNT(*) as count FROM lecturers").get() as any;
      totalUniversities = uniRow?.total || 0;
      completeUnis = uniRow?.complete || 0;
      partialUnis = uniRow?.partial || 0;
      totalLecturers = lecRow?.count || 0;
    }

    const coveragePct = totalUniversities > 0
      ? (((completeUnis + partialUnis * 0.5) / totalUniversities) * 100).toFixed(1)
      : "0.0";

    print("\n------------------------------------------------------------------------------");
    print(`[HEARTBEAT] Elapsed: ${elapsedSec}s | Memory: ${memMb} MB | Ticks: ${sessionStats.totalTicks}`);
    print(`[*] Job Queue:      Queued: ${queueStats.queued} | Running: ${queueStats.running} | Succeeded: ${queueStats.succeeded} | Failed: ${queueStats.failed}`);
    print(`[*] Nationwide:     Coverage: ${coveragePct}% | Complete: ${completeUnis} | Partial: ${partialUnis} | Total Inst: ${totalUniversities}`);
    print(`[*] Lecturers:      Total Verified: ${totalLecturers} (+${sessionStats.professorsValidated} this session)`);
    print(`[*] Session Totals: Processed: ${sessionStats.jobsProcessed} | Succeeded: ${sessionStats.jobsSucceeded} | Failed: ${sessionStats.jobsFailed}`);
    print("------------------------------------------------------------------------------\n");
  } catch (err: any) {
    console.warn(`[!] Heartbeat stats error: ${err?.message || err}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Fatal daemon crash:", err);
  process.exit(1);
});
