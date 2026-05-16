import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payments = await prisma.payment.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 payments for performance
    })

    return NextResponse.json({ payments })

  } catch (error: any) {
    console.error('Failed to fetch customer payments:', error)
    return NextResponse.json({ error: 'Failed to retrieve payments' }, { status: 500 })
  }
}
