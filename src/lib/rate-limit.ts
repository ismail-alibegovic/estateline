import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface RateLimitStore {
  count: number
  resetTime: number
}

const memoryStore = new Map<string, RateLimitStore>()

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now()
  Array.from(memoryStore.entries()).forEach(([key, val]) => {
    if (now > val.resetTime) {
      memoryStore.delete(key)
    }
  })
}, 5 * 60 * 1000)

/**
 * Lightweight token bucket rate limiter for public API endpoints.
 * @param req NextRequest
 * @param limit Maximum requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export async function checkRateLimit(
  req: NextRequest,
  limit: number = 30,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
  const path = req.nextUrl.pathname
  const key = `${ip}:${path}`
  const now = Date.now()

  // Try Upstash Redis if configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    try {
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, Math.ceil(windowMs / 1000)],
          ['TTL', key]
        ])
      })
      if (res.ok) {
        const data = await res.json()
        const count = data[0]?.result || 1
        const ttl = data[2]?.result || Math.ceil(windowMs / 1000)
        return {
          success: count <= limit,
          limit,
          remaining: Math.max(0, limit - count),
          reset: now + ttl * 1000
        }
      }
    } catch (e) {
      // Fallback to in-memory store if Redis request fails
    }
  }

  // Memory fallback
  let entry = memoryStore.get(key)
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs }
    memoryStore.set(key, entry)
  } else {
    entry.count += 1
  }

  return {
    success: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetTime
  }
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
