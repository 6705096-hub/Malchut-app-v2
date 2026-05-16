import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfWeek, parseISO } from 'date-fns'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetWeekDate } = await req.json()
    if (!targetWeekDate) return NextResponse.json({ error: 'targetWeekDate is required' }, { status: 400 })

    const targetDate = parseISO(targetWeekDate)
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }).toISOString()

    const template = await prisma.orderTemplate.findUnique({ where: { id: params.id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (template.skippedWeeks.includes(weekStart)) {
       return NextResponse.json({ success: true, message: 'Already skipped' })
    }

    // Update the template to include this week in skipped array
    await prisma.orderTemplate.update({
      where: { id: params.id },
      data: {
        skippedWeeks: {
          push: weekStart
        }
      }
    })

    // If an order was already generated for this week, we should delete it to respect the "Skip"
    const orderToDelete = await prisma.order.findFirst({
        where: { orderTemplateId: params.id, deliveryWeek: weekStart }
    })
    
    if (orderToDelete) {
        await prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: orderToDelete.customerId },
                data: { debt: { decrement: orderToDelete.totalPrice } }
            })
            await tx.order.delete({ where: { id: orderToDelete.id } })
        })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to skip template order:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
