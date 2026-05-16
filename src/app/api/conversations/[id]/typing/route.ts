import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPusher, PUSHER_EVENTS, conversationChannel } from '@/lib/pusher'
import { authenticateChatUser, verifyParticipant, checkRateLimit } from '@/lib/chatAuth'

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// POST /api/conversations/[id]/typing
// Notify that the current user is typing in this conversation.
// Broadcasts via Pusher to all participants.
// ──────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateChatUser()
    if (auth.error) return auth.error

    const rateLimited = checkRateLimit(auth.user.id)
    if (rateLimited) return rateLimited

    const conversationId = params.id

    // Verify user is a participant of this conversation
    const membership = await verifyParticipant(conversationId, auth.user.id)
    if (membership.error) return membership.error

    // Update lastTypingAt on user
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { lastTypingAt: new Date() },
    })

    // Broadcast typing event via Pusher
    const pusher = getPusher()
    if (pusher) {
      pusher.trigger(
        conversationChannel(conversationId),
        PUSHER_EVENTS.TYPING,
        {
          userId: auth.user.id,
          userName: auth.user.name,
          conversationId,
          at: new Date().toISOString(),
        }
      ).catch((e: any) => console.error('Pusher typing error:', e))
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('POST typing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
