/**
 * In-memory rate limiter for Vercel serverless functions.
 *
 * Note: Each serverless instance has its own memory, so limits reset on cold start.
 * This is sufficient to prevent burst abuse within a single instance lifetime.
 * For production-grade rate limiting, use Vercel KV or Upstash Redis.
 */

const buckets = new Map();

const MAX_BUCKETS = 5000;

function cleanup() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // If still too many, remove oldest entries
  if (buckets.size > MAX_BUCKETS) {
    const entries = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = entries.slice(0, entries.length - MAX_BUCKETS + 500);
    for (const [key] of toRemove) buckets.delete(key);
  }
}

/**
 * Check if a request is within rate limits.
 * @param {string} userId - User identifier
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds (default: 1 hour)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(userId, maxRequests = 20, windowMs = 3600000) {
  // PUBLIC_API_MODE — bypass rate-limit pentru testare pre-lansare.
  const publicMode = (process.env.PUBLIC_API_MODE || "").trim().toLowerCase();
  if (publicMode && publicMode !== "0" && publicMode !== "false" && publicMode !== "no") {
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs };
  }
  const now = Date.now();
  const key = userId;

  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  cleanup();

  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Send 429 Too Many Requests response.
 * @param {import('http').ServerResponse} res
 * @param {{ resetAt: number }} limit
 */
export function sendRateLimitError(res, limit) {
  const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000);
  res.setHeader("Retry-After", String(Math.max(1, retryAfter)));
  res.status(429).json({
    error: "Prea multe cereri. Incercati din nou mai tarziu.",
    retryAfterSeconds: Math.max(1, retryAfter),
  });
}

/**
 * Max file size check for base64-encoded uploads.
 * @param {string} base64Data - Base64 encoded string
 * @param {number} maxBytes - Max decoded size in bytes (default: 5 MB)
 * @returns {boolean} true if within limit
 */
export function checkFileSize(base64Data, maxBytes = 5_242_880) {
  if (!base64Data || typeof base64Data !== "string") return false;
  // Base64 encodes 3 bytes as 4 chars, so decoded size ~ length * 0.75
  const stripped = base64Data.replace(/^data:[^;]+;base64,/, "");
  const estimatedBytes = stripped.length * 0.75;
  return estimatedBytes <= maxBytes;
}
