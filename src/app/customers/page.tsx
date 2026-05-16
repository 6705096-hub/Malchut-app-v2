import prisma from '@/lib/prisma'
import CustomerList from '@/components/customers/CustomerList'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      phone: true,
      debt: true
    }
  })

  return <CustomerList initialCustomers={customers} />
}
