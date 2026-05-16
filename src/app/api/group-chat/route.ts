import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

// Set up web-push safely
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

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

    // Update last read time safely via async fire-and-forget or await
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { lastChatReadAt: new Date() }
    })

    // Fetch messages
    const messages = await prisma.groupMessage.findMany({
      orderBy: { createdAt: 'asc' },
      where: {
        AND: [
          {
            NOT: {
              hiddenFor: {
                has: currentUser.id
              }
            }
          },
          {
            OR: [
              { targetUserId: null }, // Global messages
              { targetUserId: currentUser.id }, // Private messages to me
              { userId: currentUser.id } // Private messages from me
            ]
          }
        ]
      },
      take: 1000, 
      include: {
        user: { select: { id: true, name: true, role: true, image: true, isChatBanned: true } },
        replyTo: { select: { id: true, content: true, user: { select: { name: true } } } },
        receipts: { select: { id: true, userId: true, readAt: true, playedAt: true, user: { select: { name: true } } } }
      }
    })

    const teamMembers = await prisma.user.findMany({
      where: { role: { not: 'PENDING' }, isActive: true },
      select: { id: true, name: true, image: true, role: true, lastSeenAt: true },
      orderBy: { role: 'asc' }
    })

    const totalActiveUsers = teamMembers.length

    // Get typing users (anyone who typed in the last 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000)
    const typingUsers = await prisma.user.findMany({
      where: {
        lastTypingAt: { gt: fiveSecondsAgo },
        id: { not: currentUser.id }
      },
      select: { name: true }
    })

    // Return custom payload to include totalActiveUsers, teamMembers, and typingUsers
    return NextResponse.json({ messages, totalActiveUsers, teamMembers, typingUsers: typingUsers.map(u => u.name) })
  } catch (error: any) {
    console.error('Failed to GET group chat', error)
    require('fs').writeFileSync('api-error.txt', String(error.stack || error))
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser || currentUser.isChatBanned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { content, replyToId, attachmentData, attachmentType, mentionedIds, targetUserId } = await req.json()

    if ((!content || !content.trim()) && !attachmentData) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    const message = await prisma.groupMessage.create({
      data: {
        content: content ? content.trim() : '',
        userId: currentUser.id,
        targetUserId: targetUserId || null,
        replyToId: replyToId || null,
        attachmentData: attachmentData || null,
        attachmentType: attachmentType || null,
        mentionedUsers: Array.isArray(mentionedIds) ? mentionedIds : []
      },
      include: {
        user: { select: { id: true, name: true, role: true, image: true } },
        replyTo: { select: { id: true, content: true, user: { select: { name: true } } } }
      }
    })

    // Also update current user lastChatReadAt so they don't get unread notification for their own message
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { lastChatReadAt: new Date() }
    })

    // Async push notifications to other users
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      // Intentionally not awaiting this so we return faster
      prisma.user.findMany({
        where: { 
          id: { not: currentUser.id }, 
          pushSubscriptions: { some: {} },
          isActive: true
        },
        include: { pushSubscriptions: true }
      }).then(async (notifiableUsers) => {
        const bodyPreview = (content ? content.substring(0, 100) : (attachmentType?.startsWith('audio') ? '🎤 הודעה קולית' : (attachmentType === 'poll' ? '📊 סקר חדש' : '🖼️ קובץ מצורף'))) + (content?.length > 100 ? '...' : '')
        
        for (const user of notifiableUsers) {
          const isMentioned = Array.isArray(mentionedIds) && mentionedIds.includes(user.id)
          
          const payload = JSON.stringify({
            title: isMentioned ? `🔔 ${currentUser.name} תייג אותך מלכות!` : `צ'אט מלכות: ${currentUser.name || 'משתמש'}`,
            body: bodyPreview,
            url: '/' // When clicking the notification
          })
          
          for (const sub of user.pushSubscriptions) {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { auth: sub.auth, p256dh: sub.p256dh }
              }, payload).catch(() => {})
            } catch(e) {}
          }
        }
      }).catch(console.error)
    }

    return NextResponse.json(message)
  } catch (error: any) {
    console.error('Failed to POST group chat', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
