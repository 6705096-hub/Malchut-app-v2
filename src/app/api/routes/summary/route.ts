import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { startOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

// GET /api/routes/summary?date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    if (!dateStr) return NextResponse.json({ error: 'Date required' }, { status: 400 })

    const targetDate = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat']
    const targetDayName = dayNames[targetDate.getDay()]
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 0 }).toISOString()

    // 1. Fetch Orders for this date that are strictly Beit Shemesh
    const orders = await prisma.order.findMany({
      where: {
        city: 'בית שמש',
        OR: [
          { deliveryWeek: dateStr }, // Exact date
          { deliveryWeek: 'THIS_WEEK', deliveryDay: targetDayName }, // Recurring
          { deliveryWeek: targetWeekStart, deliveryDay: targetDayName } // Generated from templates
        ]
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            debt: true
          }
        },
        deliveryArea: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // 2. We want to return data shaped for the Routes UI.
    // routesSummary = {
    //   [routeId: string]: {
    //     id: string;
    //     name: string;
    //     items: Record<string, { id, name, hot, cold, total }>;
    //     ordersList: any[];
    //   }
    // }
    
    // Unassigned orders go to 'UNASSIGNED'
    const summary: Record<string, any> = {
      'UNASSIGNED': {
        id: 'UNASSIGNED',
        name: 'ללא שיוך',
        items: {},
        ordersList: []
      }
    }

    // Pre-populate actual routes so they show up even if empty
    const routes = await prisma.route.findMany()
    for (const r of routes) {
      summary[r.id] = {
        id: r.id,
        name: r.name,
        items: {},
        ordersList: []
      }
    }

    for (const order of orders) {
      // Determine the active route UUID
      let activeRouteId = 'UNASSIGNED'
      if (order.routeId) activeRouteId = order.routeId;
      else if (order.deliveryArea?.routeId) activeRouteId = order.deliveryArea.routeId;

      const bucket = summary[activeRouteId]

      // Compile items summary for the vehicle
      for (const item of order.items) {
        if (!bucket.items[item.productId]) {
          bucket.items[item.productId] = {
            id: item.productId,
            name: item.product.name,
            hot: 0,
            cold: 0,
            total: 0
          }
        }
        
        const q = item.quantity
        bucket.items[item.productId].total += q
        
        const isHot = item.variant === 'HOT' || (!item.variant && order.type === 'HOT')
        const isCold = item.variant === 'COLD' || (!item.variant && order.type === 'COLD')
        
        if (isHot) bucket.items[item.productId].hot += q
        else if (isCold) bucket.items[item.productId].cold += q
      }

      // Add full order object to ordersList for expanded review / printing
      bucket.ordersList.push({
        id: order.id,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerDebt: order.customer.debt,
        address: order.address || order.customZone || order.deliveryArea?.name || 'ללא כתובת',
        totalPrice: order.totalPrice,
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          variant: item.variant
        })),
        notes: order.notes
      })
    }

    // Convert bucket mapping to an array so it's easier to iterate on the frontend
    const payload = Object.values(summary).map(bucket => ({
      ...bucket,
      itemsList: Object.values(bucket.items).sort((a: any, b: any) => b.total - a.total)
    }))

    return NextResponse.json({ success: true, summary: payload })
  } catch (error: any) {
    console.error('Failed to fetch route summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
