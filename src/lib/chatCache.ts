/**
 * chatCache — Simple in-memory cache for chat message queries.
 *
 * LRU-style TTL cache. Keys are "conversationId:cursor:limit".
 * Invalidated when new messages are posted to a conversation.
 *
 * Keeps at most MAX_ENTRIES to prevent memory bloat.
 */

const MAX_ENTRIES = 200
const TTL_MS = 30_000 // 30 seconds

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/** Build a cache key from query params */
export function cacheKey(conversationId: string, cursor?: string | null, limit?: number): string {
  return `${conversationId}:${cursor || 'head'}:${limit || 50}`
}

/** Get a cached response (returns null if expired or missing) */
export function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

/** Store a response in cache */
export function setCache(key: string, data: any): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

/** Invalidate all cache entries for a conversation (called on new message / delete) */
export function invalidateConversation(conversationId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${conversationId}:`)) {
      cache.delete(key)
    }
  }
}
