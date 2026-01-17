/**
 * Simple in-memory rate limiter for edge functions
 * Limits requests per IP or user ID with sliding window
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on function cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number;      // Max requests in window
  windowMs: number;         // Window size in milliseconds
  identifier: string;       // Unique identifier (IP or user ID)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if request is allowed under rate limit
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const key = config.identifier;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  // Check various headers for client IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP.trim();
  }

  return "unknown";
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Rate limit response for blocked requests
 */
export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...rateLimitHeaders(result),
      },
    }
  );
}
