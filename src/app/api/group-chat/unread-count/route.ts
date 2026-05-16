import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, lastChatReadAt: true }
    })

    if (!currentUser) {
      return NextResponse.json({ unreadCount: 0 })
    }

    // Count messages created after lastChatReadAt, or if never read, count all
    const amount = await prisma.groupMessage.count({
      where: {
        AND: [
          { userId: { not: currentUser.id } }, // Don't count my own messages
          currentUser.lastChatReadAt ? { createdAt: { gt: currentUser.lastChatReadAt } } : {}
        ]
      }
    })

    return NextResponse.json({ unreadCount: amount })
  } catch (error: any) {
    console.error('Failed to GET unread-count', error)
    return NextResponse.json({ unreadCount: 0 })
  }
}
