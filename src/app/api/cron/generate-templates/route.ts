import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfWeek, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current time in Israel
    const israelTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
    const today = new Date(israelTimeStr)
    const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Mapping: which delivery days should be generated TODAY?
    let targetDeliveryDays: string[] = []
    let targetDeliveryWeekDate = today // The date we use to calculate the 'weekStart' string

    if (currentDayOfWeek === 0) { // Sunday
      targetDeliveryDays = ['Tuesday', 'Monday']
    } else if (currentDayOfWeek === 1) { // Monday
      targetDeliveryDays = ['Wednesday']
    } else if (currentDayOfWeek === 2) { // Tuesday
      targetDeliveryDays = ['Thursday']
    } else if (currentDayOfWeek === 3) { // Wednesday
      targetDeliveryDays = ['Friday', 'Shabbat']
    } else if (currentDayOfWeek === 4) { // Thursday
      targetDeliveryDays = ['Sunday']
      // Thursday generates for NEXT Sunday. So the target week is next week.
      targetDeliveryWeekDate = new Date(today)
      targetDeliveryWeekDate.setDate(today.getDate() + 7)
    } else {
      // Friday (5) or Saturday (6) - no generation
      return NextResponse.json({ success: true, count: 0, message: 'No generations scheduled for today' })
    }

    const weekStartStr = format(startOfWeek(targetDeliveryWeekDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

    // Find all templates that match the target delivery days
    const templates = await prisma.orderTemplate.findMany({
      where: { 
        isActive: true,
        deliveryDay: { in: targetDeliveryDays },
        pausedForever: false,
        OR: [
          { pausedUntil: null },
          { pausedUntil: { lt: today } }
        ]
      },
      include: { items: true, customer: true }
    })

    if (templates.length === 0) {
       return NextResponse.json({ success: true, count: 0, message: 'No active templates found for today\'s schedule' })
    }

    const firstUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    const createdById = firstUser?.id || 'SYSTEM'

    let createdCount = 0

    await prisma.$transaction(async (tx) => {
      for (const t of templates) {
        // Skip if explicitly skipped for this week
        if (t.skippedWeeks.includes(weekStartStr)) {
          continue;
        }

        // IMPORTANT: Prevent duplicates.
        // Check if this customer already has an order for this day and week.
        const existingOrder = await tx.order.findFirst({
          where: {
            customerId: t.customerId,
            deliveryDay: t.deliveryDay,
            deliveryWeek: weekStartStr,
            deletedAt: null
          }
        })

        if (existingOrder) {
          continue; // Already generated (or manually created)
        }

        const hotCount = t.items.filter(i => i.variant === 'HOT').reduce((acc, i) => acc + i.quantity, 0)
        const orderType = (t.deliveryDay === 'Shabbat') ? 'HOT' : (hotCount > 0 ? 'HOT' : 'COLD')

        await tx.order.create({
          data: {
            customerId: t.customerId,
            createdById,
            type: orderType,
            deliveryDay: t.deliveryDay,
            deliveryWeek: weekStartStr,
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
        
        await tx.customer.update({
          where: { id: t.customerId },
          data: { debt: { increment: t.totalPrice } }
        })
        
        createdCount++
      }
    })

    return NextResponse.json({ success: true, count: createdCount, targetWeek: weekStartStr, days: targetDeliveryDays })

  } catch (error: any) {
    console.error('Failed cron generation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
