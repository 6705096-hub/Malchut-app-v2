import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/drivers/[id]/areas — get driver's assigned areas (Shabbat)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const weekDate = searchParams.get('weekDate') // optional: specific week override

    // Get permanent areas + any specific week overrides
    const areas = await prisma.driverArea.findMany({
      where: {
        driverId: params.id,
        OR: [
          { weekDate: null },           // permanent
          { weekDate: weekDate || '' }  // specific week
        ]
      }
    })

    // Enrich with area names from DeliveryArea
    const areaIds = [...new Set(areas.map(a => a.deliveryAreaId))]
    const deliveryAreas = await prisma.deliveryArea.findMany({
      where: { id: { in: areaIds } },
      select: { id: true, name: true, isActive: true }
    })
    const areaMap = Object.fromEntries(deliveryAreas.map(a => [a.id, a]))

    // Merge: if weekDate override exists for an area, use it; else use permanent
    const merged = areas.map(a => ({
      ...a,
      areaName: areaMap[a.deliveryAreaId]?.name || 'אזור לא ידוע',
      isOverride: a.weekDate !== null
    }))

    return NextResponse.json({ areas: merged })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/drivers/[id]/areas — set driver's permanent areas (replaces all)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { areaIds, weekDate } = await req.json()
    // weekDate: null = permanent, string = specific week override

    // Delete existing for this driver (permanent or specific week)
    await prisma.driverArea.deleteMany({
      where: { driverId: params.id, weekDate: weekDate || null }
    })

    // Re-create with new selection
    if (areaIds && areaIds.length > 0) {
      await prisma.driverArea.createMany({
        data: areaIds.map((deliveryAreaId: string) => ({
          driverId: params.id,
          deliveryAreaId,
          weekDate: weekDate || null
        }))
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PUT /api/drivers/[id]/areas error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
