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

    const areaId = params.id
    const { routeId } = await request.json()

    // routeId can be string (valid UUID) or null (unassigned)
    const updatedArea = await prisma.deliveryArea.update({
      where: { id: areaId },
      data: { routeId }
    })

    return NextResponse.json({ success: true, area: updatedArea })
  } catch (error: any) {
    console.error('Failed to update area route assignment:', error)
    return NextResponse.json({ error: 'Failed to update route assignment' }, { status: 500 })
  }
}
