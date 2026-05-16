import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfWeek, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const weekStartStr = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const createdById = admin?.id || 'SYSTEM'

    // Check if generated
    const existing = await prisma.orderTemplateGeneration.findFirst({
      where: {
        deliveryWeek: weekStartStr
      }
    })
    
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already marked as generated for this week' })
    }

    const templates = await prisma.orderTemplate.findMany({
      where: { isActive: true },
      include: {
        items: true
      }
    })

    const validTemplates = templates.filter(t => !t.skippedWeeks.includes(weekStartStr))

    let createdCount = 0

    for (const t of validTemplates) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          orderTemplateId: t.id,
          deliveryWeek: weekStartStr,
          deletedAt: null
        }
      })

      if (!existing && !existingOrder) {
        await prisma.$transaction(async (tx) => {
          const newOrder = await tx.order.create({
            data: {
              customerId: t.customerId,
              createdById,
              orderTemplateId: t.id,
              deliveryDay: t.deliveryDay,
              deliveryWeek: weekStartStr,
              address: t.address || '',
              city: t.city || '',
              deliveryAreaId: t.deliveryAreaId,
              notes: t.notes || '',
              status: 'PLANNED',
              totalPrice: t.totalPrice,
              items: {
                create: t.items.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  variant: item.variant
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
        createdCount++
      }
    }

    if (createdCount > 0 || validTemplates.length === 0) {
      // Mark generated for the week
      await prisma.orderTemplateGeneration.upsert({
        where: { deliveryWeek: weekStartStr },
        create: { deliveryWeek: weekStartStr, status: 'GENERATED' },
        update: {}
      })
    }

    return NextResponse.json({ success: true, createdCount })
  } catch (error: any) {
    console.error('Failed to run cron for recurring orders:', error)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
