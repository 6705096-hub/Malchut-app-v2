import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// PUT /api/drivers/vehicles/[id] — update vehicle name / areas
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, areaIds } = await req.json()

    // Update name
    const vehicle = await prisma.vehicleRun.update({
      where: { id: params.id },
      data: { ...(name !== undefined && { name }) }
    })

    // Replace areas if provided
    if (areaIds !== undefined) {
      await prisma.vehicleRunArea.deleteMany({ where: { vehicleRunId: params.id } })
      if (areaIds.length > 0) {
        await prisma.vehicleRunArea.createMany({
          data: areaIds.map((deliveryAreaId: string) => ({
            vehicleRunId: params.id,
            deliveryAreaId
          }))
        })
      }
    }

    return NextResponse.json({ vehicle })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/drivers/vehicles/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.vehicleRun.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
