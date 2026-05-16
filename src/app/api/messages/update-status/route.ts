import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPusher, PUSHER_EVENTS, conversationChannel } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// PUT /api/messages/update-status
// Mark messages as READ for the current user
// Body: { messageIds: string[] } OR { conversationId: string }
// ──────────────────────────────────────────
export async function PUT(req: NextRequest) {
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

    const body = await req.json()
    const { messageIds, conversationId } = body

    if (!messageIds && !conversationId) {
      return NextResponse.json(
        { error: 'Provide either messageIds or conversationId' },
        { status: 400 }
      )
    }

    let updatedCount = 0

    if (conversationId) {
      // Mark ALL unread messages in a conversation as READ
      // Only messages NOT sent by the current user
      const result = await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: currentUser.id },
          status: { not: 'READ' },
          isDeleted: false
        },
        data: {
          status: 'READ'
        }
      })
      updatedCount = result.count

      // Also update participant's lastReadAt
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: currentUser.id
          }
        },
        data: { lastReadAt: new Date() }
      }).catch(() => {})

    } else if (Array.isArray(messageIds) && messageIds.length > 0) {
      // Mark specific messages as READ
      // Only if the current user is NOT the sender
      const result = await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          senderId: { not: currentUser.id },
          status: { not: 'READ' }
        },
        data: {
          status: 'READ'
        }
      })
      updatedCount = result.count
    }

    // ── Pusher: notify conversation that messages were read ──
    if (updatedCount > 0 && conversationId) {
      const pusher = getPusher()
      if (pusher) {
        pusher.trigger(
          conversationChannel(conversationId),
          PUSHER_EVENTS.STATUS_UPDATED,
          {
            conversationId,
            readByUserId: currentUser.id,
            readByName:   currentUser.name,
            status:       'READ',
            updatedCount,
            at:           new Date().toISOString(),
          }
        ).catch((e: any) => console.error('Pusher status trigger error:', e))
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount
    })
  } catch (error: any) {
    console.error('PUT /api/messages/update-status error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
