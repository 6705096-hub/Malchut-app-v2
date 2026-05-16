import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, isActive, routeId } = body

    const updated = await prisma.deliveryArea.update({
      where: { id: params.id },
      data: { 
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(routeId !== undefined && { routeId })
      },
      include: { route: true }
    })

    return NextResponse.json({ area: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update delivery area' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Optionally check if orders exist for this area before deletion,
    // but Prisma will handle the relational constraint error if restricted.
    await prisma.deliveryArea.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    // If it fails due to foreign key constraints (existing orders)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete area because it has existing orders. Consider marking it as inactive instead.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to delete delivery area' }, { status: 500 })
  }
}
