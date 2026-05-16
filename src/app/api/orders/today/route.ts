import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { startOfDay, endOfDay } from 'date-fns'
import { applyOrderDataScope } from '@/lib/data-access'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const newOrders = await prisma.order.findMany({
      where: applyOrderDataScope(session, {
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }),
      include: {
        customer: true,
        createdBy: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ orders: newOrders })
  } catch (error) {
    console.error('Error fetching today orders:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
