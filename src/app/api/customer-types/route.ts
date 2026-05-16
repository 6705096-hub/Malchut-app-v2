import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'PENDING') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerTypes = await prisma.customerType.findMany({
      include: {
        prices: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ customerTypes })
  } catch (error) {
    console.error('Error fetching customer types:', error)
    return NextResponse.json({ error: 'Failed to fetch customer types' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'VIEWER' || session.user.role === 'PENDING') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, saveAddress, prices } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const newType = await prisma.customerType.create({
      data: {
        name: name.trim(),
        saveAddress: saveAddress ?? true,
        prices: (prices && Array.isArray(prices) && prices.length > 0) ? {
          create: prices.map((p: any) => ({
            productId: p.productId,
            price: parseFloat(p.price),
            bulkQuantity: p.bulkQuantity ? parseInt(p.bulkQuantity) : null,
            bulkPrice: p.bulkPrice ? parseFloat(p.bulkPrice) : null,
            discountType: p.discountType || 'PACK_OF_N',
            discountIfAnyOtherPrice: p.discountIfAnyOtherPrice ? parseFloat(p.discountIfAnyOtherPrice) : null
          }))
        } : undefined
      },
      include: { prices: true }
    })

    return NextResponse.json({ customerType: newType })
  } catch (error: any) {
    console.error('Error creating customer type:', error)
    if (error.code === 'P2002') {
       return NextResponse.json({ error: 'סוג לקוח זה כבר קיים' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create customer type' }, { status: 500 })
  }
}
