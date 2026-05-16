import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Recalculates `paidAmount` and `status` sequentially across all of a customer's historical orders
 * using a strict First-In-First-Out (FIFO) chronological allocation driven by the global debt.
 */
export async function syncCustomerOrderPayments(
  customerId: string, 
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  providedCustomer?: any
) {
  const customer = providedCustomer || await tx.customer.findUnique({
    where: { id: customerId }
  })

  if (!customer) return

  // 1. Fetch entire historical billing array sorted oldest -> newest
  const orders = await tx.order.findMany({
    where: { customerId },
    orderBy: { createdAt: 'asc' }
  })

  // 2. Identify precisely how much cash has been funneled in total across history
  const totalBilled = orders.reduce((sum: number, o: any) => sum + o.totalPrice, 0)
  let remainingPaid = totalBilled - customer.debt

  // 3. Spool the total cash linearly through time, filling oldest invoices first
  for (const order of orders) {
    let allocatedToThisOrder = 0

    if (remainingPaid >= order.totalPrice) {
      allocatedToThisOrder = order.totalPrice
      remainingPaid -= order.totalPrice
    } else if (remainingPaid > 0) {
      allocatedToThisOrder = remainingPaid
      remainingPaid = 0
    }

    // Only strike the DB if the allocated metrics actually shifted
    if (order.paidAmount !== allocatedToThisOrder) {
      await tx.order.update({
        where: { id: order.id },
        data: { paidAmount: allocatedToThisOrder }
      })
    }
  }
}
