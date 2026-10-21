/**
 * RateUrProfs In-Memory Sliding-Window Rate Limiter for Email Endpoints
 *
 * Protects against:
 * - Email enumeration attacks
 * - Spam / inbox flooding
 * - Resource exhaustion
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitBuckets = new Map<string, RateLimitRecord>();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitBuckets.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
    if (record.timestamps.length === 0) {
      rateLimitBuckets.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkEmailRateLimit(
  action: string,
  identifier: string,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const key = `${action}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();

  let record = rateLimitBuckets.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitBuckets.set(key, record);
  }

  // Filter timestamps within sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
  };
}
