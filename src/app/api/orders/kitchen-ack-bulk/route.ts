import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderIds } = body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid orderIds' }, { status: 400 })
    }

    // Record the acknowledgment for each order
    const userId = (session.user as any).id
    
    // We only want to insert if it doesn't already exist for that order, 
    // but orderHistory doesn't have a strict unique constraint for (orderId, action),
    // so we can just do a createMany. Or check first to avoid duplicates.
    const existingAcks = await prisma.orderHistory.findMany({
      where: {
        orderId: { in: orderIds },
        action: 'KITCHEN_ACKNOWLEDGED'
      },
      select: { orderId: true }
    })
    
    const existingIds = existingAcks.map(a => a.orderId)
    const newIds = orderIds.filter(id => !existingIds.includes(id))

    if (newIds.length > 0) {
      await prisma.orderHistory.createMany({
        data: newIds.map(id => ({
          orderId: id,
          userId,
          action: 'KITCHEN_ACKNOWLEDGED'
        }))
      })
    }

    return NextResponse.json({ success: true, acknowledgedCount: newIds.length })
  } catch (err: any) {
    console.error('Failed to bulk acknowledge orders:', err)
    return NextResponse.json({ error: 'Failed to acknowledge orders' }, { status: 500 })
  }
}
