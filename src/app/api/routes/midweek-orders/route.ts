import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { startOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    if (!dateStr) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

    const targetDate = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
    const targetDayName = dayNames[targetDate.getDay()]
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 0 }).toISOString()

    // Find all active orders for this date in Beit Shemesh
    const orders = await prisma.order.findMany({
      where: {
        city: 'בית שמש',
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName },
          { deliveryWeek: targetWeekStart, deliveryDay: targetDayName }
        ]
      },
      select: {
        id: true,
        customer: {
          select: {
            name: true,
            address: true
          }
        },
        address: true,
        customZone: true,
        routeId: true
      },
      orderBy: {
        customer: { name: 'asc' }
      }
    })

    // Map into a clean DTO
    const cleanOrders = orders.map(o => ({
      id: o.id,
      customerName: o.customer.name,
      address: o.address || o.customer.address || o.customZone || 'ללא כתובת',
      routeId: o.routeId
    }))

    return NextResponse.json({ success: true, orders: cleanOrders })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch midweek orders' }, { status: 500 })
  }
}
