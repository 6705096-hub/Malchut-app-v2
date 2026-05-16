import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { startOfWeek, endOfWeek, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetWeekDate } = await req.json()
    // targetWeekDate is expected to be an ISO string representing a date in the target week, e.g. "2026-03-21" represents the week containing this date.
    
    if (!targetWeekDate) {
      return NextResponse.json({ error: 'targetWeekDate is required' }, { status: 400 })
    }

    const weekStart = targetWeekDate

    // Check if we already have a generation record for this week
    const existingGen = await prisma.orderTemplateGeneration.findUnique({
      where: { deliveryWeek: weekStart }
    })

    if (existingGen && existingGen.status === 'GENERATED') {
      return NextResponse.json({ error: 'Orders already generated for this week' }, { status: 400 })
    }
    
    if (existingGen && existingGen.status === 'CANCELLED') {
      // If it was cancelled, we can allow re-generating by updating the status later.
    }

    const templates = await prisma.orderTemplate.findMany({
      where: { isActive: true },
      include: { items: true, customer: true }
    })

    const validTemplates = templates.filter(t => !t.skippedWeeks.includes(weekStart))

    if (validTemplates.length === 0) {
       return NextResponse.json({ success: true, count: 0, message: 'No active templates found' })
    }

    let createdCount = 0

    await prisma.$transaction(async (tx) => {
      for (const t of validTemplates) {
        // Create the order
        await tx.order.create({
          data: {
            customerId: t.customerId,
            createdById: (session.user as any).id,
            deliveryDay: t.deliveryDay,
            deliveryWeek: weekStart, // Tie it to the specific absolute week
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
        
        createdCount++
      }

      // Mark generation as complete
      await tx.orderTemplateGeneration.upsert({
        where: { deliveryWeek: weekStart },
        update: { status: 'GENERATED', generatedAt: new Date() },
        create: { deliveryWeek: weekStart, status: 'GENERATED' }
      })
    })

    return NextResponse.json({ success: true, count: createdCount })
  } catch (err: any) {
    console.error('Failed to generate template orders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const targetWeekDate = searchParams.get('targetWeekDate')

    if (!targetWeekDate) {
      return NextResponse.json({ error: 'targetWeekDate is required' }, { status: 400 })
    }

    const weekStart = targetWeekDate

    let deletedCount = 0

    await prisma.$transaction(async (tx) => {
      // Find all orders for this week that were created from a template
      const ordersToDelete = await tx.order.findMany({
        where: {
          deliveryWeek: weekStart,
          orderTemplateId: { not: null }
        }
      })
      
      for (const o of ordersToDelete) {
        // Revert customer debt
        await tx.customer.update({
          where: { id: o.customerId },
          data: { debt: { decrement: o.totalPrice } }
        })
      }
      
      const result = await tx.order.deleteMany({
        where: {
          deliveryWeek: weekStart,
          orderTemplateId: { not: null }
        }
      })
      deletedCount = result.count

      // Mark generation as cancelled
      await tx.orderTemplateGeneration.upsert({
        where: { deliveryWeek: weekStart },
        update: { status: 'CANCELLED', generatedAt: new Date() },
        create: { deliveryWeek: weekStart, status: 'CANCELLED' }
      })
    })

    return NextResponse.json({ success: true, count: deletedCount })
  } catch (err: any) {
    console.error('Failed to cancel template orders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
