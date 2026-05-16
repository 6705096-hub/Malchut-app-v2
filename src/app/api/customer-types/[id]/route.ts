import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role === 'VIEWER' || session.user.role === 'PENDING') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, saveAddress, prices } = await request.json()

    // Process:
    // Update the base type properties
    // For prices: delete all existing for this type, and recreate the new ones.
    const updatedType = await prisma.$transaction(async (tx) => {
      const type = await tx.customerType.update({
        where: { id: params.id },
        data: {
          name: name?.trim(),
          saveAddress: saveAddress
        }
      })

      // Wipe old custom prices
      await tx.customerTypePrice.deleteMany({
        where: { customerTypeId: params.id }
      })

      // Insert new custom prices
      if (prices && Array.isArray(prices) && prices.length > 0) {
        await tx.customerTypePrice.createMany({
          data: prices.map((p: any) => ({
            customerTypeId: params.id,
            productId: p.productId,
            price: parseFloat(p.price),
            bulkQuantity: p.bulkQuantity ? parseInt(p.bulkQuantity) : null,
            bulkPrice: p.bulkPrice ? parseFloat(p.bulkPrice) : null,
            discountType: p.discountType || 'PACK_OF_N',
            discountIfAnyOtherPrice: p.discountIfAnyOtherPrice ? parseFloat(p.discountIfAnyOtherPrice) : null
          }))
        })
      }

      return await tx.customerType.findUnique({
        where: { id: params.id },
        include: { prices: true }
      })
    })

    return NextResponse.json({ customerType: updatedType })
  } catch (error: any) {
    console.error('Error updating customer type:', error)
    if (error.code === 'P2002') {
       return NextResponse.json({ error: 'שם זה כבר קיים במערכת' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update customer type' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    // Checking if there are customers using this type
    const customersUsingThis = await prisma.customer.count({
      where: { customerTypeId: params.id }
    })

    if (customersUsingThis > 0) {
      return NextResponse.json({ error: `Cannot delete: ${customersUsingThis} customers are currently assigned to this type. Change their type first.` }, { status: 400 })
    }

    await prisma.customerType.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer type:', error)
    return NextResponse.json({ error: 'Failed to delete customer type' }, { status: 500 })
  }
}
