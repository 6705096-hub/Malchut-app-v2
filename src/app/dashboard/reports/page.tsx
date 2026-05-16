import { Suspense } from 'react'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { ReportsClient } from './ReportsClient'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isValid } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ searchParams }: { searchParams: { range?: string, start?: string, end?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions
  
  // Only ADMIN or FULL management permissions can see financial reports
  if (role !== 'ADMIN' && !hasPermission(role, permissions, 'management', 'FULL')) {
    redirect('/dashboard')
  }

  // Determine date range based on selection
  const range = searchParams.range || 'week' // Default to week
  
  const now = new Date()
  let startDate = new Date()
  let endDate = new Date()
  
  if (range === 'today') {
    startDate = startOfDay(now)
    endDate = endOfDay(now)
  } else if (range === 'week') {
    startDate = startOfWeek(now, { weekStartsOn: 0 })
    endDate = endOfWeek(now, { weekStartsOn: 0 })
  } else if (range === 'month') {
    startDate = startOfMonth(now)
    endDate = endOfMonth(now)
  } else if (range === 'year') {
    startDate = startOfYear(now)
    endDate = endOfYear(now)
  } else if (range === 'custom' && searchParams.start && searchParams.end) {
    const s = parseISO(searchParams.start)
    const e = parseISO(searchParams.end)
    if (isValid(s) && isValid(e)) {
      startDate = startOfDay(s)
      endDate = endOfDay(e)
    }
  }

  // Fetch all relevant orders
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { 
      items: { include: { product: true } },
      customer: true
    }
  })

  // 1. Calculate Total Revenue & Count
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  const totalOrders = orders.length

  // 2. Aggregate All Products
  const productsAgg: Record<string, number> = {}
  orders.forEach(o => {
    o.items.forEach(item => {
      if (item.product && !item.product.deletedAt) {
        productsAgg[item.product.name] = (productsAgg[item.product.name] || 0) + item.quantity
      }
    })
  })
  
  const topProducts = Object.entries(productsAgg)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)

  // 3. Aggregate Top Customers
  const customersAgg: Record<string, { id: string, name: string, totalSpent: number, orderCount: number }> = {}
  orders.forEach(o => {
    if (o.customer) {
      if (!customersAgg[o.customerId]) {
        customersAgg[o.customerId] = { id: o.customerId, name: o.customer.name, totalSpent: 0, orderCount: 0 }
      }
      customersAgg[o.customerId].totalSpent += (o.totalPrice || 0)
      customersAgg[o.customerId].orderCount += 1
    }
  })

  const topCustomers = Object.values(customersAgg)
    .sort((a, b) => b.totalSpent - a.totalSpent)

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-20">
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10 shadow-sm flex items-center justify-center">
        <h1 className="font-black text-xl text-gray-800">סיכום וסטטיסטיקות</h1>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-gray-400">טוען נתונים...</div>}>
        <ReportsClient 
          initialRange={range}
          startDateStr={searchParams.start || ''}
          endDateStr={searchParams.end || ''}
          data={{
            totalRevenue,
            totalOrders,
            topProducts,
            topCustomers
          }}
        />
      </Suspense>
    </div>
  )
}
