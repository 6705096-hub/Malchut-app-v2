import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfWeek, parseISO } from 'date-fns'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetWeekDate } = await req.json()
    if (!targetWeekDate) return NextResponse.json({ error: 'targetWeekDate is required' }, { status: 400 })

    const weekStart = targetWeekDate

    const t = await prisma.orderTemplate.findUnique({
      where: { id: params.id },
      include: { items: true, customer: true }
    })

    if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If it was skipped previously, un-skip it
    if (t.skippedWeeks.includes(weekStart)) {
      await prisma.orderTemplate.update({
        where: { id: params.id },
        data: {
          skippedWeeks: {
            set: t.skippedWeeks.filter(w => w !== weekStart)
          }
        }
      })
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
        where: { 
          orderTemplateId: params.id, 
          deletedAt: null,
          OR: [
            { deliveryWeek: weekStart },
            { deliveryWeek: 'THIS_WEEK' }
          ]
        }
    })

    if (existingOrder) {
        return NextResponse.json({ success: true, message: 'Already approved/generated' })
    }

    // Generate the order
    let newOrder;
    await prisma.$transaction(async (tx) => {
      newOrder = await tx.order.create({
        data: {
          customerId: t.customerId,
          createdById: (session.user as any).id,
          deliveryDay: t.deliveryDay,
          deliveryWeek: weekStart,
          address: t.address,
          city: t.city,
          deliveryAreaId: t.deliveryAreaId,
          notes: t.notes,
          totalPrice: t.totalPrice,
          orderTemplateId: t.id,
          status: 'PLANNED',
          items: {
            create: t.items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              variant: i.variant
            }))
          }
        }
      })
      
      // Update customer debt
      await tx.customer.update({
        where: { id: t.customerId },
        data: { debt: { increment: t.totalPrice } }
      })
    })

    return NextResponse.json({ success: true, order: newOrder })
  } catch (err: any) {
    console.error('Failed to generate individual template order:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetWeekDate } = await req.json()
    if (!targetWeekDate) return NextResponse.json({ error: 'targetWeekDate is required' }, { status: 400 })

    const weekStart = targetWeekDate

    // Find the generated order for this template
    const existingOrder = await prisma.order.findFirst({
        where: { 
          orderTemplateId: params.id, 
          deletedAt: null,
          OR: [
            { deliveryWeek: weekStart },
            { deliveryWeek: 'THIS_WEEK' }
          ]
        }
    })

    if (!existingOrder) {
        return NextResponse.json({ success: true, message: 'No order found to cancel' })
    }

    // Delete the order and update debt
    await prisma.$transaction(async (tx) => {
      // Revert customer debt
      await tx.customer.update({
        where: { id: existingOrder.customerId },
        data: { debt: { decrement: existingOrder.totalPrice } }
      })
      
      // Delete the order
      await tx.order.delete({
        where: { id: existingOrder.id }
      })
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to cancel individual template order:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
