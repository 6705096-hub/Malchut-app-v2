import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const template = await prisma.orderTemplate.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    })

    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ template })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customer, deliveryDay, address, city, notes, deliveryArea, items, totalPrice } = await req.json()
    
    await prisma.$transaction(async (tx) => {
      // 1. Delete old items
      await tx.orderTemplateItem.deleteMany({
        where: { orderTemplateId: params.id }
      })

      // 2. Update template and attach new items
      await tx.orderTemplate.update({
        where: { id: params.id },
        data: {
          deliveryDay,
          address: address || null,
          city: city || null,
          notes: notes || null,
          deliveryAreaId: deliveryArea || null,
          totalPrice,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: item.variant || 'HOT'
            }))
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to update template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Permanent delete as requested: un-link past orders and hard-delete the template
    await prisma.$transaction(async (tx) => {
      // 1. Unlink past generated orders so they are preserved but detached
      await tx.order.updateMany({
        where: { orderTemplateId: params.id },
        data: { orderTemplateId: null }
      })

      // 2. Hard delete the template (items will be cascade deleted)
      await tx.orderTemplate.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.role === 'VIEWER') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const dataToUpdate: any = {}
    
    if (body.isActive !== undefined) dataToUpdate.isActive = body.isActive
    if (body.pausedForever !== undefined) dataToUpdate.pausedForever = body.pausedForever
    if (body.pausedUntil !== undefined) dataToUpdate.pausedUntil = body.pausedUntil ? new Date(body.pausedUntil) : null

    await prisma.orderTemplate.update({
      where: { id: params.id },
      data: dataToUpdate
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to patch template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}
