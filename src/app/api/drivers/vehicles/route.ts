import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/drivers/vehicles?weekDate=2026-05-03
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const weekDate = searchParams.get('weekDate')
    if (!weekDate) return NextResponse.json({ error: 'weekDate required' }, { status: 400 })

    const vehicles = await prisma.vehicleRun.findMany({
      where: { weekDate },
      include: {
        areas: true,
        loads: true
      },
      orderBy: { name: 'asc' }
    })

    // Enrich each vehicle with area names and cargo summary
    const allAreaIds = vehicles.flatMap(v => v.areas.map(a => a.deliveryAreaId))
    const deliveryAreas = await prisma.deliveryArea.findMany({
      where: { id: { in: allAreaIds } },
      select: { id: true, name: true }
    })
    const areaMap = Object.fromEntries(deliveryAreas.map(a => [a.id, a.name]))

    // For each vehicle, fetch orders from those areas for that Shabbat and compute cargo
    const result = await Promise.all(vehicles.map(async (vehicle) => {
      const vehicleAreaIds = vehicle.areas.map(a => a.deliveryAreaId)
      
      // Find the day of week string matching this weekDate (Saturday = שבת)
      const ordersInAreas = await prisma.order.findMany({
        where: {
          deletedAt: null,
          deliveryAreaId: { in: vehicleAreaIds },
          deliveryDay: { in: ['Shabbat', 'שבת', 'Friday', 'שישי'] }
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } }
        }
      })

      // Per-product cargo summary
      const productTotals: Record<string, { productId: string; productName: string; orderedQty: number; loadedQty: number }> = {}
      for (const order of ordersInAreas) {
        for (const item of order.items) {
          if (!productTotals[item.productId]) {
            const loadEntry = vehicle.loads.find(l => l.productId === item.productId)
            productTotals[item.productId] = {
              productId: item.productId,
              productName: item.product.name,
              orderedQty: 0,
              loadedQty: loadEntry?.loadedQty || 0
            }
          }
          productTotals[item.productId].orderedQty += item.quantity
        }
      }

      const cargoSummary = Object.values(productTotals).map(p => ({
        ...p,
        remainingQty: p.orderedQty - p.loadedQty
      })).sort((a, b) => a.productName.localeCompare(b.productName, 'he'))

      return {
        id: vehicle.id,
        name: vehicle.name,
        weekDate: vehicle.weekDate,
        areas: vehicle.areas.map(a => ({
          id: a.id,
          deliveryAreaId: a.deliveryAreaId,
          areaName: areaMap[a.deliveryAreaId] || 'אזור לא ידוע'
        })),
        orderCount: ordersInAreas.length,
        cargoSummary
      }
    }))

    return NextResponse.json({ vehicles: result })
  } catch (err: any) {
    console.error('GET /api/drivers/vehicles error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/drivers/vehicles — create a new vehicle run for a week
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, weekDate, areaIds } = await req.json()
    if (!name || !weekDate) return NextResponse.json({ error: 'name and weekDate required' }, { status: 400 })

    const vehicle = await prisma.vehicleRun.create({
      data: {
        name,
        weekDate,
        areas: areaIds?.length ? {
          create: areaIds.map((deliveryAreaId: string) => ({ deliveryAreaId }))
        } : undefined
      },
      include: { areas: true }
    })

    return NextResponse.json({ vehicle })
  } catch (err: any) {
    console.error('POST /api/drivers/vehicles error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
