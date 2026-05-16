import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

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

    // Find all distinct custom zones mapping for this date
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
        ]
      },
      select: {
        customZone: true,
        routeId: true
      }
    })

    // Group to find uniqueness and their assigned routeId
    const zoneMap: Record<string, string | null> = {}
    for (const order of orders) {
      const zName = order.customZone || 'ללא אזור'
      // Prefer the first assigned routeId we see for this zone
      if (!zoneMap[zName] && order.routeId) {
        zoneMap[zName] = order.routeId
      } else if (zoneMap[zName] === undefined) {
        zoneMap[zName] = null;
      }
    }

    const zones = Object.entries(zoneMap).map(([zone, routeId]) => ({
      zone,
      routeId
    }))

    return NextResponse.json({ success: true, zones })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch midweek zones' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dateStr, zone, routeId } = await req.json()
    if (!dateStr || !zone) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const targetDate = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
    const targetDayName = dayNames[targetDate.getDay()]

    const customZoneQuery = zone === 'ללא אזור' ? null : zone

    const updated = await prisma.order.updateMany({
      where: {
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
        ],
        customZone: customZoneQuery
      },
      data: {
        routeId: routeId || null
      }
    })

    return NextResponse.json({ success: true, count: updated.count })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update zone route' }, { status: 500 })
  }
}
