import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { startOfDay } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { path } = await req.json().catch(() => ({ path: null }))
    const now = new Date()
    const today = startOfDay(now)

    // Find current user status
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenAt: true }
    })

    let minsToAdd = 0
    if (userRow?.lastSeenAt) {
      const diffMs = now.getTime() - userRow.lastSeenAt.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      // Only count if it's within the expected heartbeat window (e.g., < 3 mins)
      // We expect a heartbeat every 1 min, so if it's been less than 3, we add the diff.
      // If they were gone for 10 minutes, we assume they closed the app so we don't count the middle gap.
      // Since it runs minutely, we just add 1 minute on every heartbeat.
      if (diffMins > 0 && diffMins <= 5) {
        minsToAdd = diffMins
      } else if (diffMins === 0) {
        // Less than 1 min passed, wait. Or we just add 1 if we prefer (handled by frontend logic).
      }
    }

    // Always update lastSeenAt
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: now,
        lastPath: path || undefined
      }
    })

    // If minsToAdd > 0, log it globally for today
    if (minsToAdd > 0) {
      await prisma.userActivityLog.upsert({
        where: {
          userId_date: {
            userId: userId,
            date: today
          }
        },
        update: {
          activeMins: { increment: minsToAdd }
        },
        create: {
          userId: userId,
          date: today,
          activeMins: minsToAdd
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
