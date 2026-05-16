import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// PUT /api/drivers/[id] — update driver
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, city, type, userId, isActive, sortOrder } = body

    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(city !== undefined && { city }),
        ...(type !== undefined && { type }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder })
      }
    })

    return NextResponse.json({ driver })
  } catch (err: any) {
    console.error('PUT /api/drivers/[id] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/drivers/[id] — delete driver
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.driver.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/drivers/[id] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
