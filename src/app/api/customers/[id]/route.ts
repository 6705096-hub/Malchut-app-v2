import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Because Prisma's schema for orders might not have onDelete: Cascade explicitly built, we will do a transaction to be safe.
    // If it cascades automatically, this is redundant but safe.
    await prisma.$transaction(async (tx) => {
      const userId = (session?.user as any)?.id || 'SYSTEM'
      
      // 1. Soft delete all orders for this customer (without deleting items)
      // This will ensure the recycling bin sees them!
      const customerOrders = await tx.order.findMany({
        where: { customerId: params.id, deletedAt: null }
      })

      // Update debt to 0 because we're cancelling all active orders
      let debtToDecrease = 0;
      for (const ord of customerOrders) {
         debtToDecrease += ord.totalPrice;
      }
      
      if (customerOrders.length > 0) {
          await tx.order.updateMany({
            where: { customerId: params.id, deletedAt: null },
            data: { deletedAt: new Date(), deletedBy: userId }
          })
      }

      // 2. Clear customer's debt and soft delete
      const customer = await tx.customer.findUnique({ where: { id: params.id } })
      if (customer) {
        await tx.customer.update({
          where: { id: params.id },
          data: { 
            phone: customer.phone + '_DEL_' + Date.now(),
            debt: { decrement: debtToDecrease },
            deletedAt: new Date(), 
            deletedBy: userId 
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, phone, address, city, typeId, saveAddress, defaultDeliveryAreaId } = await req.json()

    // Update the customer
    await prisma.customer.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        address: address || null,
        city: city || null,
        customerTypeId: typeId === '' ? null : typeId,
        saveAddress: saveAddress !== undefined ? saveAddress : true,
        defaultDeliveryAreaId: defaultDeliveryAreaId || null
      }
    })

    // Retroactively update all past orders for this customer to match their new city
    if (city !== undefined) {
      await prisma.order.updateMany({
        where: { customerId: params.id },
        data: {
          city: city || null
        }
      })
    }
    
    // Cache the street in dictionary if they have a city
    if (address && city) {
      const normalizedStreet = address.split(/\d/)[0].trim()
      if (normalizedStreet.length >= 2) {
        await prisma.savedAddress.upsert({
          where: { street: normalizedStreet },
          update: { city: city, deliveryAreaId: defaultDeliveryAreaId || null },
          create: { street: normalizedStreet, city: city, deliveryAreaId: defaultDeliveryAreaId || null }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}
