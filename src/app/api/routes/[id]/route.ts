import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !['ADMIN', 'KITCHEN', 'ORDERS_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const updatedRoute = await prisma.route.update({
      where: { id: params.id },
      data: { name }
    })
    return NextResponse.json({ success: true, route: updatedRoute })
  } catch (err: any) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Route name already exists' }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    // Only ADMIN or KITCHEN managers should be deleting fleets
    if (!session || !['ADMIN', 'KITCHEN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const routeId = params.id
    
    // Unassign related items explicitly before deleting to avoid referential integrity constraints
    await prisma.order.updateMany({
      where: { routeId },
      data: { routeId: null }
    })
    
    await prisma.deliveryArea.updateMany({
      where: { routeId },
      data: { routeId: null }
    })

    await prisma.route.delete({
      where: { id: routeId }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 })
  }
}
