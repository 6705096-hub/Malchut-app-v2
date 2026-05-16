import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

// POST /api/routes/reset
// Expects: { scope: 'SHABBAT' | 'MIDWEEK', targetDateISO: string }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scope, targetDateISO } = await req.json()

    if (scope === 'SHABBAT') {
      // For Shabbat, vehicle assignments are attached to the DeliveryArea global model.
      // We just clear routeId from all DeliveryAreas.
      const result = await prisma.deliveryArea.updateMany({
        data: { routeId: null }
      })
      return NextResponse.json({ success: true, count: result.count })
      
    } else if (scope === 'MIDWEEK' || scope === 'SPECIAL') {
      // For midweek/special, vehicle assignments are on the Order model directly.
      if (!targetDateISO) {
        return NextResponse.json({ error: 'targetDateISO required for midweek reset' }, { status: 400 })
      }
      
      const targetDate = new Date(targetDateISO)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
      const targetDayName = dayNames[targetDate.getDay()]

      const result = await prisma.order.updateMany({
        where: {
          OR: [
            { deliveryWeek: targetDateISO },
            { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }
          ],
          specialDateId: scope === 'SPECIAL' ? { not: null } : { equals: null }
        },
        data: { routeId: null }
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
  } catch (error: any) {
    console.error('Failed to reset routes:', error)
    return NextResponse.json({ error: 'Failed to reset routes' }, { status: 500 })
  }
}
