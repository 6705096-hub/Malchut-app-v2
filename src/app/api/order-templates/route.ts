import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.role === 'VIEWER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }

    const weekStart = searchParams.get('weekStart')

    const includeOptions: any = {
      customer: true,
      deliveryArea: true,
      items: {
        include: { product: true }
      }
    }

    if (weekStart) {
      includeOptions.orders = {
        where: {
          deletedAt: null,
          OR: [
            { deliveryWeek: weekStart },
            { deliveryWeek: 'THIS_WEEK' }
          ]
        },
        select: { id: true, status: true, deliveryWeek: true }
      }
    }

    const templates = await prisma.orderTemplate.findMany({
      where,
      include: includeOptions,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ templates })
  } catch (err: any) {
    console.error('Failed to GET order templates', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.role === 'VIEWER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { 
      customerId, 
      deliveryDay, 
      address, 
      city, 
      notes, 
      deliveryAreaId, 
      items, 
      totalPrice 
    } = data

    // Create the OrderTemplate
    const template = await prisma.orderTemplate.create({
      data: {
        customerId,
        deliveryDay,
        address: address || null,
        city: city || null,
        notes: notes || null,
        deliveryAreaId: deliveryAreaId || null,
        totalPrice,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            variant: item.variant || 'HOT'
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: { product: true }
        }
      }
    })

    return NextResponse.json({ success: true, template })
  } catch (err: any) {
    console.error('Create OrderTemplate Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
