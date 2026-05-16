import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'
import { applyCustomerDataScope } from '@/lib/data-access'
import CustomersClientPage from './CustomersClientPage'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  const role = (session.user as any)?.role || 'VIEWER'
  const permissions = (session.user as any)?.permissions
  if (!hasPermission(role, permissions, 'customers_manage', 'READ')) redirect('/menu')
  const canEdit = hasPermission(role, permissions, 'customers_manage', 'FULL')

  const customers = await prisma.customer.findMany({
    where: applyCustomerDataScope(session, { deletedAt: null }),
    include: {
      _count: { select: { orders: true } },
      type: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { deliveryArea: { select: { id: true, name: true } } }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  const customerTypes = await prisma.customerType.findMany({
    select: { id: true, name: true }
  })

  const areas = await prisma.deliveryArea.findMany({
    select: { id: true, name: true },
    orderBy: { sortOrder: 'asc' }
  })

  return <CustomersClientPage customers={customers} canEdit={canEdit} customerTypes={customerTypes} areas={areas} />
}
