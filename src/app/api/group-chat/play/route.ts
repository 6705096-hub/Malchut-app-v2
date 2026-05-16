import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    const email = session?.user?.email

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { messageId } = await req.json()

    if (!messageId) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 })
    }

    const now = new Date()
    await prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId, userId: currentUser.id } },
      update: { playedAt: now, readAt: now }, // Playing implies reading
      create: { messageId, userId: currentUser.id, playedAt: now, readAt: now }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to post play status', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
