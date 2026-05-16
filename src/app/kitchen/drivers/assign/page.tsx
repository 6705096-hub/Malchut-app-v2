import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { AssignClient } from './AssignClient'

export const dynamic = 'force-dynamic'

export default async function AssignPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || !['ADMIN', 'ORDERS_MANAGER'].includes(role)) {
    redirect('/kitchen/drivers')
  }

  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  })

  return <AssignClient initialDrivers={drivers} />
}
