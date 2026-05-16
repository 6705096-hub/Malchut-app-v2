import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { syncCustomerOrderPayments } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, amount, note } = await req.json()
    if (!customerId || amount === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Begin Transaction to register payment AND offset global customer debt
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          customerId,
          amount: parseFloat(amount),
          note: note || undefined,
        }
      })

      // Math: Decrease the raw customer debt by the deposited cash flow
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          debt: { decrement: parseFloat(amount) }
        }
      })

      // Syphon the debt offsets through the strict chronological FIFO allocator
      await syncCustomerOrderPayments(customerId, tx, updatedCustomer)

      return newPayment
    })

    revalidatePath('/dashboard', 'layout')
    return NextResponse.json({ success: true, payment })

  } catch (error: any) {
    console.error('Failed to register payment:', error)
    return NextResponse.json({ error: error?.message || 'Failed to record payment', stack: error?.stack }, { status: 500 })
  }
}
