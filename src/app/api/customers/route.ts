import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { name, phone, address, city, defaultDeliveryAreaId, typeId, saveAddress } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Check if customer with phone already exists
    const existing = await prisma.customer.findUnique({
      where: { phone }
    })

    if (existing) {
      return NextResponse.json({ error: 'Customer phone already exists' }, { status: 409 })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
        city,
        defaultDeliveryAreaId: defaultDeliveryAreaId || null,
        customerTypeId: typeId || null,
        saveAddress: saveAddress ?? true,
        debt: 0.0
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error('Create Customer Error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
