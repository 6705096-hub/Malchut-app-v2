import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.role === 'VIEWER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderIds } = await req.json()
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 })
    }

    // Update all matching orders to 'EXECUTED' status
    const result = await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        // Don't downgrade orders that are already PAID or EXECUTED
        status: { in: ['PLANNED'] }
      },
      data: {
        status: 'EXECUTED',
      }
    })

    return NextResponse.json({ success: true, count: result.count })

  } catch (error: any) {
    console.error('Bulk update error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to update orders', detail: error?.message }, { status: 500 })
  }
}
