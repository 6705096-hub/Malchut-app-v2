/**
 * Chat Push Notifications — server-side utility
 * 
 * Uses the existing web-push + PushSubscription model.
 * Sends notifications only to the correct recipients:
 *  - DM:    only the receiverId (not the sender)
 *  - Group: all ConversationParticipant except the sender
 * 
 * Respects mute:
 *  - If allowUserMute is true in SystemSettings AND the participant has isMuted=true
 *    → notification is skipped for that participant
 */

import webpush from 'web-push'
import prisma from '@/lib/prisma'

const MUTE_SETTING_KEY = 'chat.allowUserMute'

// Configure VAPID once (safe to call multiple times)
let vapidConfigured = false
function ensureVapidConfigured() {
  if (vapidConfigured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT || 'mailto:admin@malchut.com'
  if (!pub || !priv) return
  webpush.setVapidDetails(subj, pub, priv)
  vapidConfigured = true
}

interface SendChatNotificationOptions {
  conversationId: string
  senderId:       string
  senderName:     string
  messageText:    string | null
  attachmentType: string | null
  isGroup:        boolean
  receiverId?:    string | null
}

export async function sendChatPushNotifications(opts: SendChatNotificationOptions): Promise<void> {
  ensureVapidConfigured()

  const { conversationId, senderId, senderName, messageText, attachmentType, isGroup, receiverId } = opts

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  // Check whether mute is globally enabled (one DB read, cached-style)
  const muteSetting = await prisma.systemSetting.findUnique({
    where: { key: MUTE_SETTING_KEY },
    select: { value: true }
  })
  const muteFeatureEnabled = muteSetting?.value === 'true'

  // Determine recipient participants (need isMuted field)
  let participants: { userId: string; isMuted: boolean }[]

  if (!isGroup && receiverId) {
    // DM — only the receiver
    const p = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: receiverId } },
      select: { userId: true, isMuted: true }
    })
    participants = p ? [p] : []
  } else {
    // Group — all participants except sender, including isMuted
    participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: senderId },
      },
      select: { userId: true, isMuted: true },
    })
  }

  if (participants.length === 0) return

  // Filter out muted participants (only when mute feature is globally on)
  const activeRecipients = muteFeatureEnabled
    ? participants.filter(p => !p.isMuted)
    : participants

  if (activeRecipients.length === 0) return

  const recipientUserIds = activeRecipients.map(p => p.userId)

  // Fetch push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: recipientUserIds } },
    select: { endpoint: true, p256dh: true, auth: true, userId: true },
  })

  if (subscriptions.length === 0) return

  // Build notification payload
  const bodyText = attachmentType
    ? attachmentType.startsWith('image') ? '🖼️ שלח/ה תמונה'
    : attachmentType.startsWith('audio') ? '🎤 הודעה קולית'
    : '📎 קובץ מצורף'
    : (messageText ? messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '') : '')

  const title = isGroup ? `💬 ${senderName} בקבוצה` : `💬 ${senderName}`

  const payload = JSON.stringify({
    title,
    body: bodyText,
    url: '/',
    conversationId,
    tag: `chat-${conversationId}`,
  })

  // Send in parallel, remove stale subscriptions
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        payload
      )
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint },
        }).catch(() => {})
      }
    }
  })

  Promise.allSettled(sendPromises).catch(() => {})
}
