import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hasPermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any)?.role || 'VIEWER'
    const permissions = (session.user as any)?.permissions
    if (!hasPermission(role, permissions, 'customers_manage', 'FULL')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { amount, notes } = await req.json()
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create a placeholder "Order" representing the debt
      await tx.order.create({
        data: {
          customerId: params.id,
          createdById: (session.user as any).id,
          deliveryDay: 'N/A',
          deliveryWeek: 'PAST_DEBT',
          totalPrice: amount,
          paidAmount: 0,
          notes: notes || 'חוב קודם',
          status: 'EXECUTED',
          deliveryAreaId: null,
          city: null,
          address: null
        }
      })

      // 2. Increment global debt
      await tx.customer.update({
        where: { id: params.id },
        data: { debt: { increment: amount } }
      })
    })

    revalidatePath(`/dashboard/customers/${params.id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to add past debt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
