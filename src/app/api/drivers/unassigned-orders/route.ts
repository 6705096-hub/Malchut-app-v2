import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET /api/drivers/unassigned-orders?dateStr=2026-05-01&city=JERUSALEM
// Returns orders for the given date + city that are NOT yet assigned to any driver
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('dateStr')  // e.g. "2026-05-01"
    const city = searchParams.get('city')         // 'JERUSALEM' | 'BEIT_SHEMESH'
    const deliveryDay = searchParams.get('deliveryDay') // e.g. 'Sunday', 'Monday'

    if (!dateStr) return NextResponse.json({ error: 'dateStr required' }, { status: 400 })

    // Get all order IDs already assigned for this date
    const assigned = await prisma.driverOrderAssignment.findMany({
      where: { dateStr },
      select: { orderId: true }
    })
    const assignedOrderIds = assigned.map(a => a.orderId)

    // Build filter for orders
    const orderWhere: any = {
      deletedAt: null,
      id: { notIn: assignedOrderIds }
    }
    if (deliveryDay) {
      orderWhere.deliveryDay = deliveryDay
    }

    // Fetch orders matching that day
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        customer: { select: { name: true, phone: true, address: true, city: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        deliveryArea: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Filter by city (use order.city → customer.city → fallback to no city)
    let filtered = orders
    if (city && city !== 'BOTH') {
      const cityMap: Record<string, string[]> = {
        'JERUSALEM': ['ירושלים', 'jerusalem'],
        'BEIT_SHEMESH': ['בית שמש', 'beit shemesh', 'בית-שמש']
      }
      const cityVariants = cityMap[city] || []
      filtered = orders.filter(o => {
        const orderCity = (o.city || o.customer?.city || '').toLowerCase()
        return cityVariants.some(v => orderCity.includes(v.toLowerCase()))
      })
    }

    // Shape the response
    const result = filtered.map(o => ({
      id: o.id,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      address: o.address || o.customer.address || '',
      city: o.city || o.customer.city || '',
      deliveryDay: o.deliveryDay,
      deliveryArea: o.deliveryArea?.name || null,
      notes: o.notes,
      totalPrice: o.totalPrice,
      items: o.items.map(i => ({
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity
      }))
    }))

    return NextResponse.json({ orders: result, total: result.length })
  } catch (err: any) {
    console.error('GET /api/drivers/unassigned-orders error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
