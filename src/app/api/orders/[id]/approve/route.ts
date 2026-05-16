import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/orders/[id]/approve — Approve a PENDING_APPROVAL order → PLANNED
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Order is not pending approval' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.id },
        data: { status: 'PLANNED' }
      })
      // Now add to customer debt (was skipped when created as PENDING_APPROVAL)
      await tx.customer.update({
        where: { id: order.customerId },
        data: { debt: { increment: order.totalPrice } }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Approve order error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/orders/[id]/approve — Reject/skip this week's PENDING_APPROVAL order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const order = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Order is not pending approval' }, { status: 400 })
    }

    // Add this week to skippedWeeks on the template (so it won't be auto-created again this week)
    if (order.orderTemplateId) {
      const template = await prisma.orderTemplate.findUnique({
        where: { id: order.orderTemplateId }
      })
      if (template) {
        const updatedSkipped = [...template.skippedWeeks, order.deliveryWeek]
        await prisma.orderTemplate.update({
          where: { id: order.orderTemplateId },
          data: { skippedWeeks: updatedSkipped }
        })
      }
    }

    // Soft-delete the order
    await prisma.order.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: (session.user as any)?.id || 'SYSTEM'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reject order error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
