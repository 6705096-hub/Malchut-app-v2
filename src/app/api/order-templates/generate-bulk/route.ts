import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { startOfWeek, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetWeekDate, templateIds } = await req.json()
    
    if (!targetWeekDate || !templateIds || !Array.isArray(templateIds)) {
       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const targetDate = parseISO(targetWeekDate)
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }).toISOString()

    const templates = await prisma.orderTemplate.findMany({
      where: { 
        id: { in: templateIds },
        isActive: true 
      },
      include: { items: true }
    })

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No valid active templates found' }, { status: 400 })
    }

    let createdCount = 0

    await prisma.$transaction(async (tx) => {
      for (const t of templates) {
        // Check if an order already exists for this week from this template
        const existing = await tx.order.findFirst({
           where: { deliveryWeek: weekStart, orderTemplateId: t.id, deletedAt: null }
        });
        if (existing) continue; // Skip if already generated

        // Remove skip if it exists
        if (t.skippedWeeks.includes(weekStart)) {
           await tx.orderTemplate.update({
             where: { id: t.id },
             data: {
               skippedWeeks: t.skippedWeeks.filter(w => w !== weekStart)
             }
           })
        }

        // Create the order
        await tx.order.create({
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

        createdCount++
      }
    })

    return NextResponse.json({ success: true, count: createdCount })
  } catch (err: any) {
    console.error('Failed to generate bulk template orders:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
