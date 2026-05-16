import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { subDays, startOfDay, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = startOfDay(subDays(new Date(), days))

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        deletedAt: null
      },
      include: {
        items: { include: { product: true } }
      }
    })

    // 1. Revenue over time (Grouped by date)
    const revenueByDate: Record<string, { date: string; revenue: number; orders: number }> = {}
    
    // 2. Top Products
    const productCounts: Record<string, { name: string; quantity: number }> = {}

    orders.forEach((order: any) => {
      const dateKey = format(order.createdAt, 'yyyy-MM-dd')
      
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = { date: dateKey, revenue: 0, orders: 0 }
      }
      
      revenueByDate[dateKey].revenue += order.totalPrice || 0
      revenueByDate[dateKey].orders += 1

      order.items.forEach((item: any) => {
        if (!item.product || item.product.deletedAt) return
        const pName = item.product.name
        if (!productCounts[pName]) {
          productCounts[pName] = { name: pName, quantity: 0 }
        }
        productCounts[pName].quantity += item.quantity
      })
    })

    // Format revenue data for charts
    const revenueData = Object.values(revenueByDate).sort((a, b) => a.date.localeCompare(b.date))
    
    // Format top products
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    return NextResponse.json({
      revenueData,
      topProducts,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0)
    })
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
