import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json({ error: 'User ID missing from session' }, { status: 401 })
    }

    const data = await request.json()
    const { customer, items, totalPrice, deliveryDay, city } = data

    if (!customer?.phone || !customer?.name) {
      return NextResponse.json({ error: 'Customer phone and name are required' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 })
    }

    // Upsert Customer by Phone
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: customer.phone }
    })

    let dbCustomer
    if (existingCustomer) {
      dbCustomer = await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: customer.name,
          address: customer.address || existingCustomer.address,
          city: customer.city || existingCustomer.city
        }
      })
    } else {
      dbCustomer = await prisma.customer.create({
        data: {
          phone: customer.phone,
          name: customer.name,
          address: customer.address,
          city: customer.city
        }
      })
    }

    // Create the Wholesale Order
    const order = await prisma.order.create({
      data: {
        customerId: dbCustomer.id,
        createdById: userId,
        deliveryDay: deliveryDay || 'Wednesday_Stores',
        deliveryWeek: 'THIS_WEEK',
        city: city || dbCustomer.city,
        address: customer.address || dbCustomer.address,
        totalPrice: totalPrice,
        status: 'PLANNED',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    })

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error creating wholesale order:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
