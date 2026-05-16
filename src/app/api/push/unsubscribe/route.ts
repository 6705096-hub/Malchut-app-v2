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

    const { endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { 
        endpoint,
        userId
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
