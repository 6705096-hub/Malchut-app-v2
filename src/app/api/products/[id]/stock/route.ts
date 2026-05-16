import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN_MANAGER'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { inStock } = await req.json()
    if (typeof inStock !== 'number') return new NextResponse('Bad Request', { status: 400 })

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { inStock }
    })

    return NextResponse.json({ success: true, inStock: updated.inStock })
  } catch (error) {
    console.error('Error updating stock:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
