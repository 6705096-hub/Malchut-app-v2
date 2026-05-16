import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/drivers/[id]/orders?dateStr=2026-05-01
// Returns all orders assigned to this driver for the given date, with per-product cargo summary
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('dateStr')
    if (!dateStr) return NextResponse.json({ error: 'dateStr required' }, { status: 400 })

    // Get assignments for this driver on this date
    const assignments = await prisma.driverOrderAssignment.findMany({
      where: { driverId: params.id, dateStr },
      orderBy: { sortOrder: 'asc' }
    })

    if (assignments.length === 0) {
      return NextResponse.json({ orders: [], cargoSummary: [] })
    }

    const orderIds = assignments.map(a => a.orderId)

    // Fetch the actual orders from the existing model (READ ONLY)
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, deletedAt: null },
      include: {
        customer: { select: { name: true, phone: true, address: true, city: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        deliveryArea: { select: { id: true, name: true } }
      }
    })

    // Re-sort orders by assignment sortOrder
    const sortMap = Object.fromEntries(assignments.map(a => [a.orderId, a.sortOrder]))
    const sortedOrders = orders.sort((a, b) => (sortMap[a.id] || 0) - (sortMap[b.id] || 0))

    // Build per-product cargo summary
    const productTotals: Record<string, { productId: string; productName: string; totalQty: number }> = {}
    for (const order of sortedOrders) {
      for (const item of order.items) {
        if (!productTotals[item.productId]) {
          productTotals[item.productId] = {
            productId: item.productId,
            productName: item.product.name,
            totalQty: 0
          }
        }
        productTotals[item.productId].totalQty += item.quantity
      }
    }
    const cargoSummary = Object.values(productTotals).sort((a, b) => a.productName.localeCompare(b.productName, 'he'))

    // Shape order response
    const result = sortedOrders.map((o, idx) => ({
      id: o.id,
      assignmentSortOrder: sortMap[o.id] ?? idx,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      address: o.address || o.customer.address || '',
      city: o.city || o.customer.city || '',
      deliveryArea: o.deliveryArea?.name || null,
      notes: o.notes,
      totalPrice: o.totalPrice,
      items: o.items.map(i => ({
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity
      }))
    }))

    return NextResponse.json({ orders: result, cargoSummary })
  } catch (err: any) {
    console.error('GET /api/drivers/[id]/orders error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/drivers/[id]/orders — bulk assign orders to this driver
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderIds, dateStr } = await req.json()
    if (!orderIds?.length || !dateStr) {
      return NextResponse.json({ error: 'orderIds and dateStr required' }, { status: 400 })
    }

    // Get existing assignments for this driver on this date (for sortOrder continuity)
    const existing = await prisma.driverOrderAssignment.findMany({
      where: { driverId: params.id, dateStr },
      select: { sortOrder: true }
    })
    const maxSort = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder)) + 1 : 0

    // upsert each order assignment
    const results = []
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i]
      try {
        const assignment = await prisma.driverOrderAssignment.upsert({
          where: { orderId_dateStr: { orderId, dateStr } },
          update: { driverId: params.id },
          create: { driverId: params.id, orderId, dateStr, sortOrder: maxSort + i }
        })
        results.push(assignment)
      } catch (e) {
        // Skip if already assigned (shouldn't happen with upsert)
      }
    }

    return NextResponse.json({ assigned: results.length })
  } catch (err: any) {
    console.error('POST /api/drivers/[id]/orders error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/drivers/[id]/orders — unassign specific orders from this driver
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderIds, dateStr } = await req.json()
    if (!dateStr) return NextResponse.json({ error: 'dateStr required' }, { status: 400 })

    await prisma.driverOrderAssignment.deleteMany({
      where: {
        driverId: params.id,
        dateStr,
        ...(orderIds ? { orderId: { in: orderIds } } : {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/drivers/[id]/orders error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
