import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'No user ID' }, { status: 401 })

    const subscription = await req.json()

    // Validate subscription payload
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Check if it already exists (by endpoint)
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint }
    })

    if (!existing) {
      await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        }
      })
    } else if (existing.userId !== userId) {
      // Endpoint changed ownership?
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId }
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
