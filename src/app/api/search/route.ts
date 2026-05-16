import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ customers: [], orders: [], messages: [] })
    }

    const query = q.trim()

    // 1. Search Customers
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ]
      },
      take: 5
    })

    // 2. Search Orders (by order ID substring, or by customer name)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { id: { startsWith: query } },
          { customer: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        customer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // 3. Search Chat Messages
    const messages = await prisma.groupMessage.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
        isDeleted: false
      },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    return NextResponse.json({
      customers,
      orders,
      messages
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
