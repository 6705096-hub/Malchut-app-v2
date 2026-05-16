import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// PUT /api/drivers/[id]/sort — update sort order of driver's assignments
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // sorted array: [{ orderId, dateStr, sortOrder }]
    const { sortedItems } = await req.json()
    if (!sortedItems?.length) return NextResponse.json({ error: 'sortedItems required' }, { status: 400 })

    await Promise.all(
      sortedItems.map(({ orderId, dateStr, sortOrder }: { orderId: string; dateStr: string; sortOrder: number }) =>
        prisma.driverOrderAssignment.updateMany({
          where: { driverId: params.id, orderId, dateStr },
          data: { sortOrder }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PUT /api/drivers/[id]/sort error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
