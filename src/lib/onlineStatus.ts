'use client'

/**
 * Determine if a user is "online" based on their lastSeenAt timestamp.
 * Online = seen within the last 2 minutes.
 */

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

export function isUserOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  return diff < ONLINE_THRESHOLD_MS
}

/**
 * Format "last seen" text in Hebrew.
 */
export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return 'לא מחובר'
  
  if (isUserOnline(lastSeenAt)) return 'מחובר/ת'

  const date = new Date(lastSeenAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 60) return `נראה/ת לפני ${diffMinutes} דק׳`
  if (diffHours < 24) return `נראה/ת לפני ${diffHours} שע׳`
  if (diffDays === 1) return `נראה/ת אתמול ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
  return `נראה/ת ${date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
}
