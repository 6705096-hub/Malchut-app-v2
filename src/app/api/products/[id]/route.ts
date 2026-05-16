import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { isActive } = await req.json()
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive }
    })
    return NextResponse.json({ product }, { status: 200 })
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { 
      name, price, category, isManufactured,
      linkedWholeProductId, bulkQuantity, bulkPrice, fractionSize, discountType, discountIfAnyOtherPrice,
      isSpecial, isSpecialStores
    } = await req.json()

    const product = await prisma.product.update({
      where: { id: params.id },
      data: { 
        name, 
        price: Number(price), 
        category, 
        isManufactured: Boolean(isManufactured),
        linkedWholeProductId: linkedWholeProductId || null,
        bulkQuantity: bulkQuantity ? Number(bulkQuantity) : null,
        bulkPrice: bulkPrice ? Number(bulkPrice) : null,
        fractionSize: fractionSize ? Number(fractionSize) : 0.5,
        discountType: discountType || 'PACK_OF_N',
        discountIfAnyOtherPrice: discountIfAnyOtherPrice ? Number(discountIfAnyOtherPrice) : null,
        isSpecial: Boolean(isSpecial),
        isSpecialStores: Boolean(isSpecialStores)
      }
    })
    return NextResponse.json({ product }, { status: 200 })
  } catch (error) {
    console.error('Failed to edit product:', error)
    return NextResponse.json({ error: 'Failed to edit product' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.product.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: (session.user as any)?.id || 'SYSTEM'
      }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
