import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const routeId = params.id
    const { orderIds, dateStr } = await req.json()

    if (!dateStr || !Array.isArray(orderIds)) {
      return NextResponse.json({ error: 'Missing dateStr or orderIds' }, { status: 400 })
    }

    const targetDate = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
    const targetDayName = dayNames[targetDate.getDay()]

    // Unassign from this route: all midweek orders on this date that belong to this route but are NOT in the checked list
    await prisma.order.updateMany({
      where: {
        routeId: routeId,
        specialDateId: null, // midweek only
        id: { notIn: orderIds },
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
        ]
      },
      data: { routeId: null }
    })

    // Assign the checked orders to this route
    if (orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { routeId: routeId }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Failed to assign orders' }, { status: 500 })
  }
}
