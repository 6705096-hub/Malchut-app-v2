import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  const role = (session?.user as any)?.role || 'VIEWER'
  if (!session || role === 'VIEWER') return new NextResponse('Unauthorized', { status: 401 })

  try {
    const prices = await prisma.customerPrice.findMany({
      where: { customerId: params.id }
    })
    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching customer prices:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  console.log('SESSION DATA:', JSON.stringify(session))
  const role = (session as any)?.role || (session?.user as any)?.role || 'VIEWER'
  if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { prices } = await request.json()
    console.log('API Received prices payload:', JSON.stringify(prices, null, 2))
    
    // Use transaction to delete existing and create new ones
    await prisma.$transaction(async (tx) => {
      // delete all custom prices for this customer
      await tx.customerPrice.deleteMany({
        where: { customerId: params.id }
      })

      // insert only the ones with a defined custom price
      const validPrices = prices.filter((p: any) => typeof p.price === 'number' && !isNaN(p.price))
      if (validPrices.length > 0) {
        await tx.customerPrice.createMany({
          data: validPrices.map((p: any) => ({
            customerId: params.id,
            productId: p.productId,
            price: p.price,
            bulkQuantity: p.bulkQuantity ? parseInt(p.bulkQuantity) : null,
            bulkPrice: p.bulkPrice ? parseFloat(p.bulkPrice) : null,
            discountType: p.discountType || 'PACK_OF_N'
          }))
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating customer prices:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
