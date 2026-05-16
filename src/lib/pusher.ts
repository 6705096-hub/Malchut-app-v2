/**
 * Pusher server-side singleton
 * 
 * Required env vars (add to .env):
 *   PUSHER_APP_ID=your_app_id
 *   PUSHER_KEY=your_key
 *   NEXT_PUBLIC_PUSHER_KEY=your_key   (same as above, exposed to client)
 *   PUSHER_SECRET=your_secret
 *   PUSHER_CLUSTER=eu                  (your cluster, e.g. eu, us2, ap2)
 *   NEXT_PUBLIC_PUSHER_CLUSTER=eu      (same, exposed to client)
 * 
 * Free plan: 200 simultaneous connections, 200k messages/day.
 * Sign up at: https://pusher.com → Channels → Create App
 */
import Pusher from 'pusher'

// Singleton — reuse across hot reloads in dev
const globalForPusher = globalThis as unknown as { pusher?: Pusher }

function createPusher(): Pusher {
  const appId   = process.env.PUSHER_APP_ID
  const key     = process.env.PUSHER_KEY
  const secret  = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || 'eu'

  if (!appId || !key || !secret) {
    throw new Error(
      'Missing Pusher env vars. Add PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET to .env'
    )
  }

  return new Pusher({ appId, key, secret, cluster, useTLS: true })
}

export function getPusher(): Pusher | null {
  // Return null if env vars are not configured (graceful degradation)
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET
  ) {
    return null
  }

  if (!globalForPusher.pusher) {
    globalForPusher.pusher = createPusher()
  }
  return globalForPusher.pusher
}

// ──────────────────────────────────────────
// Channel naming conventions
// ──────────────────────────────────────────
// Group conversation:  chat-conv-{conversationId}
// Status update:       chat-conv-{conversationId}  (same channel, different event)
// User-specific:       chat-user-{userId}          (for DM notifications)

export const PUSHER_EVENTS = {
  NEW_MESSAGE:     'new-message',      // new message in a conversation
  MESSAGE_UPDATED: 'message-updated',  // edited message
  MESSAGE_DELETED: 'message-deleted',  // deleted for everyone
  STATUS_UPDATED:  'status-updated',   // read receipt update
  TYPING:          'typing',           // user is typing
} as const

export function conversationChannel(conversationId: string): string {
  return `chat-conv-${conversationId}`
}

export function userChannel(userId: string): string {
  return `chat-user-${userId}`
}
