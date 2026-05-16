import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPusher, PUSHER_EVENTS, conversationChannel } from '@/lib/pusher'
import { sendChatPushNotifications } from '@/lib/chatPush'
import { encryptMessage, decryptMessage, isEncryptionEnabled } from '@/lib/chatEncryption'
import { checkRateLimit, sanitizeMessageText } from '@/lib/chatAuth'
import { cacheKey, getCached, setCache, invalidateConversation } from '@/lib/chatCache'
import { parsePermissions } from '@/lib/permissions'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5MB base64 string length limit

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// GET /api/messages?conversationId=xxx&cursor=yyy&limit=50
// Fetch messages for a conversation (paginated)
// ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const perms = parsePermissions(currentUser.permissions) as any
    if (perms?._chat?.isBanned) {
      return NextResponse.json({ error: 'Banned from chat' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const cursor = searchParams.get('cursor')          // last message id for pagination
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const since = searchParams.get('since')            // ISO timestamp for polling
    const search = searchParams.get('search')?.trim()  // text search

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Verify user is a participant of this conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      }
    })
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
    }

    // Build query
    const where: any = {
      conversationId,
      isDeleted: false
    }

    // If polling with "since", only return new messages
    if (since) {
      where.createdAt = { gt: new Date(since) }
    }

    // Text search filter (disabled when encryption is active — can't search ciphertext)
    if (search) {
      if (isEncryptionEnabled()) {
        return NextResponse.json(
          { error: 'חיפוש אינו זמין כאשר הצפנה פעילה', encryptionActive: true },
          { status: 400 }
        )
      }
      where.text = { contains: search, mode: 'insensitive' }
    }

    // Check cache for standard (non-search, non-since) queries
    const ck = (!search && !since) ? cacheKey(conversationId, cursor, limit) : null
    if (ck) {
      const cached = getCached(ck)
      if (cached) return NextResponse.json(cached)
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true }
        },
        receiver: {
          select: { id: true, name: true }
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            sender: { select: { name: true } }
          }
        }
      }
    })

    // Update lastReadAt for this participant (fire-and-forget)
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      },
      data: { lastReadAt: new Date() }
    }).catch(() => {})

    // Decrypt message text fields before sending to client
    const decrypted = messages.map((m: any) => ({
      ...m,
      text: decryptMessage(m.text),
      replyTo: m.replyTo ? {
        ...m.replyTo,
        text: decryptMessage(m.replyTo.text),
      } : null,
    }))

    const response = {
      messages: decrypted,
      hasMore: messages.length === limit,
      cursor: messages.length > 0 ? messages[0].id : null, // first message ID for "load older" cursor
    }

    // Store in cache for standard queries
    if (ck) setCache(ck, response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────
// POST /api/messages
// Send a new message to a conversation
// Body: { conversationId, text?, receiverId?, orderId?, replyToId?, attachmentData?, attachmentType? }
// ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (currentUser.isChatBanned) {
      return NextResponse.json({ error: 'You are banned from chat' }, { status: 403 })
    }

    // Rate limiting
    const rateLimited = checkRateLimit(currentUser.id)
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { conversationId, text, receiverId, orderId, replyToId, attachmentData, attachmentType } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Sanitize text input
    const cleanText = sanitizeMessageText(text)

    if (!cleanText && !attachmentData) {
      return NextResponse.json({ error: 'Message must have text or attachment' }, { status: 400 })
    }

    // Validate attachment size (base64 string length)
    if (attachmentData && attachmentData.length > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { error: `קובץ גדול מדי (${Math.round(attachmentData.length / 1024 / 1024)}MB). מקסימום 5MB.` },
        { status: 413 }
      )
    }

    // Validate attachmentType if provided
    if (attachmentData && !attachmentType) {
      return NextResponse.json({ error: 'attachmentType is required with attachmentData' }, { status: 400 })
    }

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      }
    })
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
    }

    // Encrypt text before persisting
    const plainText  = cleanText
    const storedText = plainText ? encryptMessage(plainText) : null

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        text: storedText,
        senderId: currentUser.id,
        receiverId: receiverId || null,
        orderId: orderId || null,
        replyToId: replyToId || null,
        attachmentData: attachmentData || null,
        attachmentType: attachmentType || null,
        status: 'SENT'
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true, role: true }
        },
        receiver: {
          select: { id: true, name: true }
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            sender: { select: { name: true } }
          }
        }
      }
    })

    // Update conversation's updatedAt to push it to top of list
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    // Invalidate message cache for this conversation
    invalidateConversation(conversationId)

    // Update sender's lastReadAt so they don't see their own message as unread
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      },
      data: { lastReadAt: new Date() }
    })

    // ── Pusher: broadcast new message to all participants in real-time ──
    const pusher = getPusher()
    if (pusher) {
      // Send decrypted text to Pusher (clients receive plaintext via real-time)
      const replyToRaw = (message as any).replyTo
      pusher.trigger(
        conversationChannel(conversationId),
        PUSHER_EVENTS.NEW_MESSAGE,
        {
          id:              message.id,
          conversationId:  message.conversationId,
          text:            plainText,          // already decrypted (was never encrypted yet)
          senderId:        message.senderId,
          receiverId:      message.receiverId,
          orderId:         message.orderId,
          replyToId:       message.replyToId,
          attachmentType:  message.attachmentType,
          status:          message.status,
          isDeleted:       message.isDeleted,
          isEdited:        message.isEdited,
          isPinned:        message.isPinned,
          reactions:       message.reactions,
          createdAt:       message.createdAt,
          sender:          (message as any).sender,
          receiver:        (message as any).receiver,
          replyTo:         replyToRaw ? { ...replyToRaw, text: decryptMessage(replyToRaw.text) } : null,
        }
      ).catch((e: any) => console.error('Pusher trigger error:', e))
    }

    // ── Push Notifications (fire-and-forget, non-blocking) ──
    // Fetch conversation type to know if group or DM
    const conversationMeta = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { isGroup: true }
    }).catch(() => null)

    sendChatPushNotifications({
      conversationId,
      senderId:       currentUser.id,
      senderName:     currentUser.name || 'מישהו',
      messageText:    text?.trim() || null,
      attachmentType: attachmentType || null,
      isGroup:        conversationMeta?.isGroup ?? false,
      receiverId:     receiverId || null,
    }).catch((e) => console.error('Push notification error:', e))

    // Return the message with decrypted text so optimistic UI is consistent
    const responseMsg = {
      ...(message as any),
      text: plainText,
      replyTo: (message as any).replyTo
        ? { ...(message as any).replyTo, text: decryptMessage((message as any).replyTo.text) }
        : null,
    }
    return NextResponse.json(responseMsg, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/messages error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
