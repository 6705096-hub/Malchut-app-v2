import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseISO, isSameDay } from 'date-fns'

export async function POST(req: Request) {
  try {
    const { action, force } = await req.json()
    if (!action) return NextResponse.json({ error: 'No action provided' }, { status: 400 })

    if (action.type === 'CREATE_ORDER') {
      const payload = action.payload

      // Avoid duplicates: 
      // check if in the last 24 hours an order was created for this customer, this date, and these items (exactly)
      if (!force) {
        
        let customerIdCheck = payload.customerId
        if (!customerIdCheck && payload.customerName) {
           // Might be new customer inside the payload. Let's look for orders with this customerName if no customerId
           const existingCustomer = await prisma.customer.findFirst({ where: { name: payload.customerName }})
           if (existingCustomer) customerIdCheck = existingCustomer.id
        }

        if (customerIdCheck) {
          const recentOrders = await prisma.order.findMany({
            where: {
              customerId: customerIdCheck,
              createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 48) } // last 48 hours
            },
            include: { items: true }
          })

          const isDuplicate = recentOrders.some(order => {
            const sameDate = order.deliveryDay === payload.deliveryDay && order.deliveryWeek === payload.deliveryWeek
            if (!sameDate) return false
            
            // Check if items are identical
            const payloadItems = payload.items || []
            if (payloadItems.length !== order.items.length) return false
            
            return payloadItems.every((pi: any) => 
               order.items.some(oi => oi.productId === pi.productId && oi.quantity === pi.quantity)
            )
          })

          if (isDuplicate) {
             return NextResponse.json({ 
               duplicateDetected: true, 
               error: 'דומה שקיימת כבר הזמנה זהה במערכת.',
               details: `מזהה כפילות להזמנה של: ${payload.customerName || 'לקוח'} (ליום ${payload.deliveryDay}).`
             }, { status: 409 })
          }
        }
      }

      // Procede to execute! Call the standard insert logic
      // Note: Re-implementing the core of /api/orders here since we skip next/api overhead.
      
      let finalCustomerId = payload.customerId
      if (!finalCustomerId) {
        if (!payload.customerName) return NextResponse.json({ error: 'Missing customer info' }, { status: 400 })
        const newCust = await prisma.customer.create({
          data: {
            name: payload.customerName,
            phone: payload.customerPhone || '',
            address: payload.customerAddress || '',
          }
        })
        finalCustomerId = newCust.id
      }

      await prisma.order.create({
        data: {
          customerId: finalCustomerId,
          createdById: finalCustomerId, // Not perfectly accurate, but bulk sync acts as auto
          deliveryDay: payload.deliveryDay,
          deliveryWeek: payload.deliveryWeek,
          type: payload.type || 'HOT',
          address: payload.address || null,
          city: payload.city || null,
          deliveryAreaId: payload.deliveryArea || null,
          totalPrice: payload.totalPrice,
          deliveryFee: payload.deliveryFee || 0,
          paidAmount: payload.paidAmount || 0,
          notes: payload.notes || null,
          specialDateId: payload.specialDateId || null,
          items: {
            create: payload.items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              variant: i.variant
            }))
          }
        }
      })

      return NextResponse.json({ success: true })
    }

    if (action.type === 'ADD_PAYMENT') {
       const payload = action.payload
       await prisma.payment.create({
         data: {
            customerId: payload.customerId,
            amount: payload.amount,
            note: payload.note || null
         }
       })
       return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Unknown action type' }, { status: 400 })

  } catch (err: any) {
    console.error('Bulk sync error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
