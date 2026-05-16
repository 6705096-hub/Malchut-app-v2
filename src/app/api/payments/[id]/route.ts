import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { syncCustomerOrderPayments } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || session.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paymentId = params.id

    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId }
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Begin Transaction to reverse payment and adjust global customer debt
    await prisma.$transaction(async (tx) => {
      // Math: Revert the deposited cash flow by INCREMENTING the debt by the same amount
      // (because when it was created, we DECREMENTED the debt by this amount)
      const updatedCustomer = await tx.customer.update({
        where: { id: existingPayment.customerId },
        data: {
          debt: { increment: existingPayment.amount }
        }
      })

      // Delete the payment record
      await tx.payment.delete({
        where: { id: paymentId }
      })

      // Syphon the debt offsets through the strict chronological FIFO allocator
      await syncCustomerOrderPayments(existingPayment.customerId, tx, updatedCustomer)
    })

    revalidatePath('/dashboard', 'layout')
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Failed to delete payment:', error)
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}
