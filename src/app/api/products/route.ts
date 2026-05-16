import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(category ? { category } : {})
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
    name, price, category, isManufactured, inStock, isActive,
    linkedWholeProductId, bulkQuantity, bulkPrice, fractionSize, discountType, discountIfAnyOtherPrice,
    isSpecial, isSpecialStores
  } = await req.json()

  if (!name || price === undefined || !category) {
    return NextResponse.json({ error: 'חסרים נתוני חובה' }, { status: 400 })
  }

  const newProduct = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      category,
      isManufactured: Boolean(isManufactured),
      inStock: inStock ? Number(inStock) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
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

    return NextResponse.json({ newProduct }, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
