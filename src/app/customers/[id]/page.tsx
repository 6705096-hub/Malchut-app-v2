import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CustomerDetailsClient from '@/components/customers/CustomerDetailsClient'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { applyCustomerDataScope } from '@/lib/data-access'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const customer = await prisma.customer.findFirst({
    where: applyCustomerDataScope(session, { id: params.id }),
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  })

  if (!customer) {
    notFound()
  }

  // Convert Date objects to strings for Client Component if necessary, 
  // or just pass as is if Next.js handles it (it usually does for Server Components to Client Components)
  return <CustomerDetailsClient customer={customer as any} />
}
