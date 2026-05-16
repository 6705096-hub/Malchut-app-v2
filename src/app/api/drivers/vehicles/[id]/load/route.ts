import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// PUT /api/drivers/vehicles/[id]/load — update loaded quantity per product
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId, loadedQty } = await req.json()
    if (!productId || loadedQty === undefined) {
      return NextResponse.json({ error: 'productId and loadedQty required' }, { status: 400 })
    }

    const entry = await prisma.vehicleLoadEntry.upsert({
      where: { vehicleRunId_productId: { vehicleRunId: params.id, productId } },
      update: { loadedQty },
      create: { vehicleRunId: params.id, productId, loadedQty }
    })

    return NextResponse.json({ entry })
  } catch (err: any) {
    console.error('PUT /api/drivers/vehicles/[id]/load error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
