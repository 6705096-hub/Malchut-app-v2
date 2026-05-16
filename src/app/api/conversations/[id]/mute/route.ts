import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MUTE_SETTING_KEY = 'chat.allowUserMute'

// ──────────────────────────────────────────
// PUT /api/conversations/[id]/mute
// Mute or unmute a conversation for the current user.
// Body: { muted: boolean }
// 
// Rules:
//   1. User must be a participant of the conversation
//   2. allowUserMute must be true in SystemSettings (set by admin)
//   3. Admins can always mute regardless of the setting
// ──────────────────────────────────────────
export async function PUT(
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
      select: { id: true, role: true }
    })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const conversationId = params.id
    const { muted } = await req.json()
    if (typeof muted !== 'boolean') {
      return NextResponse.json({ error: 'muted must be a boolean' }, { status: 400 })
    }

    // Check if user is a participant
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

    // Non-admins must check the global allowUserMute setting
    if (currentUser.role !== 'ADMIN') {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: MUTE_SETTING_KEY }
      })
      const allowUserMute = setting?.value === 'true'

      if (!allowUserMute) {
        return NextResponse.json(
          { error: 'השתקת שיחות אינה מופעלת במערכת. פנה למנהל.' },
          { status: 403 }
        )
      }
    }

    // Update isMuted
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      },
      data: { isMuted: muted }
    })

    return NextResponse.json({
      success: true,
      conversationId,
      muted
    })
  } catch (error: any) {
    console.error('PUT /api/conversations/[id]/mute error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
