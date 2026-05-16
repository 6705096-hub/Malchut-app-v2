import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

// GET to fetch unique areas used by Special Date orders on a given date
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

    // Find all active orders for this date in Beit Shemesh that belong to a Special Date
    const orders = await prisma.order.findMany({
      where: {
        city: 'בית שמש',
        specialDateId: { not: null },
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
        ]
      },
      select: {
        deliveryArea: { select: { id: true, name: true } },
        routeId: true
      }
    })

    // Group by delivery area
    const areaMap: Record<string, { id: string; name: string; routeId: string | null }> = {}
    
    for (const order of orders) {
      if (!order.deliveryArea) continue
      
      const aId = order.deliveryArea.id
      if (!areaMap[aId]) {
        areaMap[aId] = {
          id: aId,
          name: order.deliveryArea.name,
          routeId: order.routeId // Prefer the route assigned explicitly to the first order we see in this area
        }
      } else if (!areaMap[aId].routeId && order.routeId) {
         areaMap[aId].routeId = order.routeId
      }
    }

    return NextResponse.json({ success: true, areas: Object.values(areaMap).sort((a,b) => a.name.localeCompare(b.name)) })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch special date areas' }, { status: 500 })
  }
}

// PATCH to assign all Special Date orders in an Area to a Route for a specific date
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dateStr, areaId, routeId } = await req.json()
    if (!dateStr || !areaId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const targetDate = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
    const targetDayName = dayNames[targetDate.getDay()]

    const updated = await prisma.order.updateMany({
      where: {
        deliveryAreaId: areaId,
        specialDateId: { not: null },
        OR: [
          { deliveryWeek: dateStr },
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
        ]
      },
      data: {
        routeId: routeId || null
      }
    })

    return NextResponse.json({ success: true, count: updated.count })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update special date area route' }, { status: 500 })
  }
}
