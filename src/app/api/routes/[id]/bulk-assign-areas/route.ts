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
    const { areaIds, context, dateStr } = await req.json()

    if (!Array.isArray(areaIds)) {
      return NextResponse.json({ error: 'Missing areaIds' }, { status: 400 })
    }

    if (context === 'SHABBAT') {
      // 1. Unassign any area that currently belongs to THIS routeId but is NOT checked
      await prisma.deliveryArea.updateMany({
        where: {
          routeId: routeId,
          id: { notIn: areaIds }
        },
        data: { routeId: null }
      })

      // 2. Assign checked areas to THIS routeId
      if (areaIds.length > 0) {
        await prisma.deliveryArea.updateMany({
          where: { id: { in: areaIds } },
          data: { routeId: routeId }
        })
      }
    } else if (context === 'SPECIAL') {
      if (!dateStr) return NextResponse.json({ error: 'Missing dateStr for SPECIAL context' }, { status: 400 })
      
      const targetDate = new Date(dateStr)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
      const targetDayName = dayNames[targetDate.getDay()]

      // 1. Unassign special orders on this date that currently belong to THIS routeId but their area is NOT checked
      await prisma.order.updateMany({
        where: {
          routeId: routeId,
          specialDateId: { not: null },
          deliveryAreaId: { notIn: areaIds },
          OR: [
            { deliveryWeek: dateStr },
            { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
          ]
        },
        data: { routeId: null }
      })

      // 2. Assign special orders on this date whose area IS checked to THIS routeId
      if (areaIds.length > 0) {
        await prisma.order.updateMany({
          where: {
            specialDateId: { not: null },
            deliveryAreaId: { in: areaIds },
            OR: [
              { deliveryWeek: dateStr },
              { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
            ]
          },
          data: { routeId: routeId }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Failed to assign areas' }, { status: 500 })
  }
}
