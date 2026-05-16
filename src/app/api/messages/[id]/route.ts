import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPusher, PUSHER_EVENTS, conversationChannel } from '@/lib/pusher'
import { invalidateConversation } from '@/lib/chatCache'

export const dynamic = 'force-dynamic'

// ──────────────────────────────────────────
// DELETE /api/messages/[id]
// Delete a message.
// Body: { mode: "for_me" | "for_everyone" }
//
// Rules:
//   "for_me"       → Adds current userId to deletedForUsers JSON array
//   "for_everyone" → Sets isDeleted=true, clears text+attachment (only sender or ADMIN can do this)
// ──────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, isChatBanned: true, permissions: true }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (currentUser.isChatBanned) {
      return NextResponse.json({ error: 'Banned from chat' }, { status: 403 })
    }

    const messageId = params.id
    const { mode } = await req.json() as { mode: 'for_me' | 'for_everyone' }

    if (!['for_me', 'for_everyone'].includes(mode)) {
      return NextResponse.json({ error: 'mode must be "for_me" or "for_everyone"' }, { status: 400 })
    }

    // Fetch the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
        isDeleted: true,
        deletedForUsers: true,
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Verify user is a participant of this conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId: currentUser.id
        }
      }
    })
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    if (mode === 'for_me') {
      // Add userId to deletedForUsers array
      const existing = (message.deletedForUsers as string[]) || []
      if (!existing.includes(currentUser.id)) {
        existing.push(currentUser.id)
      }
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedForUsers: existing }
      })

      invalidateConversation(message.conversationId)
      return NextResponse.json({ success: true, mode: 'for_me', messageId })
    }

    // mode === 'for_everyone'
    // Only sender or ADMIN can delete for everyone
    const perms = currentUser.permissions ? JSON.parse(currentUser.permissions as string || '{}') : {}
    const isChatAdmin = currentUser.role === 'ADMIN' || !!perms?._chat?.isAdmin

    if (message.senderId !== currentUser.id && !isChatAdmin) {
      return NextResponse.json(
        { error: 'רק השולח או מנהל יכול למחוק עבור כולם' },
        { status: 403 }
      )
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        text: null,
        attachmentData: null,
        attachmentType: null,
      }
    })

    // Broadcast deletion via Pusher
    const pusher = getPusher()
    if (pusher) {
      pusher.trigger(
        conversationChannel(message.conversationId),
        PUSHER_EVENTS.MESSAGE_DELETED || 'message-deleted',
        { messageId, conversationId: message.conversationId }
      ).catch(() => {})
    }

    invalidateConversation(message.conversationId)
    return NextResponse.json({ success: true, mode: 'for_everyone', messageId })
  } catch (error: any) {
    console.error('DELETE /api/messages/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
