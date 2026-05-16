import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import webpush from 'web-push'
import { syncCustomerOrderPayments } from '@/lib/payments'
import { syncActiveOrdersToExcel } from '@/lib/backup'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.role === 'VIEWER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { customer, deliveryDay, deliveryWeek, type, deliveryArea, address, city, notes, items, totalPrice, deliveryFee, isPastOrder, specialDateId, isRecurring, recurringDay, paidAmount, requiresApproval } = data

    // Handle Smart CRM: Create Customer if NEW
    let customerId = customer.id
    if (!customerId || customerId === 'NEW') {
        const typeId = customer.typeId || null
        
        // Respect customer's own saveAddress preference if passed from UI, otherwise fallback to their Type's default or true.
        let shouldSaveAddress = true
        if (customer.saveAddress !== undefined) {
           shouldSaveAddress = customer.saveAddress
        } else if (typeId) {
          const type = await prisma.customerType.findUnique({ where: { id: typeId } })
          shouldSaveAddress = type?.saveAddress ?? true
        }

        const existingCustomer = await prisma.customer.findUnique({
            where: { phone: customer.phone }
        })
        
        if (existingCustomer) {
            customerId = existingCustomer.id
            const dataToUpdate: any = {}
            if (typeId && typeId !== existingCustomer.customerTypeId) {
              dataToUpdate.customerTypeId = typeId
            }
            if (customer.saveAddress !== undefined && customer.saveAddress !== existingCustomer.saveAddress) {
              dataToUpdate.saveAddress = customer.saveAddress
            }
            if (address && address !== existingCustomer.address && (shouldSaveAddress || !existingCustomer.address)) {
              dataToUpdate.address = address
            }
            if (city && city !== existingCustomer.city && (shouldSaveAddress || !existingCustomer.city)) {
              dataToUpdate.city = city
            }
            if (deliveryArea && deliveryArea !== existingCustomer.defaultDeliveryAreaId && (shouldSaveAddress || !existingCustomer.defaultDeliveryAreaId)) {
              dataToUpdate.defaultDeliveryAreaId = deliveryArea
            }
            if (Object.keys(dataToUpdate).length > 0) {
              await prisma.customer.update({
                  where: { id: customerId },
                  data: dataToUpdate
              })
            }
        } else {
            const newCustomer = await prisma.customer.create({
                data: {
                    name: customer.name,
                    phone: customer.phone,
                    saveAddress: shouldSaveAddress,
                    address: address || null,
                    city: city || null,
                    defaultDeliveryAreaId: deliveryArea || null,
                    customerTypeId: typeId
                }
            })
            customerId = newCustomer.id
        }
    }

    // Handle Recurring Orders Template Creation
    let orderTemplateId: string | null = null
    if (isRecurring && !isPastOrder && !specialDateId) {
       const newTemplate = await prisma.orderTemplate.create({
         data: {
           customerId,
           deliveryDay: recurringDay || deliveryDay,
           address: address || null,
           city: city || null,
           notes: notes || null,
           deliveryAreaId: deliveryArea || null,
           totalPrice,
           deliveryFee: deliveryFee || 0,
           requiresApproval: requiresApproval || false,
           items: {
             create: items.map((item: any) => ({
               productId: item.productId,
               quantity: item.quantity,
               variant: item.variant || 'HOT'
            }))
          },
          
        }
      })
       orderTemplateId = newTemplate.id
    }

    // Create Order with Items & Update Customer Debt
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId,
          createdById: (session.user as any).id,
          deliveryDay,
          deliveryWeek,
          type,
          address,
          city: city || null,
          notes: notes || null,
          deliveryAreaId: deliveryArea || null,
          specialDateId: specialDateId || null,
          totalPrice,
          deliveryFee: deliveryFee || 0,
          paidAmount: paidAmount || 0,
          orderTemplateId,
          status: isPastOrder ? 'EXECUTED' : 'PLANNED',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: item.variant || 'HOT'
            }))
          },
          histories: {
            create: {
              userId: (session.user as any).id,
              action: 'CREATED'
            }
          }
        }
      })

      const customerUpdateData: any = { debt: { increment: totalPrice - (paidAmount || 0) } }

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: customerUpdateData
      })

      await syncCustomerOrderPayments(customerId, tx, updatedCustomer)
      return newOrder
    })

    // Background Backup Sync (Live view of all active orders)
    await syncActiveOrdersToExcel()

    // If there's an address and a city, cache it in the dictionary
    if (address && city) {
      // Extract street name without trailing numbers/apartments
      // e.g. "רשבי 10" -> "רשבי"
      const normalizedStreet = address.split(/\d/)[0].trim()
      
      if (normalizedStreet.length >= 2) {
        // Upsert dictionary entry so future orders auto-fill the city and area
        await prisma.savedAddress.upsert({
          where: { street: normalizedStreet },
          update: { city: city, deliveryAreaId: deliveryArea || null },
          create: { street: normalizedStreet, city: city, deliveryAreaId: deliveryArea || null }
        })
      }
    }

    let shouldNotify = false;
    let pushTitle = 'הזמנה חדשה! 📦';
    let pushLines: string[] = [];
    let debugLog = ``;

    try {
      if (!isPastOrder && items?.length > 0) {
        // --- Calculate if order is for TODAY (Israel Time) ---
        const israelTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" });
        const israelDate = new Date(israelTimeStr);
        const todayDayIndex = israelDate.getDay();
        const offsetToSunday = todayDayIndex;
        const todayWeekStart = new Date(israelDate);
        todayWeekStart.setDate(israelDate.getDate() - offsetToSunday);
        
        const yyyy = todayWeekStart.getFullYear();
        const mm = String(todayWeekStart.getMonth() + 1).padStart(2, '0');
        const dd = String(todayWeekStart.getDate()).padStart(2, '0');
        const todayWeekStartStr = `${yyyy}-${mm}-${dd}`;
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Shabbat'];
        const todayDayName = dayNames[todayDayIndex];
        
        const yyyyToday = israelDate.getFullYear();
        const mmToday = String(israelDate.getMonth() + 1).padStart(2, '0');
        const ddToday = String(israelDate.getDate()).padStart(2, '0');
        const todayStr = `${yyyyToday}-${mmToday}-${ddToday}`;

        // 1. Determine targetDateString
        let targetDateString = '';
        if (specialDateId) {
          targetDateString = specialDateId;
        } else {
          let baseDate = new Date(israelTimeStr);
          if (deliveryWeek === 'NEXT_WEEK') {
            baseDate.setDate(baseDate.getDate() + 7);
          } else if (deliveryWeek.includes('-')) {
            baseDate = new Date(`${deliveryWeek}T12:00:00`);
          }
          
          if (deliveryDay === 'Shabbat' || deliveryDay === 'Friday') {
            // Shabbat orders belong to that week's Saturday
            const saturdayOffset = 6 - baseDate.getDay();
            baseDate.setDate(baseDate.getDate() + saturdayOffset);
          } else {
             // Midweek Daily orders belong to that exact day
             const targetDayIndex = dayNames.indexOf(deliveryDay);
             if (targetDayIndex !== -1) {
                const diff = targetDayIndex - baseDate.getDay();
                baseDate.setDate(baseDate.getDate() + diff);
             }
          }

          const y = baseDate.getFullYear();
          const m = String(baseDate.getMonth() + 1).padStart(2, '0');
          const d = String(baseDate.getDate()).padStart(2, '0');
          targetDateString = `${y}-${m}-${d}`;
        }

        const isTodayDelivery = (targetDateString === todayStr) || (deliveryWeek === todayStr) || (deliveryWeek === todayWeekStartStr && deliveryDay === todayDayName);
        debugLog += `targetDateString is ${targetDateString}. isTodayDelivery: ${isTodayDelivery}.\n`;

        const dbProducts = await prisma.product.findMany({
          where: { id: { in: items.map((i: any) => i.productId) } },
          select: { id: true, name: true, isManufactured: true, linkedWholeProductId: true }
        })
        const mProductsMap = new Map(dbProducts.map(p => [p.id, p]))

        // Which items have we already started producing for targetDateString?
        const existingLogs = await prisma.productionLog.findMany({
          where: { dateString: targetDateString, quantityProduced: { gt: 0 } }
        });
        const startedProductIds = new Set(existingLogs.map(l => l.productId));
        const hasStartedShift = startedProductIds.size > 0;

        // Fetch all quantities for this order's day/week combo (for the parent/manufactured items or the products themselves)
        const currentQuantities = await prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            productId: { in: dbProducts.map(p => p.id) },
            order: { deliveryDay, deliveryWeek, specialDateId: specialDateId || null, status: { not: 'EXECUTED' } }
          },
          _sum: { quantity: true }
        })
        const currQtyMap = new Map(currentQuantities.map(g => [g.productId, g._sum.quantity || 0]))

        for (const item of items) {
          const product = mProductsMap.get(item.productId)
          if (!product) continue

          // If this exact product was started, or its linked parent was started
          const isDirectStarted = startedProductIds.has(product.id);
          const isLinkedStarted = product.linkedWholeProductId ? startedProductIds.has(product.linkedWholeProductId) : false;
          const isStarted = isDirectStarted || isLinkedStarted;

          const currentReq = currQtyMap.get(item.productId) || 0;
          const previousReq = currentReq - item.quantity;
          const isSurprise = (previousReq <= 0);

          let triggerPush = isStarted;

          // Rule 2: If target date is TODAY, also notify for surprise products if the shift has started.
          if (!triggerPush && isTodayDelivery && hasStartedShift && isSurprise) {
            triggerPush = true;
          }

          if (triggerPush) {
            shouldNotify = true;
            pushTitle = isStarted ? 'עודכן מוצר שכבר בתנור! 🔥' : 'הזמנה חמה למטבח! 📦';
            pushLines.push(`נוסף עוד ${item.quantity} - ${product.name}`);
            debugLog += `-> Included in Push! (started=${isStarted}, surprise=${isSurprise})\n`;
          }
        }

      }
      if (shouldNotify && pushLines.length > 0) {
        debugLog += `-> Sending push...\n`;
        const admins = await prisma.user.findMany({
          where: { notifyOnNewOrder: true },
          include: { pushSubscriptions: true }
        })
        debugLog += `-> Users found to notify: ${admins.length}\n`;
        const pushPayload = JSON.stringify({
          title: pushTitle,
          body: `${pushLines.join('\n')}`,
          url: '/dashboard'
        })
        const pushPromises = admins.flatMap(admin => 
          admin.pushSubscriptions.map(sub => 
            webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { auth: sub.auth, p256dh: sub.p256dh }
            }, pushPayload)
            .then(() => { debugLog += `-> Push success to ${admin.name}\n`; })
            .catch(err => {
              debugLog += `-> Push failed to ${admin.name}: ${err.statusCode}\n`;
              if (err.statusCode === 410 || err.statusCode === 404) {
                return prisma.pushSubscription.delete({ where: { id: sub.id } })
              }
            })
          )
        )
        await Promise.all(pushPromises)
      } else {
        debugLog += `-> Skipped push because shouldNotify was false.\n`;
      }
      
      await prisma.systemSetting.upsert({
        where: { key: 'DEBUG_PUSH' },
        update: { value: debugLog + `\nTime: ${new Date().toISOString()}` },
        create: { key: 'DEBUG_PUSH', value: debugLog + `\nTime: ${new Date().toISOString()}` }
      }).catch(console.error);
    } catch(e) { console.error('Push warning:', e) }

    return NextResponse.json({ success: true, orderId: order.id })

  } catch (error: any) {
    console.error('Order creation error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to create order', detail: error?.message }, { status: 500 })
  }
}

