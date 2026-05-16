import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { subMinutes } from 'date-fns'
import { getSession } from '@/lib/session'
import { applyOrderDataScope } from '@/lib/data-access'

export const dynamic = 'force-dynamic'

// GET /api/orders/recent?since=ISOString
// Returns any orders created after `since` that have HOT items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sinceParam = searchParams.get('since')
    
    // Default to looking back 5 minutes if no since attached
    const sinceDate = sinceParam ? new Date(sinceParam) : subMinutes(new Date(), 5)
    
    const session = await getSession()

    const recentOrders = await prisma.order.findMany({
      where: applyOrderDataScope(session, {
        createdAt: {
          gt: sinceDate
        },
        items: {
          some: {
            variant: {
              not: 'COLD'
            }
          }
        },
        histories: {
          none: {
            action: 'KITCHEN_ACKNOWLEDGED'
          }
        }
      }),
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const acks = await prisma.orderHistory.findMany({
      where: {
        action: 'KITCHEN_ACKNOWLEDGED'
      },
      select: { orderId: true }
    })
    const acknowledgedOrderIds = acks.map(a => a.orderId)

    return NextResponse.json({ success: true, orders: recentOrders, acknowledgedOrderIds })
  } catch (error: any) {
    console.error('Failed to fetch recent orders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch recent orders' }, { status: 500 })
  }
}
