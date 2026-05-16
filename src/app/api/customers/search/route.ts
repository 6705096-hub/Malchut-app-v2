import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { applyCustomerDataScope } from '@/lib/data-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ customers: [] })
    }

    const baseWhere = {
      deletedAt: null,
      OR: [
        { name: { contains: query } },
        { phone: { contains: query } },
      ],
    }

    const customers = await prisma.customer.findMany({
      where: applyCustomerDataScope(session, baseWhere),
      include: {
        prices: true
      },
      take: 10,
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search customers' }, { status: 500 })
  }
}
