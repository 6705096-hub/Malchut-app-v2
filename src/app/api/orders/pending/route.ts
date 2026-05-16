import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/orders/pending — Return all PENDING_APPROVAL orders
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        deletedAt: null
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: { product: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ orders })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
