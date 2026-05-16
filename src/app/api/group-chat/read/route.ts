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

    const { messageIds } = await req.json()

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: true })
    }

    // Upsert receipts for each message
    const now = new Date()
    for (const msgId of messageIds) {
      await prisma.messageReceipt.upsert({
        where: { messageId_userId: { messageId: msgId, userId: currentUser.id } },
        update: { readAt: now },
        create: { messageId: msgId, userId: currentUser.id, readAt: now }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to post reads', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
