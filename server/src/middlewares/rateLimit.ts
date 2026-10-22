import type { NextFunction, Request, Response } from 'express'
import { HttpError } from './error.js'

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

/** Drop buckets that no longer hold a live hit so the map cannot grow forever. */
function sweep(now: number, maxWindowMs: number): void {
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((time) => now - time < maxWindowMs)
    if (bucket.hits.length === 0) buckets.delete(key)
  }
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
}

export interface RateLimitOptions {
  /**
   * Namespace for the counters. Each limiter needs its own scope so that two
   * rules sharing the same key (for example a per-IP registration limit and a
   * per-IP contact limit) never consume the same budget.
   */
  scope: string
  /** Length of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests allowed inside the window. */
  max: number
  /** Builds the bucket key; defaults to the client IP address. */
  key?: (req: Request) => string
  /** Response message; defaults to the Laravel throttle message. */
  message?: string
}

/**
 * Sliding-window rate limiter.
 *
 * Mirrors the Laravel throttle middleware:
 *   login         -> 5 requests / minute, keyed by lowercased email + IP
 *   registration  -> 10 requests / hour,   keyed by IP
 *   sensitive     -> 10 requests / minute, keyed by user id + IP
 *   contact       -> 10 requests / minute, keyed by IP
 *
 * The counters live in process memory, which matches the single-process
 * deployment model of the reference platform.
 */
export function rateLimit(options: RateLimitOptions) {
  const { scope, windowMs, max, key, message } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()

    if (buckets.size > 5000) sweep(now, Math.max(windowMs, 60 * 60 * 1000))

    const bucketKey = `${scope}:${key ? key(req) : clientIp(req)}`
    let bucket = buckets.get(bucketKey)
    if (!bucket) {
      bucket = { hits: [] }
      buckets.set(bucketKey, bucket)
    }

    bucket.hits = bucket.hits.filter((time) => now - time < windowMs)

    if (bucket.hits.length >= max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - bucket.hits[0])) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      next(new HttpError(429, message ?? 'Too Many Attempts.'))
      return
    }

    bucket.hits.push(now)
    next()
  }
}

/** Test seam: forget every recorded hit. */
export function resetRateLimits(): void {
  buckets.clear()
}
